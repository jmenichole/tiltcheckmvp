'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  STAKE_CATEGORY_BLOCKS,
  buildStakeCategoryExclusions,
  type GameExclusionEntry,
  type GameExclusionMode,
  type LockoutStyle,
  type StakeCategoryId,
} from '@tiltcheck/shared';
import { apiFetch } from '@/lib/api';
import { extensionInstallHref } from '@/lib/extension-install';
import { StakeCategoryPicker } from '@/components/StakeCategoryPicker';

type RiskProfile = 'conservative' | 'moderate' | 'degen';

type TrapPattern = 'game_trap' | 'autopilot' | 'chase' | 'heater' | 'skip';

const ALL_STAKE_CATEGORY_IDS: StakeCategoryId[] = STAKE_CATEGORY_BLOCKS.map((c) => c.id);

const SENSITIVITY_CARDS: Array<{
  id: RiskProfile;
  title: string;
  copy: string;
  example: string;
}> = [
  {
    id: 'conservative',
    title: 'Conservative — early brakes',
    copy: 'Fires warnings sooner. Touch Grass kicks in when click-speed or loss streaks look like autopilot.',
    example: 'Touch Grass when: 10+ clicks in 5 seconds',
  },
  {
    id: 'moderate',
    title: 'Moderate — balanced',
    copy: 'Standard thresholds. Ignores normal variance; reacts when pacing clearly shifts.',
    example: 'Touch Grass when: 14+ clicks in 5 seconds',
  },
  {
    id: 'degen',
    title: 'Degen — let me cook',
    copy: 'High tolerance. Only locks you out on obvious tilt patterns.',
    example: 'Touch Grass when: 20+ clicks in 5 seconds',
  },
];

const TRAP_CARDS: Array<{
  id: TrapPattern;
  title: string;
  copy: string;
}> = [
  {
    id: 'game_trap',
    title: 'Specific games cook me',
    copy: 'Crash, blackjack, slots — you already know the trap list.',
  },
  {
    id: 'autopilot',
    title: 'I click on autopilot',
    copy: 'Fast spins before you notice the damage. Early warnings help.',
  },
  {
    id: 'chase',
    title: 'I chase losses',
    copy: 'One bad run turns into a deposit spiral. Tighter brakes and longer lockouts.',
  },
  {
    id: 'heater',
    title: 'I give back wins',
    copy: 'Up big, then donate it back. Shorter lockouts and friction before reload.',
  },
  {
    id: 'skip',
    title: 'Mix of everything',
    copy: 'Skip the guesswork — you will tune games and sensitivity on the next steps.',
  },
];

type Props = {
  initialGameExclusions: GameExclusionEntry[];
  initialRiskProfile: RiskProfile;
  initialSessionCapMinutes: number;
  onComplete: () => void;
  onSkip: () => void;
};

function stakeCategoryIdFromEntry(entry: GameExclusionEntry): StakeCategoryId | null {
  if (entry.source !== 'stake_category') return null;
  const id = entry.id.replace(/^stake-cat-/, '') as StakeCategoryId;
  return ALL_STAKE_CATEGORY_IDS.includes(id) ? id : null;
}

function applyTrapDefaults(
  trap: TrapPattern,
): Partial<{
  riskProfile: RiskProfile;
  categoryDefaultMode: GameExclusionMode;
  sessionCapMinutes: number;
  selectedCategories: Set<StakeCategoryId>;
  lockoutStyle: LockoutStyle;
}> {
  switch (trap) {
    case 'game_trap':
      return {
        categoryDefaultMode: 'block',
        riskProfile: 'moderate',
        sessionCapMinutes: 15,
        selectedCategories: new Set<StakeCategoryId>(['stake-originals', 'scratch-cards']),
      };
    case 'autopilot':
      return {
        categoryDefaultMode: 'warn',
        riskProfile: 'conservative',
        sessionCapMinutes: 15,
        selectedCategories: new Set<StakeCategoryId>(['stake-originals', 'slots']),
        lockoutStyle: 'friction_first',
      };
    case 'chase':
      return {
        categoryDefaultMode: 'block',
        riskProfile: 'conservative',
        sessionCapMinutes: 20,
        selectedCategories: new Set(ALL_STAKE_CATEGORY_IDS),
        lockoutStyle: 'hard_stop',
      };
    case 'heater':
      return {
        categoryDefaultMode: 'warn',
        riskProfile: 'moderate',
        sessionCapMinutes: 10,
        selectedCategories: new Set<StakeCategoryId>(['stake-originals', 'slots']),
        lockoutStyle: 'friction_first',
      };
    case 'skip':
      return {
        categoryDefaultMode: 'block',
        selectedCategories: new Set(),
      };
    default:
      return {};
  }
}

