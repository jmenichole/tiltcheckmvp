'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  CASINOS,
  findLiveTrustScore,
  formatRiskLabel,
  getCasinoBySlug,
  getRiskBadgeStyle,
  getScoreColor,
  gradeFromNumericScore,
  type CasinoEntry,
  type LiveTrustScore,
} from '@tiltcheck/trust';

const MAX_COMPARE = 3;

const QUICK_COMPARE_SLUGS = ['stake-us', 'wow-vegas', 'mcluck'] as const;

const PILLAR_ROWS = [
  { key: 'financialPayouts' as const, label: 'Payouts' },
  { key: 'fairnessTransparency' as const, label: 'Fairness' },
  { key: 'promotionalHonesty' as const, label: 'Promo honesty' },
  { key: 'operationalSupport' as const, label: 'Support' },
  { key: 'communityReputation' as const, label: 'Community' },
];

export type CasinoTrustCompareProps = {
  selectedSlugs: string[];
  liveScores: LiveTrustScore[];
  onToggle: (slug: string) => void;
  onClear: () => void;
  onQuickCompare: (slugs: string[]) => void;
};

function resolveCasino(slug: string): CasinoEntry | undefined {
  return getCasinoBySlug(slug) ?? CASINOS.find((c) => c.slug === slug);
}

function scoreFor(casino: CasinoEntry, liveScores: LiveTrustScore[]) {
  const live = findLiveTrustScore(casino, liveScores);
  const score = live?.currentScore ?? casino.score;
  return {
    score,
    grade: gradeFromNumericScore(score),
    risk: live?.riskLevel ?? casino.risk,
    live: Boolean(live),
  };
}

export function CasinoTrustCompareBar({
  selectedSlugs,
  onToggle,
  onClear,
}: Pick<CasinoTrustCompareProps, 'selectedSlugs' | 'onToggle' | 'onClear'>) {
  if (selectedSlugs.length === 0) return null;

  return (
    <div className="casino-compare-bar" role="region" aria-label="Casinos selected for compare">
      <div className="casino-compare-bar__inner landing-shell">
        <p className="casino-compare-bar__label">
          Compare trust ({selectedSlugs.length}/{MAX_COMPARE})
        </p>
        <ul className="casino-compare-bar__chips">
          {selectedSlugs.map((slug) => {
            const casino = resolveCasino(slug);
            if (!casino) return null;
            return (
              <li key={slug}>
                <button
                  type="button"
                  className="casino-compare-bar__chip"
                  onClick={() => onToggle(slug)}
                  aria-label={`Remove ${casino.name} from compare`}
                >
                  {casino.name} ×
                </button>
              </li>
            );
          })}
        </ul>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClear}>
          Clear
        </button>
      </div>
    </div>
  );
}

