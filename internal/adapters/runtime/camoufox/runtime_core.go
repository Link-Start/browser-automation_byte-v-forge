package camoufox

import (
	"context"
	"errors"
	"os"
	"sync"

	browserautomationv1 "github.com/byte-v-forge/browser-automation/gen/go/browser/automation/v1"
	"github.com/byte-v-forge/browser-automation/internal/core"
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
	if session.GetProfile().GetBrowserKind() != browserautomationv1.BrowserKind_BROWSER_KIND_FIREFOX {
		return core.NewError(core.CodeUnsupportedOperation, "camoufox runtime supports firefox browser kind", false)
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
	proxyURL, err := r.resolveSessionProxy(ctx, session)
	if err != nil {
		return core.NewError(core.CodeProxyFailed, err.Error(), false)
	}
	endpoint, server, err := r.startServer(ctx, session, proxyURL)
	if err != nil {
		_ = r.releaseSessionProxy(ctx, session)
		return err
	}
	worker, err := r.startWorker(ctx, endpoint, session, proxyURL)
	if err != nil {
		_ = server.stop(r.cfg.ShutdownTimeout)
		_ = r.releaseSessionProxy(ctx, session)
		return err
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	if existing := r.sessions[session.GetSessionId()]; existing != nil {
		_ = worker.stop(r.cfg.ShutdownTimeout)
		_ = server.stop(r.cfg.ShutdownTimeout)
		_ = r.releaseSessionProxy(ctx, session)
		return nil
	}
	if len(r.sessions) >= r.cfg.MaxSessions {
		_ = worker.stop(r.cfg.ShutdownTimeout)
		_ = server.stop(r.cfg.ShutdownTimeout)
		_ = r.releaseSessionProxy(ctx, session)
		return core.NewError(core.CodeCapacityUnavailable, "browser session capacity is exhausted", true)
	}
	r.sessions[session.GetSessionId()] = &sessionRuntime{
		sessionID: session.GetSessionId(),
		endpoint:  endpoint,
		server:    server,
		worker:    worker,
	}
	return nil
}

func (r *Runtime) StopSession(ctx context.Context, session *core.Session, _ string) error {
	if session == nil {
		return nil
	}
	r.mu.Lock()
	runtime := r.sessions[session.GetSessionId()]
	delete(r.sessions, session.GetSessionId())
	r.mu.Unlock()
	if runtime == nil {
		return r.releaseSessionProxy(ctx, session)
	}
	stopErr := runtime.stop(r.cfg.ShutdownTimeout)
	releaseErr := r.releaseSessionProxy(ctx, session)
	if stopErr != nil {
		return stopErr
	}
	return releaseErr
}

func (r *Runtime) Shutdown(ctx context.Context) error {
	r.mu.Lock()
	sessions := make([]*sessionRuntime, 0, len(r.sessions))
	for _, runtime := range r.sessions {
		sessions = append(sessions, runtime)
	}
	r.sessions = make(map[string]*sessionRuntime)
	r.mu.Unlock()
	var result error
	for _, runtime := range sessions {
		result = errors.Join(result, runtime.stop(r.cfg.ShutdownTimeout))
		result = errors.Join(result, r.releaseSessionProxy(ctx, &browserautomationv1.BrowserSession{SessionId: runtime.sessionID}))
	}
	return result
}

func (r *Runtime) resolveSessionProxy(ctx context.Context, session *core.Session) (string, error) {
	if r.cfg.Proxy == nil {
		return "", nil
	}
	return r.cfg.Proxy.ResolveSessionProxy(ctx, session)
}

func (r *Runtime) releaseSessionProxy(ctx context.Context, session *core.Session) error {
	if r.cfg.Proxy == nil {
		return nil
	}
	return r.cfg.Proxy.ReleaseSessionProxy(ctx, session)
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
