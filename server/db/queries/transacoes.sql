-- Queries da tela de Transações. Valores em centavos (bigint) com cast no SQL.
-- Tudo escopado por user_id, com os joins filtrados pelo mesmo dono (isolamento nos
-- dois lados). Personalidade (tag/colapso/notas) e labels de data são derivados em Go;
-- aqui só sai dado real.

-- name: ListTransactionsFiltered :many
-- Log de transações do usuário com filtros opcionais (período via @since/@until, categorias
-- — OR entre elas — e busca ILIKE por descrição/categoria) + paginação. total_count (window)
-- traz o total do filtro numa query só. Categoria pode ser nula → COALESCE. Recentes primeiro.
SELECT
    t.id::text                   AS id,
    t.occurred_on                AS occurred_on,
    t.description                AS description,
    a.name                       AS account_name,
    COALESCE(c.name, '')         AS category_name,
    COALESCE(c.icon, 'payments') AS category_icon,
    t.direction                  AS direction,
    (t.amount * 100)::bigint     AS amount_cents,
    COUNT(*) OVER()::bigint      AS total_count
FROM transactions t
JOIN accounts a ON a.id = t.account_id AND a.user_id = t.user_id
LEFT JOIN categories c ON c.id = t.category_id AND c.user_id = t.user_id
WHERE t.user_id = sqlc.arg(user_id)
  AND (sqlc.narg(since)::date IS NULL OR t.occurred_on >= sqlc.narg(since))
  AND (sqlc.narg(until)::date IS NULL OR t.occurred_on <= sqlc.narg(until))
  AND (
    cardinality(sqlc.arg(category_ids)::uuid[]) = 0
    OR t.category_id = ANY(sqlc.arg(category_ids)::uuid[])
  )
  AND (
    sqlc.arg(q)::text = ''
    OR t.description ILIKE '%' || sqlc.arg(q) || '%'
    OR COALESCE(c.name, '') ILIKE '%' || sqlc.arg(q) || '%'
  )
ORDER BY t.occurred_on DESC, t.booked_at DESC
LIMIT sqlc.arg(lim) OFFSET sqlc.arg(off);

-- name: ListCategories :many
-- Categorias ativas do usuário — alimenta o filtro de categoria da tela de Transações.
SELECT
    c.id::text AS id,
    c.name     AS name,
    c.icon     AS icon,
    c.kind     AS kind
FROM categories c
WHERE c.user_id = sqlc.arg(user_id)
  AND c.is_archived = false
ORDER BY c.name;

-- name: ListActiveRecurringRules :many
-- Regras de recorrência ativas do usuário, com a categoria juntada (nome + ícone).
-- Receitas (income) antes das despesas; maior valor primeiro.
SELECT
    r.id::text                   AS id,
    r.description                AS description,
    COALESCE(c.name, '')         AS category_name,
    COALESCE(c.icon, 'payments') AS category_icon,
    r.direction                  AS direction,
    (r.amount * 100)::bigint     AS amount_cents
FROM recurring_rules r
LEFT JOIN categories c ON c.id = r.category_id AND c.user_id = r.user_id
WHERE r.user_id = sqlc.arg(user_id)
  AND r.is_active = true
ORDER BY r.direction DESC, r.amount DESC;

-- name: ListInstallmentDebts :many
-- Compras parceladas (kind='installment') do usuário agrupadas por purchase_group_id:
-- progresso (parcelas lançadas / total), valor da parcela e ícone da categoria. Em
-- centavos. COALESCE em tudo p/ o sqlc gerar tipos não-nulos. Mais recentes primeiro.
SELECT
    COALESCE(t.purchase_group_id::text, '')::text AS group_id,
    MIN(t.description)::text                       AS description,
    COALESCE(MAX(t.installment_total), 0)::int     AS installment_total,
    COUNT(*)::int                                  AS installments_paid,
    (COALESCE(MAX(t.amount), 0) * 100)::bigint      AS installment_cents,
    COALESCE(MAX(c.icon), 'payments')::text        AS category_icon
