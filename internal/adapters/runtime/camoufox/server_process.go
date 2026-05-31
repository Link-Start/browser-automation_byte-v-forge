package camoufox

import (
	"os/exec"
	"time"
)

type serverProcess struct {
	cmd    *exec.Cmd
	done   chan error
	stdout *tailBuffer
	stderr *tailBuffer
}

func (p *serverProcess) stop(timeout time.Duration) error {
	return stopCommand(p.cmd, p.done, timeout)
}

func (p *serverProcess) failureMessage(prefix string, err error) string {
	return failureMessage(prefix, err, p.stderr.String(), p.stdout.String())
}
