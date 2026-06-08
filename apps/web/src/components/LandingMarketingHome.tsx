import LandingHeroActions from '@/components/LandingHeroActions';
import LandingSessionMock from '@/components/LandingSessionMock';

const coreJobs = [
  {
    step: '01',
    title: 'Block Your Problem Games',
    description:
      'Pick the games that wreck you — blackjack, crash, live dealer. Paste a link or keywords. Block instantly or get a 10-second warn first.',
  },
  {
    step: '02',
    title: 'Catch Tilt on the Tab',
    description:
      'Chrome extension watches bet pacing and click speed on casino sites. Read-only. No wallet passwords. Alerts when you shift into autopilot.',
  },
  {
    step: '03',
    title: 'Lock the Tab at Your Line',
    description:
      'Set a session cap in your dashboard. Open a blocked game or hit critical tilt → Touch Grass fullscreen lockout until the timer ends. No dismiss.',
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
            TiltCheck is a read-only Chrome extension. Block specific games you know are traps, catch tilt
            when your pacing shifts, and lock the casino tab when you cross the line you set.
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
