'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [meRes, vaultRes] = await Promise.all([apiFetch('/auth/me'), apiFetch('/vault')]);

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
    : "Set your walk-away line. The extension can't enforce what you haven't configured.";

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
                <p className="public-page-card__eyebrow">Vault</p>
                <h3 className="public-page-card__title">
                  {vaultError ? 'Status unavailable' : capArmed ? `Session cap: ${capMinutes} min` : 'No exit line set'}
                </h3>
                <p className="public-page-card__copy">
                  {vaultError ? (
                    <Link href="/dashboard">Open dashboard to check vault</Link>
                  ) : capArmed ? (
                    'Touch Grass lockout is configured.'
                  ) : (
                    <Link href="/dashboard">Set your session cap on the dashboard</Link>
                  )}
                </p>
              </article>
              <article className="public-page-card">
                <p className="public-page-card__eyebrow">Extension</p>
                <h3 className="public-page-card__title">Read-only watcher</h3>
                <p className="public-page-card__copy">
                  <Link href="/extension">Reload after login so vault rules sync</Link>
                </p>
              </article>
            </div>
          ) : null}

          <p className="landing-authed-home__tertiary">
            <Link href="/casinos">Casino trust</Link>
            {' · '}
            <Link href="/bonuses">Bonuses</Link>
            {' · '}
            <Link href="/settings">Settings</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
