import { toneText, toneBg, toneBorder } from '../../src/theme/toneClass';

describe('toneClass', () => {
  it('mapeia tom para classe de texto literal', () => {
    expect(toneText('primary')).toBe('text-primary');
    expect(toneText('secondary')).toBe('text-secondary');
    expect(toneText('error')).toBe('text-error');
    expect(toneText('neutral')).toBe('text-on-surface');
  });

  it('mapeia tom para classe de fundo literal', () => {
    expect(toneBg('primary')).toBe('bg-primary');
    expect(toneBg('secondary')).toBe('bg-secondary');
    expect(toneBg('error')).toBe('bg-error');
    expect(toneBg('neutral')).toBe('bg-on-surface');
  });

  it('mapeia tom para classe de borda literal', () => {
    expect(toneBorder('primary')).toBe('border-primary');
    expect(toneBorder('secondary')).toBe('border-secondary');
    expect(toneBorder('error')).toBe('border-error');
    expect(toneBorder('neutral')).toBe('border-on-surface');
  });
});
