package postgres

import (
	"context"
	"errors"

	"github.com/byte-v-forge/browser-automation/internal/core"
	"github.com/jackc/pgx/v5"
)

func (r *Repository) GetTask(ctx context.Context, taskID string) (*core.Task, error) {
	return r.getTask(ctx, "task_id = $1", taskID)
}

func (r *Repository) GetTaskByRequestID(ctx context.Context, requestID string) (*core.Task, error) {
	return r.getTask(ctx, "request_id = $1", requestID)
}
func (r *Repository) getTask(ctx context.Context, where string, value string) (*core.Task, error) {
	if value == "" {
		return nil, core.NewError(core.CodeValidationFailed, "task lookup value is required", false)
	}
	ctx, cancel := r.context(ctx)
	defer cancel()
	var data []byte
	err := r.pool.QueryRow(ctx, "select data from browser_automation_tasks where "+where, value).Scan(&data)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, core.NewError(core.CodeTaskNotFound, "browser task not found", false)
	}
	if err != nil {
		return nil, err
	}
	return r.decodeTask(data)
}
