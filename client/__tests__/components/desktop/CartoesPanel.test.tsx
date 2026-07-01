import { render, screen, userEvent } from '@testing-library/react-native';
import { CartoesPanel } from '../../../src/components/desktop/CartoesPanel';
import { contasSnapshot } from '../../../src/mocks/contasSnapshot';

describe('CartoesPanel (desktop)', () => {
  it('mostra o título, a contagem e os cartões', async () => {
    await render(<CartoesPanel cards={contasSnapshot.cards} hidden={false} />);

    expect(screen.getByRole('header', { name: 'Cartões' })).toBeOnTheScreen();
    expect(screen.getByText('2 ATIVOS')).toBeOnTheScreen();
    expect(screen.getByText('Nubank Roxinho')).toBeOnTheScreen();
    expect(screen.getByText('Itaú Click')).toBeOnTheScreen();
  });

  it('encaminha o id do cartão tocado para onOpenCard (abre o detalhe)', async () => {
    const onOpenCard = jest.fn();
    await render(
      <CartoesPanel cards={contasSnapshot.cards} hidden={false} onOpenCard={onOpenCard} />,
    );

    await userEvent.setup().press(screen.getByRole('button', { name: 'Abrir Nubank Roxinho' }));
    expect(onOpenCard).toHaveBeenCalledWith('nubank-cartao');
  });
});
