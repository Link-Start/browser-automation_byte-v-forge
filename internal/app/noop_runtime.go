package app

import (
	"context"
	"time"

	"github.com/byte-v-forge/browser-automation/internal/core"
	browserautomationv1 "github.com/byte-v-forge/common-lib/gen/go/byte/v/forge/contracts/browserautomation/v1"
)

type NoopRuntime struct{}

func (NoopRuntime) StartSession(context.Context, *core.Session) error {
	return nil
}

func (NoopRuntime) StopSession(context.Context, *core.Session, string) error {
	return nil
}

func (NoopRuntime) EnqueueTask(context.Context, *core.Task) error {
	return nil
}

func (NoopRuntime) ExecuteTask(_ context.Context, task *core.Task) (core.TaskExecutionResult, error) {
	now := timestamp(time.Now().UTC())
	commands := task.GetInput().GetCommands()
	results := make([]*browserautomationv1.BrowserCommandResult, 0, len(commands))
	for _, command := range commands {
		results = append(results, &browserautomationv1.BrowserCommandResult{
			CommandId:   command.GetCommandId(),
			CommandKey:  command.GetCommandKey(),
			Status:      browserautomationv1.BrowserCommandStatus_BROWSER_COMMAND_STATUS_SUCCEEDED,
			CompletedAt: now,
		})
	}
	return core.TaskExecutionResult{Results: results}, nil
}
