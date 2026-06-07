'use client';

import Link from 'next/link';
import { useState } from 'react';

type Tab = 'immediate' | 'resources' | 'support';

const SIDE_QUESTS = [
  {
    href: '/casinos',
    eyebrow: 'Intel',
    title: 'Casino Trust Engine',
    copy: 'Read what TiltCheck has on the casino you just played. Cold water.',
    external: false,
  },
  {
    href: '/bonuses',
    eyebrow: 'Intel',
    title: 'Bonus Scanner',
    copy: "If you're coming back later, know what's claimable before another deposit.",
    external: false,
  },
  {
    href: '/dashboard',
    eyebrow: 'Protection',
    title: 'Tweak Your Vault Cap',
    copy: "While you're thinking clearly, adjust your session cap for next time.",
    external: false,
  },
  {
    href: '/extension',
    eyebrow: 'Protection',
    title: 'Extension Setup',
    copy: 'Install or reconnect Discord so vault rules follow you across tabs.',
    external: false,
  },
  {
    href: 'https://discord.gg/gdBsEJfCar',
    eyebrow: 'Community',
    title: 'Hit the Discord',
    copy: 'Talk to other degens who have been exactly where you are.',
    external: true,
  },
  {
    href: 'https://lichess.org',
    eyebrow: 'Skill game',
    title: 'Play Chess',
    copy: 'Free. Skill-only. No house. Outlast the reload urge.',
    external: true,
  },
] as const;

