import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { I18nextProvider } from 'react-i18next';
import { initI18n } from '@velora/shared';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { router } from '@/router';
import { store } from '@/store';
import { restoreSession } from '@/store/slices/authSlice';
import { theme } from '@/theme';
import '@/styles/index.css';

const i18n = initI18n();

// Validate the persisted session (and the caller's role) before first paint.
void store.dispatch(restoreSession());

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element #root was not found in index.html');
}

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <Provider store={store}>
        <I18nextProvider i18n={i18n}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <RouterProvider router={router} />
          </ThemeProvider>
        </I18nextProvider>
      </Provider>
    </ErrorBoundary>
  </StrictMode>,
);
