'use client';

import * as React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  name?: string;
  compact?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.name ?? 'unknown'}]`, error, info.componentStack);
  }

  private retry = () => this.setState({ hasError: false, error: undefined });

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.compact) {
      return (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-charcoal border border-border-luxury text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-text-secondary flex-1">Что-то пошло не так</span>
          <button
            onClick={this.retry}
            className="flex items-center gap-1.5 text-champagne hover:text-champagne/80 transition-colors text-xs font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Повторить
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[320px] gap-4 p-8">
        <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-amber-400" />
        </div>
        <div className="text-center space-y-1">
          <p className="font-serif text-lg font-medium text-text-primary">Что-то пошло не так</p>
          <p className="text-sm text-text-secondary">Этот раздел не смог загрузиться</p>
        </div>
        <button
          onClick={this.retry}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-champagne/10 border border-champagne/20 text-champagne text-sm font-medium hover:bg-champagne/15 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Попробовать снова
        </button>
        {process.env.NODE_ENV === 'development' && this.state.error && (
          <pre className="mt-4 p-3 rounded-lg bg-charcoal border border-border-luxury text-xs text-red-400 max-w-lg overflow-auto text-left">
            {this.state.error.message}
          </pre>
        )}
      </div>
    );
  }
}
