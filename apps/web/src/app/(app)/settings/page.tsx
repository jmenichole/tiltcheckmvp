'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type SettingsState = {
  riskProfile: string;
  notificationsEnabled: boolean;
  demoMode: boolean;
};

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; avatarUrl: string | null; email: string | null } | null>(
    null,
  );
  const [settings, setSettings] = useState<SettingsState>({
    riskProfile: 'moderate',
    notificationsEnabled: true,
    demoMode: false,
  });
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

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
            setSettings(settingsData.settings);
          }
        }
      })
      .catch(() => router.replace('/login?redirect=/settings'))
      .finally(() => setLoading(false));
  }, [router]);

  async function saveSettings() {
    setStatus('Saving...');
    const res = await apiFetch('/user/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
    setStatus(res.ok ? 'Settings saved.' : 'Save failed — try again.');
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

            <div className="dashboard-field">
              <label htmlFor="risk-profile">Tilt sensitivity</label>
              <select
                id="risk-profile"
                value={settings.riskProfile}
                onChange={(e) => setSettings((s) => ({ ...s, riskProfile: e.target.value }))}
              >
                <option value="conservative">Conservative — early warnings</option>
                <option value="moderate">Moderate — balanced</option>
                <option value="degen">Degen — let me cook until critical</option>
              </select>
            </div>

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
