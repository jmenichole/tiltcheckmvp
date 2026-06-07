import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { getSupabaseAdmin } from '@tiltcheck/db';
import type { EmailBonusFeed } from './email-bonus-feed.js';

const EMPTY_FEED: EmailBonusFeed = { updatedAt: null, bonuses: [] };

export function getLocalBonusFeedPath(): string {
  return (
    process.env.EMAIL_BONUS_FEED_PATH?.trim() ||
    path.join(process.cwd(), 'data', 'email-bonus-feed.json')
  );
}

function readLocalBonusFeed(): EmailBonusFeed {
  const feedPath = getLocalBonusFeedPath();
  if (!existsSync(feedPath)) return EMPTY_FEED;
  try {
    const raw = readFileSync(feedPath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<EmailBonusFeed>;
    return {
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
      bonuses: Array.isArray(parsed.bonuses) ? parsed.bonuses : [],
    };
  } catch (error) {
    console.warn('[bonus-feed-store] Failed to read local feed:', error);
    return EMPTY_FEED;
  }
}

function writeLocalBonusFeed(feed: EmailBonusFeed): void {
  const feedPath = getLocalBonusFeedPath();
  const dataDir = path.dirname(feedPath);
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  writeFileSync(feedPath, JSON.stringify(feed, null, 2), 'utf8');
}

async function readSupabaseBonusFeed(): Promise<EmailBonusFeed | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;
  const { data, error } = await db
    .from('bonus_inbox_feed')
    .select('updated_at, payload')
    .eq('id', 'default')
    .maybeSingle();
  if (error || !data?.payload) return null;
  const payload = data.payload as Partial<EmailBonusFeed>;
  return {
    updatedAt:
      typeof payload.updatedAt === 'string'
        ? payload.updatedAt
        : typeof data.updated_at === 'string'
          ? data.updated_at
          : null,
    bonuses: Array.isArray(payload.bonuses) ? payload.bonuses : [],
  };
}

async function writeSupabaseBonusFeed(feed: EmailBonusFeed): Promise<boolean> {
  const db = getSupabaseAdmin();
  if (!db) return false;
  const { error } = await db.from('bonus_inbox_feed').upsert(
    {
      id: 'default',
      updated_at: feed.updatedAt ?? new Date().toISOString(),
      payload: feed,
    },
    { onConflict: 'id' },
  );
  if (error) {
    console.warn('[bonus-feed-store] Supabase write failed:', error.message);
    return false;
  }
  return true;
}

export async function loadBonusFeed(): Promise<EmailBonusFeed> {
  const remote = await readSupabaseBonusFeed();
  if (remote && remote.bonuses.length > 0) return remote;
  const local = readLocalBonusFeed();
  if (local.bonuses.length > 0) return local;
  return remote ?? local;
}

export async function saveBonusFeed(feed: EmailBonusFeed): Promise<void> {
  writeLocalBonusFeed(feed);
  await writeSupabaseBonusFeed(feed);
}

export function hydrateBonusFeedCache(feed: EmailBonusFeed): void {
  writeLocalBonusFeed(feed);
}
