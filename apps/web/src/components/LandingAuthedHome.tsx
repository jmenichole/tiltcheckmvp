'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { GameExclusionEntry } from '@tiltcheck/shared';
import { HABIT_LOOP_COPY, PROTECTION_STEPS } from '@/lib/protection-steps';
import { apiFetch } from '@/lib/api';
import LandingMarketingHome from '@/components/LandingMarketingHome';

interface VaultRule {
  id: string;
  ruleType: string;
  enabled: boolean;
  config: { durationMinutes?: number };
}

type LoadState = 'loading' | 'authed' | 'fallback';

export default function LandingAuthedHome() {
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [username, setUsername] = useState('');
  const [capMinutes, setCapMinutes] = useState<number | null>(null);
  const [vaultError, setVaultError] = useState(false);
  const [gameExclusionCount, setGameExclusionCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [meRes, vaultRes, settingsRes] = await Promise.all([
        apiFetch('/auth/me'),
        apiFetch('/vault'),
        apiFetch('/user/settings'),
      ]);

      if (!meRes.ok) {
        if (!cancelled) setLoadState('fallback');
        return;
      }

      const meData = (await meRes.json()) as { user?: { username: string } };
      if (!cancelled) {
        setUsername(meData.user?.username ?? 'Degen');
        setLoadState('authed');
      }

      if (!vaultRes.ok) {
        if (!cancelled) setVaultError(true);
        return;
      }
      const vaultData = await vaultRes.json();
      const cap = (vaultData.rules as VaultRule[] | undefined)?.find(
        (r) => r.ruleType === 'session_cap' && r.enabled,
      );
      if (!cancelled && cap?.config?.durationMinutes) {
        setCapMinutes(cap.config.durationMinutes);
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        const exclusions = settingsData.settings?.gameExclusions;
        if (!cancelled && Array.isArray(exclusions)) {
          setGameExclusionCount(exclusions.length);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadState === 'fallback') {
    return <LandingMarketingHome />;
  }

  const capArmed = capMinutes !== null;
  const lede = capArmed
    ? `${capMinutes}-minute Touch Grass cap is armed. Play smart or don't play.`
    : "Set your walk-away line and block problem games in Settings. The extension can't enforce what you haven't configured.";

  const primaryHref = '/dashboard';
  const primaryLabel = capArmed ? 'OPEN DASHBOARD' : 'SET YOUR LINE';
  const secondaryHref = capArmed ? '/extension' : '/dashboard';
  const secondaryLabel = capArmed ? 'EXTENSION SETUP' : 'OPEN DASHBOARD';

  return (
    <main className="landing-page landing-authed-home">
      <section className="hero-surface">
        <div className="landing-shell landing-hero-centered">
          <span className="brand-eyebrow">Welcome back</span>
          <h1 className="landing-hero-title landing-hero-title--centered landing-authed-home__title">
            {loadState === 'loading' ? 'Linking your session…' : `${username} — you're linked.`}
          </h1>
          {loadState === 'authed' ? (
            <p className="landing-hero-subtitle landing-hero-subtitle--centered landing-hero-subtitle--lede">
              {lede}
            </p>
          ) : null}

          <div className="hero-actions hero-actions--desktop hero-actions--mobile">
            <Link href={primaryHref} className="btn btn-primary">
              {loadState === 'loading' ? 'LOADING…' : primaryLabel}
            </Link>
            <Link href={secondaryHref} className="btn btn-ghost">
              {secondaryLabel}
            </Link>
          </div>

          {loadState === 'authed' ? (
            <div className="landing-authed-home__status public-page-grid public-page-grid--2">
              <article className="public-page-card">
                <p className="public-page-card__eyebrow">Lockout</p>
                <h3 className="public-page-card__title">
                  {vaultError ? 'Status unavailable' : capArmed ? `${capMinutes} min armed` : 'No exit line set'}
                </h3>
                <p className="public-page-card__copy">
                  {vaultError ? (
                    <Link href="/dashboard">Open dashboard to check lockout</Link>
                  ) : capArmed ? (
                    'Touch Grass tab lock is configured.'
                  ) : (
                    <Link href="/dashboard">Set lockout minutes on the dashboard</Link>
                  )}
                </p>
              </article>
              <article className="public-page-card">
                <p className="public-page-card__eyebrow">Game blocks</p>
                <h3 className="public-page-card__title">
                  {gameExclusionCount === null
                    ? 'Loading…'
                    : gameExclusionCount > 0
                      ? `${gameExclusionCount} excluded`
                      : 'None yet'}
                </h3>
                <p className="public-page-card__copy">
                  <Link href="/settings#game-exclusion">
                    {gameExclusionCount && gameExclusionCount > 0
                      ? 'Manage exclusions in Settings'
                      : 'Block problem games in Settings'}
                  </Link>
                </p>
              </article>
            </div>
          ) : null}

          <p className="landing-authed-home__tertiary">
            <Link href="/settings">Game exclusions</Link>
            <span className="landing-authed-home__tertiary-sep" aria-hidden="true">
              ·
            </span>
            <Link href="/casinos">Casino trust</Link>
            <span className="landing-authed-home__tertiary-sep" aria-hidden="true">
              ·
            </span>
            <Link href="/bonuses">Bonuses</Link>
          </p>
        </div>
      </section>

      {loadState === 'authed' ? (
        <section className="public-page-section px-4 landing-authed-home__steps">
          <div className="landing-shell">
            <div className="public-page-grid public-page-grid--3">
              {PROTECTION_STEPS.map((item) => (
                <article key={item.step} className="public-page-card">
                  <p className="public-page-card__eyebrow">Step {item.step}</p>
                  <h3 className="public-page-card__title">{item.title}</h3>
                  <p className="public-page-card__copy">{item.description}</p>
                </article>
              ))}
            </div>
            <div className="public-page-cta-band landing-authed-home__habit">
              <p className="public-page-panel__eyebrow">{HABIT_LOOP_COPY.eyebrow}</p>
              <h3 className="public-page-cta-band__title">{HABIT_LOOP_COPY.title}</h3>
              <p className="public-page-cta-band__copy">{HABIT_LOOP_COPY.body}</p>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
