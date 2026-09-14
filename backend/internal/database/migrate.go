package database

import (
	"context"
	_ "embed"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed schema.sql
var schemaSQL string

func Migrate(pool *pgxpool.Pool) error {
	if _, err := pool.Exec(context.Background(), schemaSQL); err != nil {
		return err
	}
	return nil
}