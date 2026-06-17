// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-16
import type { Metadata } from 'next';
import DailyBonusFeed from '@/components/DailyBonusFeed';
import { apiBaseUrl } from '@/lib/api';
import {
  getDailyFeedApiUrl,
  type DailyBonusFeedResponse,
} from '@/lib/daily-bonus-feed';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'US Daily Bonus Feed | TiltCheck',
  description:
    'Daily bonus intel for US sweepstakes and social casinos — merged from CollectClock, email inbox parsing, and local cache.',
  openGraph: {
    title: 'US Daily Bonus Feed | TiltCheck',
    description:
      'Daily bonus intel for US sweepstakes and social casinos — merged from CollectClock, email inbox parsing, and local cache.',
  },
};

const COLLECTCLOCK_SITE_URL = 'https://tiltcheck-me.github.io/CollectClock/';

const EMPTY_FEED: DailyBonusFeedResponse = {
  updatedAt: new Date().toISOString(),
  total: 0,
  usTotal: 0,
  data: [],
  sources: [
    {
      key: 'email-inbox',
      label: 'Email inbox',
      available: false,
      count: 0,
      updatedAt: null,
      detail: 'No active inbox promos',
    },
    {
      key: 'collectclock',
      label: 'CollectClock',
      available: false,
      count: 0,
      updatedAt: null,
      detail: 'CollectClock unreachable',
    },
    {
      key: 'local-fallback',
      label: 'Local cache',
      available: false,
      count: 0,
      updatedAt: null,
      detail: 'No local cache',
    },
  ],
};

async function fetchDailyBonusFeed(): Promise<DailyBonusFeedResponse> {
  const apiUrl = getDailyFeedApiUrl(true);

  try {
    const response = await fetch(apiUrl, {
      next: { revalidate: 300 },
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      console.error(`[BonusFeed] daily-feed fetch failed: ${response.status} ${response.statusText}`);
      return EMPTY_FEED;
    }
    return (await response.json()) as DailyBonusFeedResponse;
  } catch (error) {
    console.error('[BonusFeed] Failed to load daily bonus feed:', error);
    return EMPTY_FEED;
  }
}

export default async function BonusesPage() {
  const feed = await fetchDailyBonusFeed();
  const hasAnyFeed = feed.data.length > 0;
  const liveSources = feed.sources.filter((source) => source.available).map((source) => source.label);

  return (
    <main className="public-page text-white">
      <section className="hero-surface">
        <div className="landing-shell">
          <span className="brand-eyebrow">Bonus intel</span>
          <h1 className="landing-hero-title">US daily bonus feed</h1>
          <p className="landing-hero-subtitle">
            One lane for US casino promos — CollectClock daily trackers, parsed email drops, and cached
            intel merged into a single feed.
          </p>
          <a
            href={COLLECTCLOCK_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary mt-4"
          >
            VIEW COLLECTCLOCK
          </a>
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell">
          {!hasAnyFeed ? (
            <div className="mb-6 public-page-card public-page-card--accent">
              <p className="text-xs font-mono uppercase tracking-widest text-[#17c3b2]">
                [FEED OFFLINE] All sources are empty or unreachable. API: {apiBaseUrl()}/bonuses/daily-feed
              </p>
            </div>
          ) : null}

          {hasAnyFeed && liveSources.length > 0 ? (
            <div className="mb-6 public-page-card">
              <p className="text-xs font-mono uppercase tracking-widest text-[#8a97a8]">
                Live sources: {liveSources.join(' · ')} · {feed.usTotal} US casino offers indexed
              </p>
            </div>
          ) : null}

          <DailyBonusFeed initialFeed={feed} usOnlyDefault />
        </div>
      </section>
    </main>
  );
}