FROM transactions t
LEFT JOIN categories c ON c.id = t.category_id AND c.user_id = t.user_id
WHERE t.user_id = sqlc.arg(user_id)
  AND t.kind = 'installment'
GROUP BY t.purchase_group_id
ORDER BY MIN(t.occurred_on) DESC;

-- name: CreateTransaction :one
-- Cria uma transação 'standard' do usuário. Só insere se a conta (e a categoria, se
-- informada) pertencem ao usuário — impede anexar transação à conta de outro dono.
-- 0 linhas (ErrNoRows no store) → conta/categoria inválida. Centavos → NUMERIC na borda.
INSERT INTO transactions (user_id, account_id, category_id, description, direction, amount, occurred_on)
SELECT
    sqlc.arg(user_id),
    sqlc.arg(account_id),
    sqlc.narg(category_id),
    sqlc.arg(description),
    sqlc.arg(direction),
    (sqlc.arg(amount_cents)::bigint)::numeric / 100,
    sqlc.arg(occurred_on)
WHERE EXISTS (
    SELECT 1 FROM accounts
    WHERE accounts.id = sqlc.arg(account_id) AND accounts.user_id = sqlc.arg(user_id) AND accounts.is_archived = false
)
  AND (
    sqlc.narg(category_id)::uuid IS NULL
    OR EXISTS (SELECT 1 FROM categories WHERE categories.id = sqlc.narg(category_id) AND categories.user_id = sqlc.arg(user_id))
  )
RETURNING id::text AS id;

-- name: GetTransactionByID :one
-- Transação única do usuário (escopada por id + user_id) com conta/categoria juntadas,
-- em centavos. Usada pra montar a resposta após criar/editar e pra pré-preencher a edição.
SELECT
    t.id::text                        AS id,
    t.account_id::text                AS account_id,
    COALESCE(t.category_id::text, '')::text AS category_id,
    t.description                     AS description,
    t.direction                       AS direction,
    (t.amount * 100)::bigint          AS amount_cents,
    t.occurred_on                     AS occurred_on,
    a.name                            AS account_name,
    COALESCE(c.name, '')              AS category_name,
    COALESCE(c.icon, 'payments')      AS category_icon
FROM transactions t
JOIN accounts a ON a.id = t.account_id AND a.user_id = t.user_id
LEFT JOIN categories c ON c.id = t.category_id AND c.user_id = t.user_id
WHERE t.id = sqlc.arg(id)
  AND t.user_id = sqlc.arg(user_id);

-- name: UpdateTransaction :one
-- Edita os campos mutáveis de uma transação 'standard' (escopada por id + user_id). Não
-- troca de conta. A categoria nova precisa ser do usuário. RETURNING vazio (ErrNoRows →
-- 404) quando a transação não é do usuário. Centavos → NUMERIC; direction flipa o signed_amount.
UPDATE transactions SET
    category_id = sqlc.narg(category_id),
    description = sqlc.arg(description),
    direction   = sqlc.arg(direction),
    amount      = (sqlc.arg(amount_cents)::bigint)::numeric / 100,
    occurred_on = sqlc.arg(occurred_on)
WHERE transactions.id = sqlc.arg(id)
  AND transactions.user_id = sqlc.arg(user_id)
  AND (
    sqlc.narg(category_id)::uuid IS NULL
    OR EXISTS (SELECT 1 FROM categories WHERE categories.id = sqlc.narg(category_id) AND categories.user_id = sqlc.arg(user_id))
  )
RETURNING id::text AS id;

-- name: DeleteTransaction :one
-- Exclui (hard delete — transação não tem soft-delete) escopada por id + user_id.
-- RETURNING vazio (ErrNoRows → 404) quando não é do usuário.
DELETE FROM transactions
WHERE id = sqlc.arg(id)
  AND user_id = sqlc.arg(user_id)
RETURNING id::text AS id;