export function OnboardingWizard({
  initialGameExclusions,
  initialRiskProfile,
  initialSessionCapMinutes,
  onComplete,
  onSkip,
}: Props) {
  const [step, setStep] = useState(0);
  const [trapPattern, setTrapPattern] = useState<TrapPattern | null>(null);
  const [riskProfile, setRiskProfile] = useState<RiskProfile>(initialRiskProfile);
  const [sessionCapMinutes, setSessionCapMinutes] = useState(initialSessionCapMinutes);
  const [lockoutStyle, setLockoutStyle] = useState<LockoutStyle>('friction_first');
  const [futureMeNote, setFutureMeNote] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Set<StakeCategoryId>>(() => {
    const ids = initialGameExclusions
      .map(stakeCategoryIdFromEntry)
      .filter((id): id is StakeCategoryId => id !== null);
    return new Set(ids);
  });
  const [categoryDefaultMode, setCategoryDefaultMode] = useState<GameExclusionMode>('block');
  const [categoryOverrides, setCategoryOverrides] = useState<
    Partial<Record<StakeCategoryId, GameExclusionMode>>
  >({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const steps = ['Welcome', 'Your pattern', 'Stake traps', 'Sensitivity', 'Session cap', 'Done'] as const;
  const installHref = extensionInstallHref();

  function continueFromTrap(nextTrap: TrapPattern) {
    setTrapPattern(nextTrap);
    const defaults = applyTrapDefaults(nextTrap);
    if (defaults.riskProfile) setRiskProfile(defaults.riskProfile);
    if (defaults.categoryDefaultMode) setCategoryDefaultMode(defaults.categoryDefaultMode);
    if (defaults.sessionCapMinutes) setSessionCapMinutes(defaults.sessionCapMinutes);
    if (defaults.lockoutStyle) setLockoutStyle(defaults.lockoutStyle);
    if (defaults.selectedCategories) {
      setSelectedCategories(defaults.selectedCategories);
      setCategoryOverrides({});
    }
    setStep(2);
  }

  async function finishWizard() {
    setSaving(true);
    setError('');
    const categoryExclusions = buildStakeCategoryExclusions(
      Array.from(selectedCategories),
      categoryDefaultMode,
      categoryOverrides,
    );
    const customExclusions = initialGameExclusions.filter(
      (e) => e.source === 'keywords' || e.source === 'url',
    );
    const gameExclusions = [...categoryExclusions, ...customExclusions];

    const settingsRes = await apiFetch('/user/settings', {
      method: 'PATCH',
      body: JSON.stringify({
        riskProfile,
        gameExclusions,
        demoMode: false,
        onboardingCompletedAt: new Date().toISOString(),
      }),
    });
    if (!settingsRes.ok) {
      setSaving(false);
      setError('Could not save settings. Try again.');
      return;
    }

    const vaultRes = await apiFetch('/vault', {
      method: 'POST',
      body: JSON.stringify({
        ruleType: 'session_cap',
        enabled: true,
        config: {
          durationMinutes: sessionCapMinutes,
          lockoutStyle,
          snoozeEnabled: false,
          futureMeNote: futureMeNote.trim().slice(0, 140),
        },
      }),
    });
    if (!vaultRes.ok) {
      setSaving(false);
      setError('Settings saved but session cap failed — set My Line on the dashboard, then try again.');
      return;
    }
    setSaving(false);
    onComplete();
  }

  return (
    <div
      className="public-page-card onboarding-wizard"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`onboarding-title-${step}`}
    >
      <div className="onboarding-wizard__header">
        <span className="brand-eyebrow">
          Setup · Step {step + 1} of {steps.length}
        </span>
        <button type="button" className="btn btn-ghost btn-sm onboarding-wizard__skip" onClick={onSkip}>
          Set up later
        </button>
      </div>

      {step === 0 && (
        <>
          <h2 id="onboarding-title-0" className="public-page-card__title">
            Welcome to TiltCheck
          </h2>
          <p className="public-page-card__copy">
            Two layers of protection: block games you know are traps, then catch tilt when pacing shifts.
            This wizard takes about two minutes.
          </p>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setStep(1)}>
            Get started
          </button>
        </>
      )}

      {step === 1 && (
        <>
          <h2 id="onboarding-title-1" className="public-page-card__title">
            What usually cooks you?
          </h2>
          <p className="public-page-card__copy">
            Pick the closest match — we will pre-fill Stake traps, sensitivity, and your exit line. You can
            change anything on the next steps.
          </p>
          <div className="sensitivity-card-grid">
            {TRAP_CARDS.map((card) => (
              <button
                key={card.id}
                type="button"
                className={`sensitivity-card${trapPattern === card.id ? ' sensitivity-card--selected' : ''}`}
                onClick={() => continueFromTrap(card.id)}
              >
                <span className="sensitivity-card__title">{card.title}</span>
                <span className="sensitivity-card__copy">{card.copy}</span>
              </button>
            ))}
          </div>
          <div className="onboarding-wizard__nav">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep(0)}>
              Back
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h2 id="onboarding-title-2" className="public-page-card__title">
            Block the wrong lobby
          </h2>
          <p className="public-page-card__copy">
            Pick Stake categories you want off-limits — group pages and direct game links both count. Zero
            selections is fine; you can add traps anytime in{' '}
            <Link href="/settings#game-exclusion">Settings</Link>.
          </p>
          <StakeCategoryPicker
            selected={selectedCategories}
            defaultMode={categoryDefaultMode}
            overrides={categoryOverrides}
            onChangeSelected={setSelectedCategories}
            onChangeDefaultMode={setCategoryDefaultMode}
            onChangeOverride={(id, mode) => {
              setCategoryOverrides((prev) => {
                const next = { ...prev };
                if (mode === undefined) delete next[id];
                else next[id] = mode;
                return next;
              });
            }}
          />
          <div className="onboarding-wizard__nav">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep(1)}>
              Back
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setStep(3)}>
              Continue
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h2 id="onboarding-title-3" className="public-page-card__title">
            Tilt sensitivity
          </h2>
          <p className="public-page-card__copy">How early should we nudge you when pacing shifts?</p>
          <div className="sensitivity-card-grid">
            {SENSITIVITY_CARDS.map((card) => (
              <label
                key={card.id}
                className={`sensitivity-card${riskProfile === card.id ? ' sensitivity-card--selected' : ''}`}
              >
                <input
                  type="radio"
                  name="risk-profile"
                  value={card.id}
                  checked={riskProfile === card.id}
                  onChange={() => setRiskProfile(card.id)}
                  className="sr-only"
                />
                <span className="sensitivity-card__title">{card.title}</span>
                <span className="sensitivity-card__copy">{card.copy}</span>
                <span className="sensitivity-card__example">{card.example}</span>
              </label>
            ))}
          </div>
          <div className="onboarding-wizard__nav">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep(2)}>
              Back
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setStep(4)}>
              Continue
            </button>
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <h2 id="onboarding-title-4" className="public-page-card__title">
            Session cap
          </h2>
          <p className="public-page-card__copy">
            Minutes of Touch Grass lockout when tilt hits critical or you open a blocked game. You chose the
            boundary — we enforce it.
          </p>
          <div className="dashboard-field">
            <label htmlFor="wizard-session-cap">Lockout duration (minutes)</label>
            <input
              id="wizard-session-cap"
              type="number"
              min={1}
              max={60}
              value={sessionCapMinutes}
              onChange={(e) => setSessionCapMinutes(Number(e.target.value))}
            />
          </div>
          <div className="dashboard-field">
            <label htmlFor="wizard-lockout-style">When the line hits</label>
            <select
              id="wizard-lockout-style"
              value={lockoutStyle}
              onChange={(e) => setLockoutStyle(e.target.value as LockoutStyle)}
            >
              <option value="friction_first">Friction first — past-you note, then lock</option>
              <option value="hard_stop">Hard stop — lock the tab immediately</option>
            </select>
          </div>
          <div className="dashboard-field">
            <label htmlFor="wizard-future-me">Past-you note (optional)</label>
            <textarea
              id="wizard-future-me"
              rows={2}
              maxLength={140}
              placeholder="Why future-you wanted this break…"
              value={futureMeNote}
              onChange={(e) => setFutureMeNote(e.target.value)}
            />
            <p className="public-page-meta-strip">{futureMeNote.length}/140</p>
          </div>
          <div className="onboarding-wizard__nav">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep(3)}>
              Back
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setStep(5)}
              disabled={sessionCapMinutes < 1}
            >
              Continue
            </button>
          </div>
        </>
      )}

      {step === 5 && (
        <>
          <h2 id="onboarding-title-5" className="public-page-card__title">
            You are set
          </h2>
          <p className="public-page-card__copy">
            You are signed in on the web — open the extension side panel and your line syncs automatically. No
            second Discord login in the extension.
          </p>
          {selectedCategories.size === 0 ? (
            <p className="public-page-card__copy">
              No Stake traps selected yet — add category blocks anytime under{' '}
              <Link href="/settings#game-exclusion">Settings → Game blocks</Link>.
            </p>
          ) : null}
          <p className="public-page-card__copy">
            Need the extension?{' '}
            <a href={installHref} target="_blank" rel="noopener noreferrer" className="dashboard-link">
              Install TiltCheck
            </a>
            , then refresh this dashboard once. Demo mode turns off when you finish — lockouts will fire on
            casino tabs.
          </p>
          {error ? <p className="dashboard-status dashboard-status--error">{error}</p> : null}
          <div className="onboarding-wizard__nav">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep(4)}>
              Back
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={finishWizard} disabled={saving}>
              {saving ? 'Saving...' : 'Finish setup'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
