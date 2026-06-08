export default function LandingSessionMock() {
  return (
    <section className="public-page-section px-4 landing-session-mock" aria-label="Mid-session extension preview">
      <div className="landing-shell landing-session-mock__shell">
        <div className="landing-session-mock__heading">
          <span className="brand-eyebrow">Mid-session</span>
          <h2 className="landing-session-mock__title">What it looks like when you start tilting.</h2>
        </div>

        <div className="landing-visual-placeholder" role="img" aria-label="Extension overlay showing tilt warning and session drift">
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
                    Bet interval dropped from 12s to 7s. Three rapid doubles in 90 seconds. Auto-pilot
                    pattern detected.
                  </p>
                </article>

                <article className="hero-signal-card">
                  <p className="hero-signal-card__label">Session drift</p>
                  <p className="hero-signal-card__value">62% tilt score</p>
                  <p className="hero-signal-card__description">
                    Click-speed and stake escalation trending hot. Vault exit line is armed.
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
      </div>
    </section>
  );
}
