import { render, screen } from '@testing-library/react-native';
import { Eyebrow } from '../../src/components/Eyebrow';

describe('Eyebrow', () => {
  it('renderiza o rótulo (o texto-fonte fica intacto; a CAIXA ALTA é só CSS)', async () => {
    await render(<Eyebrow label="Monitor de Sobrevivência" />);

    expect(screen.getByText('Monitor de Sobrevivência')).toBeOnTheScreen();
  });

  it('aceita um tom sem quebrar', async () => {
    await render(<Eyebrow label="Risco Máximo" tone="error" />);

    expect(screen.getByText('Risco Máximo')).toBeOnTheScreen();
  });
});
