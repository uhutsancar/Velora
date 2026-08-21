import { Component, type ErrorInfo, type ReactNode } from 'react';
import { i18n } from '@velora/shared';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Keeps a render error from blanking the whole back office. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[Velora Admin] Unhandled render error', error, info.componentStack);
  }

  override render(): ReactNode {
    const { error } = this.state;

    if (!error) return this.props.children;

    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
        <div>
          <p style={{ fontFamily: 'Bodoni Moda, Georgia, serif', fontSize: 28, letterSpacing: '0.2em' }}>VELORA</p>
          <h1 style={{ fontSize: 20, marginTop: 12 }}>{i18n.t('common.errorTitle')}</h1>
          <p style={{ color: '#5E5850', fontSize: 14, marginTop: 8, maxWidth: 420 }}>
            {i18n.t('admin.errorBody')}
          </p>

          {import.meta.env.DEV && (
            <pre style={{ background: '#EFEEEC', padding: 12, marginTop: 16, fontSize: 12, textAlign: 'left', overflow: 'auto', maxWidth: 520 }}>
              {error.message}
            </pre>
          )}

          <button
            type="button"
            onClick={() => window.location.assign('/')}
            style={{ marginTop: 20, background: '#12100E', color: '#F7F4EF', border: 0, padding: '12px 24px', cursor: 'pointer' }}
          >
            {i18n.t('admin.backToDashboard')}
          </button>
        </div>
      </div>
    );
  }
}
