package store

import (
	"context"
	"strconv"
	"strings"
)

const userCols = "id, username, email, password_hash, monthly_budget, created_at"

func scanUser(row interface{ Scan(...any) error }) (User, error) {
	var u User
	err := row.Scan(&u.ID, &u.Username, &u.Email, &u.PasswordHash, &u.MonthlyBudget, &u.CreatedAt)
	return u, err
}

func (s *Store) CreateUser(ctx context.Context, u User) (User, error) {
	err := s.db.QueryRow(ctx,
		`INSERT INTO users (id, username, email, password_hash)
		 VALUES ($1, $2, $3, $4)
		 RETURNING `+userCols,
		u.ID, u.Username, u.Email, u.PasswordHash,
	).Scan(&u.ID, &u.Username, &u.Email, &u.PasswordHash, &u.MonthlyBudget, &u.CreatedAt)
	if err != nil {
		if isUniqueViolation(err) {
			return User{}, ErrConflict
		}
		return User{}, err
	}
	return u, nil
}

func (s *Store) GetUserByID(ctx context.Context, id string) (User, error) {
	u, err := scanUser(s.db.QueryRow(ctx,
		`SELECT `+userCols+` FROM users WHERE id = $1`, id))
	if isNotFound(err) {
		return User{}, ErrNotFound
	}
	return u, err
}

func (s *Store) GetUserByEmail(ctx context.Context, email string) (User, error) {
	u, err := scanUser(s.db.QueryRow(ctx,
		`SELECT `+userCols+` FROM users WHERE email = $1`, email))
	if isNotFound(err) {
		return User{}, ErrNotFound
	}
	return u, err
}

func (s *Store) GetUserByUsername(ctx context.Context, username string) (User, error) {
	u, err := scanUser(s.db.QueryRow(ctx,
		`SELECT `+userCols+` FROM users WHERE username = $1`, username))
	if isNotFound(err) {
		return User{}, ErrNotFound
	}
	return u, err
}

type UserUpdates struct {
	Username      *string
	Email         *string
	MonthlyBudget *float64
	ClearBudget   bool
	PasswordHash  *string
}

func (s *Store) UpdateUser(ctx context.Context, id string, up UserUpdates) (User, error) {
	var setSQL []string
	var args []any
	n := 1
	add := func(col string, v any) {
		setSQL = append(setSQL, col+"=$"+strconv.Itoa(n))
		args = append(args, v)
		n++
	}

	if up.Username != nil {
		add("username", *up.Username)
	}
	if up.Email != nil {
		add("email", *up.Email)
	}
	if up.ClearBudget {
		add("monthly_budget", nil)
	} else if up.MonthlyBudget != nil {
		add("monthly_budget", *up.MonthlyBudget)
	}
	if up.PasswordHash != nil {
		add("password_hash", *up.PasswordHash)
	}

	if len(setSQL) == 0 {
		return s.GetUserByID(ctx, id)
	}

	args = append(args, id)
	query := "UPDATE users SET " + strings.Join(setSQL, ", ") +
		" WHERE id=$" + strconv.Itoa(n) + " RETURNING " + userCols

	u, err := scanUser(s.db.QueryRow(ctx, query, args...))
	if err != nil {
		if isUniqueViolation(err) {
			return User{}, ErrConflict
		}
		return User{}, err
	}
	return u, nil
}

func (s *Store) DeleteUser(ctx context.Context, id string) error {
	_, err := s.db.Exec(ctx, `DELETE FROM users WHERE id = $1`, id)
	return err
}