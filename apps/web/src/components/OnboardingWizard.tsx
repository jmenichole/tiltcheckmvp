'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  GAME_EXCLUSION_PRESETS,
  type GameExclusionEntry,
  type GameExclusionMode,
} from '@tiltcheck/shared';
import { apiFetch } from '@/lib/api';

type RiskProfile = 'conservative' | 'moderate' | 'degen';

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

type Props = {
  initialGameExclusions: GameExclusionEntry[];
  initialRiskProfile: RiskProfile;
  initialSessionCapMinutes: number;
  onComplete: () => void;
  onSkip: () => void;
};

function presetEntry(
  preset: (typeof GAME_EXCLUSION_PRESETS)[number],
  enabled: boolean,
  mode: GameExclusionMode,
): GameExclusionEntry | null {
  if (!enabled) return null;
  return {
    id: `preset-${preset.label.toLowerCase().replace(/\s+/g, '-')}`,
    label: preset.label,
    matchPatterns: [...preset.matchPatterns],
    mode,
    source: 'preset',
  };
}

export function OnboardingWizard({
  initialGameExclusions,
  initialRiskProfile,
  initialSessionCapMinutes,
  onComplete,
  onSkip,
}: Props) {
  const [step, setStep] = useState(0);
  const [riskProfile, setRiskProfile] = useState<RiskProfile>(initialRiskProfile);
  const [sessionCapMinutes, setSessionCapMinutes] = useState(initialSessionCapMinutes);
  const [enabledPresets, setEnabledPresets] = useState<Set<string>>(() => {
    const labels = new Set(initialGameExclusions.map((e) => e.label));
    return new Set(GAME_EXCLUSION_PRESETS.filter((p) => labels.has(p.label)).map((p) => p.label));
  });
  const [presetMode, setPresetMode] = useState<GameExclusionMode>('block');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const steps = ['Welcome', 'Games', 'Sensitivity', 'Session cap', 'Done'] as const;

  async function finishWizard() {
    setSaving(true);
    setError('');
    const gameExclusions = GAME_EXCLUSION_PRESETS.map((p) =>
      presetEntry(p, enabledPresets.has(p.label), presetMode),
    ).filter((e): e is GameExclusionEntry => e !== null);

    const settingsRes = await apiFetch('/user/settings', {
      method: 'PATCH',
      body: JSON.stringify({
        riskProfile,
        gameExclusions,
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
        config: { durationMinutes: sessionCapMinutes },
      }),
    });
    setSaving(false);
    if (!vaultRes.ok) {
      setError('Settings saved but session cap failed — set it on the dashboard.');
    }
    onComplete();
  }

  return (
    <div className="public-page-card onboarding-wizard" role="dialog" aria-labelledby="onboarding-title">
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
          <h2 id="onboarding-title" className="public-page-card__title">
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
          <h2 id="onboarding-title" className="public-page-card__title">
            Block problem games
          </h2>
          <p className="public-page-card__copy">
            Toggle games you want off-limits. You can add custom URLs and keywords later in{' '}
            <Link href="/settings#game-exclusion">Settings</Link>.
          </p>
          <div className="dashboard-field">
            <label htmlFor="preset-mode">Default mode for selected games</label>
            <select
              id="preset-mode"
              value={presetMode}
              onChange={(e) => setPresetMode(e.target.value as GameExclusionMode)}
            >
              <option value="block">Block — immediate lockout</option>
              <option value="warn">Warn — 10s countdown first</option>
            </select>
          </div>
          <div className="onboarding-preset-grid">
            {GAME_EXCLUSION_PRESETS.map((preset) => (
              <label key={preset.label} className="dashboard-checkbox onboarding-preset-chip">
                <input
                  type="checkbox"
                  checked={enabledPresets.has(preset.label)}
                  onChange={(e) => {
                    setEnabledPresets((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(preset.label);
                      else next.delete(preset.label);
                      return next;
                    });
                  }}
                />
                {preset.label}
              </label>
            ))}
          </div>
          <div className="onboarding-wizard__nav">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep(0)}>
              Back
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setStep(2)}>
              Continue
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h2 id="onboarding-title" className="public-page-card__title">
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
          <h2 id="onboarding-title" className="public-page-card__title">
            Session cap
          </h2>
          <p className="public-page-card__copy">
            Minutes of Touch Grass lockout when tilt hits critical or you open a blocked game.
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
          <div className="onboarding-wizard__nav">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep(2)}>
              Back
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setStep(4)}
              disabled={sessionCapMinutes < 1}
            >
              Continue
            </button>
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <h2 id="onboarding-title" className="public-page-card__title">
            You are set
          </h2>
          <p className="public-page-card__copy">
            Install the extension and connect Discord so exclusions and your cap sync to casino tabs.{' '}
            <Link href="/extension">Extension setup</Link>
          </p>
          {error ? <p className="dashboard-status dashboard-status--error">{error}</p> : null}
          <div className="onboarding-wizard__nav">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep(3)}>
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
