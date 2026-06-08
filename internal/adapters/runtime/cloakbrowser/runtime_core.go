package cloakbrowser

import (
	"context"
	"os"
	"sync"

	browserautomationv1 "github.com/byte-v-forge/browser-automation/gen/go/browser/automation/v1"
	"github.com/byte-v-forge/browser-automation/internal/core"
)

type Runtime struct {
	cfg      Config
	script   string
	mu       sync.Mutex
	sessions map[string]*sessionRuntime
}

func NewRuntime(cfg Config) (*Runtime, error) {
	normalized, err := cfg.normalize()
	if err != nil {
		return nil, core.NewError(core.CodeValidationFailed, err.Error(), false)
	}
	return &Runtime{
		cfg:      normalized,
		script:   workerScript(),
		sessions: make(map[string]*sessionRuntime),
	}, nil
}

func (r *Runtime) DefaultBrowserKind() browserautomationv1.BrowserKind {
	return browserautomationv1.BrowserKind_BROWSER_KIND_CHROMIUM
}

func (r *Runtime) ActiveSessionCount() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return len(r.sessions)
}

func (r *Runtime) MaxSessionCount() int {
	return r.cfg.MaxSessions
}

func (r *Runtime) StartSession(ctx context.Context, session *core.Session) error {
	if session == nil {
		return core.NewError(core.CodeValidationFailed, "session is required", false)
	}
	if session.GetProfile().GetBrowserKind() != browserautomationv1.BrowserKind_BROWSER_KIND_CHROMIUM {
		return core.NewError(core.CodeUnsupportedOperation, "cloakbrowser runtime supports chromium browser kind", false)
	}
	r.mu.Lock()
	if existing := r.sessions[session.GetSessionId()]; existing != nil {
		r.mu.Unlock()
		return nil
	}
	if len(r.sessions) >= r.cfg.MaxSessions {
		r.mu.Unlock()
		return core.NewError(core.CodeCapacityUnavailable, "browser session capacity is exhausted", true)
	}
	r.mu.Unlock()
	if err := os.MkdirAll(r.cfg.ArtifactsDir, 0o700); err != nil {
		return core.NewError(core.CodeInternal, err.Error(), true)
	}
	worker, err := r.startWorker(ctx, session)
	if err != nil {
		return err
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	if existing := r.sessions[session.GetSessionId()]; existing != nil {
		_ = worker.stop(r.cfg.ShutdownTimeout)
		return nil
	}
	if len(r.sessions) >= r.cfg.MaxSessions {
		_ = worker.stop(r.cfg.ShutdownTimeout)
		return core.NewError(core.CodeCapacityUnavailable, "browser session capacity is exhausted", true)
	}
	r.sessions[session.GetSessionId()] = &sessionRuntime{sessionID: session.GetSessionId(), worker: worker}
	return nil
}

func (r *Runtime) StopSession(_ context.Context, session *core.Session, _ string) error {
	if session == nil {
		return nil
	}
	r.mu.Lock()
	runtime := r.sessions[session.GetSessionId()]
	delete(r.sessions, session.GetSessionId())
	r.mu.Unlock()
	if runtime == nil {
		return nil
	}
	return runtime.stop(r.cfg.ShutdownTimeout)
}

func (r *Runtime) EnqueueTask(context.Context, *core.Task) error {
	return nil
}

func (r *Runtime) ExecuteTask(ctx context.Context, task *core.Task) (core.TaskExecutionResult, error) {
	if task == nil || task.GetInput() == nil {
		return core.TaskExecutionResult{}, core.NewError(core.CodeValidationFailed, "task input is required", false)
	}
	r.mu.Lock()
	session := r.sessions[task.GetInput().GetSessionId()]
	r.mu.Unlock()
	if session == nil {
		return core.TaskExecutionResult{}, core.NewError(core.CodeBrowserUnavailable, "cloakbrowser session runtime is not running", true)
	}
	return session.executeTask(ctx, task, r.cfg.TaskTimeout)
}
