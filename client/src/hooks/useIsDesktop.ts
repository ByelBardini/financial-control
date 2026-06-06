import { useWindowDimensions } from 'react-native';

// Decide o layout pela largura da janela (web no PC / tablet largo = desktop;
// celular = mobile). Breakpoint padrão 1024px (lg).
export function useIsDesktop(breakpoint = 1024): boolean {
  const { width } = useWindowDimensions();
  return width >= breakpoint;
}
