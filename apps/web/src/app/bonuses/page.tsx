'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface BonusPick {
  id: string;
  casinoName: string;
  offerTitle: string;
  url: string;
  expiresAt: string | null;
  expiryMessage: string | null;
  expiresSoon: boolean;
  urgent: boolean;
  source: string;
}

interface PicksResponse {
  success: boolean;
  source: string;
  message?: string;
  data: BonusPick[];
}

function formatExpiry(pick: BonusPick): string | null {
  if (pick.expiresAt) {
    const date = new Date(pick.expiresAt);
    if (!Number.isNaN(date.getTime())) {
      return `Expires ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    }
  }
  if (pick.expiryMessage && pick.expiryMessage !== 'Expiry not stated in email') {
    return pick.expiryMessage;
  }
  return null;
}

export default function BonusesPage() {
  const [picks, setPicks] = useState<BonusPick[]>([]);
  const [source, setSource] = useState('loading');
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/backend/bonuses/picks?limit=3', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: PicksResponse | null) => {
        if (!payload?.data?.length) {
          setPicks([]);
          setSource('unavailable');
          setNotice('No live picks right now. Check back after the inbox crawler runs.');
          return;
        }
        setPicks(payload.data);
        setSource(payload.source);
        setNotice(payload.message ?? null);
      })
      .catch(() => {
        setPicks([]);
        setSource('unavailable');
        setNotice('Could not load bonus picks.');
      });
  }, []);

  return (
    <main className="public-page text-white">
      <section className="hero-surface">
        <div className="landing-shell">
          <span className="brand-eyebrow">Today&apos;s picks</span>
          <h1 className="landing-hero-title">Inbox bonuses worth a look</h1>
          <p className="landing-hero-subtitle">
            Parsed from casino marketing email (v1 ingest). We surface urgency and expiry — you still
            verify terms on the casino site. Feed: {source}.
          </p>
          {notice ? <p className="mt-3 text-sm text-white/70">{notice}</p> : null}
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell public-page-grid public-page-grid--3">
          {picks.map((pick) => {
            const expiry = formatExpiry(pick);
            return (
              <article key={pick.id} className="public-page-card flex flex-col gap-3">
                <div className="flex flex-wrap gap-2 items-center">
                  <p className="public-page-card__eyebrow m-0">{pick.casinoName}</p>
                  {pick.expiresSoon || pick.urgent ? (
                    <span className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/40">
                      Expires soon
                    </span>
                  ) : null}
                </div>
                <h2 className="public-page-card__title text-lg">{pick.offerTitle}</h2>
                {expiry ? <p className="text-sm text-white/60 m-0">{expiry}</p> : null}
                <div className="mt-auto flex flex-wrap gap-2">
                  <a
                    href={pick.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm"
                  >
                    View offer
                  </a>
                  <Link href="/casinos" className="btn btn-secondary btn-sm">
                    Casino trust
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/casinos" className="btn btn-secondary">
            Browse casinos
          </Link>
          <Link href="/extension" className="btn btn-primary">
            Install extension
          </Link>
        </div>
        <p className="mt-6 text-sm text-white/50 max-w-2xl">
          Full bonus list and dashboard tab ship in Phase 3. No wallet linking or auto-claim.
        </p>
      </section>
    </main>
  );
}
