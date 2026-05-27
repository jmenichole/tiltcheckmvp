'use client';

// TODO(phase-plan): Phase 2 cutover = Profile + Vault tabs only. Buddies is Phase 3.
// Safety/settings can ship with Phase 2 API but must not block vault CRUD + enforcement testing.

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type Tab = 'profile' | 'safety' | 'vault' | 'buddies';

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>('profile');
  const [user, setUser] = useState<{ username: string; avatarUrl: string | null } | null>(null);
  const [settings, setSettings] = useState({
    riskProfile: 'moderate',
    notificationsEnabled: true,
    demoMode: false,
  });
  const [vaultRules, setVaultRules] = useState<unknown[]>([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    apiFetch('/auth/me')
      .then((r) => r.json())
      .then((data) => setUser(data.user));
    apiFetch('/user/settings')
      .then((r) => r.json())
      .then((data) => data.settings && setSettings(data.settings));
    apiFetch('/vault')
      .then((r) => r.json())
      .then((data) => setVaultRules(data.rules ?? []));
  }, []);

  async function saveSettings() {
    setStatus('Saving...');
    const res = await apiFetch('/user/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
    setStatus(res.ok ? 'Saved' : 'Failed');
  }

  return (
    <main className="public-page text-white min-h-screen">
      <section className="public-page-section px-4 pt-8">
        <div className="landing-shell">
          <h1 className="landing-hero-title text-3xl">Dashboard</h1>
          <p className="text-gray-400 mb-6">Welcome{user ? `, ${user.username}` : ''}.</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {(['profile', 'safety', 'vault', 'buddies'] as Tab[]).map((t) => (
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
            <div className="public-page-card">
              <p>Discord profile sync. Avatar: {user?.avatarUrl ? 'set' : 'none'}</p>
            </div>
          )}

          {tab === 'safety' && (
            <div className="public-page-card space-y-3">
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
                Save settings
              </button>
              {status ? <p className="text-xs text-gray-400">{status}</p> : null}
            </div>
          )}

          {tab === 'vault' && (
            <div className="public-page-card">
              <p className="mb-2">Vault rules ({vaultRules.length})</p>
              <p className="text-sm text-gray-400">POST /vault creates stub rules until Supabase is wired.</p>
            </div>
          )}

          {tab === 'buddies' && (
            <div className="public-page-card">
              <p className="text-gray-400">Buddies tab stub — Phase 2+ feature.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
