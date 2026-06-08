-- Queries da tela de Contas. Saldo é derivado (opening_balance + soma do ledger),
-- convertido p/ centavos (bigint) com cast no SQL. Tudo escopado por user_id, com
-- o join de transações filtrado pelo mesmo dono (isolamento nos dois lados).

-- name: ListBankAccounts :many
-- Contas "Bancos": corrente + poupança, com saldo e campos de apresentação.
SELECT
    a.id::text                                                              AS id,
    a.name                                                                  AS name,
    COALESCE(a.subtitle, '')                                                AS subtitle,
    ((a.opening_balance + COALESCE(SUM(t.signed_amount), 0)) * 100)::bigint AS balance_cents,
    a.icon                                                                  AS icon,
    a.tone                                                                  AS tone,
    a.dot_color                                                             AS dot_color
FROM accounts a
LEFT JOIN transactions t ON t.account_id = a.id AND t.user_id = a.user_id
WHERE a.is_archived = false
  AND a.user_id = sqlc.arg(user_id)
  AND a.account_type IN ('checking', 'savings')
GROUP BY a.id, a.name, a.subtitle, a.opening_balance, a.icon, a.tone, a.dot_color
ORDER BY a.name;

-- name: ListVoucherAccounts :many
-- Contas "Vales": saldo atual + valor concedido (opening_balance) como baseline de 100%.
SELECT
    a.id::text                                                              AS id,
    a.name                                                                  AS name,
    ((a.opening_balance + COALESCE(SUM(t.signed_amount), 0)) * 100)::bigint AS balance_cents,
    (a.opening_balance * 100)::bigint                                       AS granted_cents,
    a.icon                                                                  AS icon
FROM accounts a
LEFT JOIN transactions t ON t.account_id = a.id AND t.user_id = a.user_id
WHERE a.is_archived = false
  AND a.user_id = sqlc.arg(user_id)
  AND a.account_type = 'voucher'
GROUP BY a.id, a.name, a.opening_balance, a.icon
ORDER BY a.name;

-- name: GetCashBalance :one
-- "Carteira Física": saldo total das contas em espécie (cash) do usuário.
SELECT COALESCE(SUM(bal), 0)::bigint AS balance_cents
FROM (
    SELECT (a.opening_balance + COALESCE(SUM(t.signed_amount), 0)) * 100 AS bal
    FROM accounts a
    LEFT JOIN transactions t ON t.account_id = a.id AND t.user_id = a.user_id
    WHERE a.is_archived = false
      AND a.user_id = sqlc.arg(user_id)
      AND a.account_type = 'cash'
    GROUP BY a.id, a.opening_balance
) s;

-- name: ListCreditAccounts :many
-- Cartões de crédito do usuário: saldo (negativo = dívida) + limite + apresentação,
-- p/ a seção "Cartões" (por cartão) e o Raio-X (somado).
SELECT
    a.id::text                                                              AS id,
    a.name                                                                  AS name,
    ((a.opening_balance + COALESCE(SUM(t.signed_amount), 0)) * 100)::bigint AS balance_cents,
    (COALESCE(a.credit_limit, 0) * 100)::bigint                             AS limit_cents,
    a.icon                                                                  AS icon,
    a.dot_color                                                             AS dot_color
FROM accounts a
LEFT JOIN transactions t ON t.account_id = a.id AND t.user_id = a.user_id
WHERE a.is_archived = false
  AND a.user_id = sqlc.arg(user_id)
  AND a.account_type = 'credit_card'
GROUP BY a.id, a.name, a.opening_balance, a.credit_limit, a.icon, a.dot_color
ORDER BY a.name;
