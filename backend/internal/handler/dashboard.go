package handler

import (
	"net/http"
	"strconv"
	"time"

	"meubolso-api/internal/middleware"
	"meubolso-api/internal/store"
)

type comparison struct {
	IncomeDelta  float64 `json:"income_delta"`
	ExpenseDelta float64 `json:"expense_delta"`
}

type statsResponse struct {
	Balance            float64              `json:"balance"`
	Income             float64              `json:"income"`
	Expense            float64              `json:"expense"`
	IncomeTotal        float64              `json:"income_total"`
	ExpenseTotal       float64              `json:"expense_total"`
	Saved              float64              `json:"saved"`
	SavedTotal         float64              `json:"saved_total"`
	Spendable          float64              `json:"spendable"`
	Budget             *float64             `json:"budget"`
	BudgetUsage        *float64             `json:"budget_usage"`
	Month              string               `json:"month"`
	Comparison         comparison           `json:"comparison"`
	ExpensesByCategory []categoryStatResult `json:"expenses_by_category"`
	IncomeByCategory   []categoryStatResult `json:"income_by_category"`
	SavingsByCategory  []categoryStatResult `json:"savings_by_category"`
}

type categoryStatResult struct {
	CategoryID *string `json:"category_id"`
	Name       string  `json:"name"`
	Icon       string  `json:"icon"`
	Color      string  `json:"color"`
	Total      float64 `json:"total"`
	Percentage float64 `json:"percentage"`
}

func monthBounds(year, month int) (time.Time, time.Time) {
	start := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	return start, start.AddDate(0, 1, 0)
}

func prevMonth(year, month int) (int, int) {
	if month == 1 {
		return year - 1, 12
	}
	return year, month - 1
}

func (h *Handlers) DashboardStats(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUser(r.Context())

	now := time.Now()
	year := now.Year()
	month := int(now.Month())

	if y := r.URL.Query().Get("year"); y != "" {
		if n, err := strconv.Atoi(y); err == nil {
			year = n
		}
	}
	if m := r.URL.Query().Get("month"); m != "" {
		if n, err := strconv.Atoi(m); err == nil && n >= 1 && n <= 12 {
			month = n
		}
	}

	start, end := monthBounds(year, month)

	if err := h.store.SyncRecurring(r.Context(), user.ID, end.AddDate(0, 0, -1)); err != nil {
		fail(w, err)
		return
	}
	if err := h.store.SyncRecurring(r.Context(), user.ID, time.Now()); err != nil {
		fail(w, err)
		return
	}

	income, expense, saved, err := h.store.TotalsInRange(r.Context(), user.ID, start, end)
	if err != nil {
		fail(w, err)
		return
	}

	py, pm := prevMonth(year, month)
	pStart, pEnd := monthBounds(py, pm)
	prevIncome, prevExpense, _, err := h.store.TotalsInRange(r.Context(), user.ID, pStart, pEnd)
	if err != nil {
		fail(w, err)
		return
	}

	untilAllTime := time.Date(now.Year(), now.Month()+1, 1, 0, 0, 0, 0, time.UTC)
	_, _, savedTotal, err := h.store.AllTimeTotals(r.Context(), user.ID, untilAllTime)
	if err != nil {
		fail(w, err)
		return
	}

	expCats, err := h.store.CategoryBreakdown(r.Context(), user.ID, "expense", start, end)
	if err != nil {
		fail(w, err)
		return
	}
	incCats, err := h.store.CategoryBreakdown(r.Context(), user.ID, "income", start, end)
	if err != nil {
		fail(w, err)
		return
	}
	saveCats, err := h.store.SavingsBreakdown(r.Context(), user.ID)
	if err != nil {
		fail(w, err)
		return
	}

	delta := func(cur, prev float64) float64 {
		if prev > 0 {
			return (cur - prev) / prev * 100
		}
		return 0
	}

	var budgetUsage *float64
	if user.MonthlyBudget != nil && *user.MonthlyBudget > 0 {
		usage := round2((expense + saved) / *user.MonthlyBudget * 100)
		budgetUsage = &usage
	}

	// Saldo do mês: receitas - despesas - valor movimentado nas caixinhas do mês.
	// É scoped ao mês em exibição, então meses anteriores (ex.: agosto, sem dados)
	// não repetem o saldo do mês atual.
	balance := income - expense - saved
	resp := statsResponse{
		Balance:            round2(balance),
		Income:             round2(income),
		Expense:            round2(expense),
		IncomeTotal:        round2(income),
		ExpenseTotal:       round2(expense),
		Saved:              round2(saved),
		SavedTotal:         round2(savedTotal),
		Spendable:          round2(balance),
		Budget:             user.MonthlyBudget,
		BudgetUsage:        budgetUsage,
		Month:              time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC).Format("2006-01"),
		Comparison:         comparison{IncomeDelta: round2(delta(income, prevIncome)), ExpenseDelta: round2(delta(expense, prevExpense))},
		ExpensesByCategory: toStatResult(expCats),
		IncomeByCategory:   toStatResult(incCats),
		SavingsByCategory:  toStatResult(saveCats),
	}
	writeJSON(w, http.StatusOK, resp)
}

func toStatResult(cats []store.CategoryStat) []categoryStatResult {
	out := make([]categoryStatResult, 0, len(cats))
	for _, c := range cats {
		out = append(out, categoryStatResult{
			CategoryID: c.CategoryID,
			Name:       c.Name,
			Icon:       c.Icon,
			Color:      c.Color,
			Total:      c.Total,
			Percentage: c.Percentage,
		})
	}
	return out
}

func (h *Handlers) MonthlySeries(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUser(r.Context())

	year := time.Now().Year()
	months := 12
	if y := r.URL.Query().Get("year"); y != "" {
		if n, err := strconv.Atoi(y); err == nil {
			year = n
		}
	}
	if m := r.URL.Query().Get("months"); m != "" {
		if n, err := strconv.Atoi(m); err == nil && n > 0 {
			months = n
		}
	}

	start := time.Date(year-(months/12), 1, 1, 0, 0, 0, 0, time.UTC)
	untilEnd := time.Now()
	if yearStr := r.URL.Query().Get("year"); yearStr != "" {
		if y, err := strconv.Atoi(yearStr); err == nil {
			untilEnd = time.Date(y, 12, 31, 23, 59, 59, 0, time.UTC)
		}
	}
	if err := h.store.SyncRecurring(r.Context(), user.ID, untilEnd); err != nil {
		fail(w, err)
		return
	}
	series, err := h.store.MonthlySeries(r.Context(), user.ID, start)
	if err != nil {
		fail(w, err)
		return
	}
	if series == nil {
		series = []store.SeriesPoint{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"series": series})
}