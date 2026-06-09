package camoufox

import (
	"context"
	"encoding/json"
	"io"
	"os"
	"os/exec"
	"sync"
	"syscall"
	"time"

	"github.com/byte-v-forge/browser-automation/internal/core"
)

func (r *Runtime) startWorker(ctx context.Context, endpoint string, session *core.Session, proxyURL string) (*workerProcess, error) {
	optionsMap, err := workerOptions(endpoint, r.cfg, session, proxyURL)
	if err != nil {
		return nil, core.NewError(core.CodeProxyFailed, err.Error(), false)
	}
	options, err := encodeOptions(optionsMap)
	if err != nil {
		return nil, core.NewError(core.CodeInternal, err.Error(), false)
	}
	cmd := exec.Command(r.cfg.PythonPath, "-u", "-c", r.scripts.worker)
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	cmd.Env = append(os.Environ(), r.cfg.ExtraEnv...)
	cmd.Env = append(cmd.Env, "CAMOUFOX_WORKER_OPTIONS_JSON="+options)
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, core.NewError(core.CodeInternal, err.Error(), true)
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, core.NewError(core.CodeInternal, err.Error(), true)
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return nil, core.NewError(core.CodeInternal, err.Error(), true)
	}
	if err := cmd.Start(); err != nil {
		return nil, core.NewError(core.CodeBrowserUnavailable, err.Error(), true)
	}
	worker := &workerProcess{
		cmd:    cmd,
		stdin:  stdin,
		lines:  make(chan string),
		done:   make(chan error, 1),
		stderr: newTailBuffer(16 * 1024),
	}
	go func() {
		worker.done <- cmd.Wait()
	}()
	go copyTail(worker.stderr, stderr)
	go scanWorkerLines(stdout, worker.lines)

	line, err := worker.readLine(ctx, r.cfg.StartupTimeout)
	if err != nil {
		_ = worker.stop(r.cfg.ShutdownTimeout)
		return nil, err
	}
	var ready workerReady
	if err := json.Unmarshal([]byte(line), &ready); err != nil || ready.Type != "ready" {
		_ = worker.stop(r.cfg.ShutdownTimeout)
		if err != nil {
			return nil, core.NewError(core.CodeBrowserUnavailable, "camoufox worker readiness response is invalid: "+err.Error(), true)
		}
		return nil, core.NewError(core.CodeBrowserUnavailable, "camoufox worker readiness response is invalid", true)
	}
	return worker, nil
}

type workerProcess struct {
	cmd    *exec.Cmd
	stdin  io.WriteCloser
	lines  chan string
	done   chan error
	stderr *tailBuffer
	mu     sync.Mutex
}

func (p *workerProcess) readLine(ctx context.Context, timeout time.Duration) (string, error) {
	timer := time.NewTimer(timeout)
	defer timer.Stop()
	select {
	case line, ok := <-p.lines:
		if !ok {
			return "", core.NewError(core.CodeBrowserUnavailable, p.failureMessage("camoufox worker stdout closed", nil), true)
		}
		return line, nil
	case err := <-p.done:
		return "", core.NewError(core.CodeBrowserUnavailable, p.failureMessage("camoufox worker exited", err), true)
	case <-timer.C:
		return "", core.NewError(core.CodeTimeout, p.failureMessage("camoufox worker timed out", nil), true)
	case <-ctx.Done():
		return "", core.NewError(core.CodeTimeout, ctx.Err().Error(), true)
	}
}

func (p *workerProcess) stop(timeout time.Duration) error {
	_, _ = io.WriteString(p.stdin, `{"type":"stop"}`+"\n")
	timer := time.NewTimer(timeout)
	defer timer.Stop()
	select {
	case err := <-p.done:
		return ignoreFinished(err)
	case <-timer.C:
	}
	return stopCommand(p.cmd, p.done, timeout)
}

func (p *workerProcess) failureMessage(prefix string, err error) string {
	return failureMessage(prefix, err, p.stderr.String(), "")
}

type workerReady struct {
	Type string `json:"type"`
}
