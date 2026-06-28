import { useState } from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import { TransacoesHeader } from '../../../src/components/desktop/TransacoesHeader';

function Harness() {
  const [q, setQ] = useState('');
  return (
    <TransacoesHeader
      hidden={false}
      onToggleHidden={jest.fn()}
      searchText={q}
      onSearchChange={setQ}
    />
  );
}

describe('TransacoesHeader (desktop)', () => {
  it('mostra título, busca, toggle de valores e a ação de nova transação', async () => {
    await render(<Harness />);

    expect(screen.getByText('Terminal Financeiro')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Transações' })).toBeOnTheScreen();
    expect(screen.getByText('Rastreando cada centavo em fuga.')).toBeOnTheScreen();
    expect(screen.getByRole('switch', { name: 'Ocultar valores' })).toBeOnTheScreen();
    expect(screen.getByText('Nova transação')).toBeOnTheScreen();

    const input = screen.getByLabelText('Buscar transações');
    await userEvent.setup().type(input, 'uber');
    expect(input.props.value).toBe('uber');
  });

  it('dispara onCreate ao tocar em "Nova transação"', async () => {
    const onCreate = jest.fn();
    await render(
      <TransacoesHeader
        hidden={false}
        onToggleHidden={jest.fn()}
        searchText=""
        onSearchChange={jest.fn()}
        onCreate={onCreate}
      />,
    );

    await userEvent.setup().press(screen.getByRole('button', { name: 'Nova transação' }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});
