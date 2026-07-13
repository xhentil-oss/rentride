import React, { Component, ErrorInfo, ReactNode } from "react";
import { Warning, ArrowClockwise } from "@phosphor-icons/react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mb-4">
            <Warning size={32} className="text-error" weight="duotone" />
          </div>
          <h3 className="text-lg font-medium text-neutral-800 mb-2">
            Diçka shkoi keq
          </h3>
          <p className="text-sm text-neutral-500 max-w-sm mb-4">
            Ndodhi një gabim i papritur. Provoni të rifreskoni faqen ose kontaktoni mbështetjen nëse problemi vazhdon.
          </p>
          {this.state.error && (
            <details className="mb-4 text-left w-full max-w-md">
              <summary className="text-xs text-neutral-400 cursor-pointer hover:text-neutral-600">
                Detajet teknike
              </summary>
              <pre className="mt-2 p-3 bg-neutral-100 rounded-lg text-xs text-neutral-600 overflow-x-auto">
                {this.state.error.message}
              </pre>
            </details>
          )}
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
          >
            <ArrowClockwise size={16} weight="bold" />
            Provo përsëri
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
