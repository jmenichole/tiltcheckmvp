'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { GameExclusionEntry } from '@tiltcheck/shared';
import GameExclusionEditor from '@/components/GameExclusionEditor';
import { apiFetch } from '@/lib/api';

type RiskProfile = 'conservative' | 'moderate' | 'degen';

type SettingsState = {
  riskProfile: RiskProfile;
  notificationsEnabled: boolean;
  demoMode: boolean;
  gameExclusions: GameExclusionEntry[];
};

const SENSITIVITY_PROFILES: {
  id: RiskProfile;
  title: string;
  copy: string;
  trigger: string;
}[] = [
  {
    id: 'conservative',
    title: 'Conservative — early brakes',
    copy: 'Fires warnings sooner. Touch Grass kicks in when click-speed or loss streaks look like autopilot, not just full send. Best if you want help before the hole gets deep.',
    trigger: 'Touch Grass when: 10+ clicks in 5 seconds or 4+ losses in a row',
  },
  {
    id: 'moderate',
    title: 'Moderate — balanced (default)',
    copy: 'Standard thresholds. Ignores normal variance; reacts when pacing clearly shifts. Good default for most sessions.',
    trigger: 'Touch Grass when: 14+ clicks in 5 seconds or 5+ losses in a row',
  },
  {
    id: 'degen',
    title: 'Degen — let me cook (until critical)',
    copy: 'High tolerance. Only locks you out on obvious tilt patterns — rapid-fire clicks or a brutal loss run. You feel the warning late; enforcement is the last resort.',
    trigger: 'Touch Grass when: 20+ clicks in 5 seconds or 7+ losses in a row',
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; avatarUrl: string | null; email: string | null } | null>(
    null,
  );
  const [settings, setSettings] = useState<SettingsState>({
    riskProfile: 'moderate',
    notificationsEnabled: true,
    demoMode: false,
    gameExclusions: [],
  });
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [gameExclusionsDirty, setGameExclusionsDirty] = useState(false);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    Promise.all([apiFetch('/auth/me'), apiFetch('/user/settings')])
      .then(async ([meRes, settingsRes]) => {
        if (!meRes.ok) {
          router.replace('/login?redirect=/settings');
          return;
        }
        const meData = await meRes.json();
        setUser(meData.user);
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          if (settingsData.settings) {
            const s = settingsData.settings;
            setSettings({
              riskProfile: s.riskProfile ?? 'moderate',
              notificationsEnabled: s.notificationsEnabled ?? true,
              demoMode: s.demoMode ?? false,
              gameExclusions: Array.isArray(s.gameExclusions) ? s.gameExclusions : [],
            });
          }
        }
      })
      .catch(() => router.replace('/login?redirect=/settings'))
      .finally(() => {
        setLoading(false);
        initialLoadDone.current = true;
      });
  }, [router]);

  function applySettingsFromApi(s: Partial<SettingsState>) {
    setSettings({
      riskProfile: s.riskProfile ?? 'moderate',
      notificationsEnabled: s.notificationsEnabled ?? true,
      demoMode: s.demoMode ?? false,
      gameExclusions: Array.isArray(s.gameExclusions) ? s.gameExclusions : [],
    });
    setGameExclusionsDirty(false);
  }

  async function saveGameExclusions(entries: GameExclusionEntry[]) {
    setStatus('Saving game blocks...');
    const res = await apiFetch('/user/settings', {
      method: 'PATCH',
      body: JSON.stringify({ gameExclusions: entries }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { error?: string; details?: string } | null;
      setStatus(err?.error ?? 'Game blocks failed to save — try again.');
      return false;
    }
    const data = (await res.json()) as { settings?: SettingsState };
    if (data.settings) {
      applySettingsFromApi(data.settings);
    }
    setStatus('Game blocks saved.');
    return true;
  }

  useEffect(() => {
    if (!initialLoadDone.current || !gameExclusionsDirty) return;
    const timer = window.setTimeout(() => {
      void saveGameExclusions(settings.gameExclusions);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [settings.gameExclusions, gameExclusionsDirty]);

  async function saveSettings() {
    setStatus('Saving...');
    const res = await apiFetch('/user/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { error?: string; details?: string } | null;
      setStatus(err?.error ?? 'Save failed — try again.');
      return;
    }
    const data = (await res.json()) as { settings?: SettingsState };
    if (data.settings) {
      applySettingsFromApi(data.settings);
    }
    setStatus('Settings saved.');
  }

  async function handleLogout() {
    await apiFetch('/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  const avatarInitial = user?.username?.charAt(0)?.toUpperCase() ?? '?';

  if (loading) {
    return (
      <main className="public-page text-white settings-page">
        <section className="hero-surface settings-hero">
          <div className="landing-shell">
            <p className="brand-lead">Loading profile...</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="public-page text-white settings-page">
      <section className="hero-surface settings-hero">
        <div className="landing-shell">
          <span className="brand-eyebrow">Account</span>
          <h1 className="brand-page-title">Profile &amp; settings</h1>
          <p className="brand-lead">Game exclusions, tilt sensitivity, and how hard we nudge you.</p>
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell settings-layout">
          <div className="public-page-card settings-profile-card">
            <div className="settings-profile-header">
              <div className="settings-avatar" aria-hidden="true">
                {user?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt="" className="settings-avatar__image" />
                ) : (
                  <span className="settings-avatar__initial">{avatarInitial}</span>
                )}
              </div>
              <div>
                <p className="settings-profile-name">{user?.username}</p>
                <p className="settings-profile-meta">
                  {user?.email ? user.email : 'Discord-connected account'}
                </p>
              </div>
            </div>
            <div className="settings-quick-links">
              <Link href="/dashboard" className="btn btn-ghost btn-sm">
                Open dashboard
              </Link>
              <Link href="/extension" className="btn btn-ghost btn-sm">
                Extension setup
              </Link>
            </div>
          </div>

          <div className="public-page-card settings-config-card">
            <span className="brand-eyebrow">Preferences</span>
            <h2 className="public-page-card__title">TiltCheck behavior</h2>

            <fieldset className="sensitivity-fieldset">
              <legend className="dashboard-field-label">Tilt sensitivity</legend>
              <div className="sensitivity-cards" role="radiogroup" aria-label="Tilt sensitivity">
                {SENSITIVITY_PROFILES.map((profile) => {
                  const selected = settings.riskProfile === profile.id;
                  return (
                    <label
                      key={profile.id}
                      className={`sensitivity-card${selected ? ' sensitivity-card--selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="risk-profile"
                        value={profile.id}
                        checked={selected}
                        onChange={() => setSettings((s) => ({ ...s, riskProfile: profile.id }))}
                      />
                      <span className="sensitivity-card__title">{profile.title}</span>
                      <span className="sensitivity-card__copy">{profile.copy}</span>
                      <span className="sensitivity-card__trigger">{profile.trigger}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <section id="game-exclusion" className="settings-game-exclusion">
              <h3 className="public-page-card__title settings-section-title">Game self-exclusion</h3>
              <GameExclusionEditor
                value={settings.gameExclusions}
                onChange={(gameExclusions) => {
                  setGameExclusionsDirty(true);
                  setSettings((s) => ({ ...s, gameExclusions }));
                }}
              />
            </section>

            <label className="dashboard-checkbox">
              <input
                type="checkbox"
                checked={settings.notificationsEnabled}
                onChange={(e) => setSettings((s) => ({ ...s, notificationsEnabled: e.target.checked }))}
              />
              Notify me when tilt spikes
            </label>

            <label className="dashboard-checkbox">
              <input
                type="checkbox"
                checked={settings.demoMode}
                onChange={(e) => setSettings((s) => ({ ...s, demoMode: e.target.checked }))}
              />
              Demo mode — softer enforcement for testing
            </label>

            <button type="button" className="btn btn-primary btn-sm" onClick={saveSettings}>
              Save settings
            </button>
            {status ? <p className="dashboard-profile-status">{status}</p> : null}
          </div>

          <div className="public-page-card settings-danger-card">
            <span className="brand-eyebrow">Session</span>
            <p className="public-page-card__copy">
              Log out of TiltCheck on this browser. Your vault rules stay on the server until you sign back in.
            </p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
