import type { Config } from 'tailwindcss';

/**
 * Velora design tokens.
 *
 * The palette is built around a warm near-black ("ink") and a tanned leather accent
 * ("tan"), which is where the brand's identity lives — it is deliberately not the
 * cool grey/blue of a default template.
 */
export default {
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
          50: '#FBF6F0',
          100: '#F4E9DA',
          200: '#E8D2B4',
          300: '#D9B486',
          400: '#C9945B',
          500: '#B87A3F',
          600: '#9C6133',
          700: '#7D4B2C',
          800: '#663E29',
          900: '#553524',
        },
        sand: {
          50: '#FDFCFA',
          100: '#F7F4EF',
          200: '#EFE9E0',
          300: '#E2D9CB',
        },
        moss: {
          500: '#3F5A46',
          600: '#324A39',
        },
        wine: {
          500: '#7A2E3C',
          600: '#5C1F2B',
        },
      },
      fontFamily: {
        // Display face carries the brand voice; body stays highly legible.
        display: ['"Bodoni Moda"', 'Georgia', 'Cambria', 'serif'],
        sans: ['"Inter"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.08em' }],
        display: ['clamp(2.5rem, 6vw, 5rem)', { lineHeight: '1.02', letterSpacing: '-0.03em' }],
        headline: ['clamp(1.75rem, 3.5vw, 3rem)', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        title: ['clamp(1.25rem, 2vw, 1.75rem)', { lineHeight: '1.25', letterSpacing: '-0.01em' }],
      },
      letterSpacing: {
        label: '0.14em',
      },
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
        30: '7.5rem',
      },
      maxWidth: {
        container: '90rem',
      },
      borderRadius: {
        card: '0.25rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(18, 16, 14, 0.04), 0 8px 24px -12px rgba(18, 16, 14, 0.16)',
        lifted: '0 24px 60px -28px rgba(18, 16, 14, 0.35)',
        drawer: '-24px 0 60px -30px rgba(18, 16, 14, 0.4)',
      },
      transitionTimingFunction: {
        velora: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      aspectRatio: {
        product: '4 / 5',
        editorial: '3 / 4',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        marquee: 'marquee 32s linear infinite',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
