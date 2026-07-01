-- name: CreateTransfer :many
-- Transferência entre contas como dupla entrada num único statement (atômico): uma perna
-- 'expense' na origem e uma 'income' no destino, ambas kind='transfer' e dividindo um
-- transfer_group_id gerado uma vez no CTE. Só insere se origem ≠ destino E as DUAS contas são
-- do usuário e não arquivadas — as guardas não dependem da perna, então é tudo-ou-nada (2 linhas
-- no sucesso, 0 se qualquer guarda falhar; nunca 1). Centavos → NUMERIC na borda. RETURNING
-- devolve o group_id (igual nas duas linhas) pro store confirmar o par e ecoar o grupo.
WITH grp AS (SELECT gen_random_uuid() AS gid)
INSERT INTO transactions
    (user_id, account_id, description, kind, direction, amount, occurred_on, transfer_group_id)
SELECT
    sqlc.arg(user_id),
    leg.account_id,
    sqlc.arg(description),
    'transfer',
    leg.direction,
    (sqlc.arg(amount_cents)::bigint)::numeric / 100,
    sqlc.arg(occurred_on)::date,
    grp.gid
FROM (VALUES
    (sqlc.arg(origin_account_id)::uuid,      'expense'),
    (sqlc.arg(destination_account_id)::uuid, 'income')
) AS leg(account_id, direction)
CROSS JOIN grp
WHERE sqlc.arg(origin_account_id)::uuid <> sqlc.arg(destination_account_id)::uuid
  AND EXISTS (
    SELECT 1 FROM accounts
    WHERE id = sqlc.arg(origin_account_id) AND user_id = sqlc.arg(user_id) AND is_archived = false
  )
  AND EXISTS (
    SELECT 1 FROM accounts
    WHERE id = sqlc.arg(destination_account_id) AND user_id = sqlc.arg(user_id) AND is_archived = false
  )
RETURNING transfer_group_id::text AS group_id;
