package handler

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"meubolso-api/internal/config"
	"meubolso-api/internal/store"
)

type Handlers struct {
	cfg  *config.Config
	store *store.Store
}

func New(cfg *config.Config, st *store.Store) *Handlers {
	return &Handlers{cfg: cfg, store: st}
}

func (h *Handlers) createToken(ctx context.Context, userID string) (string, error) {
	claims := jwt.MapClaims{
		"sub": userID,
		"exp": time.Now().Add(h.cfg.JWTTTL).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(h.cfg.JWTSecret))
}

func hashPassword(pw string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(pw), bcrypt.DefaultCost)
	return string(b), err
}

func verifyPassword(hash, pw string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(pw)) == nil
}

type authPayload struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginPayload struct {
	Identifier string `json:"identifier"`
	Password   string `json:"password"`
}

type tokenResponse struct {
	AccessToken string      `json:"access_token"`
	TokenType   string      `json:"token_type"`
	User        store.User  `json:"user"`
}

func (h *Handlers) Register(w http.ResponseWriter, r *http.Request) {
	var p authPayload
	if err := decodeBody(w, r, &p); err != nil {
		writeError(w, http.StatusBadRequest, "Requisição inválida.")
		return
	}
	p.Username = strings.TrimSpace(p.Username)
	p.Email = strings.ToLower(strings.TrimSpace(p.Email))

	if len(p.Username) < 3 || len(p.Username) > 50 {
		writeError(w, http.StatusBadRequest, "Nome de usuário deve ter entre 3 e 50 caracteres.")
		return
	}
	if !validEmail(p.Email) {
		writeError(w, http.StatusBadRequest, "E-mail inválido.")
		return
	}
	if len(p.Password) < 6 || len(p.Password) > 128 {
		writeError(w, http.StatusBadRequest, "Senha deve ter entre 6 e 128 caracteres.")
		return
	}

	u, err := h.store.GetUserByEmail(r.Context(), p.Email)
	if err == nil {
		_ = u
		writeError(w, http.StatusConflict, "E-mail já cadastrado.")
		return
	} else if err != store.ErrNotFound {
		fail(w, err)
		return
	}
	if _, err := h.store.GetUserByUsername(r.Context(), p.Username); err == nil {
		writeError(w, http.StatusConflict, "Nome de usuário já em uso.")
		return
	} else if err != store.ErrNotFound {
		fail(w, err)
		return
	}

	hashed, err := hashPassword(p.Password)
	if err != nil {
		fail(w, err)
		return
	}

	user, err := h.store.CreateUser(r.Context(), store.User{
		ID:       newID(),
		Username: p.Username,
		Email:    p.Email,
		PasswordHash: hashed,
	})
	if err != nil {
		if err == store.ErrConflict {
			writeError(w, http.StatusConflict, "E-mail ou nome de usuário já cadastrado.")
			return
		}
		fail(w, err)
		return
	}

	if err := h.store.SeedDefaultCategories(r.Context(), user.ID); err != nil {
		fail(w, err)
		return
	}

	token, err := h.createToken(r.Context(), user.ID)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, tokenResponse{AccessToken: token, TokenType: "bearer", User: user})
}

func (h *Handlers) Login(w http.ResponseWriter, r *http.Request) {
	var p loginPayload
	if err := decodeBody(w, r, &p); err != nil {
		writeError(w, http.StatusBadRequest, "Requisição inválida.")
		return
	}
	p.Identifier = strings.TrimSpace(p.Identifier)

	var user store.User
	var err error

	lookup := strings.ToLower(p.Identifier)
	if strings.Contains(lookup, "@") {
		user, err = h.store.GetUserByEmail(r.Context(), lookup)
	} else {
		user, err = h.store.GetUserByUsername(r.Context(), p.Identifier)
	}
	if err != nil {
		if err == store.ErrNotFound {
			writeError(w, http.StatusUnauthorized, "E-mail/usuário ou senha incorretos.")
			return
		}
		fail(w, err)
		return
	}

	if !verifyPassword(user.PasswordHash, p.Password) {
		writeError(w, http.StatusUnauthorized, "E-mail/usuário ou senha incorretos.")
		return
	}

	token, err := h.createToken(r.Context(), user.ID)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, tokenResponse{AccessToken: token, TokenType: "bearer", User: user})
}

func (h *Handlers) Health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func newID() string {
	return store.NewID()
}