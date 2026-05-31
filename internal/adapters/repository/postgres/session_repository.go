package postgres

import (
	"context"
	"errors"

	"github.com/byte-v-forge/browser-automation/internal/core"
	"github.com/jackc/pgx/v5"
)

func (r *Repository) CreateSession(ctx context.Context, session *core.Session) error {
	if session == nil || session.GetSessionId() == "" {
		return core.NewError(core.CodeValidationFailed, "session_id is required", false)
	}
	data, err := r.encode(session)
	if err != nil {
		return err
	}
	labels, err := jsonMap(session.GetLabels())
	if err != nil {
		return err
	}
	ctx, cancel := r.context(ctx)
	defer cancel()
	_, err = r.pool.Exec(ctx, `
		insert into browser_automation_sessions (
			session_id, request_id, status, labels, data, created_at, updated_at, expires_at
		)
		values ($1, $2, $3, $4, $5, $6, $7, $8)
	`,
		session.GetSessionId(),
		nullableString(session.GetRequestId()),
		int32(session.GetStatus()),
		labels,
		data,
		timestampTime(session.GetCreatedAt()),
		timestampTime(session.GetUpdatedAt()),
		nullableTimestampTime(session.GetExpiresAt()),
	)
	return mapUniqueViolation(err, "session already exists")
}

func (r *Repository) GetSession(ctx context.Context, sessionID string) (*core.Session, error) {
	return r.getSession(ctx, "session_id = $1", sessionID)
}

func (r *Repository) GetSessionByRequestID(ctx context.Context, requestID string) (*core.Session, error) {
	return r.getSession(ctx, "request_id = $1", requestID)
}

func (r *Repository) UpdateSession(ctx context.Context, session *core.Session) error {
	if session == nil || session.GetSessionId() == "" {
		return core.NewError(core.CodeValidationFailed, "session_id is required", false)
	}
	data, err := r.encode(session)
	if err != nil {
		return err
	}
	labels, err := jsonMap(session.GetLabels())
	if err != nil {
		return err
	}
	ctx, cancel := r.context(ctx)
	defer cancel()
	tag, err := r.pool.Exec(ctx, `
		update browser_automation_sessions
		set request_id = $2,
		    status = $3,
		    labels = $4,
		    data = $5,
		    updated_at = $6,
		    expires_at = $7
		where session_id = $1
	`,
		session.GetSessionId(),
		nullableString(session.GetRequestId()),
		int32(session.GetStatus()),
		labels,
		data,
		timestampTime(session.GetUpdatedAt()),
		nullableTimestampTime(session.GetExpiresAt()),
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return core.NewError(core.CodeSessionNotFound, "browser session not found", false)
	}
	return nil
}
func (r *Repository) getSession(ctx context.Context, where string, value string) (*core.Session, error) {
	if value == "" {
		return nil, core.NewError(core.CodeValidationFailed, "session lookup value is required", false)
	}
	ctx, cancel := r.context(ctx)
	defer cancel()
	var data []byte
	err := r.pool.QueryRow(ctx, "select data from browser_automation_sessions where "+where, value).Scan(&data)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, core.NewError(core.CodeSessionNotFound, "browser session not found", false)
	}
	if err != nil {
		return nil, err
	}
	return r.decodeSession(data)
}
