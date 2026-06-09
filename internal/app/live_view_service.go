package app

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"strings"
	"time"

	browserautomationv1 "github.com/byte-v-forge/browser-automation/gen/go/browser/automation/v1"
	"github.com/byte-v-forge/browser-automation/internal/core"
	"google.golang.org/protobuf/proto"
)

const (
	defaultLiveViewTTL       = 10 * time.Minute
	defaultLiveViewMaxWidth  = 1280
	defaultLiveViewMaxHeight = 900
	liveTokenKeySize         = 32
)

func (s *AutomationService) CreateBrowserLiveView(ctx context.Context, request *browserautomationv1.CreateBrowserLiveViewRequest) (*browserautomationv1.BrowserLiveView, error) {
	if request == nil || strings.TrimSpace(request.GetSessionId()) == "" {
		return nil, core.NewError(core.CodeValidationFailed, "session_id is required", false)
	}
	session, err := s.GetBrowserSession(ctx, request.GetSessionId())
	if err != nil {
		return nil, err
	}
	if session.GetStatus() != browserautomationv1.BrowserSessionStatus_BROWSER_SESSION_STATUS_RUNNING {
		return nil, core.NewError(core.CodeSessionFinalized, "browser session is not running", false)
	}
	provider := request.GetProvider()
	if provider == browserautomationv1.BrowserLiveViewProvider_BROWSER_LIVE_VIEW_PROVIDER_UNSPECIFIED {
		provider = defaultLiveViewProvider(s.runtime)
	}
	liveRuntime, ok := s.runtime.(core.RuntimeLiveView)
	if !ok || !liveRuntime.SupportsLiveViewProvider(provider) {
		return nil, core.NewError(core.CodeUnsupportedOperation, "browser live view provider is not supported by active runtime", false)
	}
	ttl := duration(request.GetTtl())
	if ttl < 0 {
		return nil, core.NewError(core.CodeValidationFailed, "ttl cannot be negative", false)
	}
	if ttl == 0 {
		ttl = defaultLiveViewTTL
	}
	now := s.clock.Now()
	view := &browserautomationv1.BrowserLiveView{
		LiveViewId:     s.ids.NewID("brlive_"),
		SessionId:      session.GetSessionId(),
		Provider:       provider,
		ControlEnabled: request.GetControlEnabled(),
		MaxWidth:       normalizedDimension(request.GetMaxWidth(), defaultLiveViewMaxWidth),
		MaxHeight:      normalizedDimension(request.GetMaxHeight(), defaultLiveViewMaxHeight),
		CreatedAt:      timestamp(now),
		ExpiresAt:      timestamp(now.Add(ttl)),
	}
	token, err := s.signLiveView(view)
	if err != nil {
		return nil, err
	}
	view.Url = "/live/" + token
	view.WebsocketUrl = "/ws/browser-automation/live/" + token
	view.WebrtcUrl = "/api/browser-automation/live/" + token + "/webrtc/answer"
	return view, nil
}

func (s *AutomationService) AuthorizeBrowserLiveView(ctx context.Context, token string) (*browserautomationv1.BrowserLiveView, error) {
	view, err := s.verifyLiveView(token)
	if err != nil {
		return nil, err
	}
	if view.GetExpiresAt() == nil || s.clock.Now().After(view.GetExpiresAt().AsTime()) {
		return nil, core.NewError(core.CodeValidationFailed, "browser live view expired", false)
	}
	session, err := s.GetBrowserSession(ctx, view.GetSessionId())
	if err != nil {
		return nil, err
	}
	if session.GetStatus() != browserautomationv1.BrowserSessionStatus_BROWSER_SESSION_STATUS_RUNNING {
		return nil, core.NewError(core.CodeSessionFinalized, "browser session is not running", false)
	}
	liveRuntime, ok := s.runtime.(core.RuntimeLiveView)
	if !ok || !liveRuntime.SupportsLiveViewProvider(view.GetProvider()) {
		return nil, core.NewError(core.CodeUnsupportedOperation, "browser live view provider is not supported by active runtime", false)
	}
	return view, nil
}

