-- +goose Up
-- Auth + isolamento por usuário: tabela `users`, usuário padrão semeado e coluna
-- `user_id` (NOT NULL, FK CASCADE) em toda tabela de dados. Reusa set_updated_at()
-- e pgcrypto (crypt/gen_salt) da 00001. Ver docs/context/database.md.

CREATE TABLE users (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email         text        NOT NULL,
    password_hash text        NOT NULL,
    name          text,
    is_active     boolean     NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT users_email_not_blank CHECK (length(btrim(email)) > 0)
);

-- E-mail único case-insensitive (sem citext): o lookup usa lower(email).
CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email));

CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Usuário padrão do sistema. Hash gerado pelo pgcrypto (crypt + bcrypt 'bf' cost
-- 10) no formato $2a$, que o x/crypto/bcrypt do Go valida. Idempotente.
INSERT INTO users (id, email, password_hash) VALUES
    ('00000000-0000-0000-0000-000000000001', 'teste@teste.com', crypt('12345', gen_salt('bf', 10)))
ON CONFLICT (id) DO NOTHING;

-- user_id em cada tabela de dados: nullable -> backfill no usuário padrão -> NOT NULL.
ALTER TABLE accounts        ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE categories      ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE recurring_rules ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE transactions    ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE CASCADE;

UPDATE accounts        SET user_id = '00000000-0000-0000-0000-000000000001' WHERE user_id IS NULL;
UPDATE categories      SET user_id = '00000000-0000-0000-0000-000000000001' WHERE user_id IS NULL;
UPDATE recurring_rules SET user_id = '00000000-0000-0000-0000-000000000001' WHERE user_id IS NULL;
UPDATE transactions    SET user_id = '00000000-0000-0000-0000-000000000001' WHERE user_id IS NULL;

ALTER TABLE accounts        ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE categories      ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE recurring_rules ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE transactions    ALTER COLUMN user_id SET NOT NULL;

-- Índices user-scoped pras agregações do dashboard por usuário.
CREATE INDEX idx_accounts_user             ON accounts (user_id);
CREATE INDEX idx_categories_user           ON categories (user_id);
CREATE INDEX idx_recurring_rules_user      ON recurring_rules (user_id);
CREATE INDEX idx_transactions_user_month   ON transactions (user_id, occurred_on);
CREATE INDEX idx_transactions_user_cat_exp ON transactions (user_id, category_id, occurred_on) WHERE direction = 'expense';

-- +goose Down
DROP INDEX IF EXISTS idx_transactions_user_cat_exp;
DROP INDEX IF EXISTS idx_transactions_user_month;
DROP INDEX IF EXISTS idx_recurring_rules_user;
DROP INDEX IF EXISTS idx_categories_user;
DROP INDEX IF EXISTS idx_accounts_user;

ALTER TABLE transactions    DROP COLUMN IF EXISTS user_id;
ALTER TABLE recurring_rules DROP COLUMN IF EXISTS user_id;
ALTER TABLE categories      DROP COLUMN IF EXISTS user_id;
ALTER TABLE accounts        DROP COLUMN IF EXISTS user_id;

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
DROP TABLE IF EXISTS users;
