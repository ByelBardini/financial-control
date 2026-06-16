-- +goose Up
-- Essencialidade da categoria — alimenta a tag da transação (Sobrevivência vs Supérfluo).
-- Despesa de categoria 'essential' = Sobrevivência (necessidade); 'discretionary' = Supérfluo.
-- Default 'discretionary' (conservador: sem marcar, a despesa conta como supérflua). Receita
-- não usa esta coluna (a tag de receita sai do recurring_rule_id: Inflow Esperado vs Renda Extra).
ALTER TABLE categories ADD COLUMN essentialness text NOT NULL DEFAULT 'discretionary'
    CONSTRAINT categories_essentialness_check CHECK (essentialness IN ('essential','discretionary'));

-- +goose Down
ALTER TABLE categories DROP COLUMN essentialness;
