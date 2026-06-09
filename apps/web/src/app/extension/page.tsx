import Link from 'next/link';
import AuthAwareLink from '@/components/AuthAwareLink';

const setupSteps = [
  {
    step: '01',
    title: 'Install the extension',
    copy: 'Add TiltCheck from the Chrome Web Store. Click the toolbar icon — no floating widget on casino pages.',
  },
  {
    step: '02',
    title: 'Connect Discord',
    copy: 'One login syncs your game exclusions, tilt sensitivity, and session cap across dashboard and extension.',
  },
  {
    step: '03',
    title: 'Block your problem games',
    copy: 'In Settings: toggle presets (blackjack, crash, slots…) or paste a game URL / custom keywords. Choose block or warn per game.',
  },
  {
    step: '04',
    title: 'Set tilt sensitivity + session cap',
    copy: 'Pick how early tilt warnings fire. Set how many minutes Touch Grass locks the tab when a block or critical tilt hits.',
  },
] as const;

export default function ExtensionPage() {
  return (
    <main className="public-page text-white">
      <section className="hero-surface">
        <div className="landing-shell">
          <span className="brand-eyebrow">Chrome extension</span>
          <h1 className="landing-hero-title">Install TiltCheck</h1>
          <p className="landing-hero-subtitle">
            Block games you know are traps. Catch tilt when pacing shifts. Lock the tab at the line you
            set — open the TC icon like Trust Wallet; protection runs quietly on casino tabs.
          </p>
          <div className="hero-actions">
            <a
              href="https://chromewebstore.google.com/search/TiltCheck"
              className="btn btn-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              CHROME WEB STORE
            </a>
            <Link href="/login?redirect=/extension" className="btn btn-secondary">
              CONNECT DISCORD
            </Link>
            <AuthAwareLink href="/settings#game-exclusion" className="btn btn-ghost" loginLabel="SIGN IN FOR GAME BLOCKS">
              GAME EXCLUSIONS
            </AuthAwareLink>
          </div>
          <p className="hero-privacy-guarantee mt-3">
            Store listing may still be pending — search &ldquo;TiltCheck&rdquo; or load unpacked from this
            repo until published.
          </p>
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <div className="public-page-section-heading">
            <span className="brand-eyebrow">Setup</span>
            <h2 className="public-page-section-heading__title">Four steps to full protection</h2>
          </div>
          <div className="public-page-grid public-page-grid--2">
            {setupSteps.map((item) => (
              <article key={item.step} className="public-page-card">
                <p className="public-page-card__eyebrow">Step {item.step}</p>
                <h3 className="public-page-card__title">{item.title}</h3>
                <p className="public-page-card__copy">{item.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell public-page-card">
          <h2 className="public-page-card__title">Demo mode</h2>
          <p className="public-page-card__copy">
            Logged out? The extension still detects tilt locally. Sign in to sync game exclusions, tilt
            sensitivity, and your session cap — enforcement follows you on every casino tab.
          </p>
          <AuthAwareLink href="/dashboard" className="btn btn-ghost btn-sm mt-4" loginLabel="SIGN IN FOR DASHBOARD">
            Open dashboard
          </AuthAwareLink>
        </div>
      </section>
    </main>
  );
}
