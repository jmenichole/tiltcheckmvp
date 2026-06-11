'use client';

import { useState } from 'react';
import {
  GAME_EXCLUSION_PRESETS,
  MAX_GAME_EXCLUSIONS,
  patternsFromGameUrl,
  type GameExclusionEntry,
  type GameExclusionMode,
} from '@tiltcheck/shared';

type GameExclusionEditorProps = {
  value: GameExclusionEntry[];
  onChange: (entries: GameExclusionEntry[]) => void;
};

function presetKey(preset: (typeof GAME_EXCLUSION_PRESETS)[number]): string {
  return preset.label;
}

function isPresetActive(
  entries: GameExclusionEntry[],
  preset: (typeof GAME_EXCLUSION_PRESETS)[number],
): boolean {
  return entries.some((e) => e.source === 'preset' && e.label === preset.label);
}

function findPresetEntry(
  entries: GameExclusionEntry[],
  preset: (typeof GAME_EXCLUSION_PRESETS)[number],
): GameExclusionEntry | undefined {
  return entries.find((e) => e.source === 'preset' && e.label === preset.label);
}

function parseKeywordPatterns(raw: string): string[] {
  const seen = new Set<string>();
  const patterns: string[] = [];
  for (const part of raw.split(',')) {
    const trimmed = part.trim().toLowerCase();
    if (trimmed.length < 2 || seen.has(trimmed)) continue;
    seen.add(trimmed);
    patterns.push(trimmed);
  }
  return patterns;
}

function labelFromUrl(url: string): string {
  try {
    const segments = new URL(url.trim()).pathname.split('/').filter(Boolean);
    const last = segments.at(-1) ?? 'Custom game';
    return last.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    return 'Custom game';
  }
}

