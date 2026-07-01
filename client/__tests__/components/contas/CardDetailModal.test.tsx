import { screen, userEvent } from '@testing-library/react-native';
import * as api from '../../../src/api/contas';
import { CardDetailModal } from '../../../src/components/contas/CardDetailModal';
import { renderWithClient } from '../../_support/renderWithClient';
import type { CardDetail } from '../../../src/types/contas';

jest.mock('../../../src/api/contas');

beforeEach(() => jest.clearAllMocks());

const detail: CardDetail = {
  id: 'c1',
  name: 'Nubank Roxinho',
  icon: 'credit_card',
  brandColor: '#8a05be',
  limitCents: 150000,
  invoiceCents: 32000,
  availableCents: 118000,
  usedPercent: 21,
  months: [
    {
      month: '2026-06',
      label: 'Junho/2026',
      chargesCents: 32000,
      paymentsCents: 0,
      netCents: 32000,
      entries: [
        {
          id: 'e1',
          occurredOn: '2026-06-10',
          description: 'Mercado',
          category: 'Alimentação',
          icon: 'restaurant',
          direction: 'outflow',
          amountCents: 32000,
          kind: 'standard',
        },
      ],
    },
  ],
};

function setup(over: Partial<CardDetail> = {}) {
  jest.mocked(api.getCardDetail).mockResolvedValue({ ...detail, ...over });
  const onClose = jest.fn();
  const onEdit = jest.fn();
  const onLancar = jest.fn();
  const onPagar = jest.fn();
  return { onClose, onEdit, onLancar, onPagar };
}

describe('CardDetailModal', () => {
  it('mostra cabeçalho (fatura/disponível) e as faturas por mês', async () => {
    const h = setup();
    await renderWithClient(<CardDetailModal cardId="c1" {...h} />);

    expect(await screen.findByText('Nubank Roxinho')).toBeOnTheScreen();
    expect(screen.getByText('R$ 1.180,00 de R$ 1.500,00')).toBeOnTheScreen();
    expect(screen.getByText('Junho/2026')).toBeOnTheScreen();
    expect(screen.getByText('Mercado')).toBeOnTheScreen();
  });

  it('a engrenagem sinaliza editar pro parent', async () => {
    const h = setup();
    await renderWithClient(<CardDetailModal cardId="c1" {...h} />);

    await screen.findByText('Nubank Roxinho');
    await userEvent.setup().press(screen.getByRole('button', { name: 'Editar cartão' }));
    expect(h.onEdit).toHaveBeenCalledTimes(1);
  });

  it('"Lançar na fatura" e "Pagar fatura" sinalizam pro parent (pagar leva a fatura atual)', async () => {
    const h = setup();
    await renderWithClient(<CardDetailModal cardId="c1" {...h} />);
    const user = userEvent.setup();

    await screen.findByText('Nubank Roxinho');
    await user.press(screen.getByRole('button', { name: 'Lançar na fatura' }));
    expect(h.onLancar).toHaveBeenCalledTimes(1);

    await user.press(screen.getByRole('button', { name: 'Pagar fatura' }));
    expect(h.onPagar).toHaveBeenCalledWith(32000);
  });

  it('cartão sem lançamentos mostra o estado vazio', async () => {
    const h = setup({ months: [] });
    await renderWithClient(<CardDetailModal cardId="c1" {...h} />);

    await screen.findByText('Nubank Roxinho');
    expect(screen.getByText('Nenhum lançamento ainda.')).toBeOnTheScreen();
  });
});
