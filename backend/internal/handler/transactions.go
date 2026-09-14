package handler

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"meubolso-api/internal/middleware"
	"meubolso-api/internal/store"
)

type transactionPayload struct {
	Type              string  `json:"type"`
	Amount            float64 `json:"amount"`
	CategoryID        *string `json:"category_id"`
	Description       string  `json:"description"`
	Date              string  `json:"date"`
	RecurrenceType    string  `json:"recurrence_type"`
	InstallmentsTotal int     `json:"installments_total"`
}

func parseDate(s string) (time.Time, bool) {
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return time.Time{}, false
	}
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC), true
}

func normalizeRecurrence(rt string, installments int) (string, int, string) {
	switch rt {
	case "fixed":
		return "fixed", 0, "monthly"
	case "installments":
		if installments > 60 {
			installments = 60
		}
		return "installments", installments, "monthly"
	default:
		return "single", 0, "monthly"
	}
}

func validateTransactionPayload(p transactionPayload) (store.Transaction, string) {
	if !validType(p.Type) {
		return store.Transaction{}, "Tipo deve ser 'income' ou 'expense'."
	}
	if p.Amount <= 0 {
		return store.Transaction{}, "Valor deve ser maior que zero."
	}
	desc := strings.TrimSpace(p.Description)
	if len(desc) == 0 || len(desc) > 200 {
		return store.Transaction{}, "Descrição deve ter entre 1 e 200 caracteres."
	}
	d, ok := parseDate(p.Date)
	if !ok {
		return store.Transaction{}, "Data inválida. Use o formato AAAA-MM-DD."
	}
	if p.RecurrenceType != "" && p.RecurrenceType != "single" && p.RecurrenceType != "fixed" && p.RecurrenceType != "installments" {
		return store.Transaction{}, "Tipo de recorrência inválido."
	}
	if p.RecurrenceType == "installments" && p.InstallmentsTotal < 2 {
		return store.Transaction{}, "Parcelamento precisa de ao menos 2 parcelas."
	}
	rt, total, period := normalizeRecurrence(p.RecurrenceType, p.InstallmentsTotal)
	tx := store.Transaction{
		Type:            p.Type,
		Amount:          p.Amount,
		CategoryID:      p.CategoryID,
		Description:     desc,
		Date:            d,
		Recurring:       rt == "fixed",
		RecurringPeriod: period,
	}
	if rt == "installments" {
		tx.InstallmentsTotal = &total
	}
	return tx, ""
}

func (h *Handlers) ListTransactions(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUser(r.Context())

	q := r.URL.Query()
	f := store.TransactionFilter{Limit: 500}

	untilEnd := time.Now()
	if yearStr := q.Get("year"); yearStr != "" {
		year, err := strconv.Atoi(yearStr)
		if err != nil || year < 1970 {
			writeError(w, http.StatusBadRequest, "Ano inválido.")
			return
		}
		if monthStr := q.Get("month"); monthStr != "" {
			month, err := strconv.Atoi(monthStr)
			if err != nil || month < 1 || month > 12 {
				writeError(w, http.StatusBadRequest, "Mês inválido.")
				return
			}
			start := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
			end := start.AddDate(0, 1, 0)
			f.Start = &start
			f.End = &end
			untilEnd = end.AddDate(0, 0, -1)
		}
	}

	if v := q.Get("type"); v != "" {
		if !validType(v) {
			writeError(w, http.StatusBadRequest, "Filtro de tipo inválido.")
			return
		}
		f.Type = v
	}
	if v := q.Get("category_id"); v != "" {
		f.CategoryID = v
	}
	if v := q.Get("search"); v != "" {
		f.Search = strings.TrimSpace(v)
	}
	if v := q.Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			f.Limit = n
		}
	}

	if err := h.store.SyncRecurring(r.Context(), user.ID, untilEnd); err != nil {
		fail(w, err)
		return
	}

	items, err := h.store.ListTransactions(r.Context(), user.ID, f)
	if err != nil {
		fail(w, err)
		return
	}
	if items == nil {
		items = []store.Transaction{}
	}
	writeJSON(w, http.StatusOK, items)
}

func (h *Handlers) CreateTransaction(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUser(r.Context())

	var p transactionPayload
	if err := decodeBody(w, r, &p); err != nil {
		writeError(w, http.StatusBadRequest, "Requisição inválida.")
		return
	}
	tx, msg := validateTransactionPayload(p)
	if msg != "" {
		writeError(w, http.StatusBadRequest, msg)
		return
	}
	if p.CategoryID != nil {
		if _, err := h.store.GetCategory(r.Context(), user.ID, *p.CategoryID); err != nil {
			if err == store.ErrNotFound {
				writeError(w, http.StatusNotFound, "Categoria não encontrada.")
				return
			}
			fail(w, err)
			return
		}
	}

	_, total, _ := normalizeRecurrence(p.RecurrenceType, p.InstallmentsTotal)
	groupID := newID()

	// Parcelamento: gera todas as parcelas mensais de uma vez.
	if total > 1 {
		items := make([]store.Transaction, 0, total)
		for i := 1; i <= total; i++ {
			item := tx
			item.ID = newID()
			item.UserID = user.ID
			item.Date = time.Date(tx.Date.Year(), tx.Date.Month()+time.Month(i-1), 1, 0, 0, 0, 0, time.UTC)
			item.GroupID = &groupID
			cur := i
			item.InstallmentsCurrent = &cur
			items = append(items, item)
		}
		if err := h.store.CreateTransactions(r.Context(), items); err != nil {
			fail(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, map[string]any{
			"message": "Transação parcelada criada com sucesso.",
			"created": len(items),
		})
		return
	}

	// Fixa (recorrente): cria a âncora e materializa os meses seguintes.
	if tx.Recurring {
		tx.UserID = user.ID
		tx.ID = newID()
		tx.GroupID = &groupID
		created, err := h.store.CreateTransaction(r.Context(), tx)
		if err != nil {
			fail(w, err)
			return
		}
		if err := h.store.SyncRecurring(r.Context(), user.ID, time.Now()); err != nil {
			fail(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, created)
		return
	}

	// Transação única.
	tx.UserID = user.ID
	tx.ID = newID()
	created, err := h.store.CreateTransaction(r.Context(), tx)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, created)
}

func (h *Handlers) UpdateTransaction(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUser(r.Context())
	id := chi.URLParam(r, "id")

	var p transactionPayload
	if err := decodeBody(w, r, &p); err != nil {
		writeError(w, http.StatusBadRequest, "Requisição inválida.")
		return
	}
	tx, msg := validateTransactionPayload(p)
	if msg != "" {
		writeError(w, http.StatusBadRequest, msg)
		return
	}
	if p.CategoryID != nil {
		if _, err := h.store.GetCategory(r.Context(), user.ID, *p.CategoryID); err != nil {
			if err == store.ErrNotFound {
				writeError(w, http.StatusNotFound, "Categoria não encontrada.")
				return
			}
			fail(w, err)
			return
		}
	}

	tx.ID = id
	updated, err := h.store.UpdateTransaction(r.Context(), user.ID, tx)
	if err != nil {
		if err == store.ErrNotFound {
			writeError(w, http.StatusNotFound, "Transação não encontrada.")
			return
		}
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

func (h *Handlers) DeleteTransaction(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUser(r.Context())
	id := chi.URLParam(r, "id")

	err := h.store.DeleteTransaction(r.Context(), user.ID, id)
	if err != nil {
		if err == store.ErrNotFound {
			writeError(w, http.StatusNotFound, "Transação não encontrada.")
			return
		}
		fail(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}