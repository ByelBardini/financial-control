-- +goose Up
-- Investimentos: carteira com ativos + operações (compra/venda) + histórico de preço.
-- A posição (quantidade, preço médio, custo, valor, realizado) é DERIVADA das operações —
-- igual ao saldo, derivado do ledger; nada é cacheado. Dinheiro em NUMERIC(14,2); quantidade
-- em NUMERIC(28,8) (fracionária, p/ cripto). Ver docs/context/money.md e database.md.

CREATE TABLE investment_assets (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticker        text          NOT NULL,
    name          text          NOT NULL,
    asset_class   text          NOT NULL
                      CHECK (asset_class IN ('acoes','fiis','renda_fixa','cripto')),
    icon          text          NOT NULL,
    current_price numeric(14,2) NOT NULL DEFAULT 0 CHECK (current_price >= 0),
    is_archived   boolean       NOT NULL DEFAULT false,
    created_at    timestamptz   NOT NULL DEFAULT now(),
    updated_at    timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT inv_asset_ticker_not_blank CHECK (length(btrim(ticker)) > 0),
    CONSTRAINT inv_asset_name_not_blank   CHECK (length(btrim(name)) > 0)
);

-- Ticker único por usuário entre os ativos ATIVOS (arquivar libera recriar o mesmo ticker).
CREATE UNIQUE INDEX investment_assets_user_ticker_key
    ON investment_assets (user_id, ticker) WHERE is_archived = false;

CREATE TABLE investment_trades (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid          NOT NULL REFERENCES users(id)             ON DELETE CASCADE,
    asset_id   uuid          NOT NULL REFERENCES investment_assets(id) ON DELETE CASCADE,
    side       text          NOT NULL CHECK (side IN ('buy','sell')),
    quantity   numeric(28,8) NOT NULL CHECK (quantity > 0),
    unit_price numeric(14,2) NOT NULL CHECK (unit_price >= 0),
    traded_on  date          NOT NULL,
    created_at timestamptz   NOT NULL DEFAULT now()
);

CREATE TABLE investment_prices (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid          NOT NULL REFERENCES users(id)             ON DELETE CASCADE,
    asset_id    uuid          NOT NULL REFERENCES investment_assets(id) ON DELETE CASCADE,
    price       numeric(14,2) NOT NULL CHECK (price >= 0),
    observed_on date          NOT NULL,
    created_at  timestamptz   NOT NULL DEFAULT now()
);

CREATE TRIGGER investment_assets_set_updated_at
    BEFORE UPDATE ON investment_assets
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_investment_assets_user  ON investment_assets (user_id);
CREATE INDEX idx_investment_trades_asset ON investment_trades (asset_id);
CREATE INDEX idx_investment_trades_user  ON investment_trades (user_id);
CREATE INDEX idx_investment_prices_asset ON investment_prices (asset_id, observed_on);

-- +goose Down
DROP TABLE IF EXISTS investment_prices;
DROP TABLE IF EXISTS investment_trades;
DROP TABLE IF EXISTS investment_assets;
