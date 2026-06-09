import { Suspense } from 'react';
import TouchGrassHub from '@/components/TouchGrassHub';

export default function TouchGrassPage() {
  return (
    <Suspense
      fallback={
        <main className="public-page text-white touch-grass-page">
          <section className="hero-surface touch-grass-hero">
            <div className="landing-shell landing-hero-centered">
              <p className="brand-lead">Loading break hub…</p>
            </div>
          </section>
        </main>
      }
    >
      <TouchGrassHub />
    </Suspense>
  );
}
