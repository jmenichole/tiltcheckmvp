export default function LandingSessionMock() {
  return (
    <section className="public-page-section px-4 landing-session-mock" aria-label="Extension protection preview">
      <div className="landing-shell landing-session-mock__shell">
        <div className="landing-session-mock__heading">
          <span className="brand-eyebrow">On the casino tab</span>
          <h2 className="landing-session-mock__title">Block a game you excluded — or catch tilt mid-session.</h2>
        </div>

        <div className="landing-visual-placeholder" role="img" aria-label="Extension overlay showing game block and tilt warning">
          <div className="landing-visual-placeholder__frame">
            <div className="hero-panel landing-extension-mock">
              <div className="hero-panel__header">
                <div>
                  <p className="hero-panel__eyebrow">TiltCheck · Live session</p>
                  <h3 className="hero-panel__title">Stake.com — Blackjack</h3>
                </div>
                <span className="hero-panel__status">Blocked</span>
              </div>

              <div className="hero-panel__stack">
                <article className="hero-signal-card hero-signal-card--alert">
                  <p className="hero-signal-card__label">Game excluded</p>
                  <p className="hero-signal-card__value">Blackjack · Block mode</p>
                  <p className="hero-signal-card__description">
                    You listed this game in settings. Touch Grass lockout uses your session cap timer — same
                    minutes as tilt enforcement.
                  </p>
                </article>

                <article className="hero-signal-card">
                  <p className="hero-signal-card__label">Tilt watch (other games)</p>
                  <p className="hero-signal-card__value">Pacing +40%</p>
                  <p className="hero-signal-card__description">
                    On allowed games, the extension still tracks click-speed and bet intervals. Critical
                    tilt triggers the same lockout.
                  </p>
                </article>
              </div>

              <div className="hero-panel__footer">
                <p className="hero-panel__footer-copy">
                  Fullscreen lockout — not a toast you can swipe away. Paste a game URL or keywords in
                  settings to build your list.
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
