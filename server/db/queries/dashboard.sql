-- name: GetMonthSummary :one
-- Receitas e gastos do mês de @reference_date, em centavos (bigint). Mês vazio → 0.
-- Escopado por usuário.
SELECT
    (COALESCE(SUM(amount) FILTER (WHERE direction = 'income'),  0) * 100)::bigint AS receitas_cents,
    (COALESCE(SUM(amount) FILTER (WHERE direction = 'expense'), 0) * 100)::bigint AS gastos_cents
FROM transactions
WHERE user_id = sqlc.arg(user_id)
  AND kind <> 'investment' -- aporte/resgate move saldo, mas não é gasto/renda do mês
  AND kind <> 'transfer'   -- transferência move saldo entre contas, mas não é receita/gasto
  AND occurred_on >= date_trunc('month', sqlc.arg(reference_date)::date)
  AND occurred_on <  date_trunc('month', sqlc.arg(reference_date)::date) + interval '1 month';

-- name: ListCategorySpend :many
-- Gasto por categoria (apenas despesas) no mês de @reference_date, em centavos (bigint).
-- Escopado por usuário nos DOIS lados do join (transação e categoria do mesmo dono).
-- Aproveita o índice parcial idx_transactions_user_cat_exp. Maior gasto primeiro.
SELECT
    c.id::text                    AS id,
    c.name                        AS label,
    c.tone                        AS tone,
    (SUM(t.amount) * 100)::bigint AS amount_cents
FROM transactions t
JOIN categories c ON c.id = t.category_id AND c.user_id = t.user_id
WHERE t.direction = 'expense'
  AND t.kind <> 'investment' -- aporte não é gasto por categoria
  AND t.kind <> 'transfer'   -- transferência não é gasto por categoria
  AND t.user_id = sqlc.arg(user_id)
  AND t.occurred_on >= date_trunc('month', sqlc.arg(reference_date)::date)
  AND t.occurred_on <  date_trunc('month', sqlc.arg(reference_date)::date) + interval '1 month'
GROUP BY c.id, c.name, c.tone
ORDER BY amount_cents DESC;
