import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getCasinoBySlug,
  getScoreColor,
  formatRiskLabel,
  SCAM_FLAGS,
} from '@tiltcheck/trust';

export default async function CasinoDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const casino = getCasinoBySlug(slug);
  if (!casino) notFound();

  const pillars = [
    { label: 'Financial payouts', score: casino.financialPayouts },
    { label: 'Fairness transparency', score: casino.fairnessTransparency },
    { label: 'Promotional honesty', score: casino.promotionalHonesty },
    { label: 'Operational support', score: casino.operationalSupport },
    { label: 'Community reputation', score: casino.communityReputation },
  ];

  return (
    <main className="public-page text-white">
      <section className="hero-surface">
        <div className="landing-shell">
          <Link href="/casinos" className="brand-eyebrow">
            ← All casinos
          </Link>
          <h1 className="landing-hero-title">{casino.name}</h1>
          <p className="landing-hero-subtitle">
            {casino.category} · Grade {casino.grade} · {formatRiskLabel(casino.risk)} risk
          </p>
        </div>
      </section>
      <section className="public-page-section px-4">
        <div className="landing-shell public-page-grid public-page-grid--2">
          <article className="public-page-card">
            <h2 className="public-page-card__title">Trust pillars</h2>
            {pillars.map((pillar) => (
              <div key={pillar.label} className="mb-3">
                <div className="flex justify-between text-xs uppercase tracking-widest text-gray-500">
                  <span>{pillar.label}</span>
                  <span style={{ color: getScoreColor(pillar.score) }}>{pillar.score}</span>
                </div>
                <div className="h-1.5 bg-white/5 mt-1">
                  <div
                    className="h-full"
                    style={{ width: `${pillar.score}%`, backgroundColor: getScoreColor(pillar.score) }}
                  />
                </div>
              </div>
            ))}
          </article>
          <article className="public-page-card">
            <h2 className="public-page-card__title">License & flags</h2>
            <p className="public-page-card__copy">{casino.meta.license ?? 'License data pending.'}</p>
            {(casino.meta.violations?.length ? casino.meta.violations : SCAM_FLAGS.slice(0, 2)).map(
              (flag) => (
                <p key={flag} className="text-sm text-orange-300 mt-2">
                  • {flag}
                </p>
              ),
            )}
            {casino.affiliateUrl ? (
              <a href={casino.affiliateUrl} className="btn btn-primary btn-sm mt-4" target="_blank" rel="noreferrer">
                Visit site
              </a>
            ) : null}
          </article>
        </div>
      </section>
    </main>
  );
}
