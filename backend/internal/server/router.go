package server

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"meubolso-api/internal/config"
	"meubolso-api/internal/handler"
	appmw "meubolso-api/internal/middleware"
	"meubolso-api/internal/store"
)

func NewRouter(cfg *config.Config, st *store.Store) http.Handler {
	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	h := handler.New(cfg, st)
	auth := appmw.Auth(cfg, st)

	r.Get("/api/health", h.Health)

	r.Route("/api/auth", func(r chi.Router) {
		r.Post("/register", h.Register)
		r.Post("/login", h.Login)
		r.Group(func(r chi.Router) {
			r.Use(auth)
			r.Get("/me", h.GetMe)
		})
	})

	r.Group(func(r chi.Router) {
		r.Use(auth)

		r.Route("/api/users", func(r chi.Router) {
			r.Get("/me", h.GetMe)
			r.Put("/me", h.UpdateMe)
			r.Delete("/me", h.DeleteMe)
		})

		r.Route("/api/categories", func(r chi.Router) {
			r.Get("/", h.ListCategories)
			r.Post("/", h.CreateCategory)
			r.Put("/{id}", h.UpdateCategory)
			r.Delete("/{id}", h.DeleteCategory)
		})

		r.Route("/api/transactions", func(r chi.Router) {
			r.Get("/", h.ListTransactions)
			r.Post("/", h.CreateTransaction)
			r.Put("/{id}", h.UpdateTransaction)
			r.Delete("/{id}", h.DeleteTransaction)
		})

		r.Route("/api/dashboard", func(r chi.Router) {
			r.Get("/stats", h.DashboardStats)
			r.Get("/monthly-series", h.MonthlySeries)
		})
	})

	return r
}