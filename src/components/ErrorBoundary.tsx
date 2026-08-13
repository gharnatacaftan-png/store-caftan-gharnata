"use client";

import React from "react";
import Link from "next/link";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onReset?: () => void;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Une erreur est survenue
          </h2>
          <p className="text-gray-600 mb-4 max-w-md">
            {this.state.error?.message || "Une erreur inattendue s'est produite."}
          </p>
          <button
            onClick={this.handleReset}
            className="px-6 py-2 bg-accent text-primary font-bold rounded-full hover:bg-white transition-colors"
          >
            Réessayer
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Simplified error boundary wrapper for page-level usage
 */
export function PageErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
          <div className="text-6xl mb-6">💥</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Erreur de chargement
          </h1>
          <p className="text-gray-600 mb-6 max-w-lg">
            Une erreur est survenue lors du chargement de cette page.
            Veuillez réessayer ou retourner à l&apos;accueil.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-accent text-primary font-bold rounded-full hover:bg-white transition-colors"
            >
              Réessayer
            </button>
            <Link
              href="/"
              className="px-6 py-3 border-2 border-primary text-primary font-bold rounded-full hover:bg-primary hover:text-white transition-colors"
            >
              Accueil
            </Link>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
