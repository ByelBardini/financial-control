import { render, screen, userEvent } from '@testing-library/react-native';
import { VoucherCard } from '../../src/components/VoucherCard';
import { contasSnapshot } from '../../src/mocks/contasSnapshot';

const [alelo] = contasSnapshot.vouchers;

describe('VoucherCard', () => {
  it('mostra nome, valor formatado, status, barra e nota', async () => {
    await render(<VoucherCard voucher={alelo} hidden={false} />);

    expect(screen.getByText('Alelo Refeição')).toBeOnTheScreen();
    expect(screen.getByText('R$ 215,00')).toBeOnTheScreen();
    expect(screen.getByText('ATIVO')).toBeOnTheScreen();
    expect(screen.getByText('Dura mais 3 almoços (estimado)')).toBeOnTheScreen();
    expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ now: 15, min: 0, max: 100 });
  });

  it('mascara o valor quando hidden', async () => {
    await render(<VoucherCard voucher={alelo} hidden />);

    expect(screen.queryByText('R$ 215,00')).toBeNull();
    expect(screen.getByLabelText('valor oculto')).toBeOnTheScreen();
  });

  it('vira botão "Editar conta" quando onPress é fornecido', async () => {
    const onPress = jest.fn();
    await render(<VoucherCard voucher={alelo} hidden={false} onPress={onPress} />);

    await userEvent.setup().press(screen.getByRole('button', { name: 'Editar Alelo Refeição' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
