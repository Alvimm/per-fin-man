package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"

	"meubolso-api/internal/config"
	"meubolso-api/internal/store"
)

type ctxKey string

const userCtxKey ctxKey = "user"

func GetUser(ctx context.Context) *store.User {
	if u, ok := ctx.Value(userCtxKey).(*store.User); ok {
		return u
	}
	return nil
}

func Auth(cfg *config.Config, st *store.Store) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if !strings.HasPrefix(header, "Bearer ") {
				http.Error(w, `{"detail":"Não autenticado"}`, http.StatusUnauthorized)
				return
			}
			tokenStr := strings.TrimPrefix(header, "Bearer ")

			token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, jwt.ErrSignatureInvalid
				}
				return []byte(cfg.JWTSecret), nil
			}, jwt.WithValidMethods([]string{"HS256"}))
			if err != nil || !token.Valid {
				http.Error(w, `{"detail":"Sessão inválida ou expirada"}`, http.StatusUnauthorized)
				return
			}
			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				http.Error(w, `{"detail":"Token inválido"}`, http.StatusUnauthorized)
				return
			}
			sub, _ := claims["sub"].(string)
			if sub == "" {
				http.Error(w, `{"detail":"Token inválido"}`, http.StatusUnauthorized)
				return
			}

			user, err := st.GetUserByID(r.Context(), sub)
			if err != nil {
				http.Error(w, `{"detail":"Usuário não encontrado"}`, http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), userCtxKey, &user)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}