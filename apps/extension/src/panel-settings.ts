import {
  MAX_GAME_EXCLUSIONS,
  STAKE_CATEGORY_BLOCKS,
  stakeCategoryToExclusion,
  type GameExclusionEntry,
  type GameExclusionMode,
  type LockoutStyle,
  type SessionCapConfig,
  type StakeCategoryId,
} from '@tiltcheck/shared';
import { pushSessionCapConfig } from './vault-sync.js';
import { pushSettingsToApi, type SyncedSettings } from './settings-sync.js';

export type PanelSettingsContext = {
  token: string;
  riskProfile: SyncedSettings['riskProfile'];
  cap: SessionCapConfig;
  gameExclusions: GameExclusionEntry[];
  demoMode: boolean;
  notificationsEnabled: boolean;
};

const RISK_OPTIONS: { id: SyncedSettings['riskProfile']; label: string }[] = [
  { id: 'conservative', label: 'Conservative' },
  { id: 'moderate', label: 'Moderate' },
  { id: 'degen', label: 'Degen' },
];

const CAP_DURATION_OPTIONS: { minutes: number; label: string }[] = [
  { minutes: 1, label: '1 min' },
  { minutes: 2, label: '2 min' },
  { minutes: 5, label: '5 min' },
  { minutes: 10, label: '10 min' },
  { minutes: 15, label: '15 min' },
  { minutes: 20, label: '20 min' },
  { minutes: 30, label: '30 min' },
  { minutes: 60, label: '1 hr' },
  { minutes: 120, label: '2 hrs' },
  { minutes: 1440, label: '24 hrs' },
];

