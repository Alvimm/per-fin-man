package store

import (
	"context"
)

const catCols = "id, user_id, name, type, color, icon, is_savings"

func scanCategory(row interface{ Scan(...any) error }) (Category, error) {
	var c Category
	err := row.Scan(&c.ID, &c.UserID, &c.Name, &c.Type, &c.Color, &c.Icon, &c.IsSavings)
	return c, err
}

func (s *Store) ListCategories(ctx context.Context, userID string) ([]Category, error) {
	rows, err := s.db.Query(ctx,
		`SELECT `+catCols+` FROM categories WHERE user_id = $1 ORDER BY type, name`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Category
	for rows.Next() {
		c, err := scanCategory(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (s *Store) GetCategory(ctx context.Context, userID, id string) (Category, error) {
	c, err := scanCategory(s.db.QueryRow(ctx,
		`SELECT `+catCols+` FROM categories WHERE id = $1 AND user_id = $2`, id, userID))
	if isNotFound(err) {
		return Category{}, ErrNotFound
	}
	return c, err
}

func (s *Store) CreateCategory(ctx context.Context, c Category) (Category, error) {
	err := s.db.QueryRow(ctx,
		`INSERT INTO categories (id, user_id, name, type, color, icon, is_savings)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING `+catCols,
		c.ID, c.UserID, c.Name, c.Type, c.Color, c.Icon, c.IsSavings,
	).Scan(&c.ID, &c.UserID, &c.Name, &c.Type, &c.Color, &c.Icon, &c.IsSavings)
	if err != nil {
		if isUniqueViolation(err) {
			return Category{}, ErrConflict
		}
		return Category{}, err
	}
	return c, nil
}

func (s *Store) UpdateCategory(ctx context.Context, userID, id string, c Category) (Category, error) {
	err := s.db.QueryRow(ctx,
		`UPDATE categories SET name = $1, color = $2, icon = $3, is_savings = $4
		 WHERE id = $5 AND user_id = $6
		 RETURNING `+catCols,
		c.Name, c.Color, c.Icon, c.IsSavings, id, userID,
	).Scan(&c.ID, &c.UserID, &c.Name, &c.Type, &c.Color, &c.Icon, &c.IsSavings)
	if err != nil {
		if isNotFound(err) {
			return Category{}, ErrNotFound
		}
		if isUniqueViolation(err) {
			return Category{}, ErrConflict
		}
		return Category{}, err
	}
	c.ID = id
	c.UserID = userID
	return c, nil
}

func (s *Store) DeleteCategory(ctx context.Context, userID, id string) error {
	tag, err := s.db.Exec(ctx,
		`DELETE FROM categories WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) SeedDefaultCategories(ctx context.Context, userID string) error {
	var count int
	if err := s.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM categories WHERE user_id = $1`, userID).Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	for _, dc := range DefaultCategories {
		_, err := s.CreateCategory(ctx, Category{
			ID:     uuidString(),
			UserID: userID,
			Name:   dc.Name,
			Type:   dc.Type,
			Color:  dc.Color,
			Icon:   dc.Icon,
		})
		if err != nil && !isUniqueViolation(err) {
			return err
		}
	}
	return nil
}

type DefaultCategory struct {
	Name  string
	Type  string
	Color string
	Icon  string
}

var DefaultCategories = []DefaultCategory{
	{Name: "Salário", Type: "income", Color: "#10b981", Icon: "wallet"},
	{Name: "Investimentos", Type: "income", Color: "#0ea5e9", Icon: "trending-up"},
	{Name: "Outras receitas", Type: "income", Color: "#22c55e", Icon: "plus-circle"},
	{Name: "Moradia", Type: "expense", Color: "#f59e0b", Icon: "home"},
	{Name: "Alimentação", Type: "expense", Color: "#f97316", Icon: "utensils"},
	{Name: "Transporte", Type: "expense", Color: "#3b82f6", Icon: "car"},
	{Name: "Saúde", Type: "expense", Color: "#ef4444", Icon: "heart-pulse"},
	{Name: "Educação", Type: "expense", Color: "#8b5cf6", Icon: "graduation-cap"},
	{Name: "Lazer", Type: "expense", Color: "#ec4899", Icon: "gamepad-2"},
	{Name: "Assinaturas", Type: "expense", Color: "#64748b", Icon: "tv"},
}