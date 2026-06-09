package httpadapter

import (
	"context"
	"errors"
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
	UDPListenAddr string
}

type LiveWebRTCServer struct {
	api     *webrtc.API
	udpConn *net.UDPConn
}

func NewLiveWebRTCServer(cfg LiveWebRTCConfig) (*LiveWebRTCServer, error) {
	setting := webrtc.SettingEngine{}
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
	}
	if len(cfg.PublicIPs) > 0 {
		setting.SetNAT1To1IPs(cfg.PublicIPs, webrtc.ICECandidateTypeHost)
	}
	return &LiveWebRTCServer{api: webrtc.NewAPI(webrtc.WithSettingEngine(setting)), udpConn: udpConn}, nil
}

func (s *LiveWebRTCServer) Close() error {
	if s == nil || s.udpConn == nil {
		return nil
	}
	return s.udpConn.Close()
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
	peer.OnConnectionStateChange(func(state webrtc.PeerConnectionState) {
		if state == webrtc.PeerConnectionStateFailed || state == webrtc.PeerConnectionStateClosed || state == webrtc.PeerConnectionStateDisconnected {
			cancelPeer()
			_ = peer.Close()
		}
	})
	peer.OnDataChannel(func(channel *webrtc.DataChannel) {
		if channel.Label() != browserLiveDataChannel {
			return
		}
		channel.OnOpen(func() { go pumpWebRTCFrames(peerCtx, service, view, channel) })
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
	if err := protojsonx.UnmarshalOptions.Unmarshal(data, message); err != nil || message.GetInput() == nil {
		return
	}
	dispatchCtx, cancel := context.WithTimeout(ctx, liveOperationTimeout)
	_ = service.DispatchLiveInput(dispatchCtx, view, message.GetInput())
	cancel()
}
