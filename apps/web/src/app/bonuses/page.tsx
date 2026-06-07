'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import BonusGrid, { type BonusEntry } from '@/components/BonusGrid';

interface BonusApiRow {
  id: string;
  casinoName?: string;
  brand?: string;
  offerTitle?: string;
  bonus?: string;
  url: string;
  verified?: string;
  code?: string | null;
  expiresAt?: string | null;
  expiryMessage?: string | null;
  expiresSoon?: boolean;
  urgent?: boolean;
  imageUrl?: string | null;
}

interface FeedResponse {
  success: boolean;
  source: string;
  updatedAt?: string | null;
  total?: number;
  available?: boolean;
  message?: string;
  data: BonusApiRow[];
}

function mapRow(row: BonusApiRow): BonusEntry | null {
  const brand = row.casinoName ?? row.brand;
  const bonus = row.offerTitle ?? row.bonus;
  if (!brand || !bonus || !row.url) return null;
  return {
    id: row.id,
    brand,
    bonus,
    url: row.url,
    verified: row.verified ?? new Date().toISOString(),
    code: row.code ?? null,
    expiresAt: row.expiresAt ?? null,
    expiryMessage: row.expiryMessage ?? null,
    expiresSoon: row.expiresSoon,
    urgent: row.urgent,
    imageUrl: row.imageUrl ?? null,
  };
}

export default function BonusesPage() {
  const [bonuses, setBonuses] = useState<BonusEntry[]>([]);
  const [source, setSource] = useState('loading');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function loadFeed() {
    setRefreshing(true);
    try {
      const res = await fetch('/api/backend/bonuses?limit=50&sort=urgency', { cache: 'no-store' });
      const payload = (res.ok ? await res.json() : null) as FeedResponse | null;
      if (!payload?.data?.length) {
        setBonuses([]);
        setSource(payload?.source ?? 'unavailable');
        setUpdatedAt(payload?.updatedAt ?? null);
        setNotice(
          payload?.message ??
            'No live inbox bonuses yet. Run the email crawler to ingest casino marketing mail.',
        );
        return;
      }
      const mapped = payload.data.map(mapRow).filter((row): row is BonusEntry => row !== null);
      setBonuses(mapped);
      setSource(payload.source);
      setUpdatedAt(payload.updatedAt ?? null);
      setNotice(payload.message ?? null);
    } catch {
      setBonuses([]);
      setSource('unavailable');
      setNotice('Could not load bonus feed.');
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadFeed();
  }, []);

  const updatedLabel = updatedAt
    ? new Date(updatedAt).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  return (
    <main className="public-page text-white">
      <section className="hero-surface">
        <div className="landing-shell">
          <span className="brand-eyebrow">Bonus intel</span>
          <h1 className="landing-hero-title">Claim first. Deposit later.</h1>
          <p className="landing-hero-subtitle">
            Live offers parsed from your casino marketing inbox — urgency, expiry, and promo codes when
            the email includes them. Verify terms on the casino site before you claim.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 items-center">
            <button
              type="button"
              onClick={() => void loadFeed()}
              disabled={refreshing}
              className="btn btn-secondary btn-sm"
            >
              {refreshing ? 'Refreshing…' : 'Refresh feed'}
            </button>
            <Link href="/casinos" className="btn btn-primary btn-sm">
              Check casino trust
            </Link>
          </div>
          <p className="mt-3 text-[11px] font-mono uppercase tracking-[0.16em] text-gray-500">
            {bonuses.length} offers · source: {source}
            {updatedLabel ? ` · updated ${updatedLabel}` : ''}
          </p>
          {notice ? <p className="mt-3 text-sm text-white/70 max-w-2xl">{notice}</p> : null}
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell">
          {bonuses.length === 0 ? (
            <div className="public-page-card py-20 text-center">
              <p className="font-mono text-xs uppercase tracking-widest text-[#17c3b2] mb-2">
                [INBOX FEED EMPTY]
              </p>
              <p className="font-mono text-[#8a97a8] text-sm max-w-xl mx-auto leading-relaxed">
                Run <code className="text-[#17c3b2]">pnpm crawl:emails</code> from the repo with{' '}
                <code className="text-[#17c3b2]">CRAWLER_EMAIL</code> and{' '}
                <code className="text-[#17c3b2]">CRAWLER_APP_PASSWORD</code> set. Offers appear here
                after ingest.
              </p>
            </div>
          ) : (
            <BonusGrid bonuses={bonuses} />
          )}
        </div>
      </section>
    </main>
  );
}
