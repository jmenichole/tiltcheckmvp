import Link from 'next/link';
import LandingExtensionMock from '@/components/LandingExtensionMock';
import LandingHeroActions from '@/components/LandingHeroActions';
import LandingZeroTrustStrip from '@/components/LandingZeroTrustStrip';

const coreJobs = [
  {
    step: '01',
    title: 'Kill the Auto-Pilot',
    description:
      'We track click-speed, bet patterns, and session pacing in real time. If you are playing like a bot, we wake you up.',
  },
  {
    step: '02',
    title: 'Read the Room',
    description:
      'We flag sus pacing, pressure loops, and manipulative session cues. Math verifiers can rerun the numbers later. We catch the headspace drift while you are still inside it.',
  },
  {
    step: '03',
    title: 'Enforce the Exit',
    description:
      'We are not a suggestion. Set your line. We enforce it. No passive warnings. No concern theater.',
  },
];

export default function Home() {
  return (
    <main className="landing-page">
      <section className="hero-surface">
        <div className="landing-shell landing-hero-centered">
          <span className="brand-eyebrow">Built for Degens. By Degens.</span>
          <h1 className="landing-hero-title landing-hero-title--centered">HOUSE ALWAYS WINS? FUCK THAT.</h1>
          <p className="landing-hero-kicker">The math isn&apos;t rigged. Your dopamine is.</p>
          <p className="landing-hero-subtitle landing-hero-subtitle--centered">
            Casinos don&apos;t need to cheat the RNG when the UI is engineered to weaponize your
            psychology—breathless loops, fast pacing, flash wins. They push you into tilt until you
            voluntarily hand back every token.
          </p>
          <p className="landing-hero-subtitle landing-hero-subtitle--centered landing-hero-subtitle--lede">
            TiltCheck is the read-only friction layer that tracks your session drift in real time.
            Kill the auto-pilot. Get pulled out before you rug your own bankroll.
          </p>

          <LandingHeroActions />

          <p className="hero-privacy-guarantee">
            Read-only extension. No wallet passwords. Your session logs stay on your machine — never sold.
          </p>
        </div>
      </section>

      <LandingZeroTrustStrip />

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <div className="public-page-section-heading">
            <div>
              <span className="brand-eyebrow">What TiltCheck actually does</span>
              <h2 className="public-page-section-heading__title">Built to protect your bankroll.</h2>
            </div>
          </div>
          <div className="public-page-grid public-page-grid--3">
            {coreJobs.map((job) => (
              <article key={job.step} className="public-page-card">
                <p className="public-page-card__eyebrow">Step {job.step}</p>
                <h3 className="public-page-card__title">{job.title}</h3>
                <p className="public-page-card__copy">{job.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <LandingExtensionMock />

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <div className="public-page-cta-band">
            <p className="public-page-panel__eyebrow">Ready to kill the auto-pilot?</p>
            <p className="public-page-cta-band__copy">
              Install the extension and let TiltCheck watch your next session — or verify your casino&apos;s
              receipts first.
            </p>
            <div className="public-page-cta-band__actions public-page-cta-band__actions--desktop">
              <Link href="/extension" className="btn btn-primary">
                INSTALL THE EXTENSION
              </Link>
              <Link href="/casinos" className="btn btn-ghost">
                CHECK CASINO TRUST
              </Link>
            </div>
            <div className="public-page-cta-band__actions public-page-cta-band__actions--mobile">
              <a
                href="https://discord.gg/gdBsEJfCar"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-discord"
              >
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
        </div>
      </section>

      <section className="public-page-section px-4" style={{ paddingBottom: '2rem' }}>
        <div className="landing-shell" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: '#6b7a8d', lineHeight: 1.6 }}>
            TiltCheck is not a casino, not a bank, and not financial advice. If you or someone you know has
            a gambling problem, contact{' '}
            <a href="https://www.ncpg.org" target="_blank" rel="noopener noreferrer" style={{ color: '#17c3b2' }}>
              NCPG
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
