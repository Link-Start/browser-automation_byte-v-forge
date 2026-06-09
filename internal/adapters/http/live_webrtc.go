package httpadapter

import (
	"context"
	"errors"
	"log/slog"
	"net"
	"strings"
	"time"

	browserautomationv1 "github.com/byte-v-forge/browser-automation/gen/go/browser/automation/v1"
	"github.com/byte-v-forge/browser-automation/internal/app"
	"github.com/byte-v-forge/browser-automation/internal/core"
	"github.com/byte-v-forge/browser-automation/internal/platform/protojsonx"
	"github.com/pion/ice/v4"
	"github.com/pion/webrtc/v4"
)

const (
	browserLiveDataChannel = "browser-live"
	webrtcGatherTimeout    = 10 * time.Second
	webrtcIdleTimeout      = 30 * time.Second
)

type LiveWebRTCConfig struct {
	PublicIPs     []string
	TCPListenAddr string
	UDPListenAddr string
}

type LiveWebRTCServer struct {
	api     *webrtc.API
	tcpMux  ice.TCPMux
	udpConn *net.UDPConn
}

func NewLiveWebRTCServer(cfg LiveWebRTCConfig) (*LiveWebRTCServer, error) {
	setting := webrtc.SettingEngine{}
	networkTypes := make([]webrtc.NetworkType, 0, 2)
	var udpConn *net.UDPConn
	if strings.TrimSpace(cfg.UDPListenAddr) != "" {
		addr, err := net.ResolveUDPAddr("udp4", cfg.UDPListenAddr)
		if err != nil {
			return nil, err
		}
		udpConn, err = net.ListenUDP("udp4", addr)
		if err != nil {
			return nil, err
		}
		setting.SetICEUDPMux(ice.NewUDPMuxDefault(ice.UDPMuxParams{UDPConn: udpConn}))
		networkTypes = append(networkTypes, webrtc.NetworkTypeUDP4)
	}
	var tcpMux ice.TCPMux
	if strings.TrimSpace(cfg.TCPListenAddr) != "" {
		listener, err := net.Listen("tcp4", cfg.TCPListenAddr)
		if err != nil {
			if udpConn != nil {
				_ = udpConn.Close()
			}
			return nil, err
		}
		tcpMux = webrtc.NewICETCPMux(nil, listener, 8)
		setting.SetICETCPMux(tcpMux)
		networkTypes = append(networkTypes, webrtc.NetworkTypeTCP4)
	}
	if len(networkTypes) > 0 {
		setting.SetNetworkTypes(networkTypes)
	}
	if len(cfg.PublicIPs) > 0 {
		setting.SetNAT1To1IPs(cfg.PublicIPs, webrtc.ICECandidateTypeHost)
	}
	return &LiveWebRTCServer{api: webrtc.NewAPI(webrtc.WithSettingEngine(setting)), tcpMux: tcpMux, udpConn: udpConn}, nil
}

func (s *LiveWebRTCServer) Close() error {
	if s == nil {
		return nil
	}
	var result error
	if s.tcpMux != nil {
		result = errors.Join(result, s.tcpMux.Close())
	}
	if s.udpConn != nil {
		result = errors.Join(result, s.udpConn.Close())
	}
	return result
}

