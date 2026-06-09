import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="public-page text-white">
      <section className="hero-surface">
        <div className="landing-shell landing-hero-centered">
          <span className="brand-eyebrow">404</span>
          <h1 className="brand-page-title">Wrong table.</h1>
          <p className="landing-hero-subtitle landing-hero-subtitle--centered">
            This page doesn&apos;t exist — maybe a bad bookmark, maybe a deleted route. Either way, no
            casino tab here.
          </p>
          <div className="hero-actions hero-actions--desktop hero-actions--mobile">
            <Link href="/" className="btn btn-primary">
              Home
            </Link>
            <Link href="/casinos" className="btn btn-ghost">
              Casino trust
            </Link>
            <Link href="/touch-grass" className="btn btn-ghost">
              Touch Grass
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
