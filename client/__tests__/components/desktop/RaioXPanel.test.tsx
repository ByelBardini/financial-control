import { render, screen } from '@testing-library/react-native';
import { RaioXPanel } from '../../../src/components/desktop/RaioXPanel';
import { contasSnapshot } from '../../../src/mocks/contasSnapshot';

describe('RaioXPanel (desktop)', () => {
  it('mostra título, linhas e o panic meter', async () => {
    await render(<RaioXPanel xray={contasSnapshot.xray} hidden={false} />);

    expect(screen.getByRole('header', { name: 'Raio-X de Pobreza' })).toBeOnTheScreen();
    expect(screen.getByText('Dívidas no Nubank')).toBeOnTheScreen();
    expect(screen.getByText('R$ 4.200,00')).toBeOnTheScreen();
    expect(screen.getByText('Limite Disponível')).toBeOnTheScreen();
    expect(screen.getByText('R$ 42,10')).toBeOnTheScreen();
    expect(screen.getByText('Panic Meter™')).toBeOnTheScreen();
    expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ now: 85, min: 0, max: 100 });
  });

  it('mascara todos os valores quando hidden', async () => {
    await render(<RaioXPanel xray={contasSnapshot.xray} hidden />);

    expect(screen.getAllByLabelText('valor oculto')).toHaveLength(2);
  });
});
