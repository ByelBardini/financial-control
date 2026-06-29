import { Button } from '../Button';

type AuthButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

// Botão primário full-width das telas de auth e dos submits de formulário. Fino
// wrapper sobre o Button (variante primary, tamanho lg, largura total) — `loading`
// mostra spinner e, junto de `disabled`, bloqueia o toque e marca `busy`/`disabled`.
export function AuthButton({ label, onPress, loading = false, disabled = false }: AuthButtonProps) {
  return (
    <Button
      label={label}
      onPress={onPress}
      variant="primary"
      size="lg"
      block
      loading={loading}
      disabled={disabled}
    />
  );
}
