"use client";

import Link from "next/link";

// Nested error boundary: renders INSIDE the root layout (SiteChrome's <main>),
// so it must NOT render <html>/<body> — only global-error.tsx may do that.
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="text-6xl mb-6">💥</div>
      <h1 className="text-3xl font-bold text-primary mb-4">
        Une erreur est survenue
      </h1>
      <p className="text-gray-600 mb-2 max-w-lg">
        Nous nous excusons pour ce désagrément. L&apos;équipe a été notifiée.
      </p>
      {error.digest && (
        <p className="text-xs text-gray-400 mb-6 font-mono">
          Error ID: {error.digest}
        </p>
      )}
      <div className="flex gap-4">
        <button
          onClick={retry}
          className="px-8 py-3 bg-accent text-primary font-bold rounded-full hover:bg-white transition-colors"
        >
          Réessayer
        </button>
        <Link
          href="/"
          className="px-8 py-3 border-2 border-primary text-primary font-bold rounded-full hover:bg-primary hover:text-white transition-colors"
        >
          Accueil
        </Link>
      </div>
    </div>
  );
}