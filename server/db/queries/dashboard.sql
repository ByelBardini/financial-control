-- name: GetMonthSummary :one
-- Receitas e gastos do mês de @reference_date, em centavos (bigint). Mês vazio → 0.
SELECT
    (COALESCE(SUM(amount) FILTER (WHERE direction = 'income'),  0) * 100)::bigint AS receitas_cents,
    (COALESCE(SUM(amount) FILTER (WHERE direction = 'expense'), 0) * 100)::bigint AS gastos_cents
FROM transactions
WHERE occurred_on >= date_trunc('month', sqlc.arg(reference_date)::date)
  AND occurred_on <  date_trunc('month', sqlc.arg(reference_date)::date) + interval '1 month';

-- name: ListCategorySpend :many
-- Gasto por categoria (apenas despesas) no mês de @reference_date, em centavos (bigint).
-- Aproveita o índice parcial idx_transactions_cat_month. Maior gasto primeiro.
SELECT
    c.id::text                    AS id,
    c.name                        AS label,
    c.tone                        AS tone,
    (SUM(t.amount) * 100)::bigint AS amount_cents
FROM transactions t
JOIN categories c ON c.id = t.category_id
WHERE t.direction = 'expense'
  AND t.occurred_on >= date_trunc('month', sqlc.arg(reference_date)::date)
  AND t.occurred_on <  date_trunc('month', sqlc.arg(reference_date)::date) + interval '1 month'
GROUP BY c.id, c.name, c.tone
ORDER BY amount_cents DESC;
