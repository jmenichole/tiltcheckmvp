import {
  applyBonusListOptions,
  parseBonusListQuery,
  type BonusSortMode,
  type PublicBonusOffer,
} from './bonus-urgency.js';
import type { EmailBonusFeedEntry } from './email-bonus-feed.js';
import { loadBonusFeed } from './bonus-feed-store.js';

function isActiveEntry(entry: EmailBonusFeedEntry, now = new Date()): boolean {
  if (entry.isExpired) return false;
  if (!entry.expiresAt) return true;
  const ms = new Date(entry.expiresAt).getTime();
  return !Number.isNaN(ms) && ms > now.getTime();
}

export async function buildInboxBonusResponse(query: Record<string, string | undefined>): Promise<{
  source: 'email-inbox';
  available: boolean;
  updatedAt: string | null;
  total: number;
  limit: number;
  sort: BonusSortMode;
  data: PublicBonusOffer[];
  message?: string;
}> {
  const { limit, sort } = parseBonusListQuery({ ...query, source: 'inbox' });
  const feed = await loadBonusFeed();
  const active = feed.bonuses.filter((entry) => isActiveEntry(entry));
  const data = applyBonusListOptions(active, { limit, sort });
  const message =
    data.length === 0
      ? 'Inbox bonus feed is empty. Run the email crawler to ingest casino marketing mail.'
      : undefined;

  return {
    source: 'email-inbox',
    available: data.length > 0,
    updatedAt: feed.updatedAt,
    total: active.length,
    limit,
    sort,
    data,
    ...(message ? { message } : {}),
  };
}
