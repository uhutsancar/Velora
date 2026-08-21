import { Component, type ErrorInfo, type ReactNode } from 'react';
import { i18n } from '@velora/shared';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Last line of defence: a render error in any route shows a recoverable screen
 * instead of a blank page. Data-fetching errors are handled locally by ErrorState.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Wire this to a monitoring service (Sentry, App Insights) in production.
    console.error('[Velora] Unhandled render error', error, info.componentStack);
  }

  private readonly reset = () => {
    this.setState({ error: null });
    window.location.assign('/');
  };

  override render(): ReactNode {
    const { error } = this.state;

    if (!error) return this.props.children;

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
        <p className="font-display text-3xl tracking-[0.28em] text-ink-900">VELORA</p>
        <h1 className="font-display text-2xl text-ink-900">{i18n.t('common.errorTitle')}</h1>
        <p className="max-w-md text-sm text-ink-500">{i18n.t('common.errorBody')}</p>

        {import.meta.env.DEV && (
          <pre className="max-w-lg overflow-auto bg-ink-100 p-4 text-left text-xs text-ink-700">
            {error.message}
          </pre>
        )}

        <button
          type="button"
          onClick={this.reset}
          className="label-caps mt-2 bg-ink-900 px-6 py-3 text-sand-50 transition-colors hover:bg-ink-800"
        >
          {i18n.t('errors.goHome')}
        </button>
      </div>
    );
  }
}
