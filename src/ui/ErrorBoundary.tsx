import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Mascot } from './Mascot';

/** Friendly fallback instead of a white screen if a screen crashes. */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { error: Error | null }> {
  override state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[matematika] screen crashed', error, info.componentStack);
  }

  override componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="g92-main g92-main--narrow screen">
        <div className="g92-empty">
          <Mascot mood="oops" size={120} />
          <h1 className="text-2xl font-black">Jejda, něco se pokazilo</h1>
          <p className="g92-muted">Zkus to prosím znovu. Tvoje hvězdy zůstaly uložené.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <a className="g92-btn g92-btn--secondary g92-btn--lg" href="#/">
              Domů
            </a>
            <button type="button" className="g92-btn g92-btn--lg" onClick={() => location.reload()}>
              Načíst znovu
            </button>
          </div>
        </div>
      </div>
    );
  }
}
