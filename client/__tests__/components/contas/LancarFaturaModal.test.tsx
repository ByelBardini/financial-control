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

  it('permite escolher um mês futuro (competência muda)', async () => {
    jest.mocked(txApi.createTransaction).mockResolvedValue({} as never);
    await renderWithClient(<LancarFaturaModal cardId="card1" onClose={jest.fn()} />);
    const user = userEvent.setup();
    const opts = monthOptions(new Date(), 0, 12);
    const current = opts[0]; // índice 0 = mês atual
    const future = opts[1]; // próximo mês

    await user.type(await screen.findByLabelText('Valor'), '10000');
    await user.press(screen.getByRole('button', { name: `Mês da fatura: ${current.label}` }));
    await user.press(screen.getByRole('menuitem', { name: future.label }));
    await user.press(screen.getByRole('button', { name: 'Lançar' }));

    expect(txApi.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ occurredOn: `${future.value}-01` }),
    );
  });

  it('não cria quando o valor é zero (mostra erro)', async () => {
    await renderWithClient(<LancarFaturaModal cardId="card1" onClose={jest.fn()} />);
    await userEvent.setup().press(await screen.findByRole('button', { name: 'Lançar' }));

    expect(txApi.createTransaction).not.toHaveBeenCalled();
    expect(await screen.findByText('Informe um valor maior que zero.')).toBeOnTheScreen();
  });
});
