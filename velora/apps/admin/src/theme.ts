import type {} from '@mui/x-data-grid/themeAugmentation';
import { createTheme } from '@mui/material/styles';
import { fontStack, ink, moss, surface, tan, wine } from '@velora/shared/tokens';

/**
 * Admin MUI temasi.
 *
 * Renk ve tipografi @velora/shared/tokens'tan gelir — Tailwind config'i de ayni
 * dosyayi okur, dolayisiyla iki sistem elle hizada tutulmak zorunda degildir.
 *
 * components.defaultProps bolumu bilincli olarak genistir: burada verilen her
 * varsayilan, cagri yerlerinden bir prop siler. Ornegin CardHeader'in h5 basligi
 * burada bir kez tanimlanir, 19 sayfada tekrar edilmez.
 */
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: ink[900], light: ink[700], dark: ink[950], contrastText: '#F7F4EF' },
    secondary: { main: tan[500], light: tan[300], dark: tan[600], contrastText: '#FFFFFF' },
    success: { main: moss[500] },
    error: { main: wine[500] },
    warning: { main: tan[500] },
    info: { main: ink[500] },
    background: { default: surface.muted, paper: surface.DEFAULT },
    text: { primary: ink[800], secondary: ink[500], disabled: ink[300] },
    divider: ink[100],
  },

  shape: { borderRadius: 4 },

  typography: {
    fontFamily: fontStack.sans,
    h1: { fontFamily: fontStack.display, fontSize: '2rem', letterSpacing: '-0.02em' },
    h2: { fontFamily: fontStack.display, fontSize: '1.5rem', letterSpacing: '-0.01em' },
    h3: { fontSize: '1.25rem', fontWeight: 600 },
    h4: { fontSize: '1.125rem', fontWeight: 600 },
    h5: { fontSize: '1rem', fontWeight: 600 },
    h6: { fontSize: '0.9375rem', fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 500 },
    overline: { letterSpacing: '0.1em', fontWeight: 500 },
  },

  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 2, paddingInline: 18 } },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' }, outlined: { borderColor: ink[100] } },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: { root: { borderRadius: 4 } },
    },
    // Kart basliklarinin tamami h5; varsayilan olarak verildiginde her
    // <CardHeader> cagrisindan titleTypographyProps prop'u dusuyor.
    MuiCardHeader: {
      defaultProps: { titleTypographyProps: { variant: 'h5' } },
    },
    // Formlarin tamami kucuk/outlined; her alanda tekrar belirtmeye gerek yok.
    MuiTextField: { defaultProps: { size: 'small', variant: 'outlined' } },
    MuiSelect: { defaultProps: { size: 'small' } },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 2, fontWeight: 500 },
        sizeSmall: { height: 22, fontSize: '0.6875rem' },
      },
    },
    MuiTooltip: { defaultProps: { arrow: true } },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: `1px solid ${ink[100]}`,
          borderRadius: 4,
          backgroundColor: surface.DEFAULT,
          '--DataGrid-rowBorderColor': '#F1F0EE',
        },
        columnHeaders: {
          backgroundColor: surface.muted,
          fontSize: '0.75rem',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        },
        cell: {
          borderColor: '#F1F0EE',
          // Hucre varsayilan olarak block; renderCell icerigi (chip, buton,
          // iki satirlik metin) aksi halde ustte asili kalir.
          display: 'flex',
          alignItems: 'center',
        },
      },
    },
  },
});
