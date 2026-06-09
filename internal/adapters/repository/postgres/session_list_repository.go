package postgres

import (
	"context"

	"github.com/byte-v-forge/browser-automation/internal/core"
)

func (r *Repository) ListSessions(ctx context.Context, pageSize int, pageToken string) (core.SessionListResult, error) {
	offset, err := core.ParsePageToken(pageToken)
	if err != nil {
		return core.SessionListResult{}, err
	}
	pageSize = core.NormalizePageSize(pageSize)
	ctx, cancel := r.context(ctx)
	defer cancel()

	rows, err := r.pool.Query(ctx, `
		select data
		from browser_automation_sessions
		order by updated_at desc, session_id asc
		limit $1 offset $2
	`, pageSize+1, offset)
	if err != nil {
		return core.SessionListResult{}, err
	}
	defer rows.Close()

	sessions := make([]*core.Session, 0, pageSize)
	hasMore := false
	for rows.Next() {
		var data []byte
		if err := rows.Scan(&data); err != nil {
			return core.SessionListResult{}, err
		}
		if len(sessions) == pageSize {
			hasMore = true
			continue
		}
		session, err := r.decodeSession(data)
		if err != nil {
			return core.SessionListResult{}, err
		}
		sessions = append(sessions, session)
	}
	if err := rows.Err(); err != nil {
		return core.SessionListResult{}, err
	}
	nextPageToken := ""
	if hasMore {
		nextPageToken = core.PageToken(offset + pageSize)
	}
	return core.SessionListResult{Sessions: sessions, NextPageToken: nextPageToken}, nil
}
