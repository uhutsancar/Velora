import type { Config } from 'tailwindcss';

/**
 * Admin design tokens.
 *
 * Shares Velora's ink/tan identity with the storefront but leans denser and
 * cooler: the back office optimises for data density, not for browsing.
 * MUI owns complex widgets (DataGrid, dialogs); Tailwind owns layout and spacing.
 */
export default {
  // Prevent Tailwind's preflight from fighting MUI's own CSS baseline.
  corePlugins: { preflight: false },
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#F6F5F3',
          100: '#E9E7E3',
          200: '#D2CEC7',
          300: '#B0AAA0',
          400: '#847D72',
          500: '#5E5850',
          600: '#443F39',
          700: '#302C28',
          800: '#1E1B18',
          900: '#12100E',
          950: '#0A0908',
        },
        tan: {
          100: '#F4E9DA',
          300: '#D9B486',
          500: '#B87A3F',
          600: '#9C6133',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F7F7F6',
          sunken: '#EFEEEC',
        },
        success: { 100: '#E3EFE7', 500: '#3F5A46', 600: '#324A39' },
        danger: { 100: '#F6E6E9', 500: '#7A2E3C', 600: '#5C1F2B' },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Bodoni Moda"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.06em' }],
      },
      boxShadow: {
        card: '0 1px 2px rgba(18, 16, 14, 0.04), 0 4px 16px -10px rgba(18, 16, 14, 0.18)',
      },
      gridTemplateColumns: {
        admin: '16rem 1fr',
      },
    },
  },
  plugins: [],
} satisfies Config;
