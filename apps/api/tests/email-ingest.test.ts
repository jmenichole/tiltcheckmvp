// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-17

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/bonus-feed-store.js', () => ({
  saveBonusFeed: vi.fn(() => Promise.resolve()),
}));

import { saveBonusFeed } from '../src/lib/bonus-feed-store.js';
import { trustRoutes } from '../src/routes/trust.js';

const SAMPLE_RAW_EMAIL = `From: promo@myprize.us
Subject: Claim your 50 SC daily bonus

Get 50 SC free play today only!
https://myprize.us/bonus/claim
`;

function buildApp() {
  const app = new Hono();
  app.route('/rgaas', trustRoutes);
  return app;
}

describe('POST /rgaas/email-ingest', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.mocked(saveBonusFeed).mockClear();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns 401 when EMAIL_INGEST_SECRET is set but auth header is missing', async () => {
    process.env.EMAIL_INGEST_SECRET = 'test-ingest-secret';

    const res = await buildApp().request('/rgaas/email-ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_email: SAMPLE_RAW_EMAIL }),
    });

    expect(res.status).toBe(401);
    const body = (await res.json()) as { code: string; error: string };
    expect(body.code).toBe('EMAIL_INGEST_AUTH_FAILED');
    expect(body.error).toMatch(/authentication required/i);
  });

  it('returns 400 when raw_email payload is too small', async () => {
    delete process.env.EMAIL_INGEST_SECRET;

    const res = await buildApp().request('/rgaas/email-ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_email: 'too short' }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string; error: string };
    expect(body.code).toBe('INVALID_INPUT');
    expect(body.error).toMatch(/min 20 chars/i);
  });

  it('ingests a valid email and persists via saveBonusFeed', async () => {
    process.env.EMAIL_INGEST_SECRET = 'test-ingest-secret';
    const feedDir = mkdtempSync(path.join(tmpdir(), 'tiltcheck-email-ingest-'));
    process.env.EMAIL_BONUS_FEED_PATH = path.join(feedDir, 'email-bonus-feed.json');

    const res = await buildApp().request('/rgaas/email-ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Email-Ingest-Key': 'test-ingest-secret',
      },
      body: JSON.stringify({ raw_email: SAMPLE_RAW_EMAIL }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      intel: { senderDomain: string | null; casinoBrand: string | null };
      bonusFeed: { detected: number; added: number; updated: number };
    };
    expect(body.success).toBe(true);
    expect(body.intel.senderDomain).toBe('myprize.us');
    expect(body.intel.casinoBrand).toBe('MyPrize US');
    expect(body.bonusFeed.detected).toBeGreaterThan(0);
    expect(saveBonusFeed).toHaveBeenCalledTimes(1);
    expect(saveBonusFeed).toHaveBeenCalledWith(
      expect.objectContaining({
        bonuses: expect.arrayContaining([
          expect.objectContaining({ brand: 'MyPrize US', source: 'email-inbox' }),
        ]),
      }),
    );
  });
});
