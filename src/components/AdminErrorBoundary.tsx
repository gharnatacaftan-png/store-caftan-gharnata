"use client";

import { ErrorBoundary } from "@/components/ErrorBoundary";

export function AdminErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-white mb-2">
            Erreur dans le panneau d&apos;administration
          </h2>
          <p className="text-gray-400 mb-4 max-w-md">
            Une erreur est survenue. Veuillez recharger la page ou vous reconnecter.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2 bg-accent text-primary font-bold rounded-lg hover:bg-white transition-colors text-sm"
            >
              Recharger
            </button>
            <a
              href="/gharnata-portal-x92/login"
              className="px-5 py-2 border border-accent text-accent font-bold rounded-lg hover:bg-accent/10 transition-colors text-sm"
            >
              Se reconnecter
            </a>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
