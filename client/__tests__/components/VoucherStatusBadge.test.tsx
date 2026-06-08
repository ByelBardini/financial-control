import { render, screen } from '@testing-library/react-native';
import { VoucherStatusBadge } from '../../src/components/VoucherStatusBadge';

describe('VoucherStatusBadge', () => {
  it('mostra o rótulo de cada status', async () => {
    const { rerender } = await render(<VoucherStatusBadge status="ativo" />);
    expect(screen.getByText('ATIVO')).toBeOnTheScreen();

    await rerender(<VoucherStatusBadge status="estavel" />);
    expect(screen.getByText('ESTÁVEL')).toBeOnTheScreen();

    await rerender(<VoucherStatusBadge status="critico" />);
    expect(screen.getByText('CRÍTICO')).toBeOnTheScreen();
  });
});
