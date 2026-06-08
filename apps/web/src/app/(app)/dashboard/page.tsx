'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface VaultRule {
  id: string;
  ruleType: string;
  enabled: boolean;
  config: { durationMinutes?: number };
}

const VAULT_STEPS = [
  {
    step: '01',
    title: 'Set your cap',
    description: 'Pick how long Touch Grass locks the screen when tilt goes critical.',
  },
  {
    step: '02',
    title: 'Play your session',
    description: 'Extension watches pacing on casino tabs. Read-only. No wallet access.',
  },
  {
    step: '03',
    title: 'Touch Grass saves you',
    description: 'Fullscreen lockout. No dismiss. Timer runs, you walk away.',
  },
] as const;

export default function DashboardPage() {
  const [user, setUser] = useState<{ username: string; avatarUrl: string | null } | null>(null);
  const [vaultRules, setVaultRules] = useState<VaultRule[]>([]);
  const [sessionCapMinutes, setSessionCapMinutes] = useState(5);
  const [vaultStatus, setVaultStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [vaultError, setVaultError] = useState('');

  const sessionCapRule = vaultRules.find((r) => r.ruleType === 'session_cap');
  const capSynced = Boolean(sessionCapRule?.enabled && sessionCapRule.config?.durationMinutes);

  useEffect(() => {
    apiFetch('/auth/me')
      .then((r) => r.json())
      .then((data) => setUser(data.user));
    refreshVault();
  }, []);

  async function refreshVault() {
    const res = await apiFetch('/vault');
    if (!res.ok) return;
    const data = await res.json();
    setVaultRules(data.rules ?? []);
    const cap = (data.rules as VaultRule[] | undefined)?.find((r) => r.ruleType === 'session_cap');
    if (cap?.config?.durationMinutes) {
      setSessionCapMinutes(cap.config.durationMinutes);
    }
  }

  async function saveSessionCap() {
    setVaultStatus('saving');
    setVaultError('');
    const res = await apiFetch('/vault', {
      method: 'POST',
      body: JSON.stringify({
        ruleType: 'session_cap',
        enabled: true,
        config: { durationMinutes: sessionCapMinutes },
      }),
    });
    if (res.ok) {
      await refreshVault();
      setVaultStatus('success');
    } else {
      const err = await res.json().catch(() => ({}));
      setVaultStatus('error');
      setVaultError(err.error ?? 'Failed to save vault rule');
    }
  }

  return (
    <main className="public-page text-white dashboard-page">
      <section className="hero-surface dashboard-hero">
        <div className="landing-shell">
          <span className="brand-eyebrow">Your command center</span>
          <h1 className="brand-page-title">Dashboard</h1>
          <p className="brand-lead">
            {user
              ? `${user.username} — set your line, let the extension enforce it.`
              : 'Set your line. The extension enforces it when you start tilting.'}
          </p>

          <div className="dashboard-tab-bar" role="tablist" aria-label="Dashboard sections">
            <button type="button" role="tab" aria-selected className="dashboard-tab dashboard-tab--active">
              Vault
            </button>
            <Link href="/settings" className="dashboard-tab dashboard-tab--link">
              Profile settings
            </Link>
          </div>
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <div className="dashboard-layout dashboard-layout--vault">
              <div className="dashboard-main">
                <div className="public-page-section-heading">
                  <div>
                    <span className="brand-eyebrow">Touch Grass vault</span>
                    <h2 className="public-page-section-heading__title">Set your walk-away line</h2>
                    <p className="public-page-section-heading__copy brand-lead">
                      Help me walk away — that is the job. You pick the lockout. We pull you out before
                      you give the wins back.
                    </p>
                  </div>
                </div>

                <div className="public-page-card public-page-card--accent dashboard-cap-card">
                  <h3 className="public-page-card__title mt-0">Session cap</h3>
                  <p className="public-page-card__copy">
                    Minutes of Touch Grass lockout when tilt hits critical. No negotiating mid-rage.
                  </p>

                  <div className="dashboard-field">
                    <label htmlFor="session-cap-minutes">Lockout duration (minutes)</label>
                    <input
                      id="session-cap-minutes"
                      type="number"
                      min={1}
                      max={60}
                      value={sessionCapMinutes}
                      onChange={(e) => {
                        setSessionCapMinutes(Number(e.target.value));
                        if (vaultStatus === 'success') setVaultStatus('idle');
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={saveSessionCap}
                    disabled={vaultStatus === 'saving'}
                  >
                    {vaultStatus === 'saving' ? 'Saving...' : 'Save session cap'}
                  </button>

                  {vaultStatus === 'success' && (
                    <div className="dashboard-status dashboard-status--success" role="status">
                      <p className="dashboard-status__title">
                        {sessionCapMinutes} minute lockout is live
                      </p>
                      <p className="dashboard-status__copy">
                        Vault saved. Extension syncs on your next casino tab — Discord connected,
                        extension installed. Critical tilt → Touch Grass.
                      </p>
                    </div>
                  )}

                  {vaultStatus === 'error' && (
                    <div className="dashboard-status dashboard-status--error" role="alert">
                      <p className="dashboard-status__copy">{vaultError}</p>
                    </div>
                  )}
                </div>

                <div className="public-page-card dashboard-sync-card">
                  <p className="public-page-card__eyebrow">Extension sync</p>
                  <div className="public-page-meta-strip mt-2">
                    <span className={capSynced ? 'dashboard-sync-ready' : ''}>
                      {capSynced
                        ? `Vault ready — ${sessionCapRule?.config?.durationMinutes ?? sessionCapMinutes}m cap on API`
                        : 'No cap saved yet'}
                    </span>
                    <span className="public-page-meta-strip__separator">|</span>
                    <span>
                      {capSynced
                        ? 'Extension pulls rules when Discord is connected'
                        : 'Save a cap before your next session'}
                    </span>
                  </div>
                  <p className="public-page-card__copy">
                    {capSynced ? (
                      <>
                        Open a casino tab with the extension active. Rules refresh while you are logged
                        in. No cap on the tab? Reload the page or re-open the extension popup once.
                      </>
                    ) : (
                      <>
                        Install the extension and connect Discord so vault rules follow you across tabs.{' '}
                        <Link href="/extension" className="dashboard-link">
                          Get the extension
                        </Link>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <aside className="dashboard-aside">
                <div className="public-page-grid public-page-grid--1 dashboard-steps">
                  {VAULT_STEPS.map((item) => (
                    <article key={item.step} className="public-page-card">
                      <p className="public-page-card__eyebrow">Step {item.step}</p>
                      <h3 className="public-page-card__title">{item.title}</h3>
                      <p className="public-page-card__copy">{item.description}</p>
                    </article>
                  ))}
                </div>

                <div className="public-page-cta-band">
                  <p className="public-page-panel__eyebrow">After your first lockout</p>
                  <h3 className="public-page-cta-band__title">
                    Come back here. Tweak the cap. That is the habit loop.
                  </h3>
                  <p className="public-page-cta-band__copy">
                    Too short and you are back on the machine before the tilt clears? Bump it. Still
                    ragging through the timer? Go shorter next time. Set → play → get pulled out →
                    adjust.
                  </p>
                </div>
              </aside>
            </div>

        </div>
      </section>
    </main>
  );
}
