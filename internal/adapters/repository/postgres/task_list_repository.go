package postgres

import (
	"context"

	"github.com/byte-v-forge/browser-automation/internal/core"
	browserautomationv1 "github.com/byte-v-forge/common-lib/gen/go/byte/v/forge/contracts/browserautomation/v1"
)

func (r *Repository) ListTasks(ctx context.Context, filter *core.TaskFilter, pageSize int, pageToken string) (core.TaskListResult, error) {
	offset, err := core.ParsePageToken(pageToken)
	if err != nil {
		return core.TaskListResult{}, err
	}
	pageSize = core.NormalizePageSize(pageSize)
	if filter == nil {
		filter = &browserautomationv1.BrowserTaskFilter{}
	}
	ctx, cancel := r.context(ctx)
	defer cancel()
	rows, err := r.pool.Query(ctx, `
		select data
		from browser_automation_tasks
		where ($1 = '' or session_id = $1)
		  and ($2::int = 0 or status = $2)
		  and ($3 = '' or task_key = $3)
		  and ($4 = '' or scenario_key = $4)
		  and ($5 = '' or (labels ? $5 and ($6 = '' or labels ->> $5 = $6)))
		  and ($7::timestamptz is null or created_at >= $7)
		  and ($8::timestamptz is null or created_at <= $8)
		order by created_at desc, task_id asc
		limit $9 offset $10
	`,
		filter.GetSessionId(),
		int32(filter.GetStatus()),
		filter.GetTaskKey(),
		filter.GetScenarioKey(),
		filter.GetLabelKey(),
		filter.GetLabelValue(),
		nullableTimestampTime(filter.GetCreatedAfter()),
		nullableTimestampTime(filter.GetCreatedBefore()),
		pageSize+1,
		offset,
	)
	if err != nil {
		return core.TaskListResult{}, err
	}
	defer rows.Close()

	tasks := make([]*core.Task, 0, pageSize)
	hasMore := false
	for rows.Next() {
		var data []byte
		if err := rows.Scan(&data); err != nil {
			return core.TaskListResult{}, err
		}
		if len(tasks) == pageSize {
			hasMore = true
			continue
		}
		task, err := r.decodeTask(data)
		if err != nil {
			return core.TaskListResult{}, err
		}
		tasks = append(tasks, task)
	}
	if err := rows.Err(); err != nil {
		return core.TaskListResult{}, err
	}
	nextPageToken := ""
	if hasMore {
		nextPageToken = core.PageToken(offset + pageSize)
	}
	return core.TaskListResult{Tasks: tasks, NextPageToken: nextPageToken}, nil
}
