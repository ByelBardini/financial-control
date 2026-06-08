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

-- name: GetAccountByIDWithBalance :one
-- Conta única do usuário (escopada por id + user_id) com saldo derivado em centavos.
-- Usada pra montar a resposta após criar/editar. ErrNoRows quando não é do usuário.
SELECT
    a.id::text                                                              AS id,
    a.name                                                                  AS name,
    a.account_type                                                          AS account_type,
    COALESCE(a.subtitle, '')                                                AS subtitle,
    ((a.opening_balance + COALESCE(SUM(t.signed_amount), 0)) * 100)::bigint AS balance_cents,
    a.icon                                                                  AS icon,
    a.tone                                                                  AS tone,
    a.dot_color                                                             AS dot_color,
    (COALESCE(a.credit_limit, 0) * 100)::bigint                             AS credit_limit_cents
FROM accounts a
LEFT JOIN transactions t ON t.account_id = a.id AND t.user_id = a.user_id
WHERE a.id = sqlc.arg(id)
  AND a.user_id = sqlc.arg(user_id)
  AND a.is_archived = false
GROUP BY a.id, a.name, a.account_type, a.subtitle, a.opening_balance, a.icon, a.tone, a.dot_color, a.credit_limit;

-- name: CreateAccount :one
-- Cria conta do usuário. Dinheiro entra em centavos (bigint) e vira NUMERIC no insert.
INSERT INTO accounts (
    user_id, name, account_type, opening_balance, icon, tone, dot_color, subtitle, credit_limit
) VALUES (
    sqlc.arg(user_id),
    sqlc.arg(name),
    sqlc.arg(account_type),
    (sqlc.arg(opening_balance_cents)::bigint)::numeric / 100,
    sqlc.arg(icon),
    sqlc.arg(tone),
    sqlc.arg(dot_color),
    sqlc.narg(subtitle),
    (sqlc.narg(credit_limit_cents)::bigint)::numeric / 100
)
RETURNING id::text AS id;

-- name: UpdateAccount :one
-- Atualiza os campos mutáveis da conta (escopado por id + user_id). NÃO altera o
-- opening_balance: saldo só muda via transações, nunca por edição manual. RETURNING
-- vazio (ErrNoRows) quando a conta não é do usuário ou já está arquivada → 404.
UPDATE accounts SET
    name         = sqlc.arg(name),
    account_type = sqlc.arg(account_type),
    icon         = sqlc.arg(icon),
    tone         = sqlc.arg(tone),
    dot_color    = sqlc.arg(dot_color),
    subtitle     = sqlc.narg(subtitle),
    credit_limit = (sqlc.narg(credit_limit_cents)::bigint)::numeric / 100
WHERE id = sqlc.arg(id)
  AND user_id = sqlc.arg(user_id)
  AND is_archived = false
RETURNING id::text AS id;

-- name: ArchiveAccount :one
-- Soft-delete: marca a conta como arquivada (escopado por id + user_id). RETURNING
-- vazio (ErrNoRows) quando não é do usuário ou já estava arquivada → 404 no service.
UPDATE accounts SET is_archived = true
WHERE id = sqlc.arg(id)
  AND user_id = sqlc.arg(user_id)
  AND is_archived = false
RETURNING id::text AS id;
