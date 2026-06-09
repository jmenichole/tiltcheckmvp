import Link from 'next/link';
import AuthAwareLink from '@/components/AuthAwareLink';
import {
  extensionInstallHref,
  isChromeWebStoreLive,
} from '@/lib/extension-install';

const setupSteps = [
  {
    step: '01',
    title: 'Install the extension',
    copyLive: 'Add TiltCheck from the Chrome Web Store. Click the toolbar icon — no floating widget on casino pages.',
    copyPending:
      'Load unpacked from this repo: build with `pnpm --filter @tiltcheck/extension build`, then Chrome → Extensions → Developer mode → Load unpacked → `apps/extension/dist`.',
  },
  {
    step: '02',
    title: 'Connect Discord',
    copyLive: 'One login syncs your game exclusions, tilt sensitivity, and session cap across dashboard and extension.',
    copyPending: 'One login syncs your game exclusions, tilt sensitivity, and session cap across dashboard and extension.',
  },
  {
    step: '03',
    title: 'Block your problem games',
    copyLive:
      'In Settings: toggle presets (blackjack, crash, slots…) or paste a game URL / custom keywords. Choose block or warn per game.',
    copyPending:
      'In Settings: toggle presets (blackjack, crash, slots…) or paste a game URL / custom keywords. Choose block or warn per game.',
  },
  {
    step: '04',
    title: 'Set tilt sensitivity + session cap',
    copyLive:
      'Pick how early tilt warnings fire. Set how many minutes Touch Grass locks the tab when a block or critical tilt hits.',
    copyPending:
      'Pick how early tilt warnings fire. Set how many minutes Touch Grass locks the tab when a block or critical tilt hits.',
  },
] as const;

export default function ExtensionPage() {
  const cwsLive = isChromeWebStoreLive();
  const installHref = extensionInstallHref();

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
            {cwsLive ? (
              <a
                href={installHref}
                className="btn btn-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                INSTALL FROM CHROME WEB STORE
              </a>
            ) : (
              <a href="#unpacked-install" className="btn btn-primary">
                INSTALL UNPACKED
              </a>
            )}
            <Link href="/login?redirect=/extension" className="btn btn-secondary">
              CONNECT DISCORD
            </Link>
            <AuthAwareLink href="/settings#game-exclusion" className="btn btn-ghost" loginLabel="SIGN IN FOR GAME BLOCKS">
              GAME EXCLUSIONS
            </AuthAwareLink>
          </div>
          {cwsLive ? (
            <p className="hero-privacy-guarantee mt-3">Install from Chrome Web Store — one click, auto-updates.</p>
          ) : (
            <p className="hero-privacy-guarantee mt-3">
              Store listing may still be pending — use the unpacked steps below until published.
            </p>
          )}
        </div>
      </section>

      {!cwsLive ? (
        <section id="unpacked-install" className="public-page-section px-4">
          <div className="landing-shell public-page-card">
            <h2 className="public-page-card__title">Install unpacked (developer mode)</h2>
            <ol className="public-page-card__copy list-decimal pl-5 space-y-2">
              <li>
                Build the extension:{' '}
                <code className="text-sm">pnpm --filter @tiltcheck/extension build</code>
              </li>
              <li>Open Chrome → Extensions → enable Developer mode</li>
              <li>Click Load unpacked and select the <code className="text-sm">apps/extension/dist</code> folder</li>
              <li>Pin the TiltCheck icon — protection runs on casino tabs in the background</li>
            </ol>
          </div>
        </section>
      ) : null}

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
                <p className="public-page-card__copy">
                  {cwsLive ? item.copyLive : item.copyPending}
                </p>
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
