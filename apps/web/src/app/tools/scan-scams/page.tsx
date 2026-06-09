'use client';

import Link from 'next/link';
import { useState } from 'react';
import { apiFetch } from '@/lib/api';

type ScamMatch = { name: string; reason: string };

type ScanResponse = {
  query: string;
  matches: ScamMatch[];
  source: string;
};

export default function ScanScamsPage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);

  async function runScan() {
    const trimmed = query.trim();
    if (!trimmed) {
      setError('Enter a casino name or domain fragment.');
      setResult(null);
      return;
    }
    setError('');
    setResult(null);
    setScanning(true);
    try {
      const res = await apiFetch('/tools/scan-scams', {
        method: 'POST',
        body: JSON.stringify({ query: trimmed }),
      });
      const data = (await res.json()) as ScanResponse & { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Search failed');
        return;
      }
      setResult(data);
    } catch {
      setError('Could not reach the scam registry. Try again.');
    } finally {
      setScanning(false);
    }
  }

  return (
    <main className="public-page text-white">
      <section className="public-page-section px-4 py-12">
        <div className="landing-shell">
          <Link href="/tools/domain-verifier" className="dashboard-link text-sm">
            ← Promo link checker
          </Link>
          <span className="brand-eyebrow mt-4 block">Scam intel</span>
          <h1 className="brand-page-title">Scam registry</h1>
          <p className="brand-lead mb-6">
            Search our community blacklist for sketchy domains and known scam brands before you click a
            promo.
          </p>

          <div className="public-page-card public-page-card--accent max-w-xl">
            <div className="dashboard-field">
              <label htmlFor="scam-query">Casino name or domain</label>
              <input
                id="scam-query"
                placeholder="stake-bonus.xyz"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void runScan();
                }}
              />
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm mt-3"
              onClick={runScan}
              disabled={scanning}
            >
              {scanning ? 'Searching…' : 'Search blacklist'}
            </button>

            {error ? <p className="dashboard-status dashboard-status--error mt-4">{error}</p> : null}

            {result ? (
              <div className="mt-4">
                {result.matches.length === 0 ? (
                  <div className="dashboard-status">
                    <p className="dashboard-status__title">No blacklist hits</p>
                    <p className="dashboard-status__copy">
                      Nothing matched &ldquo;{result.query}&rdquo; in our registry. Still run suspicious
                      links through the{' '}
                      <Link href="/tools/domain-verifier" className="dashboard-link">
                        domain verifier
                      </Link>
                      .
                    </p>
                  </div>
                ) : (
                  <ul className="public-page-list mt-2">
                    {result.matches.map((match) => (
                      <li key={match.name}>
                        <strong>{match.name}</strong>
                        <span className="text-sm text-gray-400"> — {match.reason}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="dashboard-status__copy text-sm opacity-70 mt-3">
                  Source: {result.source} · {result.matches.length} match
                  {result.matches.length === 1 ? '' : 'es'}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
