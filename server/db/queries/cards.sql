-- Queries do detalhe de um cartão de crédito (tela de detalhe). Saldo derivado (centavos via
-- cast no SQL), tudo escopado por user_id + o id do cartão. A "fatura por mês" é uma VIEW de
-- agrupamento sobre as transações do cartão (por mês de occurred_on) — não redefine limite nem
-- disponível, que continuam vindo do saldo all-time (igual ao creditCardView). Ver server-api.md.

-- name: GetCardSummary :one
-- Cabeçalho do cartão (escopado por id+user, só credit_card ativo): nome/ícone/cor + limite e
-- saldo all-time (opening_balance + soma do ledger). 0 linhas (ErrNoRows) → não é cartão do
-- usuário → ErrCardNotFound (handler responde 404). O service deriva fatura/disponível disso.
SELECT
    a.id::text                                                              AS id,
    a.name                                                                  AS name,
    a.icon                                                                  AS icon,
    a.dot_color                                                             AS dot_color,
    (COALESCE(a.credit_limit, 0) * 100)::bigint                             AS limit_cents,
    ((a.opening_balance + COALESCE(SUM(t.signed_amount), 0)) * 100)::bigint AS balance_cents,
    (COALESCE(a.payment_account_id::text, ''))::text                        AS payment_account_id
FROM accounts a
LEFT JOIN transactions t ON t.account_id = a.id AND t.user_id = a.user_id
WHERE a.id = sqlc.arg(card_id)
  AND a.user_id = sqlc.arg(user_id)
  AND a.account_type = 'credit_card'
  AND a.is_archived = false
GROUP BY a.id, a.name, a.icon, a.dot_color, a.credit_limit, a.opening_balance, a.payment_account_id;

-- name: ListCardEntries :many
-- Lançamentos do cartão (escopado por user+conta), com o mês de competência (YYYY-MM) e a
-- categoria juntada (mesmo dono nos dois lados). O service agrupa por mês → faturas. Ordenado
-- do mais recente pro mais antigo, então os meses já saem em ordem decrescente.
SELECT
    t.id::text                                            AS id,
    to_char(date_trunc('month', t.occurred_on), 'YYYY-MM') AS month,
    t.occurred_on                                         AS occurred_on,
    t.description                                         AS description,
    t.direction                                           AS direction,
    (t.amount * 100)::bigint                              AS amount_cents,
    t.kind                                                AS kind,
    COALESCE(c.name, '')                                  AS category_name,
    COALESCE(c.icon, '')                                  AS category_icon
FROM transactions t
LEFT JOIN categories c ON c.id = t.category_id AND c.user_id = t.user_id
WHERE t.user_id = sqlc.arg(user_id)
  AND t.account_id = sqlc.arg(card_id)
ORDER BY t.occurred_on DESC, t.id;
