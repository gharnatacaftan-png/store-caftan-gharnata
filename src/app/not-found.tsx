import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="text-7xl mb-6">🔍</div>
      <h1 className="text-4xl font-bold text-primary mb-4">404</h1>
      <h2 className="text-xl font-semibold text-gray-700 mb-2">
        الصفحة غير موجودة
      </h2>
      <p className="text-gray-500 mb-8 max-w-md">
        La page que vous recherchez n&apos;existe pas ou a été déplacée.
      </p>
      <div className="flex gap-4">
        <Link
          href="/"
          className="px-8 py-3 bg-accent text-primary font-bold rounded-full hover:bg-white transition-colors"
        >
          Retour à l&apos;accueil
        </Link>
        <Link
          href="/shop"
          className="px-8 py-3 border-2 border-primary text-primary font-bold rounded-full hover:bg-primary hover:text-white transition-colors"
        >
          Voir la boutique
        </Link>
      </div>
    </div>
  );
}
