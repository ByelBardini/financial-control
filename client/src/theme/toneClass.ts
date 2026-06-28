import type { Tone } from '../types/dashboard';

// Classes do NativeWind precisam ser literais — o compilador não resolve
// `text-${tone}` montado em runtime; por isso cada tom mapeia para a string
// completa. Complementa o `toneColor` (colors.ts), que é para props `color=`
// (ex.: glifo do Icon), não para className.
const textByTone: Record<Tone, string> = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  error: 'text-error',
  neutral: 'text-on-surface',
};

const bgByTone: Record<Tone, string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  error: 'bg-error',
  neutral: 'bg-on-surface',
};

const borderByTone: Record<Tone, string> = {
  primary: 'border-primary',
  secondary: 'border-secondary',
  error: 'border-error',
  neutral: 'border-on-surface',
};

// toneText('secondary') === 'text-secondary'
export function toneText(tone: Tone): string {
  return textByTone[tone];
}

export function toneBg(tone: Tone): string {
  return bgByTone[tone];
}

export function toneBorder(tone: Tone): string {
  return borderByTone[tone];
}
