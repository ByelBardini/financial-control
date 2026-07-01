import { screen, userEvent, waitFor } from '@testing-library/react-native';
import * as txApi from '../../../src/api/transacoes';
import { LancarFaturaModal } from '../../../src/components/contas/LancarFaturaModal';
import { renderWithClient } from '../../_support/renderWithClient';
import { defaultMonth, monthOptions } from '../../../src/lib/monthOptions';

jest.mock('../../../src/api/transacoes');

beforeEach(() => jest.clearAllMocks());

describe('LancarFaturaModal', () => {
  it('cria uma despesa no cartão com competência no 1º dia do mês (default = mês atual)', async () => {
    jest.mocked(txApi.createTransaction).mockResolvedValue({} as never);
    const onClose = jest.fn();
    await renderWithClient(<LancarFaturaModal cardId="card1" onClose={onClose} />);
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Valor'), '50000');
    await user.press(screen.getByRole('button', { name: 'Lançar' }));

    expect(txApi.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'card1',
        direction: 'outflow',
        amountCents: 50000,
        categoryId: null,
        occurredOn: `${defaultMonth(new Date())}-01`,
      }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('permite escolher outro mês (competência muda)', async () => {
    jest.mocked(txApi.createTransaction).mockResolvedValue({} as never);
    await renderWithClient(<LancarFaturaModal cardId="card1" onClose={jest.fn()} />);
    const user = userEvent.setup();
    const opts = monthOptions(new Date());
    const current = opts[6]; // índice 6 = mês atual (fwd=6)
    const past = opts[7]; // mês anterior

    await user.type(await screen.findByLabelText('Valor'), '10000');
    await user.press(screen.getByRole('button', { name: `Mês da fatura: ${current.label}` }));
    await user.press(screen.getByRole('menuitem', { name: past.label }));
    await user.press(screen.getByRole('button', { name: 'Lançar' }));

    expect(txApi.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ occurredOn: `${past.value}-01` }),
    );
  });

  it('não cria quando o valor é zero (mostra erro)', async () => {
    await renderWithClient(<LancarFaturaModal cardId="card1" onClose={jest.fn()} />);
    await userEvent.setup().press(await screen.findByRole('button', { name: 'Lançar' }));

    expect(txApi.createTransaction).not.toHaveBeenCalled();
    expect(await screen.findByText('Informe um valor maior que zero.')).toBeOnTheScreen();
  });
});
