'use client';

import Link from 'next/link';
import AuthAwareLink from '@/components/AuthAwareLink';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type Reason = 'tilt' | 'pledge' | 'game' | 'manual';

const REASON_COPY: Record<
  Reason,
  { eyebrow: string; title: string; lead: string; accent: 'teal' | 'coral' }
> = {
  tilt: {
    eyebrow: 'Touch Grass · tab locked',
    title: 'Past you called this break.',
    lead: "The casino tab is on a timer. Use this page instead of fighting the lock — that's what it's for.",
    accent: 'teal',
  },
  pledge: {
    eyebrow: 'Vault pledge · withdraw blocked',
    title: 'The bag stays in vault.',
    lead: 'You pledged not to pull winnings back in yet. Ride out the timer — rinse prevention, not punishment.',
    accent: 'teal',
  },
  game: {
    eyebrow: 'Game block',
    title: 'Wrong table. You knew that.',
    lead: 'That game is on your no-play list. The tab locked before you dug deeper.',
    accent: 'coral',
  },
  manual: {
    eyebrow: 'Touch Grass',
    title: "You stopped. That's the win.",
    lead: "Whether TiltCheck hit the brakes or you did — you're here instead of reloading. Stay here a minute.",
    accent: 'teal',
  },
};

const BREAK_CARDS = [
  {
    href: 'https://lichess.org',
    external: true,
    step: '01',
    title: 'Play chess',
    copy: 'Skill-only. No house edge. Outlast the reload urge.',
  },
  {
    href: 'https://discord.gg/gdBsEJfCar',
    external: true,
    step: '02',
    title: 'Hit Discord',
    copy: "Other degens who've been exactly where you are.",
  },
  {
    href: '/casinos',
    external: false,
    step: '03',
    title: 'Casino intel',
    copy: 'Cold water on the site you just played — trust scores, not vibes.',
  },
  {
    href: '/settings#game-exclusion',
    external: false,
    step: '04',
    title: 'Block problem games',
    copy: 'Paste a URL or keywords before the next session starts.',
  },
  {
    href: '/dashboard',
    external: false,
    step: '05',
    title: 'My Line & vault pledge',
    copy: 'Tweak lockout length or arm a vault bag timer for next heater.',
  },
  {
    href: '/extension',
    external: false,
    step: '06',
    title: 'Extension sync',
    copy: 'Reconnect Discord so your line follows you across tabs.',
  },
] as const;

function parseReason(raw: string | null): Reason {
  if (raw === 'tilt' || raw === 'pledge' || raw === 'game') return raw;
  return 'manual';
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00';
  const sec = Math.ceil(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}h ${rm}m`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function TouchGrassHub() {
  const params = useSearchParams();
  const reason = parseReason(params.get('reason'));
  const untilRaw = params.get('until');
  const note = params.get('note')?.trim() ?? '';
  const copy = REASON_COPY[reason];

  const untilMs = useMemo(() => {
    if (!untilRaw) return null;
    const t = Date.parse(untilRaw);
    return Number.isNaN(t) ? null : t;
  }, [untilRaw]);

  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!untilMs) {
      setRemaining(null);
      return;
    }
    const tick = () => setRemaining(Math.max(0, untilMs - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [untilMs]);

  const showTimer = untilMs !== null && remaining !== null;
  const timerDone = showTimer && remaining === 0;

  return (
    <main className={`public-page text-white touch-grass-page touch-grass-page--${copy.accent}`}>
      <section className="hero-surface touch-grass-hero">
        <div className="landing-shell landing-hero-centered">
          <span className="brand-eyebrow touch-grass-hero__eyebrow">{copy.eyebrow}</span>
          <h1 className="brand-page-title touch-grass-hero__title">{copy.title}</h1>
          <p className="landing-hero-subtitle landing-hero-subtitle--centered touch-grass-hero__lead">
            {copy.lead}
          </p>

          {showTimer ? (
            <div className="touch-grass-timer" role="timer" aria-live="polite">
              <p className="touch-grass-timer__label">
                {timerDone ? 'Lockout ended — close this tab when ready' : 'Casino tab unlocks in'}
              </p>
              <p className="touch-grass-timer__value">
                {timerDone ? '✓' : formatCountdown(remaining!)}
              </p>
            </div>
          ) : null}

          {note ? (
            <blockquote className="touch-grass-note">
              <span className="touch-grass-note__label">Past-you note</span>
              {note}
            </blockquote>
          ) : null}
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <div className="touch-grass-steps">
            <div className="touch-grass-step">
              <span className="touch-grass-step__n">1</span>
              <div>
                <h2 className="touch-grass-step__title">Close the casino tab</h2>
                <p className="touch-grass-step__copy">
                  Don&apos;t watch the timer like it&apos;s a slot. This page is the break — the tab unlocks when it&apos;s
                  time.
                </p>
              </div>
            </div>
            <div className="touch-grass-step">
              <span className="touch-grass-step__n">2</span>
              <div>
                <h2 className="touch-grass-step__title">Pick one thing below</h2>
                <p className="touch-grass-step__copy">
                  Hands busy beats brain looping on "one more spin."
                </p>
              </div>
            </div>
            <div className="touch-grass-step">
              <span className="touch-grass-step__n">3</span>
              <div>
                <h2 className="touch-grass-step__title">Come back when the line says so</h2>
                <p className="touch-grass-step__copy">
                  You set the rules. TiltCheck is just enforcing what past-you wanted.
                </p>
              </div>
            </div>
          </div>

          <div className="public-page-section-heading touch-grass-section-head">
            <div>
              <span className="brand-eyebrow">While you wait</span>
              <h2 className="public-page-section-heading__title">Do this instead</h2>
              <p className="public-page-section-heading__copy brand-lead">
                No casino tabs. No "just checking balance."
              </p>
            </div>
          </div>

          <div className="touch-grass-grid">
            {BREAK_CARDS.map((card) => {
              const inner = (
                <>
                  <span className="touch-grass-card__step">{card.step}</span>
                  <h3 className="touch-grass-card__title">{card.title}</h3>
                  <p className="touch-grass-card__copy">{card.copy}</p>
                </>
              );
              if (card.external) {
                return (
                  <a
                    key={card.href}
                    href={card.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="touch-grass-card"
                  >
                    {inner}
                  </a>
                );
              }
              return (
                <Link key={card.href} href={card.href} className="touch-grass-card">
                  {inner}
                </Link>
              );
            })}
          </div>

          <details className="touch-grass-help">
            <summary>Need real help? (US helplines)</summary>
            <div className="touch-grass-help__body">
              <p>
                National Problem Gambling Helpline:{' '}
                <a href="tel:1-800-426-2537" className="dashboard-link">
                  1-800-426-2537
                </a>{' '}
                — 24/7
              </p>
              <p>
                Crisis Text Line: text HOME to 741741 · Suicide &amp; Crisis Lifeline: 988
              </p>
              <p>
                <a href="https://www.ncpg.org" target="_blank" rel="noopener noreferrer" className="dashboard-link">
                  NCPG resources
                </a>
                {' · '}
                <a
                  href="https://www.gamblersanonymous.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dashboard-link"
                >
                  Gamblers Anonymous
                </a>
              </p>
            </div>
          </details>

          <div className="touch-grass-footer-actions">
            <Link href="/" className="btn btn-secondary btn-sm">
              Home
            </Link>
            <AuthAwareLink
              href="/dashboard"
              className="btn btn-ghost btn-sm"
              loginLabel="Sign in for dashboard"
            >
              Dashboard
            </AuthAwareLink>
          </div>
        </div>
      </section>
    </main>
  );
}
