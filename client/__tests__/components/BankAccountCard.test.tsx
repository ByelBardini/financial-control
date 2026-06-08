import { render, screen, userEvent } from '@testing-library/react-native';
import { BankAccountCard } from '../../src/components/BankAccountCard';
import { contasSnapshot } from '../../src/mocks/contasSnapshot';

const [nubank] = contasSnapshot.banks;

describe('BankAccountCard', () => {
  it('mostra nome, nota e saldo formatado', async () => {
    await render(<BankAccountCard account={nubank} hidden={false} />);

    expect(screen.getByText('Nubank')).toBeOnTheScreen();
    expect(screen.getByText('Sincronizado há 2 minutos - Infelizmente')).toBeOnTheScreen();
    expect(screen.getByText('R$ 842,20')).toBeOnTheScreen();
  });

  it('mascara o saldo quando hidden', async () => {
    await render(<BankAccountCard account={nubank} hidden />);

    expect(screen.queryByText('R$ 842,20')).toBeNull();
    expect(screen.getByLabelText('valor oculto')).toBeOnTheScreen();
  });

  it('vira botão "Editar conta" quando onPress é fornecido', async () => {
    const onPress = jest.fn();
    await render(<BankAccountCard account={nubank} hidden={false} onPress={onPress} />);

    await userEvent.setup().press(screen.getByRole('button', { name: 'Editar Nubank' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
