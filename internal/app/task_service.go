package app

import (
	"context"

	"github.com/byte-v-forge/browser-automation/internal/core"
	browserautomationv1 "github.com/byte-v-forge/common-lib/gen/go/byte/v/forge/contracts/browserautomation/v1"
)

func (s *AutomationService) StartBrowserTask(ctx context.Context, requestID string, input *core.TaskInput) (*core.Task, error) {
	input = cloneTaskInput(input)
	if requestID != "" {
		existing, err := s.store.GetTaskByRequestID(ctx, requestID)
		if err == nil {
			return existing, nil
		}
		if !isTaskNotFound(err) {
			return nil, err
		}
	}
	if err := validateTaskInput(input); err != nil {
		return nil, err
	}
	session, err := s.GetBrowserSession(ctx, input.GetSessionId())
	if err != nil {
		return nil, err
	}
	if session.GetStatus() != browserautomationv1.BrowserSessionStatus_BROWSER_SESSION_STATUS_RUNNING {
		return nil, core.NewError(core.CodeSessionFinalized, "browser session is not running", false)
	}
	now := s.clock.Now()
	if requestID == "" {
		requestID = s.ids.NewID("req_")
	}
	task := &browserautomationv1.BrowserTask{
		TaskId:    s.ids.NewID("brtask_"),
		RequestId: requestID,
		Status:    browserautomationv1.BrowserTaskStatus_BROWSER_TASK_STATUS_QUEUED,
		Input:     input,
		Labels:    cloneMap(input.GetLabels()),
		CreatedAt: timestamp(now),
		UpdatedAt: timestamp(now),
	}
	if err := s.store.CreateTask(ctx, task); err != nil {
		return nil, err
	}
	if err := s.runtime.EnqueueTask(ctx, task); err != nil {
		task.Status = browserautomationv1.BrowserTaskStatus_BROWSER_TASK_STATUS_FAILED
		task.LastError = core.AutomationError(asCoreError(err, core.CodeBrowserUnavailable))
		task.UpdatedAt = timestamp(s.clock.Now())
		task.CompletedAt = task.UpdatedAt
		_ = s.store.UpdateTask(ctx, task)
		return task, err
	}
	return task, nil
}

func (s *AutomationService) ExecuteBrowserCommands(ctx context.Context, requestID string, input *core.TaskInput) (*core.Task, error) {
	input = cloneTaskInput(input)
	if requestID != "" {
		existing, err := s.store.GetTaskByRequestID(ctx, requestID)
		if err == nil {
			return existing, nil
		}
		if !isTaskNotFound(err) {
			return nil, err
		}
	}
	if input != nil && input.TaskKey == "" {
		input.TaskKey = "browser.commands"
	}
	if err := validateTaskInput(input); err != nil {
		return nil, err
	}
	if len(input.GetCommands()) == 0 {
		return nil, core.NewError(core.CodeValidationFailed, "commands are required", false)
	}
	if err := validateCommands(input.GetCommands()); err != nil {
		return nil, err
	}
	session, err := s.GetBrowserSession(ctx, input.GetSessionId())
	if err != nil {
		return nil, err
	}
	if session.GetStatus() != browserautomationv1.BrowserSessionStatus_BROWSER_SESSION_STATUS_RUNNING {
		return nil, core.NewError(core.CodeSessionFinalized, "browser session is not running", false)
	}

	now := s.clock.Now()
	if requestID == "" {
		requestID = s.ids.NewID("req_")
	}
	task := &browserautomationv1.BrowserTask{
		TaskId:    s.ids.NewID("brtask_"),
		RequestId: requestID,
		Status:    browserautomationv1.BrowserTaskStatus_BROWSER_TASK_STATUS_RUNNING,
		Input:     input,
		Labels:    cloneMap(input.GetLabels()),
		CreatedAt: timestamp(now),
		StartedAt: timestamp(now),
		UpdatedAt: timestamp(now),
	}
	if err := s.store.CreateTask(ctx, task); err != nil {
		return nil, err
	}
	result, err := s.runtime.ExecuteTask(ctx, task)
	completedAt := timestamp(s.clock.Now())
	task.Results = result.Results
	task.Artifacts = result.Artifacts
	task.UpdatedAt = completedAt
	task.CompletedAt = completedAt
	if err != nil {
		task.Status = browserautomationv1.BrowserTaskStatus_BROWSER_TASK_STATUS_FAILED
		task.LastError = core.AutomationError(asCoreError(err, core.CodeBrowserUnavailable))
		_ = s.store.UpdateTask(ctx, task)
		return task, err
	}
	task.Status = browserautomationv1.BrowserTaskStatus_BROWSER_TASK_STATUS_SUCCEEDED
	if err := s.store.UpdateTask(ctx, task); err != nil {
		return nil, err
	}
	return task, nil
}

func (s *AutomationService) GetBrowserTask(ctx context.Context, taskID string) (*core.Task, error) {
	return s.store.GetTask(ctx, taskID)
}

func (s *AutomationService) ListBrowserTasks(ctx context.Context, filter *core.TaskFilter, pageSize int, pageToken string) (core.TaskListResult, error) {
	return s.store.ListTasks(ctx, filter, pageSize, pageToken)
}
