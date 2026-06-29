-- Quebra do patrimônio em CONTAS do usuário, em centavos. Líquido = bancos + espécie
-- (o "quanto eu tenho hoje"); cartão (dívida) e vales ficam à parte. O saldo por conta é
-- derivado (opening_balance + soma do ledger); a soma por tipo usa FILTER numa varredura só.
-- Escopo por user_id nos dois lados do join (isolamento). Cast p/ centavos (bigint) no SQL.

-- name: GetLiquidBreakdown :one
WITH per_account AS (
    SELECT
        a.account_type                                        AS account_type,
        a.opening_balance + COALESCE(SUM(t.signed_amount), 0) AS balance
    FROM accounts a
    LEFT JOIN transactions t ON t.account_id = a.id AND t.user_id = a.user_id
    WHERE a.is_archived = false
      AND a.user_id = sqlc.arg(user_id)
    GROUP BY a.id, a.account_type, a.opening_balance
)
SELECT
    (COALESCE(SUM(balance) FILTER (WHERE account_type IN ('checking', 'savings')), 0) * 100)::bigint     AS bank_cents,
    (COALESCE(SUM(balance) FILTER (WHERE account_type = 'cash'), 0) * 100)::bigint                       AS cash_cents,
    (COALESCE(SUM(-balance) FILTER (WHERE account_type = 'credit_card' AND balance < 0), 0) * 100)::bigint AS card_debt_cents,
    (COALESCE(SUM(balance) FILTER (WHERE account_type = 'voucher'), 0) * 100)::bigint                    AS voucher_cents
FROM per_account;
