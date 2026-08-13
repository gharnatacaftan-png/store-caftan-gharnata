"use client";

// GlobalError replaces the ENTIRE root layout when a fatal error occurs in the
// root layout/template itself, so it must define its own <html>/<body>.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="fr">
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
          <div className="text-6xl mb-6">💥</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Une erreur est survenue
          </h1>
          <p className="text-gray-600 mb-2 max-w-lg">
            Nous nous excusons pour ce désagrément.
          </p>
          {error.digest && (
            <p className="text-xs text-gray-400 mb-6 font-mono">
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={retry}
            className="px-8 py-3 bg-accent text-primary font-bold rounded-full hover:bg-white transition-colors"
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}