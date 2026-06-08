package cloakbrowser

import (
	"context"
	"strconv"
	"time"

	browserautomationv1 "github.com/byte-v-forge/browser-automation/gen/go/browser/automation/v1"
	"github.com/byte-v-forge/browser-automation/internal/core"
	"github.com/byte-v-forge/browser-automation/internal/platform/protojsonx"
)

func (r *Runtime) DefaultLiveViewProvider() browserautomationv1.BrowserLiveViewProvider {
	return browserautomationv1.BrowserLiveViewProvider_BROWSER_LIVE_VIEW_PROVIDER_CDP
}

func (r *Runtime) SupportsLiveViewProvider(provider browserautomationv1.BrowserLiveViewProvider) bool {
	return provider == browserautomationv1.BrowserLiveViewProvider_BROWSER_LIVE_VIEW_PROVIDER_CDP
}

func (r *Runtime) CaptureLiveFrame(ctx context.Context, sessionID string, liveView *browserautomationv1.BrowserLiveView, sequence int64) (*browserautomationv1.BrowserLiveFrame, error) {
	r.mu.Lock()
	session := r.sessions[sessionID]
	r.mu.Unlock()
	if session == nil {
		return nil, core.NewError(core.CodeBrowserUnavailable, "cloakbrowser session runtime is not running", true)
	}
	return session.captureLiveFrame(ctx, liveView, sequence, r.cfg.TaskTimeout)
}

func (r *Runtime) DispatchLiveInput(ctx context.Context, sessionID string, event *browserautomationv1.BrowserLiveInputEvent) error {
	r.mu.Lock()
	session := r.sessions[sessionID]
	r.mu.Unlock()
	if session == nil {
		return core.NewError(core.CodeBrowserUnavailable, "cloakbrowser session runtime is not running", true)
	}
	return session.dispatchLiveInput(ctx, event, r.cfg.TaskTimeout)
}

func (s *sessionRuntime) captureLiveFrame(ctx context.Context, liveView *browserautomationv1.BrowserLiveView, sequence int64, timeout time.Duration) (*browserautomationv1.BrowserLiveFrame, error) {
	viewJSON, err := protojsonx.Marshal(liveView)
	if err != nil {
		return nil, core.NewError(core.CodeInternal, err.Error(), false)
	}
	request := []byte(`{"type":"capture_live_frame","sequence":` + strconv.FormatInt(sequence, 10) + `,"live_view":` + string(viewJSON) + "}\n")
	s.worker.mu.Lock()
	defer s.worker.mu.Unlock()
	if _, err := s.worker.stdin.Write(request); err != nil {
		return nil, core.NewError(core.CodeBrowserUnavailable, s.worker.failureMessage("cloakbrowser worker write failed", err), true)
	}
	line, err := s.worker.readLine(ctx, timeout)
	if err != nil {
		return nil, err
	}
	return decodeLiveFrameResponse(line)
}

func (s *sessionRuntime) dispatchLiveInput(ctx context.Context, event *browserautomationv1.BrowserLiveInputEvent, timeout time.Duration) error {
	inputJSON, err := protojsonx.Marshal(event)
	if err != nil {
		return core.NewError(core.CodeInternal, err.Error(), false)
	}
	request := []byte(`{"type":"dispatch_live_input","input":` + string(inputJSON) + "}\n")
	s.worker.mu.Lock()
	defer s.worker.mu.Unlock()
	if _, err := s.worker.stdin.Write(request); err != nil {
		return core.NewError(core.CodeBrowserUnavailable, s.worker.failureMessage("cloakbrowser worker write failed", err), true)
	}
	line, err := s.worker.readLine(ctx, timeout)
	if err != nil {
		return err
	}
	return decodeLiveInputResponse(line)
}
