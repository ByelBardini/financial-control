import type { Tone } from '../types/dashboard';

// Paleta do tema para uso em JS — necessária onde a cor é prop e não className
// (ex.: cor do glifo no Icon). Espelha os tokens de tailwind.config.js.
export const colors = {
  primary: '#d0bcff',
  secondary: '#9ddf2e',
  error: '#ffb4ab',
  onSurface: '#e2e2e8',
  onSurfaceVariant: '#cbc3d7',
} as const;

const toneToColor: Record<Tone, string> = {
  primary: colors.primary,
  secondary: colors.secondary,
  error: colors.error,
  neutral: colors.onSurface,
};

export function toneColor(tone: Tone): string {
  return toneToColor[tone];
}
