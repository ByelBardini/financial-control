import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { DesktopPageHeader } from '../../../src/components/desktop/DesktopPageHeader';

describe('DesktopPageHeader', () => {
  it('mostra eyebrow, título (role header) e subtítulo', async () => {
    await render(
      <DesktopPageHeader
        eyebrow="Monitor de Sobrevivência"
        title="Suas contas"
        subtitle="Bem-vindo à sua realidade financeira."
      />,
    );

    expect(screen.getByText('Monitor de Sobrevivência')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Suas contas' })).toBeOnTheScreen();
    expect(screen.getByText('Bem-vindo à sua realidade financeira.')).toBeOnTheScreen();
  });

  it('renderiza o slot de ações (children)', async () => {
    await render(
      <DesktopPageHeader title="Transações">
        <Text>ação</Text>
      </DesktopPageHeader>,
    );

    expect(screen.getByText('ação')).toBeOnTheScreen();
  });

  it('funciona sem eyebrow nem subtítulo', async () => {
    await render(<DesktopPageHeader title="Investimentos" />);

    expect(screen.getByRole('header', { name: 'Investimentos' })).toBeOnTheScreen();
    expect(screen.queryByText('Monitor de Sobrevivência')).toBeNull();
  });
});
