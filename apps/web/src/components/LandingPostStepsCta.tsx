import Link from 'next/link';

const DISCORD_URL = 'https://discord.gg/gdBsEJfCar';

export default function LandingPostStepsCta() {
  return (
    <section className="public-page-section px-4 landing-post-steps" aria-label="Extension preview and next steps">
      <div className="landing-shell landing-post-steps__shell">
        <div className="landing-post-steps__intro">
          <span className="brand-eyebrow">See the friction layer</span>
          <p className="landing-post-steps__copy">
            Install the extension and let TiltCheck watch your next session — or verify your casino&apos;s receipts
            first.
          </p>
        </div>

        <div className="landing-visual-placeholder" role="img" aria-label="Conceptual extension overlay showing a tilt warning">
          <div className="landing-visual-placeholder__frame">
            <div className="hero-panel landing-extension-mock">
              <div className="hero-panel__header">
                <div>
                  <p className="hero-panel__eyebrow">TiltCheck · Live session</p>
                  <h3 className="hero-panel__title">Stake.com — Blackjack</h3>
                </div>
                <span className="hero-panel__status">Watching</span>
              </div>

              <div className="hero-panel__stack">
                <article className="hero-signal-card hero-signal-card--alert">
                  <p className="hero-signal-card__label">Tilt warning</p>
                  <p className="hero-signal-card__value">Pacing +40%</p>
                  <p className="hero-signal-card__description">
                    Bet interval dropped from 12s to 7s. Three rapid doubles in 90 seconds. This is the auto-pilot
                    pattern.
                  </p>
                </article>

                <article className="hero-signal-card">
                  <p className="hero-signal-card__label">Session drift</p>
                  <p className="hero-signal-card__value">62% tilt score</p>
                  <p className="hero-signal-card__description">
                    Click-speed and stake escalation are trending hot. Vault line is armed at your preset exit.
                  </p>
                </article>
              </div>

              <div className="hero-panel__footer">
                <p className="hero-panel__footer-copy">
                  Enforcement is active — not a passive toast. Your exit rule fires when the line is crossed.
                </p>
                <span className="landing-extension-mock__chip">Read-only · No wallet access</span>
              </div>
            </div>
          </div>
        </div>

        <div className="landing-post-steps__actions hero-actions hero-actions--desktop">
          <Link href="/extension" className="btn btn-primary">
            INSTALL THE EXTENSION
          </Link>
          <Link href="/casinos" className="btn btn-ghost">
            CHECK CASINO TRUST
          </Link>
        </div>

        <div className="landing-post-steps__actions hero-actions hero-actions--mobile">
          <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-discord">
            JOIN DISCORD
          </a>
          <Link href="/casinos" className="btn btn-ghost">
            CHECK CASINO TRUST
          </Link>
          <Link href="/extension" className="hero-actions__desktop-link">
            Get the desktop install link
          </Link>
        </div>
      </div>
    </section>
  );
}
