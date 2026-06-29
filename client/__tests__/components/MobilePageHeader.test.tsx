import { render, screen } from '@testing-library/react-native';
import { MobilePageHeader } from '../../src/components/MobilePageHeader';

describe('MobilePageHeader', () => {
  it('mostra eyebrow e título (role header)', async () => {
    await render(<MobilePageHeader eyebrow="Monitor de Sobrevivência" title="Suas contas" />);

    expect(screen.getByText('Monitor de Sobrevivência')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Suas contas' })).toBeOnTheScreen();
  });

  it('funciona só com título', async () => {
    await render(<MobilePageHeader title="Investimentos" />);

    expect(screen.getByRole('header', { name: 'Investimentos' })).toBeOnTheScreen();
    expect(screen.queryByText('Monitor de Sobrevivência')).toBeNull();
  });
});
