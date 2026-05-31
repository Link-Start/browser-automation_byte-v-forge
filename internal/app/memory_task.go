package app

import (
	"context"
	"sort"

	"github.com/byte-v-forge/browser-automation/internal/core"
)

func (s *MemoryStore) CreateTask(_ context.Context, task *core.Task) error {
	if task == nil || task.GetTaskId() == "" {
		return core.NewError(core.CodeValidationFailed, "task_id is required", false)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.tasks[task.GetTaskId()]; ok {
		return core.NewError(core.CodeValidationFailed, "task already exists", false)
	}
	if task.GetRequestId() != "" {
		if _, ok := s.taskRequestID[task.GetRequestId()]; ok {
			return core.NewError(core.CodeValidationFailed, "request_id already exists", false)
		}
		s.taskRequestID[task.GetRequestId()] = task.GetTaskId()
	}
	s.tasks[task.GetTaskId()] = cloneTask(task)
	return nil
}

func (s *MemoryStore) GetTask(_ context.Context, taskID string) (*core.Task, error) {
	if taskID == "" {
		return nil, core.NewError(core.CodeValidationFailed, "task_id is required", false)
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	task, ok := s.tasks[taskID]
	if !ok {
		return nil, core.NewError(core.CodeTaskNotFound, "browser task not found", false)
	}
	return cloneTask(task), nil
}

func (s *MemoryStore) GetTaskByRequestID(_ context.Context, requestID string) (*core.Task, error) {
	if requestID == "" {
		return nil, core.NewError(core.CodeValidationFailed, "request_id is required", false)
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	taskID, ok := s.taskRequestID[requestID]
	if !ok {
		return nil, core.NewError(core.CodeTaskNotFound, "browser task not found", false)
	}
	return cloneTask(s.tasks[taskID]), nil
}

func (s *MemoryStore) ListTasks(_ context.Context, filter *core.TaskFilter, pageSize int, pageToken string) (core.TaskListResult, error) {
	offset, err := core.ParsePageToken(pageToken)
	if err != nil {
		return core.TaskListResult{}, err
	}
	pageSize = core.NormalizePageSize(pageSize)
	s.mu.RLock()
	defer s.mu.RUnlock()
	matched := make([]*core.Task, 0, len(s.tasks))
	for _, task := range s.tasks {
		if taskMatches(filter, task) {
			matched = append(matched, cloneTask(task))
		}
	}
	sort.Slice(matched, func(i, j int) bool {
		left := protoTime(matched[i].GetCreatedAt())
		right := protoTime(matched[j].GetCreatedAt())
		if !left.Equal(right) {
			return left.After(right)
		}
		return matched[i].GetTaskId() < matched[j].GetTaskId()
	})
	if offset >= len(matched) {
		return core.TaskListResult{}, nil
	}
	end := offset + pageSize
	if end > len(matched) {
		end = len(matched)
	}
	nextPageToken := ""
	if end < len(matched) {
		nextPageToken = core.PageToken(end)
	}
	return core.TaskListResult{Tasks: matched[offset:end], NextPageToken: nextPageToken}, nil
}

func (s *MemoryStore) UpdateTask(_ context.Context, task *core.Task) error {
	if task == nil || task.GetTaskId() == "" {
		return core.NewError(core.CodeValidationFailed, "task_id is required", false)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.tasks[task.GetTaskId()]; !ok {
		return core.NewError(core.CodeTaskNotFound, "browser task not found", false)
	}
	s.tasks[task.GetTaskId()] = cloneTask(task)
	if task.GetRequestId() != "" {
		s.taskRequestID[task.GetRequestId()] = task.GetTaskId()
	}
	return nil
}

func taskMatches(filter *core.TaskFilter, task *core.Task) bool {
	if filter == nil {
		return true
	}
	input := task.GetInput()
	if filter.GetSessionId() != "" && input.GetSessionId() != filter.GetSessionId() {
		return false
	}
	if filter.GetStatus() != 0 && task.GetStatus() != filter.GetStatus() {
		return false
	}
	if filter.GetTaskKey() != "" && input.GetTaskKey() != filter.GetTaskKey() {
		return false
	}
	if filter.GetScenarioKey() != "" && input.GetScenarioKey() != filter.GetScenarioKey() {
		return false
	}
	if filter.GetLabelKey() != "" {
		value, ok := task.GetLabels()[filter.GetLabelKey()]
		if !ok || (filter.GetLabelValue() != "" && value != filter.GetLabelValue()) {
			return false
		}
	}
	if filter.GetCreatedAfter() != nil && protoTime(task.GetCreatedAt()).Before(protoTime(filter.GetCreatedAfter())) {
		return false
	}
	if filter.GetCreatedBefore() != nil && protoTime(task.GetCreatedAt()).After(protoTime(filter.GetCreatedBefore())) {
		return false
	}
	return true
}