func (s *AutomationService) CaptureLiveFrame(ctx context.Context, view *browserautomationv1.BrowserLiveView, sequence int64) (*browserautomationv1.BrowserLiveFrame, error) {
	liveRuntime, ok := s.runtime.(core.RuntimeLiveView)
	if !ok {
		return nil, core.NewError(core.CodeUnsupportedOperation, "active runtime does not support browser live view", false)
	}
	return liveRuntime.CaptureLiveFrame(ctx, view.GetSessionId(), view, sequence)
}

func (s *AutomationService) DispatchLiveInput(ctx context.Context, view *browserautomationv1.BrowserLiveView, event *browserautomationv1.BrowserLiveInputEvent) error {
	if !view.GetControlEnabled() {
		return core.NewError(core.CodeValidationFailed, "browser live view is read-only", false)
	}
	liveRuntime, ok := s.runtime.(core.RuntimeLiveView)
	if !ok {
		return core.NewError(core.CodeUnsupportedOperation, "active runtime does not support browser live view", false)
	}
	return liveRuntime.DispatchLiveInput(ctx, view.GetSessionId(), event)
}

func (s *AutomationService) signLiveView(view *browserautomationv1.BrowserLiveView) (string, error) {
	payload, err := proto.Marshal(view)
	if err != nil {
		return "", core.NewError(core.CodeInternal, err.Error(), false)
	}
	signature := liveViewSignature(s.liveTokenKey, payload)
	return base64.RawURLEncoding.EncodeToString(payload) + "." + base64.RawURLEncoding.EncodeToString(signature), nil
}

func (s *AutomationService) verifyLiveView(token string) (*browserautomationv1.BrowserLiveView, error) {
	payloadPart, signaturePart, ok := strings.Cut(strings.TrimSpace(token), ".")
	if !ok || payloadPart == "" || signaturePart == "" {
		return nil, core.NewError(core.CodeValidationFailed, "browser live view token is invalid", false)
	}
	payload, err := base64.RawURLEncoding.DecodeString(payloadPart)
	if err != nil {
		return nil, core.NewError(core.CodeValidationFailed, "browser live view token is invalid", false)
	}
	signature, err := base64.RawURLEncoding.DecodeString(signaturePart)
	if err != nil {
		return nil, core.NewError(core.CodeValidationFailed, "browser live view token is invalid", false)
	}
	expected := liveViewSignature(s.liveTokenKey, payload)
	if subtle.ConstantTimeCompare(signature, expected) != 1 {
		return nil, core.NewError(core.CodeValidationFailed, "browser live view token is invalid", false)
	}
	view := &browserautomationv1.BrowserLiveView{}
	if err := proto.Unmarshal(payload, view); err != nil {
		return nil, core.NewError(core.CodeValidationFailed, "browser live view token is invalid", false)
	}
	return view, nil
}

func defaultLiveViewProvider(runtime core.Runtime) browserautomationv1.BrowserLiveViewProvider {
	if defaults, ok := runtime.(core.RuntimeLiveViewDefaults); ok {
		provider := defaults.DefaultLiveViewProvider()
		if provider != browserautomationv1.BrowserLiveViewProvider_BROWSER_LIVE_VIEW_PROVIDER_UNSPECIFIED {
			return provider
		}
	}
	return browserautomationv1.BrowserLiveViewProvider_BROWSER_LIVE_VIEW_PROVIDER_CDP
}

func liveViewSignature(key, payload []byte) []byte {
	mac := hmac.New(sha256.New, key)
	_, _ = mac.Write(payload)
	return mac.Sum(nil)
}

func newLiveTokenKey() []byte {
	key := make([]byte, liveTokenKeySize)
	if _, err := rand.Read(key); err == nil {
		return key
	}
	fallback, _ := randomHex(liveTokenKeySize)
	return []byte(fallback)
}

func normalizedDimension(value int32, fallback int32) int32 {
	if value <= 0 {
		return fallback
	}
	return value
}
