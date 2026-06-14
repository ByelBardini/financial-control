import { render, screen } from '@testing-library/react-native';
import { TransactionFilterTabs } from '../../src/components/TransactionFilterTabs';

describe('TransactionFilterTabs', () => {
  it('mostra todas as abas e marca a primeira como ativa por padrão', async () => {
    await render(<TransactionFilterTabs tabs={['Recentes', '30 Dias', 'Categorias']} />);

    for (const tab of ['Recentes', '30 Dias', 'Categorias']) {
      expect(screen.getByText(tab)).toBeOnTheScreen();
    }
    expect(screen.getByRole('tab', { name: 'Recentes' })).toBeSelected();
    expect(screen.getByRole('tab', { name: '30 Dias' })).not.toBeSelected();
  });

  it('respeita o activeIndex informado', async () => {
    await render(<TransactionFilterTabs tabs={['Recentes', 'Recorrências']} activeIndex={1} />);

    expect(screen.getByRole('tab', { name: 'Recorrências' })).toBeSelected();
  });
});
