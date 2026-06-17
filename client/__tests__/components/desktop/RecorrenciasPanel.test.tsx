import { screen } from '@testing-library/react-native';
import { RecorrenciasPanel } from '../../../src/components/desktop/RecorrenciasPanel';
import { transacoesSnapshot } from '../../../src/mocks/transacoesSnapshot';
import { renderWithClient } from '../../_support/renderWithClient';

const { recurrences } = transacoesSnapshot;

describe('RecorrenciasPanel (desktop)', () => {
  it('mostra o cabeçalho com a contagem e as recorrências', async () => {
    // renderWithClient: as linhas devidas renderizam o RegisterRecurrenceButton (usa React Query).
    await renderWithClient(<RecorrenciasPanel recurrences={recurrences} hidden={false} />);

    expect(screen.getByRole('header', { name: 'Recorrências' })).toBeOnTheScreen();
    expect(screen.getByText('4 ATIVAS')).toBeOnTheScreen();
    expect(screen.getByText('Netflix 4K')).toBeOnTheScreen();
    expect(screen.getByText('Salário Base')).toBeOnTheScreen();
  });
});
