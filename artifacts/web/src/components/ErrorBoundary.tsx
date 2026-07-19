import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; message: string; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : String(error);
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#080810',
            gap: 16,
            fontFamily: 'monospace',
            padding: 24,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 32 }}>⚠️</div>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, margin: 0 }}>
            Something went wrong
          </p>
          <code
            style={{
              color: 'rgba(248,113,113,0.8)',
              fontSize: 11,
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.15)',
              borderRadius: 8,
              padding: '8px 14px',
              maxWidth: 480,
              wordBreak: 'break-word',
            }}
          >
            {this.state.message}
          </code>
          <button
            onClick={() => window.location.replace('/login')}
            style={{
              marginTop: 8,
              padding: '8px 20px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'transparent',
              color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: 'monospace',
            }}
          >
            Back to login
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
