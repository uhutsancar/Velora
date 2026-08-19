import type {} from '@mui/x-data-grid/themeAugmentation';
import { createTheme } from '@mui/material/styles';

/**
 * MUI theme aligned with the Velora tokens in tailwind.config.ts.
 *
 * MUI owns the complex widgets here (DataGrid, dialogs, selects) because they
 * arrive accessible and keyboard-complete; Tailwind handles layout. Keeping the
 * palettes in sync means the two never look like different products.
 */
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#12100E',
      light: '#302C28',
      dark: '#0A0908',
      contrastText: '#F7F4EF',
    },
    secondary: {
      main: '#B87A3F',
      light: '#D9B486',
      dark: '#9C6133',
      contrastText: '#FFFFFF',
    },
    success: { main: '#3F5A46' },
    error: { main: '#7A2E3C' },
    warning: { main: '#B87A3F' },
    info: { main: '#5E5850' },
    background: {
      default: '#F7F7F6',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1E1B18',
      secondary: '#5E5850',
      disabled: '#B0AAA0',
    },
    divider: '#E9E7E3',
  },

  shape: { borderRadius: 4 },

  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
    h1: { fontFamily: '"Bodoni Moda", Georgia, serif', fontSize: '2rem', letterSpacing: '-0.02em' },
    h2: { fontFamily: '"Bodoni Moda", Georgia, serif', fontSize: '1.5rem', letterSpacing: '-0.01em' },
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
      styleOverrides: {
        root: { borderRadius: 2, paddingInline: 18 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        outlined: { borderColor: '#E9E7E3' },
      },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: { root: { borderRadius: 4 } },
    },
    MuiTextField: {
      defaultProps: { size: 'small', variant: 'outlined' },
    },
    MuiSelect: {
      defaultProps: { size: 'small' },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 2, fontWeight: 500 },
        sizeSmall: { height: 22, fontSize: '0.6875rem' },
      },
    },
    MuiTooltip: {
      defaultProps: { arrow: true },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: '1px solid #E9E7E3',
          borderRadius: 4,
          backgroundColor: '#FFFFFF',
          '--DataGrid-rowBorderColor': '#F1F0EE',
        },
        columnHeaders: {
          backgroundColor: '#F7F7F6',
          fontSize: '0.75rem',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        },
        cell: { borderColor: '#F1F0EE' },
      },
    },
  },
});
