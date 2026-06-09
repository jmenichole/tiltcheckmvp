'use client';

import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="public-page text-white">
      <section className="hero-surface">
        <div className="landing-shell landing-hero-centered">
          <span className="brand-eyebrow">Something broke</span>
          <h1 className="brand-page-title">Page hit a wall.</h1>
          <p className="landing-hero-subtitle landing-hero-subtitle--centered">
            {error.message || 'An unexpected error stopped this page from loading.'}
          </p>
          <div className="hero-actions hero-actions--desktop hero-actions--mobile">
            <button type="button" className="btn btn-primary" onClick={reset}>
              Try again
            </button>
            <Link href="/" className="btn btn-ghost">
              Home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
