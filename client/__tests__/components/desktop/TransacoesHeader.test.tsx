import { render, screen } from '@testing-library/react-native';
import { TransacoesHeader } from '../../../src/components/desktop/TransacoesHeader';

describe('TransacoesHeader (desktop)', () => {
  it('mostra título, subtítulo, toggle de valores e a ação visual de nova transação', async () => {
    await render(<TransacoesHeader hidden={false} onToggleHidden={jest.fn()} />);

    expect(screen.getByRole('header', { name: 'Transações' })).toBeOnTheScreen();
    expect(screen.getByText('Rastreando cada centavo em fuga.')).toBeOnTheScreen();
    expect(screen.getByRole('switch', { name: 'Ocultar valores' })).toBeOnTheScreen();
    expect(screen.getByText('NOVA TRANSAÇÃO')).toBeOnTheScreen();
  });
});
