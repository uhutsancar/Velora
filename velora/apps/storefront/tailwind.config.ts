import type { Config } from 'tailwindcss';
import { fontFamily, ink, moss, sand, tan, wine } from '@velora/shared/tokens';

/**
 * Storefront Tailwind katmani.
 *
 * Palet ve tipografi @velora/shared/tokens icinde yasar; admin MUI temasi da
 * ayni dosyadan beslenir. Burada yalnizca storefront'a ozgu olan sey durur:
 * editoryal olcek, hareket ve kompozisyon jetonlari.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { ink, tan, sand, moss, wine },
      fontFamily,
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
