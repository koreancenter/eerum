import React, { Component } from 'react';
import { RefreshCw, X } from 'lucide-react';

async function retryDynamicImport<T>(
  importer: () => Promise<T>,
  retries = 4,
  baseDelayMs = 350
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await importer();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        const jitter = Math.floor(Math.random() * 160);
        const delay = Math.round(baseDelayMs * Math.pow(1.8, attempt)) + jitter;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

/**
 * Wraps React.lazy with automatic exponential-backoff retries and
 * resets the cached lazy reference on terminal failure so subsequent
 * renders (e.g., via LazyErrorBoundary retry or modal reopen) re-fetch cleanly.
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  importer: () => Promise<{ default: T }>
): React.FC<React.ComponentProps<T>> {
  const createLazy = () =>
    React.lazy(() =>
      retryDynamicImport(importer).catch((err) => {
        LazyTarget = createLazy();
        throw err;
      })
    );

  let LazyTarget = createLazy();

  const ResilientLazyComponent: React.FC<React.ComponentProps<T>> = (props) => {
    const CurrentComponent = LazyTarget as unknown as React.ComponentType<
      React.ComponentProps<T>
    >;
    return <CurrentComponent {...props} />;
  };

  return ResilientLazyComponent;
}

interface LazyErrorBoundaryProps {
  children: React.ReactNode;
  variant?: 'inline' | 'modal' | 'silent';
  onDismiss?: () => void;
  resetKey?: string | number | boolean;
}

interface LazyErrorBoundaryState {
  hasError: boolean;
}

export class LazyErrorBoundary extends Component<
  LazyErrorBoundaryProps,
  LazyErrorBoundaryState
> {
  state: LazyErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): LazyErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('Dynamic module load failed after retries:', error);
  }

  componentDidUpdate(prevProps: LazyErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { variant = 'inline', onDismiss } = this.props;

    if (variant === 'silent') {
      return null;
    }

    if (variant === 'modal') {
      return (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={onDismiss}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-[#121214] border border-white/10 p-5 text-center space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">모듈 연결 지연</span>
              {onDismiss && (
                <button
                  type="button"
                  onClick={onDismiss}
                  className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
                  aria-label="닫기"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              일시적인 네트워크 지연으로 화면 모듈을 불러오지 못했습니다. 다시 시도해 주세요.
            </p>
            <div className="flex items-center justify-center gap-2">
              {onDismiss && (
                <button
                  type="button"
                  onClick={onDismiss}
                  className="px-3.5 py-2 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  닫기
                </button>
              )}
              <button
                type="button"
                onClick={this.handleRetry}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-neutral-950 font-bold text-xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>다시 시도</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full max-w-md rounded-2xl bg-[#121214] border border-white/10 p-6 text-center space-y-3">
        <p className="text-xs text-zinc-400">
          일시적인 네트워크 지연으로 화면 구성을 불러오지 못했습니다.
        </p>
        <button
          type="button"
          onClick={this.handleRetry}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-neutral-950 font-bold text-xs cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>다시 시도</span>
        </button>
      </div>
    );
  }
}
