package handler

import (
	"encoding/json"
	"math"
	"net/http"
	"strings"

	"meubolso-api/internal/store"
)

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		http.Error(w, `{"detail":"erro ao serializar resposta"}`, http.StatusInternalServerError)
	}
}

func writeError(w http.ResponseWriter, status int, detail string) {
	writeJSON(w, status, map[string]string{"detail": detail})
}

func decodeBody(w http.ResponseWriter, r *http.Request, dst any) error {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	return dec.Decode(dst)
}

func fail(w http.ResponseWriter, err error) {
	switch err {
	case store.ErrNotFound:
		writeError(w, http.StatusNotFound, "Registro não encontrado.")
	case store.ErrConflict:
		writeError(w, http.StatusConflict, "Já existe um registro com esses dados.")
	default:
		writeError(w, http.StatusInternalServerError, "Erro interno no servidor.")
	}
}

func validType(t string) bool {
	return t == "income" || t == "expense"
}

func validHexColor(c string) bool {
	if len(c) != 7 || !strings.HasPrefix(c, "#") {
		return false
	}
	for _, ch := range c[1:] {
		if !((ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'f') || (ch >= 'A' && ch <= 'F')) {
			return false
		}
	}
	return true
}

func validEmail(e string) bool {
	at := strings.LastIndex(e, "@")
	if at <= 0 || at == len(e)-1 {
		return false
	}
	return !strings.ContainsAny(e, " \t\r\n")
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}
