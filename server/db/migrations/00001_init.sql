-- +goose Up
-- Schema inicial: contas, categorias, regras de recorrência e transações.
-- Dinheiro em NUMERIC(14,2) e tempo em timestamptz (ver docs/context/money.md).
-- Saldo de conta é derivado (opening_balance + soma do ledger), nunca cacheado.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE accounts (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text          NOT NULL,
    account_type    text          NOT NULL DEFAULT 'checking'
                        CHECK (account_type IN ('checking','cash','exchange','credit_card','savings')),
    opening_balance numeric(14,2) NOT NULL DEFAULT 0,
    icon            text          NOT NULL,
    tone            text          NOT NULL DEFAULT 'neutral'
                        CHECK (tone IN ('primary','secondary','error','neutral')),
    dot_color       text          NOT NULL,
    is_archived     boolean       NOT NULL DEFAULT false,
    created_at      timestamptz   NOT NULL DEFAULT now(),
    updated_at      timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT accounts_name_not_blank CHECK (length(btrim(name)) > 0),
    CONSTRAINT accounts_dot_color_hex  CHECK (dot_color ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE TABLE categories (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id   uuid          REFERENCES categories(id) ON DELETE SET NULL,
    name        text          NOT NULL,
    kind        text          NOT NULL CHECK (kind IN ('expense','income')),
    color       text          NOT NULL DEFAULT '#958ea0',
    icon        text          NOT NULL DEFAULT 'category',
    tone        text          NOT NULL DEFAULT 'primary'
                    CHECK (tone IN ('primary','secondary','error','neutral')),
    is_archived boolean       NOT NULL DEFAULT false,
    created_at  timestamptz   NOT NULL DEFAULT now(),
    updated_at  timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT categories_name_not_blank CHECK (length(btrim(name)) > 0),
    CONSTRAINT categories_color_hex      CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT categories_no_self_parent CHECK (parent_id IS DISTINCT FROM id)
);

CREATE TABLE recurring_rules (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id      uuid          NOT NULL REFERENCES accounts(id)   ON DELETE CASCADE,
    category_id     uuid          REFERENCES categories(id)          ON DELETE SET NULL,
    description     text          NOT NULL,
    direction       text          NOT NULL CHECK (direction IN ('income','expense')),
    amount          numeric(14,2) NOT NULL CHECK (amount > 0),
    frequency       text          NOT NULL CHECK (frequency IN ('daily','weekly','monthly','yearly')),
    interval_count  integer       NOT NULL DEFAULT 1 CHECK (interval_count >= 1),
    start_date      date          NOT NULL,
    end_date        date,                      -- NULL = permanente
    max_occurrences integer       CHECK (max_occurrences IS NULL OR max_occurrences >= 1),
    is_active       boolean       NOT NULL DEFAULT true,
    created_at      timestamptz   NOT NULL DEFAULT now(),
    updated_at      timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT recurring_end_after_start
        CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT recurring_bound_is_exclusive
        CHECK (NOT (end_date IS NOT NULL AND max_occurrences IS NOT NULL))
);

CREATE TABLE transactions (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id            uuid          NOT NULL REFERENCES accounts(id)       ON DELETE CASCADE,
    category_id           uuid          REFERENCES categories(id)              ON DELETE SET NULL,
    recurring_rule_id     uuid          REFERENCES recurring_rules(id)         ON DELETE SET NULL,
    description           text          NOT NULL,
    kind                  text          NOT NULL DEFAULT 'standard'
                              CHECK (kind IN ('standard','installment','transfer')),
    direction             text          NOT NULL CHECK (direction IN ('income','expense')),
    amount                numeric(14,2) NOT NULL CHECK (amount > 0),
    signed_amount         numeric(14,2) GENERATED ALWAYS AS
                              (CASE WHEN direction = 'income' THEN amount ELSE -amount END) STORED,
    occurred_on           date          NOT NULL,        -- competência; o dashboard agrupa por mês disto
    booked_at             timestamptz   NOT NULL DEFAULT now(),
    -- Parcelamento (kind='installment'): cada linha é uma parcela
    purchase_group_id     uuid,
    installment_number    integer       CHECK (installment_number IS NULL OR installment_number >= 1),
    installment_total     integer       CHECK (installment_total  IS NULL OR installment_total  >= 1),
    purchase_total_amount numeric(14,2) CHECK (purchase_total_amount IS NULL OR purchase_total_amount > 0),
    -- Transferência: reservado para migration futura (dupla entrada com mesmo transfer_group_id)
    transfer_group_id     uuid,
    created_at            timestamptz   NOT NULL DEFAULT now(),
    updated_at            timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT tx_description_not_blank CHECK (length(btrim(description)) > 0),
    CONSTRAINT tx_installment_coherent CHECK (
        (kind = 'installment'
            AND purchase_group_id IS NOT NULL AND installment_number IS NOT NULL
            AND installment_total IS NOT NULL AND purchase_total_amount IS NOT NULL
            AND installment_number <= installment_total)
        OR
        (kind <> 'installment'
            AND purchase_group_id IS NULL AND installment_number IS NULL
            AND installment_total IS NULL AND purchase_total_amount IS NULL)
    )
);

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

CREATE TRIGGER accounts_set_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER categories_set_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER recurring_rules_set_updated_at
    BEFORE UPDATE ON recurring_rules
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER transactions_set_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Índices focados nas agregações do dashboard (saldo, totais do mês, gasto por categoria)
CREATE INDEX idx_transactions_account        ON transactions (account_id);
CREATE INDEX idx_transactions_occurred_on    ON transactions (occurred_on);
CREATE INDEX idx_transactions_cat_month      ON transactions (category_id, occurred_on) WHERE direction = 'expense';
CREATE INDEX idx_transactions_purchase_group ON transactions (purchase_group_id) WHERE purchase_group_id IS NOT NULL;
CREATE INDEX idx_transactions_rule           ON transactions (recurring_rule_id) WHERE recurring_rule_id IS NOT NULL;
CREATE INDEX idx_categories_parent           ON categories (parent_id) WHERE parent_id IS NOT NULL;

-- +goose Down
-- Ordem inversa das FKs. pgcrypto é deixada instalada (pode ser usada por outros schemas).
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS recurring_rules;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS accounts;
DROP FUNCTION IF EXISTS set_updated_at();
