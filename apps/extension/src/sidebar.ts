import { webBaseUrl } from './config.js';
import type { TiltIndicator } from './tilt-detector.js';
import type { RiskProfile } from './tilt-detector.js';
import type { GameMatchStatus } from './game-exclusion-watcher.js';
import type { GameExclusionEntry } from '@tiltcheck/shared';
import type { TiltWarningState } from './tilt-warnings.js';

const CHIP_SIZE = 40;
const PANEL_Z = 2147483646;
export type GameMatchInfo = {
  status: GameMatchStatus;
  label?: string;
  countdownSec?: number;
};

export type LiveStats = {
  clicksIn5s: number;
  latestIndicator: TiltIndicator | null;
};

export type PanelState = {
  loggedIn: boolean;
  demoMode: boolean;
  username?: string;
  riskProfile: RiskProfile;
  sessionCapArmed: boolean;
  sessionCapMinutes: number;
  gameExclusions: GameExclusionEntry[];
  gameMatch: GameMatchInfo;
  liveStats: LiveStats;
  tiltWarning: TiltWarningState;
  saveStatus: string;
  expanded: boolean;
  position: { left: number; top: number };
};

export type PanelActions = {
  onLogin: () => void;
  onSync: () => void;
  onToggleExpand: () => void;
  onPositionChange: (pos: { left: number; top: number }) => void;
  onSaveLockoutMinutes: (minutes: number) => void;
};

const RISK_LABELS: Record<RiskProfile, string> = {
  conservative: 'Conservative',
  moderate: 'Moderate',
  degen: 'Degen',
};

const DEFAULT_POSITION = () => ({
  left: Math.max(8, window.innerWidth - CHIP_SIZE - 16),
  top: Math.max(8, window.innerHeight - CHIP_SIZE - 16),
});

function clampPosition(left: number, top: number, width: number, height: number) {
  const maxLeft = Math.max(8, window.innerWidth - width - 8);
  const maxTop = Math.max(8, window.innerHeight - height - 8);
  return {
    left: Math.min(Math.max(8, left), maxLeft),
    top: Math.min(Math.max(8, top), maxTop),
  };
}

export async function loadPanelPosition(): Promise<{ left: number; top: number }> {
  const stored = await chrome.storage.local.get(['tc_panel_position']);
  const pos = stored.tc_panel_position as { left?: number; top?: number } | undefined;
  if (typeof pos?.left === 'number' && typeof pos?.top === 'number') {
    return clampPosition(pos.left, pos.top, CHIP_SIZE, CHIP_SIZE);
  }
  return DEFAULT_POSITION();
}

export async function loadInitialPanelState(): Promise<Partial<PanelState>> {
  const stored = await chrome.storage.local.get([
    'tc_demo',
    'tc_username',
    'tc_session_token',
    'tc_risk_profile',
    'tc_vault_rules',
    'tc_game_exclusions',
    'tc_panel_expanded',
  ]);
  const loggedIn = Boolean(stored.tc_session_token);
  const vaultRules = (stored.tc_vault_rules as Array<{ ruleType: string; enabled: boolean; config?: { durationMinutes?: number } }>) ?? [];
  const cap = vaultRules.find((r) => r.ruleType === 'session_cap' && r.enabled);
  const position = await loadPanelPosition();

  return {
    loggedIn,
    demoMode: !loggedIn || stored.tc_demo !== false,
    username: stored.tc_username as string | undefined,
    riskProfile: (stored.tc_risk_profile as RiskProfile) ?? 'moderate',
    sessionCapArmed: loggedIn && stored.tc_demo === false && Boolean(cap),
    sessionCapMinutes: cap?.config?.durationMinutes ?? 5,
    gameExclusions: (stored.tc_game_exclusions as GameExclusionEntry[]) ?? [],
    expanded: stored.tc_panel_expanded === true,
    position,
    gameMatch: { status: 'clear' },
    liveStats: { clicksIn5s: 0, latestIndicator: null },
    tiltWarning: { stage: 0, activeIndicator: null },
    saveStatus: '',
  };
}

