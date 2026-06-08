package cloakbrowser

import (
	"errors"
	"os"
	"os/exec"
	"strings"
	"syscall"
	"time"

	"github.com/byte-v-forge/browser-automation/internal/core"
)

func stopCommand(cmd *exec.Cmd, done <-chan error, timeout time.Duration) error {
	if cmd == nil || cmd.Process == nil {
		return nil
	}
	select {
	case err := <-done:
		return ignoreFinished(err)
	default:
	}
	signalProcessGroup(cmd, syscall.SIGINT)
	timer := time.NewTimer(timeout)
	defer timer.Stop()
	select {
	case err := <-done:
		return ignoreFinished(err)
	case <-timer.C:
		signalProcessGroup(cmd, syscall.SIGKILL)
		select {
		case err := <-done:
			return ignoreFinished(err)
		case <-time.After(time.Second):
			return core.NewError(core.CodeBrowserUnavailable, "process did not exit after kill", true)
		}
	}
}

func signalProcessGroup(cmd *exec.Cmd, signal syscall.Signal) {
	if cmd == nil || cmd.Process == nil {
		return
	}
	pid := cmd.Process.Pid
	if pid <= 0 {
		return
	}
	if err := syscall.Kill(-pid, signal); err == nil {
		return
	}
	if signal == syscall.SIGINT {
		_ = cmd.Process.Signal(os.Interrupt)
		return
	}
	_ = cmd.Process.Kill()
}

func ignoreFinished(err error) error {
	if err == nil {
		return nil
	}
	var exitErr *exec.ExitError
	if errors.As(err, &exitErr) {
		return nil
	}
	return err
}

func failureMessage(prefix string, err error, stderr string) string {
	parts := []string{prefix}
	if err != nil {
		parts = append(parts, err.Error())
	}
	if strings.TrimSpace(stderr) != "" {
		parts = append(parts, "stderr: "+strings.TrimSpace(stderr))
	}
	return strings.Join(parts, "; ")
}
