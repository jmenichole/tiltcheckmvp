const trustPoints = [
  'No wallet or casino passwords required.',
  'Zero data sold — your session logs stay yours.',
  'Lightweight footprint — no lag, no missed ticks.',
];

export default function LandingZeroTrustStrip() {
  return (
    <section className="zero-trust-strip" aria-label="Zero-trust architecture">
      <div className="landing-shell">
        <div className="zero-trust-strip__inner">
          <div className="zero-trust-strip__intro">
            <span className="brand-eyebrow">Zero-trust architecture</span>
            <h2 className="zero-trust-strip__title">Read-only. Local-first. No honeypot.</h2>
            <p className="zero-trust-strip__lede">
              The extension watches DOM pacing and session cues in your browser — it never logs into your casino
              account or touches your wallet.
            </p>
          </div>
          <ul className="zero-trust-strip__list">
            {trustPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
