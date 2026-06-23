import type { IconName } from '../components/Icon';
import type {
  AssetClass,
  AssetDetail,
  CreateAssetInput,
  UpdateAssetInput,
} from '../types/investimentos';

// Metadados de cada classe de ativo: rótulo PT + ícone padrão (pré-seleção ao criar/trocar).
type AssetClassMeta = { value: AssetClass; label: string; defaultIcon: IconName };

export const ASSET_CLASSES: AssetClassMeta[] = [
  { value: 'acoes', label: 'Ações', defaultIcon: 'corporate_fare' },
  { value: 'fiis', label: 'FIIs', defaultIcon: 'account_balance' },
  { value: 'renda_fixa', label: 'Renda Fixa', defaultIcon: 'savings' },
  { value: 'cripto', label: 'Cripto', defaultIcon: 'currency_bitcoin' },
];

// Ícones oferecidos no form pra distinguir ativos visualmente.
export const ASSET_ICON_PRESETS: IconName[] = [
  'corporate_fare',
  'account_balance',
  'savings',
  'currency_bitcoin',
  'trending_up',
  'payments',
  'wallet',
  'category',
];

export function assetClassMeta(value: AssetClass): AssetClassMeta {
  return ASSET_CLASSES.find((c) => c.value === value) ?? ASSET_CLASSES[0];
}

// Valores controlados do form de ativo (preço atual em centavos).
export type AssetFormValues = {
  ticker: string;
  name: string;
  assetClass: AssetClass;
  icon: IconName;
  currentPriceCents: number;
};

// Valores iniciais pra uma classe (criação / ao trocar a classe): ícone padrão da classe.
export function initialAssetValues(assetClass: AssetClass = 'acoes'): AssetFormValues {
  return {
    ticker: '',
    name: '',
    assetClass,
    icon: assetClassMeta(assetClass).defaultIcon,
    currentPriceCents: 0,
  };
}

export type AssetFormErrors = { ticker?: string; name?: string; currentPrice?: string };

// Validação do client (o server revalida): ticker e nome obrigatórios; preço atual não-negativo
// (0 é permitido — ativo recém-cadastrado sem cotação ainda). A classe é sempre uma das válidas.
export function validateAssetForm(v: AssetFormValues): AssetFormErrors {
  const errors: AssetFormErrors = {};
  if (v.ticker.trim() === '') errors.ticker = 'Informe o ticker do ativo.';
  if (v.name.trim() === '') errors.name = 'Dá um nome pra esse ativo.';
  if (v.currentPriceCents < 0) errors.currentPrice = 'Preço não pode ser negativo.';
  return errors;
}

// Serializa pro corpo de POST /investimentos/assets (inclui a classe — imutável depois).
export function toCreateAssetInput(v: AssetFormValues): CreateAssetInput {
  return {
    ticker: v.ticker.trim(),
    name: v.name.trim(),
    assetClass: v.assetClass,
    icon: v.icon,
    currentPriceCents: v.currentPriceCents,
  };
}

// Serializa pro corpo de PATCH /investimentos/assets/{id} (SEM a classe — imutável).
export function toUpdateAssetInput(v: AssetFormValues): UpdateAssetInput {
  return {
    ticker: v.ticker.trim(),
    name: v.name.trim(),
    icon: v.icon,
    currentPriceCents: v.currentPriceCents,
  };
}

// Pré-preenche o form a partir do detalhe do ativo (edição).
export function assetDetailToFormValues(d: AssetDetail): AssetFormValues {
  return {
    ticker: d.ticker,
    name: d.name,
    assetClass: d.assetClass,
    icon: d.icon,
    currentPriceCents: d.currentPriceCents,
  };
}
