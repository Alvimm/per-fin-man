package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"meubolso-api/internal/config"
	"meubolso-api/internal/database"
	"meubolso-api/internal/server"
	"meubolso-api/internal/store"
)

func main() {
	cfg := config.Load()

	if cfg.JWTSecret == "" {
		log.Fatal("JWT_SECRET não definido. Configure a variável de ambiente antes de iniciar a API.")
	}

	pool := database.Connect(cfg)
	defer pool.Close()

	if err := database.Migrate(pool); err != nil {
		log.Fatalf("erro ao aplicar migrações: %v", err)
	}

	st := store.New(pool)
	router := server.NewRouter(cfg, st)

	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: router,
	}

	go func() {
		log.Printf("🚀 API rodando em http://0.0.0.0:%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("erro ao iniciar servidor: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	log.Println("⏹ encerrando servidor...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("erro ao encerrar: %v", err)
	}
}