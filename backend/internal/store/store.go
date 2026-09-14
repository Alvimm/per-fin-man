package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("não encontrado")
var ErrConflict = errors.New("conflito")

type Store struct {
	db *pgxpool.Pool
}

func New(db *pgxpool.Pool) *Store {
	return &Store{db: db}
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

func NewID() string {
	u, err := uuid.NewRandom()
	if err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return u.String()
}

func uuidString() string {
	return NewID()
}

func isNotFound(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}

type User struct {
	ID            string     `json:"id"`
	Username      string     `json:"username"`
	Email         string     `json:"email"`
	PasswordHash  string     `json:"-"`
	MonthlyBudget *float64   `json:"monthly_budget"`
	CreatedAt     time.Time  `json:"created_at"`
}

type Category struct {
	ID        string `json:"id"`
	UserID    string `json:"-"`
	Name      string `json:"name"`
	Type      string `json:"type"`
	Color     string `json:"color"`
	Icon      string `json:"icon"`
	IsSavings bool   `json:"is_savings"`
}

type CategoryStat struct {
	CategoryID *string  `json:"category_id"`
	Name       string   `json:"name"`
	Icon       string   `json:"icon"`
	Color      string   `json:"color"`
	Total      float64  `json:"total"`
	Percentage float64  `json:"percentage"`
}

type Transaction struct {
	ID                  string    `json:"id"`
	UserID              string    `json:"-"`
	Type                string    `json:"type"`
	Amount              float64   `json:"amount"`
	CategoryID          *string   `json:"category_id"`
	Description         string    `json:"description"`
	Date                time.Time `json:"date"`
	Recurring           bool      `json:"recurring"`
	RecurringPeriod     string    `json:"recurring_period"`
	GroupID             *string   `json:"group_id"`
	InstallmentsTotal   *int      `json:"installments_total"`
	InstallmentsCurrent *int      `json:"installments_current"`
	RecurringEndsAt     *time.Time `json:"-"`
}

type SeriesPoint struct {
	Month   string  `json:"month"`
	Income  float64 `json:"income"`
	Expense float64 `json:"expense"`
}

func (s *Store) DB() *pgxpool.Pool { return s.db }

func (s *Store) WithTx(ctx context.Context, fn func(tx pgx.Tx) error) error {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if err := fn(tx); err != nil {
		return err
	}
	return tx.Commit(ctx)
}