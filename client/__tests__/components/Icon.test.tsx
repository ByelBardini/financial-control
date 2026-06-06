import { render, screen } from '@testing-library/react-native';
import { Icon } from '../../src/components/Icon';

describe('Icon', () => {
  it('expõe um rótulo acessível quando recebe accessibilityLabel', async () => {
    await render(<Icon name="visibility" accessibilityLabel="Mostrar valores" />);
    expect(screen.getByLabelText('Mostrar valores')).toBeOnTheScreen();
  });

  it('é decorativo (oculto pro leitor de tela) sem accessibilityLabel', async () => {
    await render(<Icon name="dashboard" testID="deco" />);
    const icon = screen.getByTestId('deco', { includeHiddenElements: true });
    expect(icon).toHaveProp('importantForAccessibility', 'no');
    expect(icon).toHaveProp('accessibilityElementsHidden', true);
  });
});
