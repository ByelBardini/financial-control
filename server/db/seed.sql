-- seed.sql — dados de exemplo para o dashboard. Idempotente (pode rodar de novo).
-- NÃO é uma migration goose; rode à mão:
--   psql "$DATABASE_URL" -f server/db/seed.sql
-- As transações são ancoradas no mês corrente via date_trunc('month', now()),
-- então /dashboard/summary nunca vem vazio no mês padrão.
-- Tudo pertence ao usuário padrão (teste@teste.com), criado na migration 00002.

BEGIN;

TRUNCATE transactions, recurring_rules, categories, accounts,
         investment_prices, investment_trades, investment_assets RESTART IDENTITY CASCADE;

-- Contas (banco, carteira em dinheiro e exchange) — do usuário padrão
INSERT INTO accounts (id, user_id, name, account_type, opening_balance, icon, tone, dot_color) VALUES
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Nubank',  'checking', 1000.00, 'credit_card',            'primary', '#d0bcff'),
  ('a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Carteira','cash',      300.00, 'account_balance_wallet', 'neutral', '#958ea0'),
  ('a0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Binance', 'exchange', 1450.00, 'currency_bitcoin',       'neutral', '#f3ba2f');

-- Categorias (uma de receita, três de despesa) — do usuário padrão. essentialness define a
-- tag da despesa: Alimentação/Transporte = essential (Sobrevivência); Lazer = discretionary
-- (Supérfluo). Salário é receita (essentialness não é lida; fica no default).
INSERT INTO categories (id, user_id, name, kind, color, icon, tone, essentialness) VALUES
  ('c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Salário',     'income',  '#33b58a', 'payments',        'secondary', 'discretionary'),
  ('c0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Alimentação', 'expense', '#d0bcff', 'restaurant',      'primary',   'essential'),
  ('c0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Transporte',  'expense', '#d0bcff', 'directions_car',  'primary',   'essential'),
  ('c0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Lazer',       'expense', '#d0bcff', 'sports_esports',  'primary',   'discretionary');

-- Receita do mês corrente
INSERT INTO transactions (account_id, user_id, category_id, description, direction, amount, occurred_on) VALUES
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Salário', 'income', 3200.00, date_trunc('month', now())::date + 4);

-- Despesas avulsas do mês corrente
INSERT INTO transactions (account_id, user_id, category_id, description, direction, amount, occurred_on) VALUES
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Mercado', 'expense', 620.00, date_trunc('month', now())::date + 5),
  ('a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Uber',    'expense', 210.00, date_trunc('month', now())::date + 6),
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'Cinema',  'expense',  85.50, date_trunc('month', now())::date + 7);

-- Compra parcelada (3x de 100), duas parcelas caindo neste mês
INSERT INTO transactions
  (account_id, user_id, category_id, description, kind, direction, amount, occurred_on,
   purchase_group_id, installment_number, installment_total, purchase_total_amount) VALUES
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'Fone (1/3)', 'installment', 'expense', 100.00, date_trunc('month', now())::date + 8,
   'd0000000-0000-0000-0000-000000000001', 1, 3, 300.00),
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'Fone (2/3)', 'installment', 'expense', 100.00, date_trunc('month', now())::date + 9,
   'd0000000-0000-0000-0000-000000000001', 2, 3, 300.00);

-- Regras de recorrência (alimentam /transacoes/recurrences) — do usuário padrão.
-- Uma receita (Salário) e duas assinaturas (Netflix/Gympass) na categoria Lazer.
INSERT INTO recurring_rules
  (account_id, user_id, category_id, description, direction, amount, frequency, start_date) VALUES
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Salário Base', 'income',  3200.00, 'monthly', date_trunc('month', now())::date),
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'Netflix',      'expense',   55.90, 'monthly', date_trunc('month', now())::date),
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'Gympass',      'expense',  120.00, 'monthly', date_trunc('month', now())::date);

-- Investimentos — ativos do usuário padrão (Ações/FIIs/Renda Fixa + cripto à parte).
-- A posição é DERIVADA das operações; current_price é o "último preço" manual.
INSERT INTO investment_assets (id, user_id, ticker, name, asset_class, icon, current_price) VALUES
  ('f0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'PETR4',   'Petrobras PN',       'acoes',      'local_gas_station',     9.50),
  ('f0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'VALE3',   'Vale ON',            'acoes',      'corporate_fare',       61.00),
  ('f0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'MXRF11',  'Maxi Renda FII',     'fiis',       'account_balance',      10.45),
  ('f0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'SELIC29', 'Tesouro Selic 2029', 'renda_fixa', 'savings',             102.00),
  ('f0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'BTC',     'Bitcoin',            'cripto',     'currency_bitcoin', 341250.00);

-- Operações (compra/venda). PETR4 tem compra+compra+venda (ordem importa p/ o preço médio).
INSERT INTO investment_trades (user_id, asset_id, side, quantity, unit_price, traded_on) VALUES
  ('00000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'buy',  100.00000000,     10.00, now()::date - 60),
  ('00000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'buy',  100.00000000,     12.00, now()::date - 50),
  ('00000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'sell',  50.00000000,     13.00, now()::date - 40),
  ('00000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000002', 'buy',   30.00000000,     70.00, now()::date - 45),
  ('00000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000003', 'buy',  200.00000000,     10.20, now()::date - 40),
  ('00000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000004', 'buy',   10.00000000,    100.00, now()::date - 30),
  ('00000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000005', 'buy',    0.00100000, 300000.00, now()::date - 25);

-- Histórico de preço do BTC (alimenta o `series` do gráfico da cripto), em ordem cronológica.
INSERT INTO investment_prices (user_id, asset_id, price, observed_on) VALUES
  ('00000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000005', 320000.00, now()::date - 20),
  ('00000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000005', 325000.00, now()::date - 15),
  ('00000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000005', 330000.00, now()::date - 10),
  ('00000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000005', 335000.00, now()::date - 5),
  ('00000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000005', 341250.00, now()::date);

COMMIT;

-- Resumo esperado no mês corrente (usuário padrão):
--   receitas = 3200.00 (320000c) | gastos = 620+210+85,50+100+100 = 1115,50 (111550c)
--   net = 208450c | spentPercent ≈ 35 ("No controle") | villain = Alimentação (62000c)
--
-- Investimentos esperados (posição derivada):
--   PETR4  → net 150, preço médio 11,00 (1100c), custo 1650,00, valor 1425,00, realizado 100,00
--   VALE3  → net 30,  custo 2100,00, valor 1830,00
--   MXRF11 → net 200, custo 2040,00, valor 2090,00
--   SELIC29→ net 10,  custo 1000,00, valor 1020,00
--   Geral (sem cripto): valor 6365,00 (636500c) | custo 6790,00 | ganho -425,00 | realizado 100,00
--   BTC (cripto, à parte): net 0.001, custo 300,00, valor 341,25 (34125c), série de 5 preços
