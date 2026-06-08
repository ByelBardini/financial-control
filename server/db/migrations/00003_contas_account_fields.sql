-- +goose Up
-- Campos pra tela de Contas: novo tipo 'voucher' (vales/benefícios), subtítulo da
-- conta ("Conta Corrente • Final 4022") e limite de crédito (cartão, p/ o Raio-X).
-- Dinheiro em NUMERIC(14,2) (ver docs/context/money.md). Saldo segue derivado.

ALTER TABLE accounts DROP CONSTRAINT accounts_account_type_check;
ALTER TABLE accounts ADD CONSTRAINT accounts_account_type_check
    CHECK (account_type IN ('checking','cash','exchange','credit_card','savings','voucher'));

ALTER TABLE accounts ADD COLUMN subtitle text;
ALTER TABLE accounts ADD COLUMN credit_limit numeric(14,2)
    CONSTRAINT accounts_credit_limit_non_negative CHECK (credit_limit IS NULL OR credit_limit >= 0);

-- +goose Down
ALTER TABLE accounts DROP COLUMN credit_limit;
ALTER TABLE accounts DROP COLUMN subtitle;
ALTER TABLE accounts DROP CONSTRAINT accounts_account_type_check;
ALTER TABLE accounts ADD CONSTRAINT accounts_account_type_check
    CHECK (account_type IN ('checking','cash','exchange','credit_card','savings'));
