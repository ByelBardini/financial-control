/** @type {import('tailwindcss').Config} */
// Tokens extraídos do protótipo Stitch (docs/pages/dashboard). Tema dark único.
module.exports = {
  content: ['./App.tsx', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#111317',
        surface: '#111317',
        'surface-container-lowest': '#0c0e12',
        'surface-container-low': '#1a1c20',
        'surface-container': '#1e2024',
        'surface-container-high': '#282a2e',
        'surface-container-highest': '#333539',
        'surface-bright': '#37393e',
        'on-surface': '#e2e2e8',
        'on-surface-variant': '#cbc3d7',
        'on-background': '#e2e2e8',
        primary: '#d0bcff',
        'primary-container': '#a078ff',
        'on-primary-container': '#340080',
        secondary: '#9ddf2e',
        error: '#ffb4ab',
        outline: '#958ea0',
        'outline-variant': '#494454',
        // Linha fina dos cards no grid enterprise do desktop.
        'grid-line': 'rgba(245,247,250,0.08)',
      },
      spacing: {
        'stack-sm': '4px',
        base: '8px',
        'stack-md': '12px',
        gutter: '16px',
        'stack-lg': '24px',
        'container-margin': '24px',
      },
      borderRadius: {
        DEFAULT: '2px',
        lg: '4px',
        xl: '8px',
        full: '12px',
      },
      fontFamily: {
        hanken: ['HankenGrotesk_400Regular'],
        'hanken-semibold': ['HankenGrotesk_600SemiBold'],
        'hanken-bold': ['HankenGrotesk_700Bold'],
        'geist-medium': ['Geist_500Medium'],
        'geist-semibold': ['Geist_600SemiBold'],
      },
      fontSize: {
        'display-lg': ['48px', { lineHeight: '56px', letterSpacing: '-0.96px' }],
        'display-lg-mobile': ['36px', { lineHeight: '42px', letterSpacing: '-0.72px' }],
        'headline-md': ['24px', { lineHeight: '32px' }],
        'headline-sm': ['20px', { lineHeight: '28px' }],
        'body-lg': ['18px', { lineHeight: '28px' }],
        'body-md': ['16px', { lineHeight: '24px' }],
        'label-md': ['14px', { lineHeight: '20px', letterSpacing: '0.7px' }],
        'label-sm': ['12px', { lineHeight: '16px' }],
      },
    },
  },
  plugins: [],
};
