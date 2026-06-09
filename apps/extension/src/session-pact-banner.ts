/** Once-per-tab banner summarizing the user's saved protection presets. */

import type { GameExclusionEntry, SessionCapConfig } from '@tiltcheck/shared';
import type { RiskProfile } from './tilt-detector.js';
import { dismissPageToast, showPageToast } from './page-toast.js';

const BANNER_ID = 'tiltcheck-session-pact-root';
const SHOWN_SNAPSHOT_KEY = 'tc_pact_banner_snapshot';

const RISK_LABEL: Record<RiskProfile, string> = {
  conservative: 'Conservative',
  moderate: 'Moderate',
  degen: 'Degen',
};

export type SessionPactBannerContext = {
  loggedIn: boolean;
  demoMode: boolean;
  username?: string;
  riskProfile: RiskProfile;
  cap: SessionCapConfig;
  capArmed: boolean;
  gameExclusions: GameExclusionEntry[];
};

function formatBlockList(entries: GameExclusionEntry[]): string {
  if (entries.length === 0) return 'No game blocks yet';
  const labels = entries.map((e) => e.label);
  if (labels.length <= 3) return labels.join(', ');
  return `${labels.slice(0, 3).join(', ')} +${labels.length - 3} more`;
}

function formatLockoutStyle(style: SessionCapConfig['lockoutStyle']): string {
  return style === 'hard_stop' ? 'hard stop' : 'friction first';
}

function buildBannerCopy(ctx: SessionPactBannerContext): { headline: string; sub: string } | null {
  if (!ctx.loggedIn) {
    return {
      headline: 'Connect Discord to arm your line',
      sub: 'Game blocks, tilt sensitivity, and My Line live on the dashboard — enforcement follows you here after login.',
    };
  }

  const hasBlocks = ctx.gameExclusions.length > 0;
  const hasCap = ctx.capArmed;
  if (!hasBlocks && !hasCap) {
    return {
      headline: 'Protection not armed yet',
      sub: 'Set My Line on the dashboard and block problem games in Settings — then hit Sync in the TC panel.',
    };
  }

  const who = ctx.username ? `@${ctx.username}` : 'You';
  const lines: string[] = [
    `${RISK_LABEL[ctx.riskProfile]} tilt sensitivity`,
    `${ctx.cap.durationMinutes} min line · ${formatLockoutStyle(ctx.cap.lockoutStyle)}${ctx.cap.snoozeEnabled ? ' · snooze on' : ''}`,
    `Blocks: ${formatBlockList(ctx.gameExclusions)}`,
  ];

  if (ctx.cap.futureMeNote) {
    const note =
      ctx.cap.futureMeNote.length > 72
        ? `${ctx.cap.futureMeNote.slice(0, 72)}…`
        : ctx.cap.futureMeNote;
    lines.push(`Past-you note: “${note}”`);
  }

  if (ctx.demoMode) {
    lines.push('Demo mode — warnings only, no lockout until demo is off.');
  }

  return {
    headline: `${who} — past you set this session`,
    sub: lines.join('\n'),
  };
}

function snapshotKey(ctx: SessionPactBannerContext): string {
  return [
    ctx.loggedIn ? '1' : '0',
    ctx.demoMode ? '1' : '0',
    ctx.riskProfile,
    String(ctx.cap.durationMinutes),
    ctx.cap.lockoutStyle,
    ctx.cap.snoozeEnabled ? '1' : '0',
    ctx.cap.futureMeNote,
    ctx.capArmed ? '1' : '0',
    ctx.gameExclusions
      .map((e) => e.id)
      .sort()
      .join(','),
  ].join('|');
}

export function maybeShowSessionPactBanner(ctx: SessionPactBannerContext): void {
  const snap = snapshotKey(ctx);
  if (sessionStorage.getItem(SHOWN_SNAPSHOT_KEY) === snap) return;

  const copy = buildBannerCopy(ctx);
  if (!copy) return;

  sessionStorage.setItem(SHOWN_SNAPSHOT_KEY, snap);

  showPageToast(BANNER_ID, {
    tone: ctx.demoMode ? 'demo' : 'info',
    tag: 'TC · YOUR LINE',
    headline: copy.headline,
    sub: copy.sub,
    dismissible: true,
    autoDismissMs: 14_000,
  });
}

export function dismissSessionPactBanner(): void {
  dismissPageToast(BANNER_ID);
}
