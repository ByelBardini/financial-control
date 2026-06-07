import { render, screen } from '@testing-library/react-native';
import { BrandLogo } from '../../src/components/BrandLogo';

describe('BrandLogo', () => {
  it('renderiza a marca como elemento decorativo (oculto pro leitor de tela)', async () => {
    await render(<BrandLogo />);
    const logo = screen.getByTestId('brand-logo', { includeHiddenElements: true });
    expect(logo).toBeOnTheScreen();
    expect(logo.props.accessibilityElementsHidden).toBe(true);
  });

  it('aplica o tamanho informado', async () => {
    await render(<BrandLogo size={40} />);
    const logo = screen.getByTestId('brand-logo', { includeHiddenElements: true });
    expect(logo).toHaveStyle({ width: 40, height: 40 });
  });

  it('expõe accessibilityLabel quando informado (uso não-decorativo)', async () => {
    await render(<BrandLogo accessibilityLabel="Pobrify" />);
    expect(screen.getByLabelText('Pobrify')).toBeOnTheScreen();
  });
});
