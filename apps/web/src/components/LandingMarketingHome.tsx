import LandingHeroActions from '@/components/LandingHeroActions';
import LandingSessionMock from '@/components/LandingSessionMock';

const coreJobs = [
  {
    step: '01',
    title: 'Kill the Auto-Pilot',
    description: 'Tracks click-speed and bet pacing. Wakes you up when you play like a bot.',
  },
  {
    step: '02',
    title: 'Read the Room',
    description: 'Flags sus pacing and pressure loops while you are still in the session.',
  },
  {
    step: '03',
    title: 'Enforce the Exit',
    description: 'Set your line. We enforce it — not passive warnings.',
  },
];

export default function LandingMarketingHome() {
  return (
    <main className="landing-page">
      <section className="hero-surface">
        <div className="landing-shell landing-hero-centered">
          <h1 className="landing-hero-title landing-hero-title--centered">
            HOUSE ALWAYS WINS?
            <br />
            FUCK THAT.
          </h1>
          <div className="landing-hero-kicker-block">
            <span className="landing-hero-kicker__line">The math isn&apos;t rigged. Your dopamine is.</span>
            <span className="landing-hero-kicker__line landing-hero-kicker__line--second">
              The house banks on your tilt.
            </span>
          </div>
          <p className="landing-hero-subtitle landing-hero-subtitle--centered landing-hero-subtitle--lede">
            TiltCheck is the read-only friction layer that tracks session drift in real time and pulls
            you out before you rug your own bankroll.
          </p>

          <LandingHeroActions />

          <p className="hero-privacy-guarantee">
            Read-only. No wallet passwords. Your logs stay local.
          </p>
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell">
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

      <LandingSessionMock />
    </main>
  );
}