func (s *LiveWebRTCServer) CreateAnswer(ctx context.Context, service *app.AutomationService, view *browserautomationv1.BrowserLiveView, offerSDP string) (*browserautomationv1.BrowserLiveWebRTCAnswerResponse, error) {
	if s == nil {
		return nil, core.NewError(core.CodeUnsupportedOperation, "browser live WebRTC is not configured", false)
	}
	if strings.TrimSpace(offerSDP) == "" {
		return nil, core.NewError(core.CodeValidationFailed, "offer_sdp is required", false)
	}
	peer, err := s.api.NewPeerConnection(webrtc.Configuration{})
	if err != nil {
		return nil, err
	}
	peerCtx, cancelPeer := livePeerContext(view)
	go func() {
		<-peerCtx.Done()
		_ = peer.Close()
	}()
	peer.OnICEConnectionStateChange(func(state webrtc.ICEConnectionState) {
		slog.Info("browser live WebRTC ICE state changed", "live_view_id", view.GetLiveViewId(), "session_id", view.GetSessionId(), "state", state.String())
	})
	peer.OnConnectionStateChange(func(state webrtc.PeerConnectionState) {
		slog.Info("browser live WebRTC peer state changed", "live_view_id", view.GetLiveViewId(), "session_id", view.GetSessionId(), "state", state.String())
		if state == webrtc.PeerConnectionStateFailed || state == webrtc.PeerConnectionStateClosed {
			cancelPeer()
			_ = peer.Close()
		}
	})
	peer.OnDataChannel(func(channel *webrtc.DataChannel) {
		if channel.Label() != browserLiveDataChannel {
			return
		}
		channel.OnOpen(func() {
			slog.Info("browser live WebRTC data channel opened", "live_view_id", view.GetLiveViewId(), "session_id", view.GetSessionId())
			go pumpWebRTCFrames(peerCtx, service, view, channel)
		})
		channel.OnClose(func() {
			slog.Info("browser live WebRTC data channel closed", "live_view_id", view.GetLiveViewId(), "session_id", view.GetSessionId())
		})
		channel.OnError(func(err error) {
			slog.Warn("browser live WebRTC data channel failed", "live_view_id", view.GetLiveViewId(), "session_id", view.GetSessionId(), "error", err)
		})
		channel.OnMessage(func(message webrtc.DataChannelMessage) { dispatchWebRTCInput(peerCtx, service, view, message.Data) })
	})
	if err := peer.SetRemoteDescription(webrtc.SessionDescription{Type: webrtc.SDPTypeOffer, SDP: offerSDP}); err != nil {
		cancelPeer()
		_ = peer.Close()
		return nil, err
	}
	answer, err := peer.CreateAnswer(nil)
	if err != nil {
		cancelPeer()
		_ = peer.Close()
		return nil, err
	}
	gatherComplete := webrtc.GatheringCompletePromise(peer)
	if err := peer.SetLocalDescription(answer); err != nil {
		cancelPeer()
		_ = peer.Close()
		return nil, err
	}
	if err := waitGatheringComplete(ctx, gatherComplete); err != nil {
		cancelPeer()
		_ = peer.Close()
		return nil, err
	}
	local := peer.LocalDescription()
	slog.Info("browser live WebRTC answer created", "live_view_id", view.GetLiveViewId(), "session_id", view.GetSessionId())
	return &browserautomationv1.BrowserLiveWebRTCAnswerResponse{AnswerSdp: local.SDP, AnswerType: local.Type.String()}, nil
}

func livePeerContext(view *browserautomationv1.BrowserLiveView) (context.Context, context.CancelFunc) {
	deadline := time.Now().Add(webrtcIdleTimeout)
	if view.GetExpiresAt() != nil {
		deadline = view.GetExpiresAt().AsTime()
	}
	return context.WithDeadline(context.Background(), deadline)
}

func waitGatheringComplete(ctx context.Context, done <-chan struct{}) error {
	timer := time.NewTimer(webrtcGatherTimeout)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return core.NewError(core.CodeTimeout, "WebRTC ICE gathering timed out", true)
	case <-done:
		return nil
	}
}

func pumpWebRTCFrames(ctx context.Context, service *app.AutomationService, view *browserautomationv1.BrowserLiveView, channel *webrtc.DataChannel) {
	ticker := time.NewTicker(liveFrameInterval)
	defer ticker.Stop()
	var sequence int64
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			sequence++
			if err := sendWebRTCFrame(ctx, service, view, channel, sequence); err != nil {
				slog.Warn("browser live WebRTC frame pump stopped", "live_view_id", view.GetLiveViewId(), "session_id", view.GetSessionId(), "error", err)
				return
			}
		}
	}
}

func sendWebRTCFrame(ctx context.Context, service *app.AutomationService, view *browserautomationv1.BrowserLiveView, channel *webrtc.DataChannel, sequence int64) error {
	if channel.ReadyState() != webrtc.DataChannelStateOpen {
		return errors.New("data channel closed")
	}
	captureCtx, cancel := context.WithTimeout(ctx, liveOperationTimeout)
	frame, captureErr := service.CaptureLiveFrame(captureCtx, view, sequence)
	cancel()
	message := &browserautomationv1.BrowserLiveServerMessage{Frame: frame, Error: core.AutomationError(captureErr)}
	data, err := protojsonx.Marshal(message)
	if err != nil {
		return err
	}
	if err := channel.SendText(string(data)); err != nil {
		return err
	}
	return captureErr
}

func dispatchWebRTCInput(ctx context.Context, service *app.AutomationService, view *browserautomationv1.BrowserLiveView, data []byte) {
	message := &browserautomationv1.BrowserLiveClientMessage{}
	if err := protojsonx.UnmarshalOptions.Unmarshal(data, message); err != nil {
		slog.Warn("browser live WebRTC input message invalid", "live_view_id", view.GetLiveViewId(), "session_id", view.GetSessionId(), "error", err)
		return
	}
	if message.GetInput() == nil {
		return
	}
	dispatchCtx, cancel := context.WithTimeout(ctx, liveOperationTimeout)
	err := service.DispatchLiveInput(dispatchCtx, view, message.GetInput())
	cancel()
	if err != nil {
		slog.Warn("browser live WebRTC input dispatch failed", "live_view_id", view.GetLiveViewId(), "session_id", view.GetSessionId(), "error", err)
	}
}