export default function CasinoTrustCompare({
  selectedSlugs,
  liveScores,
  onToggle,
  onClear,
  onQuickCompare,
}: CasinoTrustCompareProps) {
  const casinos = selectedSlugs
    .map((slug) => resolveCasino(slug))
    .filter((c): c is CasinoEntry => Boolean(c));

  if (casinos.length === 0) {
    return (
      <div className="public-page-card casino-compare-intro">
        <p className="public-page-card__eyebrow">Compare trust</p>
        <h2 className="public-page-card__title">Compare trust before you pick a site</h2>
        <p className="public-page-card__copy">
          Select up to three casinos — grades, payout honesty, known flags — side by side. Then install
          TiltCheck and set your exit line before you deposit.
        </p>
        <div className="casino-compare-quick">
          <span className="casino-compare-quick__label">Quick compare:</span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onQuickCompare([...QUICK_COMPARE_SLUGS])}
          >
            Stake.us · WOW Vegas · McLuck
          </button>
        </div>
      </div>
    );
  }

  if (casinos.length < 2) {
    return (
      <div className="public-page-card casino-compare-intro">
        <p className="public-page-card__copy">
          Add one more casino to compare trust — use <strong>+ Compare</strong> on any card below.
        </p>
      </div>
    );
  }

  return (
    <section className="casino-compare-panel" aria-labelledby="casino-compare-heading">
      <div className="casino-compare-panel__head">
        <div>
          <p className="public-page-card__eyebrow">Side by side</p>
          <h2 id="casino-compare-heading" className="public-page-card__title">
            Trust compare
          </h2>
        </div>
        <Link href="/extension" className="btn btn-primary btn-sm">
          Install before you deposit
        </Link>
      </div>

      <div className="casino-compare-scroll">
        <table className="casino-compare-table">
          <thead>
            <tr>
              <th scope="col">Metric</th>
              {casinos.map((casino) => (
                <th key={casino.slug} scope="col">
                  <span className="casino-compare-table__name">{casino.name}</span>
                  <button
                    type="button"
                    className="casino-compare-table__remove"
                    onClick={() => onToggle(casino.slug)}
                  >
                    Remove
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <CompareRow label="Trust grade">
              {casinos.map((casino) => {
                const { grade, score, live } = scoreFor(casino, liveScores);
                return (
                  <td key={casino.slug}>
                    <span style={{ color: getScoreColor(score), fontWeight: 700 }}>
                      {grade}
                    </span>
                    <span className="casino-compare-table__meta"> · {score}</span>
                    <span className="casino-compare-table__badge">{live ? 'LIVE' : 'STATIC'}</span>
                  </td>
                );
              })}
            </CompareRow>
            <CompareRow label="Risk">
              {casinos.map((casino) => {
                const { risk } = scoreFor(casino, liveScores);
                const style = getRiskBadgeStyle(risk);
                return (
                  <td key={casino.slug}>
                    <span
                      className="casino-compare-table__risk"
                      style={{ color: style.color, borderColor: style.border }}
                    >
                      {formatRiskLabel(risk)}
                    </span>
                  </td>
                );
              })}
            </CompareRow>
            <CompareRow label="Category">{casinos.map((c) => <td key={c.slug}>{c.category}</td>)}</CompareRow>
            {PILLAR_ROWS.map((pillar) => (
              <CompareRow key={pillar.key} label={pillar.label}>
                {casinos.map((casino) => {
                  const value = casino[pillar.key];
                  return (
                    <td key={casino.slug}>
                      <div className="casino-compare-pillar">
                        <span style={{ color: getScoreColor(value) }}>{value}</span>
                        <div className="casino-compare-pillar__track">
                          <div
                            className="casino-compare-pillar__fill"
                            style={{ width: `${value}%`, backgroundColor: getScoreColor(value) }}
                          />
                        </div>
                      </div>
                    </td>
                  );
                })}
              </CompareRow>
            ))}
            <CompareRow label="License">
              {casinos.map((casino) => (
                <td key={casino.slug} className="casino-compare-table__license">
                  {casino.meta.license ?? 'Pending'}
                </td>
              ))}
            </CompareRow>
            <CompareRow label="Known flags">
              {casinos.map((casino) => {
                const flags = casino.meta.violations ?? [];
                return (
                  <td key={casino.slug}>
                    {flags.length === 0 ? (
                      <span className="casino-compare-table__ok">None listed</span>
                    ) : (
                      <>
                        <span className="casino-compare-table__warn">{flags.length} flag(s)</span>
                        <p className="casino-compare-table__flag">{flags[0]}</p>
                      </>
                    )}
                  </td>
                );
              })}
            </CompareRow>
            <CompareRow label="Actions">
              {casinos.map((casino) => (
                <td key={casino.slug}>
                  <div className="casino-compare-actions">
                    <Link href={`/casinos/${casino.slug}`} className="btn btn-ghost btn-sm">
                      Full report
                    </Link>
                    {casino.affiliateUrl ? (
                      <a
                        href={casino.affiliateUrl}
                        className="btn btn-secondary btn-sm"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Visit site
                      </a>
                    ) : null}
                  </div>
                </td>
              ))}
            </CompareRow>
          </tbody>
        </table>
      </div>

      <p className="casino-compare-footnote">
        Bonuses change daily — trust grades are the point. Install TiltCheck, set your exit line, then
        pick where to play.
      </p>
      <button type="button" className="btn btn-ghost btn-sm casino-compare-clear" onClick={onClear}>
        Clear compare
      </button>
    </section>
  );
}

export { MAX_COMPARE };

function CompareRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <tr>
      <th scope="row">{label}</th>
      {children}
    </tr>
  );
}
