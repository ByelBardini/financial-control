-- name: ListAccountsWithBalance :many
-- Saldo all-time (não mês): opening_balance + soma do ledger, em centavos (bigint).
-- Escopado por usuário: contas do usuário + apenas transações dele no join.
SELECT
    a.id::text                                                             AS id,
    a.name                                                                 AS name,
    ((a.opening_balance + COALESCE(SUM(t.signed_amount), 0)) * 100)::bigint AS balance_cents,
    a.icon                                                                 AS icon,
    a.tone                                                                 AS tone,
    a.dot_color                                                            AS dot_color
FROM accounts a
LEFT JOIN transactions t ON t.account_id = a.id AND t.user_id = a.user_id
WHERE a.is_archived = false
  AND a.user_id = sqlc.arg(user_id)
GROUP BY a.id, a.name, a.opening_balance, a.icon, a.tone, a.dot_color
ORDER BY a.name;
