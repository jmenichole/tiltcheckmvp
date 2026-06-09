'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { GameExclusionEntry } from '@tiltcheck/shared';
import { normalizeSessionCapConfig, type LockoutStyle } from '@tiltcheck/shared';
import DashboardProtectionAside from '@/components/DashboardProtectionAside';
import DashboardTabBar from '@/components/DashboardTabBar';
import { OnboardingWizard } from '@/components/OnboardingWizard';
import { apiFetch } from '@/lib/api';

interface VaultRule {
  id: string;
  ruleType: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

export default function DashboardPage() {
  const [user, setUser] = useState<{ username: string; avatarUrl: string | null } | null>(null);
  const [vaultRules, setVaultRules] = useState<VaultRule[]>([]);
  const [sessionCapMinutes, setSessionCapMinutes] = useState(10);
  const [lockoutStyle, setLockoutStyle] = useState<LockoutStyle>('friction_first');
  const [snoozeEnabled, setSnoozeEnabled] = useState(false);
  const [futureMeNote, setFutureMeNote] = useState('');
  const [vaultStatus, setVaultStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [vaultError, setVaultError] = useState('');
  const [showWizard, setShowWizard] = useState(false);
  const [gameExclusions, setGameExclusions] = useState<GameExclusionEntry[]>([]);
  const [riskProfile, setRiskProfile] = useState<'conservative' | 'moderate' | 'degen'>('moderate');
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const sessionCapRule = vaultRules.find((r) => r.ruleType === 'session_cap');
  const capSynced = Boolean(sessionCapRule?.enabled);

  function applyCapConfig(raw: Record<string, unknown> | undefined) {
    const cap = normalizeSessionCapConfig(raw ?? {});
    setSessionCapMinutes(cap.durationMinutes);
    setLockoutStyle(cap.lockoutStyle);
    setSnoozeEnabled(cap.snoozeEnabled);
    setFutureMeNote(cap.futureMeNote);
  }

  async function refreshSettings() {
    const r = await apiFetch('/user/settings');
    if (!r.ok) return;
    const data = await r.json();
    const s = data.settings;
    if (s) {
      setGameExclusions(s.gameExclusions ?? []);
      setRiskProfile(s.riskProfile ?? 'moderate');
      setOnboardingComplete(Boolean(s.onboardingCompletedAt));
      setShowWizard(!s.onboardingCompletedAt);
    }
  }

  useEffect(() => {
    Promise.all([
      apiFetch('/auth/me')
        .then((r) => r.json())
        .then((data) => setUser(data.user)),
      refreshVault(),
      refreshSettings(),
    ]).finally(() => {
      setSettingsLoaded(true);
      setPageLoading(false);
    });
  }, []);

  async function skipOnboarding() {
    const res = await apiFetch('/user/settings', {
      method: 'PATCH',
      body: JSON.stringify({ onboardingCompletedAt: new Date().toISOString() }),
    });
    if (res.ok) {
      setShowWizard(false);
      setOnboardingComplete(true);
    }
  }

  async function refreshVault() {
    const res = await apiFetch('/vault');
    if (!res.ok) return;
    const data = await res.json();
    setVaultRules(data.rules ?? []);
    const cap = (data.rules as VaultRule[] | undefined)?.find((r) => r.ruleType === 'session_cap');
    if (cap?.enabled) {
      applyCapConfig(cap.config);
    }
  }

  async function saveMyLine() {
    setVaultStatus('saving');
    setVaultError('');
    const config = normalizeSessionCapConfig({
      durationMinutes: sessionCapMinutes,
      lockoutStyle,
      snoozeEnabled,
      futureMeNote,
    });
    const res = await apiFetch('/vault', {
      method: 'POST',
      body: JSON.stringify({
        ruleType: 'session_cap',
        enabled: true,
        config,
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

  if (pageLoading) {
    return (
      <main className="public-page text-white dashboard-page">
        <section className="hero-surface dashboard-hero">
          <div className="landing-shell">
            <span className="brand-eyebrow">Your command center</span>
            <h1 className="brand-page-title">Dashboard</h1>
            <p className="brand-lead" role="status" aria-live="polite">
              Loading your line…
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="public-page text-white dashboard-page">
      <section className="hero-surface dashboard-hero">
        <div className="landing-shell">
          <span className="brand-eyebrow">Your command center</span>
          <h1 className="brand-page-title">Dashboard</h1>
          <p className="brand-lead">
            {user
              ? `${user.username} — block problem games, set your cap, let the extension enforce both.`
              : 'Block problem games in Settings. Set your cap here. The extension enforces both on casino tabs.'}
          </p>

          <DashboardTabBar active="vault" />
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell">
          {settingsLoaded && showWizard ? (
            <OnboardingWizard
              initialGameExclusions={gameExclusions}
              initialRiskProfile={riskProfile}
              initialSessionCapMinutes={sessionCapMinutes}
              onComplete={() => {
                setShowWizard(false);
                setOnboardingComplete(true);
                void refreshVault();
                void refreshSettings();
              }}
              onSkip={() => void skipOnboarding()}
            />
          ) : null}

          <div className="dashboard-layout dashboard-layout--vault">
              <div className="dashboard-main">
                <div className="public-page-section-heading">
                  <div>
                    <span className="brand-eyebrow">Past you pact</span>
                    <h2 className="public-page-section-heading__title">My Line</h2>
                    <p className="public-page-section-heading__copy brand-lead">
                      Your walk-away pact — lockout length, how hard the tab stops, and a note from past you.
                      TiltCheck enforces what you saved here.
                    </p>
                  </div>
                </div>

                <div className="public-page-card public-page-card--accent dashboard-cap-card">
                  <h3 className="public-page-card__title mt-0">Session cap</h3>
                  <p className="public-page-card__copy">
                    Minutes of Touch Grass when tilt hits critical or you open a blocked game. Past you set
                    this — not TiltCheck judging you.
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

                  <div className="dashboard-field">
                    <label htmlFor="lockout-style">Lockout style</label>
                    <select
                      id="lockout-style"
                      value={lockoutStyle}
                      onChange={(e) => {
                        setLockoutStyle(e.target.value as LockoutStyle);
                        if (vaultStatus === 'success') setVaultStatus('idle');
                      }}
                    >
                      <option value="friction_first">Friction first (recommended)</option>
                      <option value="hard_stop">Hard stop — straight to Touch Grass</option>
                    </select>
                  </div>

                  <div className="dashboard-field">
                    <label className="dashboard-field-label">
                      <input
                        type="checkbox"
                        checked={snoozeEnabled}
                        onChange={(e) => {
                          setSnoozeEnabled(e.target.checked);
                          if (vaultStatus === 'success') setVaultStatus('idle');
                        }}
                      />{' '}
                      Allow one snooze per session (opt-in)
                    </label>
                    <p className="public-page-card__copy" style={{ marginTop: '0.35rem' }}>
                      When enabled, the first critical hit can show a snooze button on the friction screen.
                    </p>
                  </div>

                  <div className="dashboard-field">
                    <label htmlFor="future-me-note">Note from past you (optional, 140 chars)</label>
                    <textarea
                      id="future-me-note"
                      maxLength={140}
                      rows={3}
                      value={futureMeNote}
                      placeholder="e.g. You said no chasing after 3 reds — walk."
                      onChange={(e) => {
                        setFutureMeNote(e.target.value);
                        if (vaultStatus === 'success') setVaultStatus('idle');
                      }}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(23,195,178,.35)',
                        background: '#12161e',
                        color: '#e6e6e6',
                        font: 'inherit',
                        resize: 'vertical',
                      }}
                    />
                    <p className="public-page-card__copy" style={{ marginTop: '0.35rem' }}>
                      {futureMeNote.length}/140 — shown on Touch Grass lockout, only to you.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={saveMyLine}
                    disabled={vaultStatus === 'saving'}
                  >
                    {vaultStatus === 'saving' ? 'Saving...' : 'Save My Line'}
                  </button>

                  {vaultStatus === 'success' && (
                    <div className="dashboard-status dashboard-status--success" role="status">
                      <p className="dashboard-status__title">
                        {sessionCapMinutes} min line is live
                      </p>
                      <p className="dashboard-status__copy">
                        Vault saved. Extension syncs on your next casino tab — Discord connected,
                        extension installed. Critical tilt → Touch Grass with your pact copy.
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
                        ? `Vault ready — ${sessionCapRule?.config?.durationMinutes ?? sessionCapMinutes}m line on API`
                        : 'No line saved yet'}
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

              <DashboardProtectionAside
                riskProfile={riskProfile}
                gameExclusions={gameExclusions}
                capMinutes={
                  sessionCapRule?.enabled
                    ? normalizeSessionCapConfig(sessionCapRule.config ?? {}).durationMinutes
                    : capSynced
                      ? sessionCapMinutes
                      : null
                }
                capSynced={capSynced}
                onboardingComplete={onboardingComplete}
              />
            </div>

        </div>
      </section>
    </main>
  );
}
