package postgres

import (
	"context"

	"github.com/byte-v-forge/browser-automation/internal/core"
)

func (r *Repository) CreateTask(ctx context.Context, task *core.Task) error {
	if task == nil || task.GetTaskId() == "" {
		return core.NewError(core.CodeValidationFailed, "task_id is required", false)
	}
	data, err := r.encode(task)
	if err != nil {
		return err
	}
	labels, err := jsonMap(task.GetLabels())
	if err != nil {
		return err
	}
	ctx, cancel := r.context(ctx)
	defer cancel()
	_, err = r.pool.Exec(ctx, `
		insert into browser_automation_tasks (
			task_id, request_id, session_id, status, task_key, scenario_key, labels,
			data, created_at, updated_at, completed_at
		)
		values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`,
		task.GetTaskId(),
		nullableString(task.GetRequestId()),
		task.GetInput().GetSessionId(),
		int32(task.GetStatus()),
		task.GetInput().GetTaskKey(),
		task.GetInput().GetScenarioKey(),
		labels,
		data,
		timestampTime(task.GetCreatedAt()),
		timestampTime(task.GetUpdatedAt()),
		nullableTimestampTime(task.GetCompletedAt()),
	)
	return mapUniqueViolation(err, "task already exists")
}

func (r *Repository) UpdateTask(ctx context.Context, task *core.Task) error {
	if task == nil || task.GetTaskId() == "" {
		return core.NewError(core.CodeValidationFailed, "task_id is required", false)
	}
	data, err := r.encode(task)
	if err != nil {
		return err
	}
	labels, err := jsonMap(task.GetLabels())
	if err != nil {
		return err
	}
	ctx, cancel := r.context(ctx)
	defer cancel()
	tag, err := r.pool.Exec(ctx, `
		update browser_automation_tasks
		set request_id = $2,
		    session_id = $3,
		    status = $4,
		    task_key = $5,
		    scenario_key = $6,
		    labels = $7,
		    data = $8,
		    updated_at = $9,
		    completed_at = $10
		where task_id = $1
	`,
		task.GetTaskId(),
		nullableString(task.GetRequestId()),
		task.GetInput().GetSessionId(),
		int32(task.GetStatus()),
		task.GetInput().GetTaskKey(),
		task.GetInput().GetScenarioKey(),
		labels,
		data,
		timestampTime(task.GetUpdatedAt()),
		nullableTimestampTime(task.GetCompletedAt()),
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return core.NewError(core.CodeTaskNotFound, "browser task not found", false)
	}
	return nil
}
