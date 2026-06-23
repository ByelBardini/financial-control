import { fireEvent, render, screen } from '@testing-library/react-native';
import {
  QuantityField,
  sanitizeQuantity,
} from '../../../src/components/investimentos/QuantityField';

describe('sanitizeQuantity', () => {
  it('troca vírgula por ponto', () => {
    expect(sanitizeQuantity('1,5')).toBe('1.5');
  });

  it('remove letras e símbolos', () => {
    expect(sanitizeQuantity('1a0.5x')).toBe('10.5');
  });

  it('mantém só o primeiro ponto', () => {
    expect(sanitizeQuantity('1.2.3')).toBe('1.23');
  });

  it('limita a 8 casas decimais', () => {
    expect(sanitizeQuantity('1.123456789')).toBe('1.12345678');
  });

  it('aceita inteiro puro', () => {
    expect(sanitizeQuantity('100')).toBe('100');
  });

  it('vazio continua vazio', () => {
    expect(sanitizeQuantity('')).toBe('');
  });

  it('preserva zeros à esquerda (sem normalizar)', () => {
    expect(sanitizeQuantity('00123.45')).toBe('00123.45');
  });

  it('múltiplas vírgulas viram um único ponto', () => {
    expect(sanitizeQuantity('1,2,3')).toBe('1.23');
  });

  it('trunca a 9ª casa pra 8', () => {
    expect(sanitizeQuantity('0.000000001')).toBe('0.00000000');
  });

  it('só o ponto passa intacto (a validação é quem rejeita)', () => {
    expect(sanitizeQuantity('.')).toBe('.');
  });
});

describe('QuantityField', () => {
  it('mostra o label e o valor controlado', async () => {
    await render(<QuantityField label="Quantidade" value="10.5" onChangeText={jest.fn()} />);
    expect(screen.getByLabelText('Quantidade').props.value).toBe('10.5');
  });

  it('entrega o texto sanitizado no onChangeText', async () => {
    const onChangeText = jest.fn();
    await render(<QuantityField label="Quantidade" value="" onChangeText={onChangeText} />);

    fireEvent.changeText(screen.getByLabelText('Quantidade'), '2,5kg');
    expect(onChangeText).toHaveBeenCalledWith('2.5');
  });

  it('mostra o erro quando passado', async () => {
    await render(
      <QuantityField
        label="Quantidade"
        value=""
        onChangeText={jest.fn()}
        error="Informe uma quantidade maior que zero (até 8 casas)."
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/quantidade/i);
  });
});
