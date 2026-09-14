package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"meubolso-api/internal/middleware"
	"meubolso-api/internal/store"
)

func (h *Handlers) GetMe(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUser(r.Context())
	writeJSON(w, http.StatusOK, user)
}

func (h *Handlers) UpdateMe(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUser(r.Context())

	var raw map[string]json.RawMessage
	if err := json.NewDecoder(r.Body).Decode(&raw); err != nil {
		writeError(w, http.StatusBadRequest, "Requisição inválida.")
		return
	}

	var up store.UserUpdates
	currentPassword := ""
	newPassword := ""

	if v, ok := raw["username"]; ok {
		var username string
		if err := json.Unmarshal(v, &username); err != nil {
			writeError(w, http.StatusBadRequest, "Campo username inválido.")
			return
		}
		username = strings.TrimSpace(username)
		if len(username) < 3 || len(username) > 50 {
			writeError(w, http.StatusBadRequest, "Nome de usuário deve ter entre 3 e 50 caracteres.")
			return
		}
		up.Username = &username
	}

	if v, ok := raw["email"]; ok {
		var email string
		if err := json.Unmarshal(v, &email); err != nil {
			writeError(w, http.StatusBadRequest, "Campo email inválido.")
			return
		}
		email = strings.ToLower(strings.TrimSpace(email))
		if !validEmail(email) {
			writeError(w, http.StatusBadRequest, "E-mail inválido.")
			return
		}
		up.Email = &email
	}

	if v, ok := raw["monthly_budget"]; ok {
		if string(v) == "null" {
			up.ClearBudget = true
		} else {
			var budget float64
			if err := json.Unmarshal(v, &budget); err != nil || budget <= 0 {
				writeError(w, http.StatusBadRequest, "Orçamento mensal inválido.")
				return
			}
			up.MonthlyBudget = &budget
		}
	}

	if v, ok := raw["new_password"]; ok {
		var np string
		if err := json.Unmarshal(v, &np); err != nil {
			writeError(w, http.StatusBadRequest, "Campo new_password inválido.")
			return
		}
		if len(np) < 6 || len(np) > 128 {
			writeError(w, http.StatusBadRequest, "Senha deve ter entre 6 e 128 caracteres.")
			return
		}
		newPassword = np
		if cp, ok := raw["current_password"]; ok {
			var c string
			if err := json.Unmarshal(cp, &c); err == nil {
				currentPassword = c
			}
		}
	}
	if newPassword != "" {
		if !verifyPassword(user.PasswordHash, currentPassword) {
			writeError(w, http.StatusBadRequest, "Senha atual incorreta.")
			return
		}
		hashed, err := hashPassword(newPassword)
		if err != nil {
			fail(w, err)
			return
		}
		up.PasswordHash = &hashed
	}

	updated, err := h.store.UpdateUser(r.Context(), user.ID, up)
	if err != nil {
		if err == store.ErrConflict {
			writeError(w, http.StatusConflict, "E-mail ou nome de usuário já em uso.")
			return
		}
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

func (h *Handlers) DeleteMe(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUser(r.Context())
	if err := h.store.DeleteUser(r.Context(), user.ID); err != nil {
		fail(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}