-- +goose Up
-- Liquidação dos investimentos em conta: comprar/vender passa a mexer no saldo de uma conta,
-- via uma transação `kind='investment'` ligada ao trade (compra = expense, venda = income).
-- Saldo segue derivado de transactions; o resumo do mês exclui kind='investment' (aporte/resgate
-- não é gasto/renda). Ver docs/context/investimentos.md, transacoes.md e money.md.

-- Novo kind 'investment' nas transações (a tx_installment_coherent já cobre kind <> 'installment').
ALTER TABLE transactions DROP CONSTRAINT transactions_kind_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_kind_check
    CHECK (kind IN ('standard','installment','transfer','investment'));

-- Liga a transação de caixa ao trade que a originou: excluir o trade reverte o caixa (CASCADE).
ALTER TABLE transactions ADD COLUMN investment_trade_id uuid
    REFERENCES investment_trades(id) ON DELETE CASCADE;
CREATE INDEX idx_transactions_investment_trade
    ON transactions (investment_trade_id) WHERE investment_trade_id IS NOT NULL;

-- Conta em que a operação liquidou (nullable: trades legados/seed = NULL, sem movimento de caixa).
ALTER TABLE investment_trades ADD COLUMN account_id uuid REFERENCES accounts(id);

-- +goose Down
ALTER TABLE investment_trades DROP COLUMN account_id;
DROP INDEX IF EXISTS idx_transactions_investment_trade;
ALTER TABLE transactions DROP COLUMN investment_trade_id;
ALTER TABLE transactions DROP CONSTRAINT transactions_kind_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_kind_check
    CHECK (kind IN ('standard','installment','transfer'));
