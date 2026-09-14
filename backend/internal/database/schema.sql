CREATE TABLE IF NOT EXISTS users (
    id              TEXT PRIMARY KEY,
    username        TEXT UNIQUE NOT NULL,
    email           TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    monthly_budget  NUMERIC(12,2),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    type        TEXT NOT NULL CHECK (type IN ('income','expense')),
    color       TEXT NOT NULL,
    icon        TEXT NOT NULL,
    is_savings  BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, name, type)
);

CREATE TABLE IF NOT EXISTS transactions (
    id                   TEXT PRIMARY KEY,
    user_id              TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id          TEXT REFERENCES categories(id) ON DELETE SET NULL,
    type                 TEXT NOT NULL CHECK (type IN ('income','expense')),
    amount               NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    description          TEXT NOT NULL,
    date                 TIMESTAMPTZ NOT NULL,
    recurring            BOOLEAN NOT NULL DEFAULT false,
    recurring_period     TEXT NOT NULL DEFAULT 'monthly',
    group_id             TEXT,
    installments_total   INT,
    installments_current INT,
    recurring_ends_at    DATE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_cat  ON transactions (user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_categories_user        ON categories (user_id);

-- Migrações incrementais (bancos já existentes)
ALTER TABLE categories    ADD COLUMN IF NOT EXISTS is_savings BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE transactions  ADD COLUMN IF NOT EXISTS recurring BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE transactions  ADD COLUMN IF NOT EXISTS recurring_period TEXT NOT NULL DEFAULT 'monthly';
ALTER TABLE transactions  ADD COLUMN IF NOT EXISTS group_id TEXT;
ALTER TABLE transactions  ADD COLUMN IF NOT EXISTS installments_total INT;
ALTER TABLE transactions  ADD COLUMN IF NOT EXISTS installments_current INT;
ALTER TABLE transactions  ADD COLUMN IF NOT EXISTS recurring_ends_at DATE;

CREATE INDEX IF NOT EXISTS idx_transactions_group     ON transactions (user_id, group_id) WHERE group_id IS NOT NULL;

DELETE FROM transactions a
USING transactions b
WHERE a.group_id IS NOT NULL
  AND a.user_id = b.user_id
  AND a.group_id = b.group_id
  AND a.date = b.date
  AND a.ctid > b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_transactions_user_group_date
    ON transactions (user_id, group_id, date) WHERE group_id IS NOT NULL;