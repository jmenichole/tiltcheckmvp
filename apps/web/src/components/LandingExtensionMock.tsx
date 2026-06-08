export default function LandingExtensionMock() {
  return (
    <section className="public-page-section px-4 landing-preview-section" aria-label="Extension preview">
      <div className="landing-shell landing-preview-shell">
        <div className="landing-preview-copy">
          <span className="brand-eyebrow">See the friction layer</span>
          <h2 className="public-page-section-heading__title">What it looks like mid-session.</h2>
          <p className="landing-preview-copy__body">
            TiltCheck runs as a lightweight overlay — not another casino tab. You get pacing signals and hard
            exits before the UI drags you into another deposit loop.
          </p>
        </div>

        <div className="hero-panel landing-extension-mock" role="img" aria-label="Conceptual extension overlay showing a tilt warning">
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
    </section>
  );
}
