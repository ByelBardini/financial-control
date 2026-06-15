import { render, screen, userEvent } from '@testing-library/react-native';
import { Pagination } from '../../src/components/Pagination';

describe('Pagination', () => {
  it('na primeira página: Anterior desabilitado, Próxima navega', async () => {
    const onPrev = jest.fn();
    const onNext = jest.fn();
    await render(<Pagination page={1} pageCount={3} onPrev={onPrev} onNext={onNext} />);

    expect(screen.getByText('Página 1 de 3')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();

    await userEvent.setup().press(screen.getByRole('button', { name: 'Próxima' }));
    expect(onNext).toHaveBeenCalled();
  });

  it('na última página, Próxima fica desabilitada', async () => {
    await render(<Pagination page={3} pageCount={3} onPrev={jest.fn()} onNext={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
  });
});
