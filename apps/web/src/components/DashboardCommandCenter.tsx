'use client';

import Link from 'next/link';
import type { GameExclusionEntry } from '@tiltcheck/shared';
import { HABIT_LOOP_COPY } from '@/lib/protection-steps';

type Pillar = {
  id: string;
  label: string;
  value: string;
  done: boolean;
  href: string;
  cta: string;
};

type Props = {
  username?: string;
  capSynced: boolean;
  capMinutes: number | null;
  lockoutStyle: string;
  gameExclusions: GameExclusionEntry[];
  riskProfile: string;
  pledgeActive: boolean;
  pledgeCountdown: string;
  onboardingComplete: boolean;
  futureMeNote: string;
};

const RISK_SHORT: Record<string, string> = {
  conservative: 'Early brakes',
  moderate: 'Balanced',
  degen: 'Let me cook',
};

const QUICK_TOOLS = [
  { href: '/touch-grass', label: 'Touch Grass', copy: 'Break hub when locked out' },
  { href: '/casinos', label: 'Casino intel', copy: 'Trust before you deposit' },
  { href: '/extension', label: 'Extension', copy: 'Side panel on casino tabs' },
  { href: '/stake', label: 'Stake AutoVault', copy: 'Skim wins on stake.us' },
  { href: '/nuts', label: 'nuts AutoVault', copy: 'Skim wins on nuts.gg' },
  { href: 'https://discord.gg/gdBsEJfCar', label: 'Discord', copy: 'Degens who get it', external: true },
] as const;

function buildPillars(props: Props): Pillar[] {
  const blocks = props.gameExclusions.length;
  return [
    {
      id: 'line',
      label: 'Exit line',
      value: props.capSynced && props.capMinutes ? `${props.capMinutes}m Touch Grass` : 'Not armed',
      done: props.capSynced,
      href: '#my-line',
      cta: props.capSynced ? 'Tweak line' : 'Arm line',
    },
    {
      id: 'blocks',
      label: 'Game traps',
      value: blocks > 0 ? `${blocks} blocked` : 'None yet',
      done: blocks > 0,
      href: '/settings#game-exclusion',
      cta: blocks > 0 ? 'Manage' : 'Add blocks',
    },
    {
      id: 'tilt',
      label: 'Tilt brakes',
      value: RISK_SHORT[props.riskProfile] ?? props.riskProfile,
      done: true,
      href: '/settings',
      cta: 'Sensitivity',
    },
    {
      id: 'pledge',
      label: 'Vault bag',
      value: props.pledgeActive ? props.pledgeCountdown || 'Active' : 'No pledge',
      done: props.pledgeActive,
      href: '#vault-pledge',
      cta: props.pledgeActive ? 'View pledge' : 'Arm pledge',
    },
  ];
}

export default function DashboardCommandCenter({
  username,
  capSynced,
  capMinutes,
  gameExclusions,
  riskProfile,
  pledgeActive,
  pledgeCountdown,
  onboardingComplete,
  futureMeNote,
  lockoutStyle,
}: Props) {
  const pillars = buildPillars({
    username,
    capSynced,
    capMinutes,
    lockoutStyle,
    gameExclusions,
    riskProfile,
    pledgeActive,
    pledgeCountdown,
    onboardingComplete,
    futureMeNote,
  });

  const requiredDone = [capSynced, gameExclusions.length > 0, onboardingComplete].filter(Boolean).length;
  const scorePct = Math.round((requiredDone / 3) * 100);
  const scoreLabel =
    scorePct >= 100
      ? 'Locked in — play on your terms'
      : scorePct >= 66
        ? 'Almost there — one more setup step'
        : scorePct >= 33
          ? 'Half protected — finish before the heater'
          : 'Unarmed — the house loves this';

  const blockSummary =
    gameExclusions.length > 0
      ? gameExclusions.map((e) => e.label).join(' · ')
      : null;

  return (
    <section className="dashboard-command">
      <div className="dashboard-command__hero">
        <div className="dashboard-command__score-ring" aria-hidden="true">
          <svg viewBox="0 0 120 120" className="dashboard-command__ring-svg">
            <circle cx="60" cy="60" r="52" className="dashboard-command__ring-track" />
            <circle
              cx="60"
              cy="60"
              r="52"
              className="dashboard-command__ring-fill"
              style={{
                strokeDasharray: `${(scorePct / 100) * 327} 327`,
              }}
            />
          </svg>
          <span className="dashboard-command__score-value">{scorePct}%</span>
        </div>
        <div className="dashboard-command__hero-copy">
          <span className="brand-eyebrow">Walk away a winner</span>
          <h2 className="dashboard-command__headline">{scoreLabel}</h2>
          <p className="dashboard-command__lede">
            {username ? `@${username} — ` : ''}
            TiltCheck enforces what past-you set. Block traps, catch tilt on-tab, lock before the rinse.
          </p>
          {futureMeNote ? (
            <blockquote className="dashboard-command__note">
              <span className="dashboard-command__note-label">Past-you said</span>
              {futureMeNote}
            </blockquote>
          ) : null}
        </div>
      </div>

      <div className="dashboard-command__pillars" role="list">
        {pillars.map((p) => (
          <a
            key={p.id}
            href={p.href}
            className={`dashboard-command__pillar${p.done ? ' dashboard-command__pillar--done' : ''}`}
            role="listitem"
          >
            <span className="dashboard-command__pillar-status" aria-hidden="true">
              {p.done ? '✓' : '○'}
            </span>
            <span className="dashboard-command__pillar-label">{p.label}</span>
            <span className="dashboard-command__pillar-value">{p.value}</span>
            <span className="dashboard-command__pillar-cta">{p.cta} →</span>
          </a>
        ))}
      </div>

      {blockSummary ? (
        <p className="dashboard-command__blocks-summary">
          <span className="dashboard-command__blocks-label">Watching:</span> {blockSummary}
          {gameExclusions.length > 2 ? ` +${gameExclusions.length - 2} more` : ''}
        </p>
      ) : null}

      <div className="dashboard-command__tools">
        <div className="dashboard-command__tools-head">
          <span className="brand-eyebrow">Tools</span>
          <h3 className="dashboard-command__tools-title">Use between sessions</h3>
        </div>
        <div className="dashboard-command__tools-grid">
          {QUICK_TOOLS.map((tool) => {
            const inner = (
              <>
                <span className="dashboard-command__tool-label">{tool.label}</span>
                <span className="dashboard-command__tool-copy">{tool.copy}</span>
              </>
            );
            if ('external' in tool && tool.external) {
              return (
                <a
                  key={tool.href}
                  href={tool.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dashboard-command__tool"
                >
                  {inner}
                </a>
              );
            }
            return (
              <Link key={tool.href} href={tool.href} className="dashboard-command__tool">
                {inner}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="dashboard-command__habit">
        <p className="public-page-panel__eyebrow">{HABIT_LOOP_COPY.eyebrow}</p>
        <p className="dashboard-command__habit-title">{HABIT_LOOP_COPY.title}</p>
        <p className="dashboard-command__habit-copy">{HABIT_LOOP_COPY.body}</p>
      </div>
    </section>
  );
}
