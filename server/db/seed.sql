-- seed.sql — dados de exemplo para o dashboard. Idempotente (pode rodar de novo).
-- NÃO é uma migration goose; rode à mão:
--   psql "$DATABASE_URL" -f server/db/seed.sql
-- As transações são ancoradas no mês corrente via date_trunc('month', now()),
-- então /dashboard/summary nunca vem vazio no mês padrão.

BEGIN;

TRUNCATE transactions, recurring_rules, categories, accounts RESTART IDENTITY CASCADE;

-- Contas (banco, carteira em dinheiro e exchange)
INSERT INTO accounts (id, name, account_type, opening_balance, icon, tone, dot_color) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Nubank',  'checking', 1000.00, 'credit_card',            'primary', '#d0bcff'),
  ('a0000000-0000-0000-0000-000000000002', 'Carteira','cash',      300.00, 'account_balance_wallet', 'neutral', '#958ea0'),
  ('a0000000-0000-0000-0000-000000000003', 'Binance', 'exchange', 1450.00, 'currency_bitcoin',       'neutral', '#f3ba2f');

-- Categorias (uma de receita, três de despesa)
INSERT INTO categories (id, name, kind, color, icon, tone) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Salário',     'income',  '#33b58a', 'payments',        'secondary'),
  ('c0000000-0000-0000-0000-000000000002', 'Alimentação', 'expense', '#d0bcff', 'restaurant',      'primary'),
  ('c0000000-0000-0000-0000-000000000003', 'Transporte',  'expense', '#d0bcff', 'directions_car',  'primary'),
  ('c0000000-0000-0000-0000-000000000004', 'Lazer',       'expense', '#d0bcff', 'sports_esports',  'primary');

-- Receita do mês corrente
INSERT INTO transactions (account_id, category_id, description, direction, amount, occurred_on) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Salário', 'income', 3200.00, date_trunc('month', now())::date + 4);

-- Despesas avulsas do mês corrente
INSERT INTO transactions (account_id, category_id, description, direction, amount, occurred_on) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Mercado', 'expense', 620.00, date_trunc('month', now())::date + 5),
  ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 'Uber',    'expense', 210.00, date_trunc('month', now())::date + 6),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'Cinema',  'expense',  85.50, date_trunc('month', now())::date + 7);

-- Compra parcelada (3x de 100), duas parcelas caindo neste mês
INSERT INTO transactions
  (account_id, category_id, description, kind, direction, amount, occurred_on,
   purchase_group_id, installment_number, installment_total, purchase_total_amount) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'Fone (1/3)', 'installment', 'expense', 100.00, date_trunc('month', now())::date + 8,
   'd0000000-0000-0000-0000-000000000001', 1, 3, 300.00),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'Fone (2/3)', 'installment', 'expense', 100.00, date_trunc('month', now())::date + 9,
   'd0000000-0000-0000-0000-000000000001', 2, 3, 300.00);

COMMIT;

-- Resumo esperado no mês corrente:
--   receitas = 3200.00 (320000c) | gastos = 620+210+85,50+100+100 = 1115,50 (111550c)
--   net = 208450c | spentPercent ≈ 35 ("No controle") | villain = Alimentação (62000c)
