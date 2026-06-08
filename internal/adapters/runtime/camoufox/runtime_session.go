package camoufox

import (
	"context"
	"errors"
	"time"

	"github.com/byte-v-forge/browser-automation/internal/core"
	"github.com/byte-v-forge/browser-automation/internal/platform/protojsonx"
	"google.golang.org/protobuf/types/known/durationpb"
)

type sessionRuntime struct {
	sessionID string
	endpoint  string
	server    *serverProcess
	worker    *workerProcess
}

func (s *sessionRuntime) executeTask(ctx context.Context, task *core.Task, defaultTimeout time.Duration) (core.TaskExecutionResult, error) {
	timeout := taskTimeout(task, defaultTimeout)
	taskJSON, err := protojsonx.Marshal(task)
	if err != nil {
		return core.TaskExecutionResult{}, core.NewError(core.CodeInternal, err.Error(), false)
	}
	request := []byte(`{"type":"execute_task","task":` + string(taskJSON) + "}\n")
	s.worker.mu.Lock()
	defer s.worker.mu.Unlock()
	if _, err := s.worker.stdin.Write(request); err != nil {
		return core.TaskExecutionResult{}, core.NewError(core.CodeBrowserUnavailable, s.worker.failureMessage("camoufox worker write failed", err), true)
	}
	line, err := s.worker.readLine(ctx, timeout)
	if err != nil {
		return core.TaskExecutionResult{}, err
	}
	response, err := decodeWorkerResponse(line)
	if err != nil {
		return core.TaskExecutionResult{}, err
	}
	result := core.TaskExecutionResult{Results: response.Results, Artifacts: response.Artifacts}
	if response.Error != nil {
		return result, response.Error
	}
	return result, nil
}

func (s *sessionRuntime) stop(timeout time.Duration) error {
	var err error
	if s.worker != nil {
		err = errors.Join(err, s.worker.stop(timeout))
	}
	if s.server != nil {
		err = errors.Join(err, s.server.stop(timeout))
	}
	return err
}
func taskTimeout(task *core.Task, fallback time.Duration) time.Duration {
	if task == nil || task.GetInput() == nil {
		return fallback
	}
	timeout := duration(task.GetInput().GetTimeout())
	if timeout <= 0 {
		return fallback
	}
	return timeout
}

func duration(value *durationpb.Duration) time.Duration {
	if value == nil {
		return 0
	}
	return value.AsDuration()
}
