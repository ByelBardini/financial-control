import {
  assetClassMeta,
  assetDetailToFormValues,
  initialAssetValues,
  toCreateAssetInput,
  toUpdateAssetInput,
  validateAssetForm,
  type AssetFormValues,
} from '../../src/lib/assetForm';
import type { AssetDetail } from '../../src/types/investimentos';

const valid: AssetFormValues = {
  ticker: 'WEGE3',
  name: 'WEG ON',
  assetClass: 'acoes',
  icon: 'corporate_fare',
  currentPriceCents: 5000,
};

describe('initialAssetValues', () => {
  it('usa o ícone padrão da classe pedida', () => {
    expect(initialAssetValues('cripto')).toEqual({
      ticker: '',
      name: '',
      assetClass: 'cripto',
      icon: 'currency_bitcoin',
      currentPriceCents: 0,
    });
  });

  it('default é Ações', () => {
    expect(initialAssetValues().assetClass).toBe('acoes');
  });
});

describe('assetClassMeta', () => {
  it('resolve o rótulo PT da classe', () => {
    expect(assetClassMeta('fiis').label).toBe('FIIs');
  });

  it.each([
    ['acoes', 'Ações', 'corporate_fare'],
    ['fiis', 'FIIs', 'account_balance'],
    ['renda_fixa', 'Renda Fixa', 'savings'],
    ['cripto', 'Cripto', 'currency_bitcoin'],
  ] as const)('classe %s → rótulo %s + ícone padrão %s', (value, label, icon) => {
    expect(assetClassMeta(value)).toEqual({ value, label, defaultIcon: icon });
    expect(initialAssetValues(value).icon).toBe(icon);
  });
});

describe('validateAssetForm', () => {
  it('sem erros quando tudo é válido', () => {
    expect(validateAssetForm(valid)).toEqual({});
  });

  it('cobra ticker e nome', () => {
    expect(validateAssetForm({ ...valid, ticker: '  ' }).ticker).toBeDefined();
    expect(validateAssetForm({ ...valid, name: '' }).name).toBeDefined();
  });

  it('rejeita preço negativo, aceita zero', () => {
    expect(validateAssetForm({ ...valid, currentPriceCents: -1 }).currentPrice).toBeDefined();
    expect(validateAssetForm({ ...valid, currentPriceCents: 0 }).currentPrice).toBeUndefined();
  });
});

describe('serialização', () => {
  it('toCreateAssetInput inclui a classe e faz trim', () => {
    expect(toCreateAssetInput({ ...valid, ticker: ' WEGE3 ', name: ' WEG ON ' })).toEqual({
      ticker: 'WEGE3',
      name: 'WEG ON',
      assetClass: 'acoes',
      icon: 'corporate_fare',
      currentPriceCents: 5000,
    });
  });

  it('toUpdateAssetInput NÃO inclui a classe (imutável)', () => {
    const out = toUpdateAssetInput(valid);
    expect(out).toEqual({
      ticker: 'WEGE3',
      name: 'WEG ON',
      icon: 'corporate_fare',
      currentPriceCents: 5000,
    });
    expect('assetClass' in out).toBe(false);
  });
});

describe('assetDetailToFormValues', () => {
  it('pré-preenche o form a partir do detalhe', () => {
    const detail: AssetDetail = {
      id: 'a1',
      ticker: 'MXRF11',
      name: 'Maxi Renda',
      assetClass: 'fiis',
      icon: 'account_balance',
      currentPriceCents: 1050,
      netQuantity: '100.00000000',
      avgPriceCents: 1000,
      costBasisCents: 100000,
      currentValueCents: 105000,
      gainCents: 5000,
      gainPct: 5,
      realizedCents: 0,
      trades: [],
    };
    expect(assetDetailToFormValues(detail)).toEqual({
      ticker: 'MXRF11',
      name: 'Maxi Renda',
      assetClass: 'fiis',
      icon: 'account_balance',
      currentPriceCents: 1050,
    });
  });
});