export default function TouchGrassPage() {
  const [tab, setTab] = useState<Tab>('immediate');

  return (
    <main className="public-page text-white">
      <section className="hero-surface" style={{ borderBottomColor: 'rgba(239,68,68,0.3)' }}>
        <div className="landing-shell landing-hero-centered">
          <span className="brand-eyebrow" style={{ borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444' }}>
            Touch Grass Protocol
          </span>
          <h1 className="brand-page-title" style={{ color: '#ef4444' }}>
            You stopped. That&apos;s the point.
          </h1>
          <p className="landing-hero-subtitle landing-hero-subtitle--centered">
            TiltCheck hit the brakes — or you pulled them yourself. Either way you&apos;re here instead of
            reloading.
          </p>
        </div>
      </section>

      <section className="public-page-section px-4" style={{ paddingTop: 0 }}>
        <div className="landing-shell">
          <div className="public-page-card public-page-card--danger text-center">
            <p className="public-page-card__copy" style={{ marginTop: 0 }}>
              <strong style={{ color: '#ef4444' }}>Need immediate help?</strong>{' '}
              <a href="tel:1-800-426-2537" className="dashboard-link">
                1-800-GAMBLER (1-800-426-2537)
              </a>{' '}
              — 24/7
            </p>
          </div>

          <div className="dashboard-tab-bar mt-6" role="tablist">
            {(
              [
                ['immediate', 'Right now'],
                ['resources', 'Resources'],
                ['support', 'Real talk'],
              ] as const
            ).map(([t, label]) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                className={`dashboard-tab${tab === t ? ' dashboard-tab--active' : ''}`}
                onClick={() => setTab(t)}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'immediate' && (
            <div className="public-page-card public-page-card--danger mt-6 space-y-4">
              <div>
                <h3 className="public-page-card__title mt-0" style={{ color: '#ef4444' }}>
                  Step 1: Stop playing
                </h3>
                <p className="public-page-card__copy">
                  Close the casino. Close the browser. Put the phone in another room. The urge to get it
                  back is dopamine talking.
                </p>
              </div>
              <div>
                <h3 className="public-page-card__title" style={{ color: '#ef4444' }}>
                  Step 2: Tell someone
                </h3>
                <p className="public-page-card__copy">
                  Not your buddy who gambles. Someone who will care and won&apos;t enable you.
                </p>
              </div>
              <div>
                <h3 className="public-page-card__title" style={{ color: '#ef4444' }}>
                  Step 3: Count what you lost
                </h3>
                <p className="public-page-card__copy">
                  Don&apos;t estimate. Write it down. Look at it. You can&apos;t fix it tonight.
                </p>
              </div>
              <div>
                <h3 className="public-page-card__title" style={{ color: '#ef4444' }}>
                  Step 4: Seek help
                </h3>
                <p className="public-page-card__copy">
                  Call{' '}
                  <a href="tel:1-800-426-2537" className="dashboard-link">
                    1-800-GAMBLER
                  </a>
                  . Free. Confidential.
                </p>
              </div>
            </div>
          )}

          {tab === 'resources' && (
            <div className="public-page-grid public-page-grid--2 mt-6">
              <div className="public-page-card public-page-card--accent">
                <p className="public-page-card__eyebrow">Crisis hotlines</p>
                <p className="public-page-card__copy">
                  National Problem Gambling Helpline:{' '}
                  <a href="tel:1-800-426-2537" className="dashboard-link">
                    1-800-426-2537
                  </a>
                  <br />
                  Crisis Text Line: text HOME to 741741
                  <br />
                  Suicide prevention: 988
                </p>
              </div>
              <div className="public-page-card public-page-card--accent">
                <p className="public-page-card__eyebrow">Support orgs</p>
                <p className="public-page-card__copy">
                  <a href="https://www.gamblersanonymous.org" target="_blank" rel="noopener noreferrer" className="dashboard-link">
                    Gamblers Anonymous
                  </a>
                  <br />
                  <a href="https://www.ncpg.org" target="_blank" rel="noopener noreferrer" className="dashboard-link">
                    NCPG
                  </a>
                  <br />
                  <a href="https://www.gam-anon.org" target="_blank" rel="noopener noreferrer" className="dashboard-link">
                    Gam-Anon (families)
                  </a>
                </p>
              </div>
            </div>
          )}

          {tab === 'support' && (
            <div className="space-y-4 mt-6">
              <div className="public-page-card public-page-card--accent">
                <h3 className="public-page-card__title mt-0">The science is real</h3>
                <p className="public-page-card__copy">
                  Gambling addiction isn&apos;t weakness — it&apos;s neurobiology. Dopamine loops. Reward
                  pathways going haywire.
                </p>
              </div>
              <div className="public-page-card public-page-card--accent">
                <h3 className="public-page-card__title mt-0">Recovery is real too</h3>
                <p className="public-page-card__copy">
                  Millions have stopped with therapy and support groups. TiltCheck is the brakes — not a
                  replacement for treatment if you&apos;re hitting limits every session.
                </p>
              </div>
            </div>
          )}

          <div className="mt-10">
            <h2 className="public-page-section-heading__title">Degen side quests</h2>
            <p className="brand-lead mb-4">Something to do with your hands. Do not open a casino tab.</p>
            <div className="public-page-grid public-page-grid--3">
              {SIDE_QUESTS.map((quest) =>
                quest.external ? (
                  <a
                    key={quest.href}
                    href={quest.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="public-page-card"
                  >
                    <p className="public-page-card__eyebrow">{quest.eyebrow}</p>
                    <h3 className="public-page-card__title">{quest.title}</h3>
                    <p className="public-page-card__copy">{quest.copy}</p>
                  </a>
                ) : (
                  <Link key={quest.href} href={quest.href} className="public-page-card">
                    <p className="public-page-card__eyebrow">{quest.eyebrow}</p>
                    <h3 className="public-page-card__title">{quest.title}</h3>
                    <p className="public-page-card__copy">{quest.copy}</p>
                  </Link>
                ),
              )}
            </div>
          </div>

          <div className="public-page-cta-band mt-8">
            <p className="public-page-panel__eyebrow">Right now</p>
            <h3 className="public-page-cta-band__title">Pick one thing. Just one.</h3>
            <div className="public-page-cta-band__actions">
              <a href="tel:1-800-426-2537" className="btn btn-primary btn-sm">
                Call 1-800-GAMBLER
              </a>
              <a
                href="https://www.ncpg.org/chat"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
              >
                NCPG chat
              </a>
              <Link href="/" className="btn btn-secondary btn-sm">
                Go home
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
