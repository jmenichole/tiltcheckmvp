import Link from 'next/link';

export default function ExtensionPage() {
  return (
    <main className="public-page text-white">
      <section className="hero-surface">
        <div className="landing-shell">
          <span className="brand-eyebrow">Chrome extension</span>
          <h1 className="landing-hero-title">Install TiltCheck</h1>
          <p className="landing-hero-subtitle">
            Read-only protection on casino tabs. Connect Discord to sync vault rules with your dashboard.
          </p>
          <div className="hero-actions">
            <a
              href="https://chromewebstore.google.com"
              className="btn btn-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              CHROME WEB STORE
            </a>
            <Link href="/login" className="btn btn-secondary">
              CONNECT DISCORD
            </Link>
          </div>
        </div>
      </section>
      <section className="public-page-section px-4">
        <div className="landing-shell public-page-card">
          <h2 className="public-page-card__title">Demo mode</h2>
          <p className="public-page-card__copy">
            Logged out? The extension still runs tilt detection locally. Sign in to sync vault rules and
            settings across devices.
          </p>
        </div>
      </section>
    </main>
  );
}
