package camoufox

import (
	"context"
	"os"
	"sync"

	"github.com/byte-v-forge/browser-automation/internal/core"
	browserautomationv1 "github.com/byte-v-forge/common-lib/gen/go/byte/v/forge/contracts/browserautomation/v1"
)

type Runtime struct {
	cfg      Config
	scripts  scripts
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
		scripts:  defaultScripts(),
		sessions: make(map[string]*sessionRuntime),
	}, nil
}

func (r *Runtime) DefaultBrowserKind() browserautomationv1.BrowserKind {
	return browserautomationv1.BrowserKind_BROWSER_KIND_FIREFOX
}

func (r *Runtime) StartSession(ctx context.Context, session *core.Session) error {
	if session == nil {
		return core.NewError(core.CodeValidationFailed, "session is required", false)
	}
	if session.GetProfile().GetBrowserKind() != browserautomationv1.BrowserKind_BROWSER_KIND_FIREFOX {
		return core.NewError(core.CodeUnsupportedOperation, "camoufox runtime supports firefox browser kind", false)
	}
	r.mu.Lock()
	if existing := r.sessions[session.GetSessionId()]; existing != nil {
		r.mu.Unlock()
		return nil
	}
	r.mu.Unlock()
	if err := os.MkdirAll(r.cfg.ArtifactsDir, 0o700); err != nil {
		return core.NewError(core.CodeInternal, err.Error(), true)
	}
	endpoint, server, err := r.startServer(ctx, session)
	if err != nil {
		return err
	}
	worker, err := r.startWorker(ctx, endpoint, session)
	if err != nil {
		_ = server.stop(r.cfg.ShutdownTimeout)
		return err
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	if existing := r.sessions[session.GetSessionId()]; existing != nil {
		_ = worker.stop(r.cfg.ShutdownTimeout)
		_ = server.stop(r.cfg.ShutdownTimeout)
		return nil
	}
	r.sessions[session.GetSessionId()] = &sessionRuntime{
		sessionID: session.GetSessionId(),
		endpoint:  endpoint,
		server:    server,
		worker:    worker,
	}
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
		return core.TaskExecutionResult{}, core.NewError(core.CodeBrowserUnavailable, "camoufox session runtime is not running", true)
	}
	return session.executeTask(ctx, task, r.cfg.TaskTimeout)
}