function capDurationOptions(currentMinutes: number): { minutes: number; label: string }[] {
  const options = [...CAP_DURATION_OPTIONS];
  if (!options.some((o) => o.minutes === currentMinutes)) {
    options.push({ minutes: currentMinutes, label: `${currentMinutes} min` });
    options.sort((a, b) => a.minutes - b.minutes);
  }
  return options;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stakeCategoryActive(exclusions: GameExclusionEntry[], id: StakeCategoryId): boolean {
  return exclusions.some((e) => e.id === `stake-cat-${id}`);
}

function toggleStakeCategory(
  exclusions: GameExclusionEntry[],
  id: StakeCategoryId,
): GameExclusionEntry[] {
  const entryId = `stake-cat-${id}`;
  if (exclusions.some((e) => e.id === entryId)) {
    return exclusions.filter((e) => e.id !== entryId);
  }
  const category = STAKE_CATEGORY_BLOCKS.find((c) => c.id === id);
  if (!category || exclusions.length >= MAX_GAME_EXCLUSIONS) return exclusions;
  return [...exclusions, stakeCategoryToExclusion(category, 'block')];
}

function setEntryMode(
  exclusions: GameExclusionEntry[],
  id: string,
  mode: GameExclusionMode,
): GameExclusionEntry[] {
  return exclusions.map((e) => (e.id === id ? { ...e, mode } : e));
}

function removeEntry(exclusions: GameExclusionEntry[], id: string): GameExclusionEntry[] {
  return exclusions.filter((e) => e.id !== id);
}

export function injectSettingsStyles(): void {
  if (document.getElementById('tc-panel-settings-styles')) return;
  const style = document.createElement('style');
  style.id = 'tc-panel-settings-styles';
  style.textContent = `
    .settings-header {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 16px; border-bottom: 1px solid rgba(23,195,178,.2); background: #0a0c10;
    }
    .settings-back {
      border: none; background: transparent; color: #17c3b2; font: inherit;
      font-size: 12px; font-weight: 700; cursor: pointer; padding: 4px 0;
    }
    .settings-title { font: 800 16px/1 ui-monospace,monospace; color: #f3f4f6; letter-spacing: .06em; }
    .settings-body { padding: 12px 16px 16px; }
    .settings-section { margin-bottom: 16px; }
    .settings-section__label {
      margin: 0 0 8px; font: 700 10px/1 ui-monospace,monospace;
      letter-spacing: .12em; text-transform: uppercase; color: #6b7280;
    }
    .settings-segmented { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
    .settings-segment {
      padding: 8px 6px; border-radius: 8px; border: 1px solid rgba(30,37,51,.9);
      background: #12161e; color: #9ca3af; font-size: 10px; font-weight: 700;
      text-align: center; cursor: pointer;
    }
    .settings-segment--active { border-color: rgba(23,195,178,.55); color: #17c3b2; background: #0f1419; }
    .settings-field { margin-bottom: 10px; }
    .settings-field label { display: block; margin-bottom: 4px; font-size: 11px; color: #9ca3af; }
    .settings-field select, .settings-field input[type="number"], .settings-field textarea {
      width: 100%; box-sizing: border-box; padding: 8px 10px; border-radius: 8px;
      border: 1px solid rgba(30,37,51,.9); background: #12161e; color: #f3f4f6; font: inherit; font-size: 12px;
    }
    .settings-field textarea { resize: vertical; min-height: 52px; }
    .settings-check {
      display: flex; align-items: center; gap: 8px; margin-bottom: 8px;
      font-size: 12px; color: #d1d5db; cursor: pointer;
    }
    .settings-check input { accent-color: #17c3b2; }
    .settings-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .settings-chip {
      padding: 6px 10px; border-radius: 999px; border: 1px solid rgba(30,37,51,.9);
      background: #12161e; color: #9ca3af; font-size: 10px; font-weight: 700; cursor: pointer;
    }
    .settings-chip--active { border-color: rgba(23,195,178,.55); color: #17c3b2; }
    .settings-blocks { display: flex; flex-direction: column; gap: 6px; max-height: 160px; overflow-y: auto; }
    .settings-block-row {
      display: grid; grid-template-columns: 1fr auto auto; gap: 6px; align-items: center;
      padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(30,37,51,.7); background: #12161e;
    }
    .settings-block-row__label { font-size: 11px; color: #f3f4f6; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .settings-block-row select {
      padding: 4px 6px; border-radius: 6px; border: 1px solid rgba(30,37,51,.9);
      background: #0a0c10; color: #17c3b2; font-size: 10px;
    }
    .settings-block-row button {
      border: none; background: transparent; color: #6b7280; font-size: 14px; cursor: pointer; padding: 0 4px;
    }
    .settings-empty { margin: 0; font-size: 11px; color: #6b7280; line-height: 1.5; }
    .settings-status { margin: 8px 0 0; font-size: 11px; color: #6b7280; min-height: 16px; }
  `;
  document.head.appendChild(style);
}

function renderBlockRows(exclusions: GameExclusionEntry[]): string {
  if (exclusions.length === 0) {
    return '<p class="settings-empty">No game blocks yet. Toggle a Stake category below.</p>';
  }
  return exclusions
    .map(
      (e) => `
      <div class="settings-block-row" data-block-id="${escapeHtml(e.id)}">
        <span class="settings-block-row__label" title="${escapeHtml(e.label)}">${escapeHtml(e.label)}</span>
        <select class="settings-block-mode" aria-label="Mode for ${escapeHtml(e.label)}">
          <option value="warn"${e.mode === 'warn' ? ' selected' : ''}>Warn</option>
          <option value="block"${e.mode === 'block' ? ' selected' : ''}>Block</option>
        </select>
        <button type="button" class="settings-block-remove" aria-label="Remove ${escapeHtml(e.label)}">×</button>
      </div>`,
    )
    .join('');
}

export function renderPanelSettings(ctx: PanelSettingsContext): string {
  const capOptions = capDurationOptions(ctx.cap.durationMinutes)
    .map(
      (o) =>
        `<option value="${o.minutes}"${ctx.cap.durationMinutes === o.minutes ? ' selected' : ''}>${escapeHtml(o.label)}</option>`,
    )
    .join('');

  const riskSegments = RISK_OPTIONS.map(
    (o) =>
      `<button type="button" class="settings-segment${ctx.riskProfile === o.id ? ' settings-segment--active' : ''}" data-risk="${o.id}">${o.label}</button>`,
  ).join('');

  const stakeChips = STAKE_CATEGORY_BLOCKS.map((c) => {
    const active = stakeCategoryActive(ctx.gameExclusions, c.id);
    return `<button type="button" class="settings-chip${active ? ' settings-chip--active' : ''}" data-stake-cat="${c.id}">${escapeHtml(c.label)}</button>`;
  }).join('');

  return `
    <header class="settings-header">
      <button type="button" class="settings-back" id="tc-settings-back">← Back</button>
      <span class="settings-title">Quick settings</span>
    </header>
    <div class="settings-body">
      <section class="settings-section">
        <p class="settings-section__label">Tilt sensitivity</p>
        <div class="settings-segmented" role="group" aria-label="Tilt sensitivity">${riskSegments}</div>
      </section>

      <section class="settings-section">
        <p class="settings-section__label">Exit line</p>
        <div class="settings-field">
          <label for="tc-cap-minutes">Session cap</label>
          <select id="tc-cap-minutes">${capOptions}</select>
        </div>
        <div class="settings-field">
          <label for="tc-cap-lockout">When tilt hits</label>
          <select id="tc-cap-lockout">
            <option value="friction_first"${ctx.cap.lockoutStyle === 'friction_first' ? ' selected' : ''}>Friction first (countdown)</option>
            <option value="hard_stop"${ctx.cap.lockoutStyle === 'hard_stop' ? ' selected' : ''}>Hard stop (Touch Grass)</option>
          </select>
        </div>
        <label class="settings-check">
          <input type="checkbox" id="tc-cap-snooze"${ctx.cap.snoozeEnabled ? ' checked' : ''} />
          Allow one snooze before lockout
        </label>
        <div class="settings-field">
          <label for="tc-cap-note">Note to future you (optional)</label>
          <textarea id="tc-cap-note" maxlength="140" placeholder="Why am I stopping?">${escapeHtml(ctx.cap.futureMeNote)}</textarea>
        </div>
      </section>

      <section class="settings-section">
        <p class="settings-section__label">Game blocks (${ctx.gameExclusions.length}/${MAX_GAME_EXCLUSIONS})</p>
        <div class="settings-blocks">${renderBlockRows(ctx.gameExclusions)}</div>
        <p class="settings-section__label" style="margin-top:10px">Stake.us categories</p>
        <div class="settings-chips">${stakeChips}</div>
      </section>

      <section class="settings-section">
        <p class="settings-section__label">Other</p>
        <label class="settings-check">
          <input type="checkbox" id="tc-notifications"${ctx.notificationsEnabled ? ' checked' : ''} />
          Notify when tilt spikes
        </label>
        <label class="settings-check">
          <input type="checkbox" id="tc-demo"${ctx.demoMode ? ' checked' : ''} />
          Demo mode (softer enforcement)
        </label>
      </section>

      <p class="settings-status" id="tc-settings-status" role="status" aria-live="polite"></p>
    </div>`;
}

type SettingsWireOptions = {
  ctx: PanelSettingsContext;
  onBack: () => void;
  onSaved: () => void;
};

export function wirePanelSettings(root: HTMLElement, options: SettingsWireOptions): void {
  const { ctx, onBack, onSaved } = options;
  let exclusions = [...ctx.gameExclusions];
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  const statusEl = root.querySelector('#tc-settings-status');
  const setStatus = (text: string) => {
    if (statusEl) statusEl.textContent = text;
  };

  const saveExclusions = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      setStatus('Saving blocks…');
      const result = await pushSettingsToApi(ctx.token, { gameExclusions: exclusions });
      setStatus(result.ok ? 'Blocks saved.' : result.error);
      if (result.ok) onSaved();
    }, 400);
  };

  const saveCap = async (patch: Partial<SessionCapConfig> = {}) => {
    const merged: SessionCapConfig = {
      durationMinutes: Number(
        (root.querySelector('#tc-cap-minutes') as HTMLSelectElement | null)?.value ??
          ctx.cap.durationMinutes,
      ),
      lockoutStyle:
        ((root.querySelector('#tc-cap-lockout') as HTMLSelectElement | null)?.value as
          | LockoutStyle
          | undefined) ?? ctx.cap.lockoutStyle,
      snoozeEnabled:
        (root.querySelector('#tc-cap-snooze') as HTMLInputElement | null)?.checked ??
        ctx.cap.snoozeEnabled,
      futureMeNote:
        (root.querySelector('#tc-cap-note') as HTMLTextAreaElement | null)?.value.trim() ??
        ctx.cap.futureMeNote,
      ...patch,
    };
    setStatus('Saving exit line…');
    const result = await pushSessionCapConfig(ctx.token, merged);
    setStatus(result.ok ? 'Exit line saved.' : result.error);
    if (result.ok) onSaved();
  };

  const savePrefs = async (
    patch: Partial<Pick<SyncedSettings, 'riskProfile' | 'demoMode' | 'notificationsEnabled'>>,
  ) => {
    setStatus('Saving…');
    const result = await pushSettingsToApi(ctx.token, patch);
    setStatus(result.ok ? 'Saved.' : result.error);
    if (result.ok) onSaved();
  };

  root.querySelector('#tc-settings-back')?.addEventListener('click', (e) => {
    e.preventDefault();
    onBack();
  });

  root.querySelectorAll('[data-risk]').forEach((el) => {
    el.addEventListener('click', () => {
      const risk = (el as HTMLElement).dataset.risk as SyncedSettings['riskProfile'];
      root.querySelectorAll('[data-risk]').forEach((seg) => {
        seg.classList.toggle('settings-segment--active', (seg as HTMLElement).dataset.risk === risk);
      });
      void savePrefs({ riskProfile: risk });
    });
  });

  root.querySelector('#tc-cap-minutes')?.addEventListener('change', (e) => {
    const minutes = Number((e.target as HTMLSelectElement).value);
    void saveCap({ durationMinutes: minutes });
  });

  root.querySelector('#tc-cap-lockout')?.addEventListener('change', (e) => {
    const lockoutStyle = (e.target as HTMLSelectElement).value as LockoutStyle;
    void saveCap({ lockoutStyle });
  });

  root.querySelector('#tc-cap-snooze')?.addEventListener('change', (e) => {
    void saveCap({ snoozeEnabled: (e.target as HTMLInputElement).checked });
  });

  root.querySelector('#tc-cap-note')?.addEventListener(
    'change',
    (e) => {
      void saveCap({ futureMeNote: (e.target as HTMLTextAreaElement).value.trim() });
    },
  );

  root.querySelector('#tc-notifications')?.addEventListener('change', (e) => {
    void savePrefs({ notificationsEnabled: (e.target as HTMLInputElement).checked });
  });

  root.querySelector('#tc-demo')?.addEventListener('change', (e) => {
    void savePrefs({ demoMode: (e.target as HTMLInputElement).checked });
  });

  root.querySelectorAll('[data-stake-cat]').forEach((el) => {
    el.addEventListener('click', () => {
      const id = (el as HTMLElement).dataset.stakeCat as StakeCategoryId;
      exclusions = toggleStakeCategory(exclusions, id);
      el.classList.toggle('settings-chip--active', stakeCategoryActive(exclusions, id));
      const blocksEl = root.querySelector('.settings-blocks');
      if (blocksEl) blocksEl.innerHTML = renderBlockRows(exclusions);
      wireBlockRows(root);
      saveExclusions();
    });
  });

  function wireBlockRows(container: ParentNode) {
    container.querySelectorAll('.settings-block-row').forEach((row) => {
      const id = (row as HTMLElement).dataset.blockId;
      if (!id) return;
      row.querySelector('.settings-block-mode')?.addEventListener('change', (e) => {
        const mode = (e.target as HTMLSelectElement).value as GameExclusionMode;
        exclusions = setEntryMode(exclusions, id, mode);
        saveExclusions();
      });
      row.querySelector('.settings-block-remove')?.addEventListener('click', () => {
        exclusions = removeEntry(exclusions, id);
        row.remove();
        if (exclusions.length === 0) {
          const blocksEl = root.querySelector('.settings-blocks');
          if (blocksEl) {
            blocksEl.innerHTML =
              '<p class="settings-empty">No game blocks yet. Toggle a Stake category below.</p>';
          }
        }
        root.querySelectorAll('[data-stake-cat]').forEach((chip) => {
          const catId = (chip as HTMLElement).dataset.stakeCat as StakeCategoryId;
          chip.classList.toggle('settings-chip--active', stakeCategoryActive(exclusions, catId));
        });
        saveExclusions();
      });
    });
  }

  wireBlockRows(root);
}
