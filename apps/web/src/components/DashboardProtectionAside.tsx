'use client';

import Link from 'next/link';
import type { GameExclusionEntry } from '@tiltcheck/shared';

const RISK_LABELS: Record<string, string> = {
  conservative: 'Conservative — early brakes',
  moderate: 'Moderate — balanced',
  degen: 'Degen — let me cook',
};

type Props = {
  riskProfile: string;
  gameExclusions: GameExclusionEntry[];
  capMinutes: number | null;
  capSynced: boolean;
  onboardingComplete: boolean;
};

export default function DashboardProtectionAside({
  riskProfile,
  gameExclusions,
  capMinutes,
  capSynced,
  onboardingComplete,
}: Props) {
  const blockCount = gameExclusions.filter((e) => e.mode === 'block').length;
  const warnCount = gameExclusions.filter((e) => e.mode === 'warn').length;

  return (
    <aside className="dashboard-aside">
      <div className="public-page-card dashboard-status-panel">
        <span className="brand-eyebrow">Protection status</span>
        <h3 className="public-page-card__title">Your line today</h3>

        <dl className="dashboard-status-list">
          <div className="dashboard-status-list__row">
            <dt>Tilt sensitivity</dt>
            <dd>{RISK_LABELS[riskProfile] ?? riskProfile}</dd>
          </div>
          <div className="dashboard-status-list__row">
            <dt>Game exclusions</dt>
            <dd>
              {gameExclusions.length === 0 ? (
                <Link href="/settings#game-exclusion" className="dashboard-link">
                  None set — add in Settings
                </Link>
              ) : (
                <>
                  {gameExclusions.length} game{gameExclusions.length === 1 ? '' : 's'}
                  {blockCount > 0 ? ` · ${blockCount} block` : ''}
                  {warnCount > 0 ? ` · ${warnCount} warn` : ''}
                </>
              )}
            </dd>
          </div>
          <div className="dashboard-status-list__row">
            <dt>Touch Grass lockout</dt>
            <dd>
              {capSynced && capMinutes ? (
                <span className="dashboard-sync-ready">{capMinutes} min armed</span>
              ) : (
                <span className="dashboard-status-list__muted">Not saved yet</span>
              )}
            </dd>
          </div>
          <div className="dashboard-status-list__row">
            <dt>Setup</dt>
            <dd>{onboardingComplete ? 'Wizard complete' : 'Finish onboarding when ready'}</dd>
          </div>
        </dl>

        <div className="dashboard-status-actions">
          <Link href="/settings#game-exclusion" className="btn btn-ghost btn-sm">
            Game blocks
          </Link>
          <Link href="/extension" className="btn btn-ghost btn-sm">
            Extension
          </Link>
        </div>
      </div>

      <div className="public-page-card dashboard-stats-panel">
        <span className="brand-eyebrow">Session patterns</span>
        <h3 className="public-page-card__title">Lockout history</h3>
        <p className="public-page-card__copy">
          Tilt and game-block events still live in the extension on each tab. A synced session log
          (lockouts per week, top triggers, cap tweaks) is planned — your habit loop starts with
          adjusting the lockout time after each pull-out.
        </p>
        <p className="public-page-card__copy dashboard-stats-panel__hint">
          On casino tabs: expand the TC chip for live clicks/5s and latest tilt indicator.
        </p>
      </div>
    </aside>
  );
}
