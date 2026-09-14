package database

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"meubolso-api/internal/config"
)

func Connect(cfg *config.Config) *pgxpool.Pool {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("falha ao criar pool do banco: %v", err)
	}
	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("falha ao conectar no PostgreSQL: %v", err)
	}
	log.Println("✅ conectado ao PostgreSQL")
	return pool
}