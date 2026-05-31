package camoufox

import (
	"context"
	"os"
	"os/exec"
	"regexp"
	"syscall"
	"time"

	"github.com/byte-v-forge/browser-automation/internal/core"
)

var endpointPattern = regexp.MustCompile(`ws://[^\s]+`)

func (r *Runtime) startServer(ctx context.Context, session *core.Session) (string, *serverProcess, error) {
	optionsMap, err := serverOptions(r.cfg, session)
	if err != nil {
		return "", nil, core.NewError(core.CodeProxyFailed, err.Error(), false)
	}
	options, err := encodeOptions(optionsMap)
	if err != nil {
		return "", nil, core.NewError(core.CodeInternal, err.Error(), false)
	}
	cmd := exec.Command(r.cfg.PythonPath, "-u", "-c", r.scripts.server)
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	cmd.Env = append(os.Environ(), r.cfg.ExtraEnv...)
	cmd.Env = append(cmd.Env, "CAMOUFOX_SERVER_OPTIONS_JSON="+options)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return "", nil, core.NewError(core.CodeInternal, err.Error(), true)
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return "", nil, core.NewError(core.CodeInternal, err.Error(), true)
	}
	if err := cmd.Start(); err != nil {
		return "", nil, core.NewError(core.CodeBrowserUnavailable, err.Error(), true)
	}
	process := &serverProcess{
		cmd:    cmd,
		done:   make(chan error, 1),
		stdout: newTailBuffer(16 * 1024),
		stderr: newTailBuffer(16 * 1024),
	}
	go func() {
		process.done <- cmd.Wait()
	}()
	go copyTail(process.stderr, stderr)

	endpointCh := make(chan string, 1)
	go scanEndpoint(process.stdout, stdout, endpointCh)

	timeout := time.NewTimer(r.cfg.StartupTimeout)
	defer timeout.Stop()
	select {
	case endpoint := <-endpointCh:
		return endpoint, process, nil
	case err := <-process.done:
		return "", nil, core.NewError(core.CodeBrowserUnavailable, process.failureMessage("camoufox server exited before endpoint", err), true)
	case <-timeout.C:
		_ = process.stop(r.cfg.ShutdownTimeout)
		return "", nil, core.NewError(core.CodeTimeout, process.failureMessage("camoufox server startup timed out", nil), true)
	case <-ctx.Done():
		_ = process.stop(r.cfg.ShutdownTimeout)
		return "", nil, core.NewError(core.CodeTimeout, ctx.Err().Error(), true)
	}
}
