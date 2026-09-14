package store

import (
	"context"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

const txCols = "id, type, amount, category_id, description, date, recurring, recurring_period, group_id, installments_total, installments_current, recurring_ends_at"

func scanTransaction(row interface{ Scan(...any) error }) (Transaction, error) {
	var t Transaction
	err := row.Scan(&t.ID, &t.Type, &t.Amount, &t.CategoryID, &t.Description, &t.Date,
		&t.Recurring, &t.RecurringPeriod, &t.GroupID, &t.InstallmentsTotal, &t.InstallmentsCurrent, &t.RecurringEndsAt)
	return t, err
}

type TransactionFilter struct {
	Start      *time.Time
	End        *time.Time
	Type       string
	CategoryID string
	Search     string
	Limit      int
}

func (s *Store) ListTransactions(ctx context.Context, userID string, f TransactionFilter) ([]Transaction, error) {
	var conds []string
	var args []any
	n := 1

	conds = append(conds, "user_id=$"+strconv.Itoa(n))
	args = append(args, userID)
	n++

	if f.Start != nil {
		conds = append(conds, "date >= $"+strconv.Itoa(n))
		args = append(args, *f.Start)
		n++
	}
	if f.End != nil {
		conds = append(conds, "date < $"+strconv.Itoa(n))
		args = append(args, *f.End)
		n++
	}
	if f.Type != "" {
		conds = append(conds, "type = $"+strconv.Itoa(n))
		args = append(args, f.Type)
		n++
	}
	if f.CategoryID != "" {
		conds = append(conds, "category_id = $"+strconv.Itoa(n))
		args = append(args, f.CategoryID)
		n++
	}
	if f.Search != "" {
		conds = append(conds, "description ILIKE $"+strconv.Itoa(n))
		args = append(args, "%"+f.Search+"%")
		n++
	}

	limit := f.Limit
	if limit <= 0 || limit > 1000 {
		limit = 500
	}

	query := "SELECT " + txCols + " FROM transactions WHERE " +
		strings.Join(conds, " AND ") +
		" ORDER BY date DESC, created_at DESC LIMIT $" + strconv.Itoa(n)
	args = append(args, limit)

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Transaction
	for rows.Next() {
		t, err := scanTransaction(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

func (s *Store) GetTransaction(ctx context.Context, userID, id string) (Transaction, error) {
	t, err := scanTransaction(s.db.QueryRow(ctx,
		`SELECT `+txCols+` FROM transactions WHERE id = $1 AND user_id = $2`, id, userID))
	if isNotFound(err) {
		return Transaction{}, ErrNotFound
	}
	return t, err
}

func (s *Store) CreateTransaction(ctx context.Context, t Transaction) (Transaction, error) {
	err := s.db.QueryRow(ctx,
		`INSERT INTO transactions (id, user_id, type, amount, category_id, description, date,
		                           recurring, recurring_period, group_id, installments_total, installments_current)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		 RETURNING `+txCols,
		t.ID, t.UserID, t.Type, t.Amount, t.CategoryID, t.Description, t.Date,
		t.Recurring, t.RecurringPeriod, t.GroupID, t.InstallmentsTotal, t.InstallmentsCurrent,
	).Scan(&t.ID, &t.Type, &t.Amount, &t.CategoryID, &t.Description, &t.Date,
		&t.Recurring, &t.RecurringPeriod, &t.GroupID, &t.InstallmentsTotal, &t.InstallmentsCurrent, &t.RecurringEndsAt)
	return t, err
}

// CreateTransactions insere várias transações em uma única transação do banco.
func (s *Store) CreateTransactions(ctx context.Context, items []Transaction) error {
	return s.WithTx(ctx, func(tx pgx.Tx) error {
		for _, t := range items {
			if _, err := tx.Exec(ctx,
				`INSERT INTO transactions (id, user_id, type, amount, category_id, description, date,
				                           recurring, recurring_period, group_id, installments_total, installments_current)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
				t.ID, t.UserID, t.Type, t.Amount, t.CategoryID, t.Description, t.Date,
				t.Recurring, t.RecurringPeriod, t.GroupID, t.InstallmentsTotal, t.InstallmentsCurrent,
			); err != nil {
				return err
			}
		}
		return nil
	})
}

// SyncRecurring materializa as ocorrências mensais ainda não lançadas de cada
// grupo de recorrência do usuário, até (e inclusive) o mês de `until`.
func (s *Store) SyncRecurring(ctx context.Context, userID string, until time.Time) error {
	rows, err := s.db.Query(ctx,
		`SELECT group_id, type, amount, category_id, description, recurring_period, MAX(date), MAX(recurring_ends_at)
		 FROM transactions
		 WHERE user_id = $1 AND recurring AND group_id IS NOT NULL
		 GROUP BY group_id, type, amount, category_id, description, recurring_period`,
		userID,
	)
	if err != nil {
		return err
	}
	defer rows.Close()

	type tpl struct {
		groupID         string
		typ             string
		amount          float64
		categoryID      *string
		description     string
		recurringPeriod string
		maxDate         time.Time
		endsAt          *time.Time
	}
	var tpls []tpl
	for rows.Next() {
		var t tpl
		if err := rows.Scan(&t.groupID, &t.typ, &t.amount, &t.categoryID, &t.description, &t.recurringPeriod, &t.maxDate, &t.endsAt); err != nil {
			return err
		}
		tpls = append(tpls, t)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	untilStart := time.Date(until.Year(), until.Month(), 1, 0, 0, 0, 0, time.UTC)
	for _, t := range tpls {
		next := time.Date(t.maxDate.Year(), t.maxDate.Month()+1, 1, 0, 0, 0, 0, time.UTC)
		for !next.After(untilStart) {
			if t.endsAt != nil && next.After(*t.endsAt) {
				break
			}
			_, err := s.db.Exec(ctx,
				`INSERT INTO transactions (id, user_id, type, amount, category_id, description, date,
				                           recurring, recurring_period, group_id, installments_total, installments_current)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
				 ON CONFLICT (user_id, group_id, date) WHERE group_id IS NOT NULL DO NOTHING`,
				NewID(), userID, t.typ, t.amount, t.categoryID, t.description, next,
				true, t.recurringPeriod, t.groupID, nil, nil,
			)
			if err != nil {
				return err
			}
			next = next.AddDate(0, 1, 0)
		}
	}
	return nil
}

func (s *Store) UpdateTransaction(ctx context.Context, userID string, t Transaction) (Transaction, error) {
	err := s.db.QueryRow(ctx,
		`UPDATE transactions SET type = $1, amount = $2, category_id = $3, description = $4, date = $5
		 WHERE id = $6 AND user_id = $7
		 RETURNING `+txCols,
		t.Type, t.Amount, t.CategoryID, t.Description, t.Date, t.ID, userID,
	).Scan(&t.ID, &t.Type, &t.Amount, &t.CategoryID, &t.Description, &t.Date,
		&t.Recurring, &t.RecurringPeriod, &t.GroupID, &t.InstallmentsTotal, &t.InstallmentsCurrent, &t.RecurringEndsAt)
	if err != nil {
		if isNotFound(err) {
			return Transaction{}, ErrNotFound
		}
		return Transaction{}, err
	}
	return t, nil
}

func (s *Store) DeleteTransaction(ctx context.Context, userID, id string) error {
	t, err := scanTransaction(s.db.QueryRow(ctx,
		`SELECT `+txCols+` FROM transactions WHERE id = $1 AND user_id = $2`, id, userID))
	if err != nil {
		if isNotFound(err) {
			return ErrNotFound
		}
		return err
	}

	// Descobre se a ocorrência a ser excluída é a mais recente do grupo
	// antes de removê-la (o SyncRecurring usaria o que sobrar como base).
	var wasLatest bool
	if t.Recurring && t.GroupID != nil {
		var maxDate *time.Time
		if err := s.db.QueryRow(ctx,
			`SELECT MAX(date) FROM transactions WHERE user_id = $1 AND group_id = $2`,
			userID, *t.GroupID).Scan(&maxDate); err != nil {
			return err
		}
		wasLatest = maxDate != nil && maxDate.Equal(t.Date)
	}

	tag, err := s.db.Exec(ctx,
		`DELETE FROM transactions WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	// Se era a ocorrência mais recente de um grupo recorrente, encerra o
	// grupo no mês anterior para o SyncRecurring não recriá-la.
	if wasLatest {
		if _, err := s.db.Exec(ctx,
			`UPDATE transactions SET recurring_ends_at = $1 WHERE user_id = $2 AND group_id = $3`,
			time.Date(t.Date.Year(), t.Date.Month()-1, 1, 0, 0, 0, 0, time.UTC),
			userID, *t.GroupID); err != nil {
			return err
		}
	}
	return nil
}