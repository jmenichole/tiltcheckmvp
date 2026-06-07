'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';

type ScanResponse = {
  domain: string;
  safe: boolean;
  riskLevel: string;
  message: string;
};

const RISK_COLOR: Record<string, string> = {
  safe: '#17c3b2',
  suspicious: '#ffd700',
  high: '#f97316',
  critical: '#ef4444',
};

export default function DomainVerifierPage() {
  const [domain, setDomain] = useState('');
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [error, setError] = useState('');

  async function runScan() {
    setError('');
    setResult(null);
    const res = await apiFetch('/tools/domain-verifier', {
      method: 'POST',
      body: JSON.stringify({ domain }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Scan failed');
      return;
    }
    setResult(data);
  }

  const riskColor = result ? (RISK_COLOR[result.riskLevel] ?? '#17c3b2') : '#17c3b2';

  return (
    <main className="public-page text-white">
      <section className="public-page-section px-4 py-12">
        <div className="landing-shell">
          <span className="brand-eyebrow">Link intel</span>
          <h1 className="brand-page-title">Domain verifier</h1>
          <p className="brand-lead mb-6">
            Paste a casino promo link or sketchy domain. We flag typosquats, scam TLDs, and blacklist hits.
          </p>

          <div className="public-page-card public-page-card--accent max-w-xl">
            <div className="dashboard-field">
              <label htmlFor="domain-input">Domain or URL</label>
              <input
                id="domain-input"
                placeholder="stake-bonus-promo.xyz"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              />
            </div>
            <button type="button" className="btn btn-primary btn-sm mt-3" onClick={runScan}>
              Scan domain
            </button>

            {error ? <p className="dashboard-status dashboard-status--error mt-4">{error}</p> : null}

            {result ? (
              <div
                className="dashboard-status mt-4"
                style={{ borderColor: `${riskColor}55`, background: `${riskColor}14` }}
              >
                <p className="dashboard-status__title" style={{ color: riskColor }}>
                  {result.safe ? 'Looks OK' : 'Heads up'} — {result.riskLevel.toUpperCase()}
                </p>
                <p className="dashboard-status__copy">{result.message}</p>
                <p className="dashboard-status__copy text-sm opacity-80">Checked: {result.domain}</p>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
