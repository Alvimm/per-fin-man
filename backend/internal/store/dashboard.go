package store

import (
	"context"
	"math"
	"time"
)

// TotalsInRange retorna receitas e despesas (excluindo categorias caixinha)
// e o valor líquido guardado no período (depósitos - retiradas).
func (s *Store) TotalsInRange(ctx context.Context, userID string, start, end time.Time) (income, expense, saved float64, err error) {
	err = s.db.QueryRow(ctx,
		`SELECT
			COALESCE(SUM(amount) FILTER (WHERE t.type = 'income' AND COALESCE(c.is_savings, false) = false), 0),
			COALESCE(SUM(amount) FILTER (WHERE t.type = 'expense' AND COALESCE(c.is_savings, false) = false), 0),
			COALESCE(SUM(amount) FILTER (WHERE t.type = 'expense' AND COALESCE(c.is_savings, false) = true), 0)
				- COALESCE(SUM(amount) FILTER (WHERE t.type = 'income' AND COALESCE(c.is_savings, false) = true), 0)
		 FROM transactions t
		 LEFT JOIN categories c ON c.id = t.category_id
		 WHERE t.user_id = $1 AND t.date >= $2 AND t.date < $3`,
		userID, start, end,
	).Scan(&income, &expense, &saved)
	return income, expense, saved, err
}

// AllTimeTotals retorna os totais acumulados de receitas, despesas (excluindo
// categorias caixinha) e valor guardado até `until` (exclusivo). Ocorrências
// futuras materializadas de transações fixas não entram no saldo atual.
func (s *Store) AllTimeTotals(ctx context.Context, userID string, until time.Time) (income, expense, savedTotal float64, err error) {
	err = s.db.QueryRow(ctx,
		`SELECT
			COALESCE(SUM(amount) FILTER (WHERE t.type = 'income' AND COALESCE(c.is_savings, false) = false), 0),
			COALESCE(SUM(amount) FILTER (WHERE t.type = 'expense' AND COALESCE(c.is_savings, false) = false), 0),
			COALESCE(SUM(amount) FILTER (WHERE t.type = 'expense' AND COALESCE(c.is_savings, false) = true), 0)
				- COALESCE(SUM(amount) FILTER (WHERE t.type = 'income' AND COALESCE(c.is_savings, false) = true), 0)
		 FROM transactions t
		 LEFT JOIN categories c ON c.id = t.category_id
		 WHERE t.user_id = $1 AND t.date < $2`,
		userID, until,
	).Scan(&income, &expense, &savedTotal)
	return income, expense, savedTotal, err
}

func (s *Store) CategoryBreakdown(ctx context.Context, userID, typ string, start, end time.Time) ([]CategoryStat, error) {
	rows, err := s.db.Query(ctx,
		`SELECT COALESCE(t.category_id, ''), COALESCE(c.name, 'Sem categoria'),
		        COALESCE(c.icon, 'circle'), COALESCE(c.color, '#94a3b8'), SUM(t.amount)
		 FROM transactions t
		 LEFT JOIN categories c ON c.id = t.category_id
		 WHERE t.user_id = $1 AND t.type = $2 AND t.date >= $3 AND t.date < $4
		   AND COALESCE(c.is_savings, false) = false
		 GROUP BY 1, 2, 3, 4
		 ORDER BY 5 DESC`,
		userID, typ, start, end,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []CategoryStat
	var total float64
	for rows.Next() {
		var st CategoryStat
		var rawID string
		if err := rows.Scan(&rawID, &st.Name, &st.Icon, &st.Color, &st.Total); err != nil {
			return nil, err
		}
		total += st.Total
		if rawID != "" {
			st.CategoryID = &rawID
		}
		out = append(out, st)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	for i := range out {
		if total > 0 {
			out[i].Percentage = round2(out[i].Total / total * 100)
		}
	}
	return out, nil
}

// SavingsBreakdown mostra o valor acumulado por categoria caixinha (depósitos
// - retiradas), considerando todo o histórico até o mês corrente — persists de
// mês em mês e cada valor adicionado se soma. Ocorrências futuras materializadas
// de transações fixas não entram.
func (s *Store) SavingsBreakdown(ctx context.Context, userID string) ([]CategoryStat, error) {
	rows, err := s.db.Query(ctx,
		`SELECT c.id, c.name, c.icon, c.color,
		        SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE -t.amount END)
		 FROM transactions t
		 JOIN categories c ON c.id = t.category_id
		 WHERE t.user_id = $1 AND c.is_savings = true
		   AND t.date < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
		 GROUP BY 1, 2, 3, 4
		 HAVING SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE -t.amount END) <> 0
		 ORDER BY 5 DESC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []CategoryStat
	var total float64
	for rows.Next() {
		var st CategoryStat
		var rawID string
		if err := rows.Scan(&rawID, &st.Name, &st.Icon, &st.Color, &st.Total); err != nil {
			return nil, err
		}
		st.CategoryID = &rawID
		total += st.Total
		out = append(out, st)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	for i := range out {
		if total > 0 {
			out[i].Percentage = round2(out[i].Total / total * 100)
		}
	}
	return out, nil
}

func (s *Store) MonthlySeries(ctx context.Context, userID string, since time.Time) ([]SeriesPoint, error) {
	rows, err := s.db.Query(ctx,
		`SELECT to_char(date_trunc('month', t.date), 'YYYY-MM') AS month,
		        COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'income' AND COALESCE(c.is_savings, false) = false), 0),
		        COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'expense' AND COALESCE(c.is_savings, false) = false), 0)
		 FROM transactions t
		 LEFT JOIN categories c ON c.id = t.category_id
		 WHERE t.user_id = $1 AND t.date >= $2
		 GROUP BY 1
		 ORDER BY MIN(t.date)`,
		userID, since,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []SeriesPoint
	for rows.Next() {
		var p SeriesPoint
		if err := rows.Scan(&p.Month, &p.Income, &p.Expense); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}
