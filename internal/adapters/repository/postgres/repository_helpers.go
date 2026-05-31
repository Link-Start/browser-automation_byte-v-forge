package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/byte-v-forge/browser-automation/internal/core"
	"github.com/jackc/pgx/v5/pgconn"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func (r *Repository) context(ctx context.Context) (context.Context, context.CancelFunc) {
	if r.statementTimeout <= 0 {
		return context.WithCancel(ctx)
	}
	return context.WithTimeout(ctx, r.statementTimeout)
}

func timestampTime(timestamp *timestamppb.Timestamp) time.Time {
	if timestamp == nil {
		return time.Time{}
	}
	return timestamp.AsTime()
}

func nullableTimestampTime(timestamp *timestamppb.Timestamp) any {
	if timestamp == nil {
		return nil
	}
	return timestamp.AsTime()
}

func nullableString(value string) any {
	if value == "" {
		return nil
	}
	return value
}

func jsonMap(values map[string]string) ([]byte, error) {
	if len(values) == 0 {
		return []byte(`{}`), nil
	}
	return json.Marshal(values)
}

func mapUniqueViolation(err error, message string) error {
	if err == nil {
		return nil
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return core.NewError(core.CodeValidationFailed, message, false)
	}
	return err
}
