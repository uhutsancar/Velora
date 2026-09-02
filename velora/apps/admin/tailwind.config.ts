import type { Config } from 'tailwindcss';
import { fontFamily, ink, moss, surface, tan, wine } from '@velora/shared/tokens';

/**
 * Admin Tailwind katmani — yalnizca yerlesim ve aralik.
 *
 * Karmasik bilesenler (DataGrid, dialog, select) MUI'ye aittir ve temalarini
 * src/theme.ts uzerinden alir. Iki taraf da @velora/shared/tokens okudugu icin
 * paletler tanim geregi senkrondur; ayrica hizada tutulmalari gerekmez.
 */
export default {
  // Tailwind preflight'i MUI'nin CssBaseline'i ile catismasin diye kapali.
  corePlugins: { preflight: false },
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { ink, tan, surface, success: moss, danger: wine },
      fontFamily,
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
