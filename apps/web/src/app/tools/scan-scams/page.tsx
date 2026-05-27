'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';

export default function ScanScamsPage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  async function runScan() {
    const res = await apiFetch('/tools/scan-scams', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
    setResult(await res.json());
  }

  return (
    <main className="public-page text-white">
      <section className="public-page-section px-4 py-12">
        <div className="landing-shell public-page-card">
          <h1 className="public-page-card__title">Scan scams</h1>
          <input
            className="w-full mt-4 px-3 py-2 bg-black/40 border border-white/10"
            placeholder="Casino name or domain"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="button" className="btn btn-primary btn-sm mt-3" onClick={runScan}>
            Search blacklist
          </button>
          {result ? (
            <pre className="mt-4 text-xs overflow-auto">{JSON.stringify(result, null, 2)}</pre>
          ) : null}
        </div>
      </section>
    </main>
  );
}
