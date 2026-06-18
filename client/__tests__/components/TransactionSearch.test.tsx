import { useState } from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import { TransactionSearch } from '../../src/components/TransactionSearch';

// Harness com estado: o input é controlado, então o teste precisa refletir o onChange.
function Harness() {
  const [v, setV] = useState('');
  return <TransactionSearch value={v} onChange={setV} />;
}

describe('TransactionSearch', () => {
  it('reflete o texto digitado (input controlado)', async () => {
    await render(<Harness />);
    const input = screen.getByLabelText('Buscar transações');
    await userEvent.setup().type(input, 'uber');
    expect(input.props.value).toBe('uber');
  });
});
