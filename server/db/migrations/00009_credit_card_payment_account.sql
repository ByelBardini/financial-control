-- +goose Up
-- Vincula cada cartão de crédito a uma conta de banco (a conta que paga a fatura).
-- payment_account_id só existe (e é obrigatório) em credit_card; nas demais contas é NULL.
-- O CHECK garante a coerência estrutural (cartão ⇔ tem conta de pagamento); a validação de que
-- o alvo é uma conta de banco (checking/savings) do próprio usuário fica no server (pacote account).
-- Cartões legados (sem vínculo) são APAGADOS antes do CHECK — decisão de produto: cartão sem conta
-- vinculada deixa de existir, sem fallback. As transações do cartão caem por ON DELETE CASCADE.

ALTER TABLE accounts ADD COLUMN payment_account_id uuid REFERENCES accounts(id) ON DELETE RESTRICT;

DELETE FROM accounts WHERE account_type = 'credit_card';

ALTER TABLE accounts ADD CONSTRAINT card_payment_account_coherent CHECK (
    (account_type =  'credit_card' AND payment_account_id IS NOT NULL)
    OR
    (account_type <> 'credit_card' AND payment_account_id IS NULL)
);

CREATE INDEX idx_accounts_payment_account ON accounts (payment_account_id)
    WHERE payment_account_id IS NOT NULL;

-- +goose Down
DROP INDEX IF EXISTS idx_accounts_payment_account;
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS card_payment_account_coherent;
ALTER TABLE accounts DROP COLUMN payment_account_id;
