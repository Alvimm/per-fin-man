package handler

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"meubolso-api/internal/middleware"
	"meubolso-api/internal/store"
)

type categoryPayload struct {
	Name      string `json:"name"`
	Type      string `json:"type"`
	Color     string `json:"color"`
	Icon      string `json:"icon"`
	IsSavings bool   `json:"is_savings"`
}

func validateCategoryPayload(p categoryPayload) string {
	p.Name = strings.TrimSpace(p.Name)
	if len(p.Name) == 0 || len(p.Name) > 50 {
		return "Nome da categoria deve ter entre 1 e 50 caracteres."
	}
	if !validType(p.Type) {
		return "Tipo deve ser 'income' ou 'expense'."
	}
	if !validHexColor(p.Color) {
		return "Cor inválida."
	}
	if len(p.Icon) == 0 || len(p.Icon) > 40 {
		return "Ícone inválido."
	}
	return ""
}

func (h *Handlers) ListCategories(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUser(r.Context())

	if err := h.store.SeedDefaultCategories(r.Context(), user.ID); err != nil {
		fail(w, err)
		return
	}
	cats, err := h.store.ListCategories(r.Context(), user.ID)
	if err != nil {
		fail(w, err)
		return
	}
	if cats == nil {
		cats = []store.Category{}
	}
	writeJSON(w, http.StatusOK, cats)
}

func (h *Handlers) CreateCategory(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUser(r.Context())

	var p categoryPayload
	if err := decodeBody(w, r, &p); err != nil {
		writeError(w, http.StatusBadRequest, "Requisição inválida.")
		return
	}
	if msg := validateCategoryPayload(p); msg != "" {
		writeError(w, http.StatusBadRequest, msg)
		return
	}

	cat, err := h.store.CreateCategory(r.Context(), store.Category{
		ID:        newID(),
		UserID:    user.ID,
		Name:      strings.TrimSpace(p.Name),
		Type:      p.Type,
		Color:     p.Color,
		Icon:      p.Icon,
		IsSavings: p.IsSavings,
	})
	if err != nil {
		if err == store.ErrConflict {
			writeError(w, http.StatusConflict, "Já existe uma categoria com esse nome.")
			return
		}
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, cat)
}

func (h *Handlers) UpdateCategory(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUser(r.Context())
	id := chi.URLParam(r, "id")

	var p categoryPayload
	if err := decodeBody(w, r, &p); err != nil {
		writeError(w, http.StatusBadRequest, "Requisição inválida.")
		return
	}
	if msg := validateCategoryPayload(p); msg != "" {
		writeError(w, http.StatusBadRequest, msg)
		return
	}

	cat, err := h.store.UpdateCategory(r.Context(), user.ID, id, store.Category{
		Name:      strings.TrimSpace(p.Name),
		Color:     p.Color,
		Icon:      p.Icon,
		IsSavings: p.IsSavings,
	})
	if err != nil {
		if err == store.ErrNotFound {
			writeError(w, http.StatusNotFound, "Categoria não encontrada.")
			return
		}
		if err == store.ErrConflict {
			writeError(w, http.StatusConflict, "Já existe uma categoria com esse nome.")
			return
		}
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, cat)
}

func (h *Handlers) DeleteCategory(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUser(r.Context())
	id := chi.URLParam(r, "id")

	err := h.store.DeleteCategory(r.Context(), user.ID, id)
	if err != nil {
		if err == store.ErrNotFound {
			writeError(w, http.StatusNotFound, "Categoria não encontrada.")
			return
		}
		fail(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}