export default function GameExclusionEditor({ value, onChange }: GameExclusionEditorProps) {
  const [customLabel, setCustomLabel] = useState('');
  const [customKeywords, setCustomKeywords] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [urlLabel, setUrlLabel] = useState('');
  const [formError, setFormError] = useState('');

  const atLimit = value.length >= MAX_GAME_EXCLUSIONS;

  function togglePreset(preset: (typeof GAME_EXCLUSION_PRESETS)[number]) {
    setFormError('');
    if (isPresetActive(value, preset)) {
      onChange(value.filter((e) => !(e.source === 'preset' && e.label === preset.label)));
      return;
    }
    if (atLimit) {
      setFormError(`Maximum ${MAX_GAME_EXCLUSIONS} game exclusions allowed.`);
      return;
    }
    onChange([
      ...value,
      {
        id: crypto.randomUUID(),
        label: preset.label,
        matchPatterns: [...preset.matchPatterns],
        mode: 'block',
        source: 'preset',
      },
    ]);
  }

  function setEntryMode(id: string, mode: GameExclusionMode) {
    onChange(value.map((e) => (e.id === id ? { ...e, mode } : e)));
  }

  function removeEntry(id: string) {
    setFormError('');
    onChange(value.filter((e) => e.id !== id));
  }

  function addKeywordEntry() {
    setFormError('');
    if (atLimit) {
      setFormError(`Maximum ${MAX_GAME_EXCLUSIONS} game exclusions allowed.`);
      return;
    }
    const label = customLabel.trim();
    if (label.length < 1) {
      setFormError('Enter a label for your custom game.');
      return;
    }
    const matchPatterns = parseKeywordPatterns(customKeywords);
    if (matchPatterns.length === 0) {
      setFormError('Add at least one keyword (2+ characters), comma-separated.');
      return;
    }
    onChange([
      ...value,
      {
        id: crypto.randomUUID(),
        label,
        matchPatterns,
        mode: 'block',
        source: 'keywords',
      },
    ]);
    setCustomLabel('');
    setCustomKeywords('');
  }

  function addUrlEntry() {
    setFormError('');
    if (atLimit) {
      setFormError(`Maximum ${MAX_GAME_EXCLUSIONS} game exclusions allowed.`);
      return;
    }
    const raw = urlInput.trim();
    if (!raw) {
      setFormError('Paste a full game URL from your casino.');
      return;
    }
    let matchPatterns: string[];
    try {
      matchPatterns = patternsFromGameUrl(raw);
    } catch {
      setFormError('Invalid URL — paste the full link from your casino game page.');
      return;
    }
    const label = urlLabel.trim() || labelFromUrl(raw);
    onChange([
      ...value,
      {
        id: crypto.randomUUID(),
        label,
        matchPatterns,
        mode: 'block',
        source: 'url',
      },
    ]);
    setUrlInput('');
    setUrlLabel('');
  }

  return (
    <div className="game-exclusion-editor">
      <p className="public-page-card__copy">
        Toggle presets or add custom games — changes save automatically. The extension matches URL, page
        title, and headings against your patterns — block immediately or warn first.
      </p>

      <div className="game-exclusion-presets" role="group" aria-label="Preset games">
        {GAME_EXCLUSION_PRESETS.map((preset) => {
          const active = isPresetActive(value, preset);
          const entry = findPresetEntry(value, preset);
          return (
            <div key={presetKey(preset)} className="game-exclusion-preset-row">
              <label className="dashboard-checkbox game-exclusion-preset-toggle">
                <input
                  type="checkbox"
                  checked={active}
                  disabled={!active && atLimit}
                  onChange={() => togglePreset(preset)}
                />
                {preset.label}
              </label>
              {active && entry ? (
                <div className="game-exclusion-mode-toggle" role="group" aria-label={`${preset.label} mode`}>
                  <button
                    type="button"
                    className={`btn btn-sm ${entry.mode === 'block' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setEntryMode(entry.id, 'block')}
                  >
                    Block
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${entry.mode === 'warn' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setEntryMode(entry.id, 'warn')}
                  >
                    Warn
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="game-exclusion-custom">
        <div className="dashboard-field">
          <label htmlFor="game-exclusion-custom-label">Custom game label</label>
          <input
            id="game-exclusion-custom-label"
            type="text"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="e.g. Crazy Time"
            maxLength={80}
            disabled={atLimit}
          />
        </div>
        <div className="dashboard-field">
          <label htmlFor="game-exclusion-keywords">Keywords (comma-separated)</label>
          <input
            id="game-exclusion-keywords"
            type="text"
            value={customKeywords}
            onChange={(e) => setCustomKeywords(e.target.value)}
            placeholder="crazy time, bonus wheel"
            disabled={atLimit}
          />
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={addKeywordEntry}
          disabled={atLimit}
        >
          Add keywords
        </button>
      </div>

      <div className="game-exclusion-custom">
        <div className="dashboard-field">
          <label htmlFor="game-exclusion-url">Paste game URL</label>
          <input
            id="game-exclusion-url"
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://casino.example/games/blackjack"
            disabled={atLimit}
          />
        </div>
        <div className="dashboard-field">
          <label htmlFor="game-exclusion-url-label">Label (optional)</label>
          <input
            id="game-exclusion-url-label"
            type="text"
            value={urlLabel}
            onChange={(e) => setUrlLabel(e.target.value)}
            placeholder="Defaults from URL path"
            maxLength={80}
            disabled={atLimit}
          />
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={addUrlEntry}
          disabled={atLimit}
        >
          Add from URL
        </button>
      </div>

      {atLimit ? (
        <p className="game-exclusion-limit" role="status">
          {MAX_GAME_EXCLUSIONS} games max — remove one to add another.
        </p>
      ) : (
        <p className="game-exclusion-count">
          {value.length} / {MAX_GAME_EXCLUSIONS} games
        </p>
      )}

      {formError ? (
        <p className="game-exclusion-error" role="alert">
          {formError}
        </p>
      ) : null}

      {value.some((e) => e.source !== 'preset') ? (
        <ul className="game-exclusion-list">
          {value
            .filter((e) => e.source !== 'preset')
            .map((entry) => (
              <li key={entry.id} className="game-exclusion-list-item">
                <div className="game-exclusion-list-item__main">
                  <span className="game-exclusion-list-item__label">
                    {entry.label}
                    {entry.source === 'stake_category' ? (
                      <span
                        className="drift-status-card__badge drift-status-card__badge--live"
                        style={{ marginLeft: '0.5rem', verticalAlign: 'middle' }}
                      >
                        Stake category
                      </span>
                    ) : null}
                  </span>
                  <span className="game-exclusion-list-item__patterns">
                    {entry.matchPatterns.slice(0, 3).join(', ')}
                    {entry.matchPatterns.length > 3 ? '…' : ''}
                  </span>
                </div>
                <div className="game-exclusion-mode-toggle" role="group" aria-label={`${entry.label} mode`}>
                  <button
                    type="button"
                    className={`btn btn-sm ${entry.mode === 'block' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setEntryMode(entry.id, 'block')}
                  >
                    Block
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${entry.mode === 'warn' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setEntryMode(entry.id, 'warn')}
                  >
                    Warn
                  </button>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm game-exclusion-remove"
                  onClick={() => removeEntry(entry.id)}
                  aria-label={`Remove ${entry.label}`}
                >
                  Remove
                </button>
              </li>
            ))}
        </ul>
      ) : null}
    </div>
  );
}