export class TiltCheckSidebar {
  private host: HTMLElement;
  private state: PanelState;
  private actions: PanelActions;
  private chipEl: HTMLElement | null = null;
  private panelEl: HTMLElement | null = null;
  private draftLockoutMinutes = 5;
  private drag: { pointerId: number; startX: number; startY: number; originLeft: number; originTop: number; w: number; h: number } | null =
    null;

  constructor(host: HTMLElement, initial: PanelState, actions: PanelActions) {
    this.host = host;
    this.state = initial;
    this.actions = actions;
    this.draftLockoutMinutes = initial.sessionCapMinutes;
    this.render();
    window.addEventListener('resize', () => this.clampAndMove());
  }

  update(partial: Partial<PanelState>) {
    if (partial.sessionCapMinutes !== undefined) {
      this.draftLockoutMinutes = partial.sessionCapMinutes;
    }
    this.state = { ...this.state, ...partial };
    this.render();
  }

  private clampAndMove() {
    const w = this.state.expanded ? 280 : CHIP_SIZE;
    const h = this.state.expanded ? 380 : CHIP_SIZE;
    const pos = clampPosition(this.state.position.left, this.state.position.top, w, h);
    if (pos.left !== this.state.position.left || pos.top !== this.state.position.top) {
      this.state.position = pos;
      this.applyPosition();
      this.actions.onPositionChange(pos);
    }
  }

  private applyPosition() {
    const target = this.state.expanded ? this.panelEl : this.chipEl;
    if (!target) return;
    target.style.left = `${this.state.position.left}px`;
    target.style.top = `${this.state.position.top}px`;
  }

