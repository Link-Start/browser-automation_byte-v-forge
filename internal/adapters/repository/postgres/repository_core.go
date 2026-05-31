package postgres

import (
	"time"

	"github.com/byte-v-forge/browser-automation/internal/core"
	"github.com/jackc/pgx/v5/pgxpool"
	"google.golang.org/protobuf/encoding/protojson"
)

type Repository struct {
	pool             *pgxpool.Pool
	statementTimeout time.Duration
	marshal          protojson.MarshalOptions
	unmarshal        protojson.UnmarshalOptions
}

var _ core.Store = (*Repository)(nil)

func NewRepository(pool *pgxpool.Pool, statementTimeout time.Duration) *Repository {
	return &Repository{
		pool:             pool,
		statementTimeout: statementTimeout,
		marshal: protojson.MarshalOptions{
			UseProtoNames:   false,
			EmitUnpopulated: false,
		},
		unmarshal: protojson.UnmarshalOptions{
			DiscardUnknown: true,
		},
	}
}
