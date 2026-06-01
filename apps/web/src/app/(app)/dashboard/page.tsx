'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type Tab = 'profile' | 'vault';

interface VaultRule {
  id: string;
  ruleType: string;
  enabled: boolean;
  config: { durationMinutes?: number };
}

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>('profile');
  const [user, setUser] = useState<{ username: string; avatarUrl: string | null } | null>(null);
  const [settings, setSettings] = useState({
    riskProfile: 'moderate',
    notificationsEnabled: true,
    demoMode: false,
  });
  const [vaultRules, setVaultRules] = useState<VaultRule[]>([]);
  const [sessionCapMinutes, setSessionCapMinutes] = useState(5);
  const [status, setStatus] = useState('');

  useEffect(() => {
    apiFetch('/auth/me')
      .then((r) => r.json())
      .then((data) => setUser(data.user));
    apiFetch('/user/settings')
      .then((r) => r.json())
      .then((data) => data.settings && setSettings(data.settings));
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

  async function saveSettings() {
    setStatus('Saving...');
    const res = await apiFetch('/user/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
    setStatus(res.ok ? 'Saved' : 'Failed');
  }

  async function saveSessionCap() {
    setStatus('Saving vault rule...');
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
      setStatus('Vault rule saved — extension will enforce on critical tilt.');
    } else {
      const err = await res.json().catch(() => ({}));
      setStatus(err.error ?? 'Failed to save vault rule');
    }
  }

  return (
    <main className="public-page text-white min-h-screen">
      <section className="public-page-section px-4 pt-8">
        <div className="landing-shell">
          <h1 className="landing-hero-title text-3xl">Dashboard</h1>
          <p className="text-gray-400 mb-6">Welcome{user ? `, ${user.username}` : ''}.</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {(['profile', 'vault'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'profile' && (
            <div className="public-page-card space-y-3">
              <p>Discord profile sync. Avatar: {user?.avatarUrl ? 'set' : 'none'}</p>
              <label className="block text-sm">
                Risk profile
                <select
                  className="block mt-1 w-full bg-black/40 border border-white/10 p-2"
                  value={settings.riskProfile}
                  onChange={(e) => setSettings((s) => ({ ...s, riskProfile: e.target.value }))}
                >
                  <option value="conservative">Conservative</option>
                  <option value="moderate">Moderate</option>
                  <option value="degen">Degen</option>
                </select>
              </label>
              <label className="flex gap-2 items-center text-sm">
                <input
                  type="checkbox"
                  checked={settings.notificationsEnabled}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, notificationsEnabled: e.target.checked }))
                  }
                />
                Notifications
              </label>
              <button type="button" className="btn btn-primary btn-sm" onClick={saveSettings}>
                Save profile settings
              </button>
            </div>
          )}

          {tab === 'vault' && (
            <div className="public-page-card space-y-4">
              <p className="text-sm text-gray-400">
                Session cap: fullscreen lockout when the extension detects critical tilt.
              </p>
              <label className="block text-sm">
                Lockout duration (minutes)
                <input
                  type="number"
                  min={1}
                  max={60}
                  className="block mt-1 w-full bg-black/40 border border-white/10 p-2"
                  value={sessionCapMinutes}
                  onChange={(e) => setSessionCapMinutes(Number(e.target.value))}
                />
              </label>
              <button type="button" className="btn btn-primary btn-sm" onClick={saveSessionCap}>
                Save session cap
              </button>
              <p className="text-xs text-gray-500">
                Active rules: {vaultRules.length}
                {vaultRules.map((r) => (
                  <span key={r.id} className="block">
                    {r.ruleType} — {r.enabled ? 'on' : 'off'}{' '}
                    {r.config?.durationMinutes ? `(${r.config.durationMinutes}m)` : ''}
                  </span>
                ))}
              </p>
            </div>
          )}

          {status ? <p className="text-xs text-gray-400 mt-4">{status}</p> : null}
        </div>
      </section>
    </main>
  );
}
