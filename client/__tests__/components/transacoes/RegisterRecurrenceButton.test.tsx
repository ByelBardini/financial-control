import { screen, userEvent, waitFor } from '@testing-library/react-native';
import * as txApi from '../../../src/api/transacoes';
import { RegisterRecurrenceButton } from '../../../src/components/transacoes/RegisterRecurrenceButton';
import { renderWithClient } from '../../_support/renderWithClient';
import type { TransactionDetail } from '../../../src/types/transacoes';

jest.mock('../../../src/api/transacoes');

describe('RegisterRecurrenceButton', () => {
  it('registra a ocorrência (pelo id) ao tocar', async () => {
    jest.mocked(txApi.registerRecurrence).mockResolvedValue({} as TransactionDetail);
    await renderWithClient(<RegisterRecurrenceButton recurrenceId="r1" direction="outflow" />);

    await userEvent.setup().press(screen.getByRole('button', { name: 'Registrar pagamento' }));

    await waitFor(() => expect(txApi.registerRecurrence).toHaveBeenCalledWith('r1'));
  });

  it('rótulo de recebimento quando o sentido é receita (inflow)', async () => {
    await renderWithClient(<RegisterRecurrenceButton recurrenceId="r2" direction="inflow" />);

    expect(screen.getByRole('button', { name: 'Registrar recebimento' })).toBeOnTheScreen();
  });
});
