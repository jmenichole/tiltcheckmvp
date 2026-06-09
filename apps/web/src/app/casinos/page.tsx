'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ALL_CATEGORIES,
  CASINOS,
  casinoMatchesQuery,
  findLiveTrustScore,
  formatRiskLabel,
  getRiskBadgeStyle,
  getScoreColor,
  gradeFromNumericScore,
  type LiveTrustScore,
} from '@tiltcheck/trust';

const PAGE_SIZE = 18;

export default function CasinosPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [page, setPage] = useState(1);
  const [liveScores, setLiveScores] = useState<LiveTrustScore[]>([]);
  const [liveSource, setLiveSource] = useState('unavailable');

  useEffect(() => {
    fetch('/api/backend/rgaas/casino-scores', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { casinos?: LiveTrustScore[]; source?: string } | null) => {
        setLiveScores(Array.isArray(payload?.casinos) ? payload.casinos : []);
        setLiveSource(payload?.source ?? 'unavailable');
      })
      .catch(() => {
        setLiveScores([]);
        setLiveSource('unavailable');
      });
  }, []);

  const filtered = useMemo(
    () =>
      CASINOS.filter((casino) => {
        const matchesCategory = category === 'All' || casino.category === category;
        return matchesCategory && casinoMatchesQuery(casino, query);
      }),
    [category, query],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <main className="public-page text-white">
      <section className="hero-surface">
        <div className="landing-shell">
          <span className="brand-eyebrow">Public trust lookup</span>
          <h1 className="landing-hero-title">Look up the casino. Read the proof.</h1>
          <p className="landing-hero-subtitle">
            Live feed: {liveSource}. Static grades always available when API is down.
          </p>
          <label htmlFor="casino-search" className="sr-only">
            Search casinos
          </label>
          <input
            id="casino-search"
            className="w-full max-w-md mt-4 px-3 py-2 bg-black/40 border border-white/10 rounded"
            placeholder="Search casinos..."
            aria-label="Search casinos by name"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
          <div className="flex flex-wrap gap-2 mt-3">
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`btn btn-sm ${category === cat ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => {
                  setCategory(cat);
                  setPage(1);
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="public-page-section px-4">
        <div className="landing-shell">
          {filtered.length === 0 ? (
            <div className="public-page-card py-16 text-center">
              <p className="public-page-card__eyebrow">No matches</p>
              <h2 className="public-page-card__title">No casinos match that search</h2>
              <p className="public-page-card__copy max-w-md mx-auto">
                Try a shorter name, clear the category filter, or browse all casinos.
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm mt-4"
                onClick={() => {
                  setQuery('');
                  setCategory('All');
                  setPage(1);
                }}
              >
                Clear filters
              </button>
            </div>
          ) : (
        <div className="public-page-grid public-page-grid--3">
          {paged.map((casino) => {
            const live = findLiveTrustScore(casino, liveScores);
            const score = live?.currentScore ?? casino.score;
            const grade = gradeFromNumericScore(score);
            const riskStyle = getRiskBadgeStyle(live?.riskLevel ?? casino.risk);
            return (
              <Link key={casino.slug} href={`/casinos/${casino.slug}`} className="public-page-card">
                <p className="public-page-card__eyebrow">{casino.category}</p>
                <h3 className="public-page-card__title">{casino.name}</h3>
                <p style={{ color: getScoreColor(score) }}>
                  {grade} · {formatRiskLabel(live?.riskLevel ?? casino.risk)}
                </p>
                <span
                  style={{
                    fontSize: '0.65rem',
                    color: riskStyle.color,
                    border: `1px solid ${riskStyle.border}`,
                    padding: '2px 6px',
                  }}
                >
                  {live ? 'LIVE' : 'STATIC'}
                </span>
              </Link>
            );
          })}
        </div>
          )}
        {filtered.length > 0 ? (
          <div className="flex gap-2 justify-center mt-6">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <span className="text-sm text-gray-400 self-center">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        ) : null}
        </div>
      </section>
    </main>
  );
}