  private attachDrag(el: HTMLElement, handle: HTMLElement, width: number, height: number) {
    handle.style.cursor = 'grab';
    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest('[data-tc-no-drag]')) return;
      this.drag = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originLeft: this.state.position.left,
        originTop: this.state.position.top,
        w: width,
        h: height,
      };
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    handle.addEventListener('pointermove', (e) => {
      if (!this.drag || e.pointerId !== this.drag.pointerId) return;
      const dx = e.clientX - this.drag.startX;
      const dy = e.clientY - this.drag.startY;
      const pos = clampPosition(this.drag.originLeft + dx, this.drag.originTop + dy, this.drag.w, this.drag.h);
      this.state.position = pos;
      this.applyPosition();
    });
    const end = (e: PointerEvent) => {
      if (!this.drag || e.pointerId !== this.drag.pointerId) return;
      handle.releasePointerCapture(e.pointerId);
      this.actions.onPositionChange(this.state.position);
      this.drag = null;
    };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }

  private gameMatchHtml(): string {
    const { gameMatch } = this.state;
    if (gameMatch.status === 'clear') {
      return '<span style="color:#6b7280">No excluded game detected</span>';
    }
    if (gameMatch.status === 'demo-banner') {
      return `<span style="color:#f59e0b">Demo: would block ${gameMatch.label ?? 'game'}</span>`;
    }
    if (gameMatch.status === 'warn') {
      return `<span style="color:#ff4a4a;font-weight:700">⚠ ${gameMatch.label} — leave in ${gameMatch.countdownSec ?? '?'}s</span>`;
    }
    if (gameMatch.status === 'blocked') {
      return `<span style="color:#ff4a4a;font-weight:700">Blocked: ${gameMatch.label ?? 'game'}</span>`;
    }
    return '';
  }

  private indicatorHtml(): string {
    const ind = this.state.liveStats.latestIndicator;
    if (!ind) return '<span style="color:#6b7280">None</span>';
    const color =
      ind.severity === 'critical' ? '#ff4a4a' : ind.severity === 'high' ? '#f59e0b' : '#17c3b2';
    return `<span style="color:${color}">${ind.type} · ${ind.severity}</span>`;
  }

  private tiltWarningHtml(): string {
    const { tiltWarning } = this.state;
    if (!tiltWarning.activeIndicator || tiltWarning.stage === 0) {
      return '<span style="color:#6b7280">No active warnings</span>';
    }
    const color = tiltWarning.stage >= 2 ? '#ff4a4a' : '#f59e0b';
    return `<span style="color:${color}">Stage ${tiltWarning.stage}: ${tiltWarning.activeIndicator.description}</span>`;
  }

  private render() {
    this.host.innerHTML = '';
    const baseStyle =
      'position:fixed;z-index:' +
      PANEL_Z +
      ';font:12px/1.4 system-ui,-apple-system,sans-serif;color:#e6e6e6;user-select:none;touch-action:none';

    if (!this.state.expanded) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.title = 'TiltCheck — click to expand';
      chip.style.cssText =
        baseStyle +
        `;width:${CHIP_SIZE}px;height:${CHIP_SIZE}px;border-radius:50%;border:1px solid rgba(23,195,178,.45);background:#0a0c10;color:#17c3b2;font:700 11px/1 ui-monospace,monospace;box-shadow:0 4px 16px rgba(0,0,0,.35);padding:0;cursor:pointer`;
      chip.textContent = 'TC';
      chip.addEventListener('click', () => this.actions.onToggleExpand());
      chip.addEventListener('dblclick', (e) => {
        e.preventDefault();
      });
      this.chipEl = chip;
      this.panelEl = null;
      this.host.appendChild(chip);
      this.applyPosition();
      this.attachDrag(chip, chip, CHIP_SIZE, CHIP_SIZE);
      return;
    }

    const panel = document.createElement('div');
    panel.style.cssText =
      baseStyle +
      ';width:280px;background:#0a0c10;border:1px solid rgba(23,195,178,.3);border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.45);overflow:hidden';

    const header = document.createElement('div');
    header.style.cssText =
      'display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:rgba(23,195,178,.08);border-bottom:1px solid rgba(23,195,178,.2);cursor:grab';
    header.innerHTML =
      '<strong data-tc-drag-handle style="font-size:13px;color:#17c3b2">TiltCheck</strong><button type="button" data-tc-minimize data-tc-no-drag style="background:transparent;border:none;color:#9ca3af;cursor:pointer;font-size:16px;line-height:1;padding:2px 6px">−</button>';

    const body = document.createElement('div');
    body.style.cssText = 'padding:10px 12px 12px;display:flex;flex-direction:column;gap:8px;max-height:340px;overflow-y:auto';

    const account = this.state.loggedIn
      ? `Hi, <strong>${this.state.username ?? 'player'}</strong>`
      : 'Not connected — <button type="button" data-tc-login data-tc-no-drag style="background:transparent;border:none;color:#17c3b2;cursor:pointer;padding:0;font:inherit;text-decoration:underline">Connect Discord</button>';

    const protection = [
      `Tilt sensitivity: <strong>${RISK_LABELS[this.state.riskProfile]}</strong>`,
      `Touch Grass lockout: ${
        this.state.sessionCapArmed
          ? `<strong>armed (${this.state.sessionCapMinutes} min tab lock)</strong>`
          : '<span style="color:#6b7280">not armed — set lockout time below</span>'
      }`,
      this.state.demoMode ? '<span style="color:#f59e0b">Demo mode — warnings only</span>' : '',
      '<span style="color:#6b7280;font-size:10px;line-height:1.4;display:block;margin-top:2px">Tab lock when tilt or blocked games hit — not your casino balance vault.</span>',
    ]
      .filter(Boolean)
      .join('<br/>');

    const blockCount = this.state.gameExclusions.length;
    const gameBlocksSection = this.state.loggedIn
      ? `<strong>${blockCount}</strong> active — <button type="button" data-tc-settings-more data-tc-no-drag style="background:transparent;border:none;color:#17c3b2;cursor:pointer;padding:0;font:inherit;text-decoration:underline">Edit on web</button><br/><span style="color:#6b7280;font-size:10px;line-height:1.4">Save blocks in Settings, then tap Refresh rules.</span>`
      : '<span style="color:#6b7280">Connect Discord, set blocks on web, then Refresh rules.</span>';

    const warnBanner =
      this.state.gameMatch.status === 'warn' || this.state.gameMatch.status === 'demo-banner'
        ? `<div style="padding:8px 10px;border-radius:6px;background:rgba(255,74,74,.12);border:1px solid rgba(255,74,74,.35);margin-bottom:4px">${this.gameMatchHtml()}</div>`
        : '';

    body.innerHTML = `
      ${warnBanner}
      <section><div style="font:700 9px/1 ui-monospace,monospace;letter-spacing:.12em;color:#6b7280;text-transform:uppercase;margin-bottom:4px">Account</div>${account}</section>
      <section><div style="font:700 9px/1 ui-monospace,monospace;letter-spacing:.12em;color:#6b7280;text-transform:uppercase;margin-bottom:4px">Protection</div>${protection}</section>
      <section data-tc-no-drag>
        <div style="font:700 9px/1 ui-monospace,monospace;letter-spacing:.12em;color:#6b7280;text-transform:uppercase;margin-bottom:4px">Lockout time</div>
        <div style="display:flex;gap:6px;align-items:center">
          <input type="number" data-tc-lockout-min min="1" max="60" value="${this.draftLockoutMinutes}" ${this.state.loggedIn ? '' : 'disabled'} style="width:56px;padding:4px 6px;border-radius:6px;border:1px solid rgba(23,195,178,.35);background:#12161e;color:#e6e6e6;font:inherit" />
          <span style="color:#9ca3af;font-size:11px">min tab lock</span>
          <button type="button" data-tc-save-lockout style="margin-left:auto;padding:4px 8px;border-radius:6px;border:1px solid rgba(23,195,178,.35);background:transparent;color:#17c3b2;cursor:pointer;font:inherit;font-size:11px" ${this.state.loggedIn ? '' : 'disabled'}>Save</button>
        </div>
      </section>
      <section><div style="font:700 9px/1 ui-monospace,monospace;letter-spacing:.12em;color:#6b7280;text-transform:uppercase;margin-bottom:4px">Game blocks</div>${gameBlocksSection}</section>
      <section><div style="font:700 9px/1 ui-monospace,monospace;letter-spacing:.12em;color:#6b7280;text-transform:uppercase;margin-bottom:4px">Game match</div>${this.gameMatchHtml()}</section>
      <section><div style="font:700 9px/1 ui-monospace,monospace;letter-spacing:.12em;color:#6b7280;text-transform:uppercase;margin-bottom:4px">Tilt warnings</div>${this.tiltWarningHtml()}</section>
      <section><div style="font:700 9px/1 ui-monospace,monospace;letter-spacing:.12em;color:#6b7280;text-transform:uppercase;margin-bottom:4px">Live stats</div>
        Clicks (5s): <strong>${this.state.liveStats.clicksIn5s}</strong><br/>
        Latest: ${this.indicatorHtml()}
      </section>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">
        <button type="button" data-tc-sync data-tc-no-drag style="flex:1;min-width:90px;padding:6px 8px;border-radius:6px;border:1px solid rgba(23,195,178,.35);background:#17c3b2;color:#0a0c10;cursor:pointer;font:inherit;font-size:11px;font-weight:600" title="Pull game blocks (from web settings) and lockout rules from your account">Refresh rules</button>
      </div>
      ${this.state.saveStatus ? `<p data-tc-no-drag style="margin:4px 0 0;font-size:11px;color:#9ca3af">${this.state.saveStatus}</p>` : ''}
    `;

    panel.appendChild(header);
    panel.appendChild(body);
    this.panelEl = panel;
    this.chipEl = null;
    this.host.appendChild(panel);
    this.applyPosition();

    const dragHandle = header.querySelector('[data-tc-drag-handle]') as HTMLElement | null;
    if (dragHandle) this.attachDrag(panel, dragHandle, 280, 380);

    const minimizeBtn = header.querySelector('[data-tc-minimize]');
    minimizeBtn?.addEventListener('pointerdown', (e) => e.stopPropagation());
    minimizeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.actions.onToggleExpand();
    });

    body.querySelector('[data-tc-login]')?.addEventListener('click', () => this.actions.onLogin());
    body.querySelector('[data-tc-settings-more]')?.addEventListener('click', () => {
      window.open(`${webBaseUrl()}/settings#game-exclusion`, '_blank');
    });
    body.querySelector('[data-tc-sync]')?.addEventListener('click', () => this.actions.onSync());

    body.querySelector('[data-tc-lockout-min]')?.addEventListener('input', (e) => {
      const val = Number((e.target as HTMLInputElement).value);
      if (Number.isFinite(val)) this.draftLockoutMinutes = val;
    });

    body.querySelector('[data-tc-save-lockout]')?.addEventListener('click', () => {
      this.actions.onSaveLockoutMinutes(this.draftLockoutMinutes);
    });

  }
}
