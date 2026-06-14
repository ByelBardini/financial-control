import { render, screen } from '@testing-library/react-native';
import { DividasPanel } from '../../../src/components/desktop/DividasPanel';
import { transacoesSnapshot } from '../../../src/mocks/transacoesSnapshot';

const { debts } = transacoesSnapshot;

describe('DividasPanel (desktop)', () => {
  it('mostra o cabeçalho e as dívidas futuras', async () => {
    await render(<DividasPanel debts={debts} hidden={false} />);

    expect(screen.getByRole('header', { name: 'Dívidas Futuras' })).toBeOnTheScreen();
    expect(screen.getByText('iPhone 15 Pro')).toBeOnTheScreen();
    expect(screen.getByText('Aluguel')).toBeOnTheScreen();
  });
});
