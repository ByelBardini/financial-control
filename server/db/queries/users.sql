-- name: FindUserByEmail :one
-- Busca por e-mail case-insensitive (usa o índice único users_email_lower_key).
-- Devolve o hash e is_active pro service decidir (mantém o 401 genérico no service).
SELECT
    u.id::text          AS id,
    u.email             AS email,
    u.password_hash     AS password_hash,
    u.is_active         AS is_active,
    COALESCE(u.name, '') AS name
FROM users u
WHERE lower(u.email) = lower(sqlc.arg(email));

-- name: GetUserByID :one
-- Lookup por PK pro /auth/me e pro check de liveness no middleware (is_active).
SELECT
    u.id::text          AS id,
    u.email             AS email,
    u.is_active         AS is_active,
    COALESCE(u.name, '') AS name
FROM users u
WHERE u.id = sqlc.arg(id);
