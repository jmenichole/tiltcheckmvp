import { webBaseUrl } from './config.js';
import type { TiltIndicator } from './tilt-detector.js';
import type { RiskProfile } from './tilt-detector.js';
import type { GameMatchStatus } from './game-exclusion-watcher.js';
import type { GameExclusionEntry } from '@tiltcheck/shared';
import type { TiltWarningState } from './tilt-warnings.js';

const CHIP_SIZE = 40;
const PANEL_Z = 2147483646;
const MIN_WIDTH = 180;
const MAX_WIDTH = 400;
const MIN_HEIGHT = 200;
const MAX_HEIGHT = 720;
const DEFAULT_WIDTH = 240;
const DEFAULT_HEIGHT = 300;
const DEFAULT_HEIGHT_WITH_AV = 420;

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
  alwaysOn: boolean;
  panelWidth: number;
  panelHeight: number;
  position: { left: number; top: number };
  autoVaultSite: string | null;
};

export type PanelLayoutPatch = {
  alwaysOn?: boolean;
  panelWidth?: number;
  panelHeight?: number;
  expanded?: boolean;
  position?: { left: number; top: number };
};

export type PanelActions = {
  onLogin: () => void;
  onSync: () => void;
  onToggleExpand: () => void;
  onToggleAlwaysOn: () => void;
  onLayoutChange: (layout: PanelLayoutPatch) => void;
  onSaveLockoutMinutes: (minutes: number) => void;
  onAvMountReady: (mount: HTMLElement) => void;
};

const RISK_SHORT: Record<RiskProfile, string> = {
  conservative: 'Conservative',
  moderate: 'Moderate',
  degen: 'Degen',
};

const PAGE_MARGIN_STYLE_ID = 'tiltcheck-page-margin';

function clampWidth(w: number): number {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(w)));
}

function clampHeight(h: number): number {
  return Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(h)));
}

const DEFAULT_POSITION = () => ({
  left: Math.max(8, window.innerWidth - DEFAULT_WIDTH - 16),
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
    return clampPosition(pos.left, pos.top, DEFAULT_WIDTH, DEFAULT_HEIGHT);
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
    'tc_panel_always_on',
    'tc_panel_width',
    'tc_panel_height',
  ]);
  const loggedIn = Boolean(stored.tc_session_token);
  const vaultRules =
    (stored.tc_vault_rules as Array<{ ruleType: string; enabled: boolean; config?: { durationMinutes?: number } }>) ??
    [];
  const cap = vaultRules.find((r) => r.ruleType === 'session_cap' && r.enabled);
  const alwaysOn = stored.tc_panel_always_on === true;
  const position = await loadPanelPosition();

  return {
    loggedIn,
    demoMode: !loggedIn || stored.tc_demo !== false,
    username: stored.tc_username as string | undefined,
    riskProfile: (stored.tc_risk_profile as RiskProfile) ?? 'moderate',
    sessionCapArmed: loggedIn && stored.tc_demo === false && Boolean(cap),
    sessionCapMinutes: cap?.config?.durationMinutes ?? 5,
    gameExclusions: (stored.tc_game_exclusions as GameExclusionEntry[]) ?? [],
    alwaysOn,
    panelWidth: clampWidth(typeof stored.tc_panel_width === 'number' ? stored.tc_panel_width : DEFAULT_WIDTH),
    panelHeight: clampHeight(typeof stored.tc_panel_height === 'number' ? stored.tc_panel_height : DEFAULT_HEIGHT),
    expanded: alwaysOn || stored.tc_panel_expanded === true,
    position,
    gameMatch: { status: 'clear' },
    liveStats: { clicksIn5s: 0, latestIndicator: null },
    tiltWarning: { stage: 0, activeIndicator: null },
    saveStatus: '',
    autoVaultSite: null,
  };
}

export class TiltCheckSidebar {
  private host: HTMLElement;
  private state: PanelState;
  private actions: PanelActions;
  private chipEl: HTMLElement | null = null;
  private panelEl: HTMLElement | null = null;
  private draftLockoutMinutes = 5;
  private drag: {
    pointerId: number;
    startX: number;
    startY: number;
    originLeft: number;
    originTop: number;
    w: number;
    h: number;
  } | null = null;
  private resize: {
    pointerId: number;
    edge: 'left' | 'bottom';
    startX: number;
    startY: number;
    originW: number;
    originH: number;
  } | null = null;
  private avMountEl: HTMLElement | null = null;

  constructor(host: HTMLElement, initial: PanelState, actions: PanelActions) {
    this.host = host;
    this.state = initial;
    this.actions = actions;
    this.draftLockoutMinutes = initial.sessionCapMinutes;
    this.render();
    window.addEventListener('resize', () => this.onWindowResize());
  }

  update(partial: Partial<PanelState>) {
    if (partial.sessionCapMinutes !== undefined) {
      this.draftLockoutMinutes = partial.sessionCapMinutes;
    }
    this.state = { ...this.state, ...partial };
    this.render();
  }

  private onWindowResize() {
    if (this.state.alwaysOn && this.state.expanded) {
      this.syncPageMargin();
      return;
    }
    if (!this.state.expanded) return;
    const pos = clampPosition(
      this.state.position.left,
      this.state.position.top,
      this.state.panelWidth,
      this.state.panelHeight,
    );
    if (pos.left !== this.state.position.left || pos.top !== this.state.position.top) {
      this.state.position = pos;
      this.applyFloatPosition();
      this.actions.onLayoutChange({ position: pos });
    }
  }

  private syncPageMargin() {
    let el = document.getElementById(PAGE_MARGIN_STYLE_ID) as HTMLStyleElement | null;
    if (!this.state.alwaysOn || !this.state.expanded) {
      el?.remove();
      return;
    }
    if (!el) {
      el = document.createElement('style');
      el.id = PAGE_MARGIN_STYLE_ID;
      document.head.appendChild(el);
    }
    el.textContent = `html { margin-right: ${this.state.panelWidth}px !important; transition: margin-right .12s ease; }`;
  }

  private applyFloatPosition() {
    const target = this.state.expanded ? this.panelEl : this.chipEl;
    if (!target || this.state.alwaysOn) return;
    target.style.left = `${this.state.position.left}px`;
    target.style.top = `${this.state.position.top}px`;
    target.style.right = 'auto';
  }

  private applyPinnedLayout() {
    if (!this.panelEl) return;
    this.panelEl.style.display = 'flex';
    this.panelEl.style.flexDirection = 'column';
    this.panelEl.style.left = 'auto';
    this.panelEl.style.top = '0';
    this.panelEl.style.right = '0';
    this.panelEl.style.width = `${this.state.panelWidth}px`;
    this.panelEl.style.height = '100vh';
    this.panelEl.style.maxHeight = '100vh';
    this.panelEl.style.borderRadius = '0';
    this.syncPageMargin();
  }

  private applyPanelSize() {
    if (!this.panelEl || this.state.alwaysOn) return;
    this.panelEl.style.width = `${this.state.panelWidth}px`;
    this.panelEl.style.height = `${this.state.panelHeight}px`;
    this.panelEl.style.display = 'flex';
    this.panelEl.style.flexDirection = 'column';
  }

  private attachDrag(el: HTMLElement, handle: HTMLElement, width: number, height: number) {
    handle.style.cursor = 'grab';
    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || this.state.alwaysOn) return;
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
      this.applyFloatPosition();
    });
    const end = (e: PointerEvent) => {
      if (!this.drag || e.pointerId !== this.drag.pointerId) return;
      handle.releasePointerCapture(e.pointerId);
      this.actions.onLayoutChange({ position: this.state.position });
      this.drag = null;
    };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }

  private attachResize(panel: HTMLElement) {
    const leftHandle = panel.querySelector('[data-tc-resize-left]') as HTMLElement | null;
    const bottomHandle = panel.querySelector('[data-tc-resize-bottom]') as HTMLElement | null;

    const onMove = (e: PointerEvent) => {
      if (!this.resize || e.pointerId !== this.resize.pointerId) return;
      if (this.resize.edge === 'left' && this.state.alwaysOn) {
        const dw = this.resize.startX - e.clientX;
        const w = clampWidth(this.resize.originW + dw);
        this.state.panelWidth = w;
        this.applyPinnedLayout();
      } else if (this.resize.edge === 'bottom' && !this.state.alwaysOn) {
        const dh = e.clientY - this.resize.startY;
        const h = clampHeight(this.resize.originH + dh);
        this.state.panelHeight = h;
        this.applyPanelSize();
      }
    };

    const end = (e: PointerEvent) => {
      if (!this.resize || e.pointerId !== this.resize.pointerId) return;
      this.actions.onLayoutChange({
        panelWidth: this.state.panelWidth,
        panelHeight: this.state.panelHeight,
      });
      this.resize = null;
    };

    const arm = (edge: 'left' | 'bottom', el: HTMLElement) => {
      el.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        this.resize = {
          pointerId: e.pointerId,
          edge,
          startX: e.clientX,
          startY: e.clientY,
          originW: this.state.panelWidth,
          originH: this.state.panelHeight,
        };
        el.setPointerCapture(e.pointerId);
      });
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
    };

    if (leftHandle && this.state.alwaysOn) arm('left', leftHandle);
    if (bottomHandle && !this.state.alwaysOn) arm('bottom', bottomHandle);
  }

  private alertLine(): string {
    const { gameMatch, tiltWarning } = this.state;
    if (gameMatch.status === 'warn') {
      return `<span style="color:#ff8a72;font-weight:600">${gameMatch.label} · ${gameMatch.countdownSec ?? '?'}s</span>`;
    }
    if (gameMatch.status === 'demo-banner') {
      return `<span style="color:#8a97a8">Demo · ${gameMatch.label ?? 'game'}</span>`;
    }
    if (gameMatch.status === 'blocked') {
      return `<span style="color:#ff5c5c;font-weight:600">Locked · ${gameMatch.label ?? 'game'}</span>`;
    }
    if (tiltWarning.activeIndicator && tiltWarning.stage > 0) {
      const color = tiltWarning.stage >= 2 ? '#ff8a72' : '#5eead4';
      const label = tiltWarning.stage >= 2 ? 'Last call' : 'Pulse check';
      return `<span style="color:${color};font-weight:600">${label}</span>`;
    }
    const ind = this.state.liveStats.latestIndicator;
    if (ind && (ind.severity === 'high' || ind.severity === 'critical')) {
      const color = ind.severity === 'critical' ? '#ff5c5c' : '#5eead4';
      return `<span style="color:${color}">${this.state.liveStats.clicksIn5s} clk · heating up</span>`;
    }
    return '<span style="color:#4b5563">All clear</span>';
  }

  private render() {
    this.host.innerHTML = '';
    const baseStyle =
      'position:fixed;z-index:' +
      PANEL_Z +
      ';font:12px/1.35 system-ui,-apple-system,sans-serif;color:#e6e6e6;user-select:none;touch-action:none';

    if (!this.state.expanded) {
      document.getElementById(PAGE_MARGIN_STYLE_ID)?.remove();
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.title = 'TiltCheck';
      chip.style.cssText =
        baseStyle +
        `;width:${CHIP_SIZE}px;height:${CHIP_SIZE}px;border-radius:50%;border:1px solid rgba(23,195,178,.45);background:#0a0c10;color:#17c3b2;font:700 11px/1 ui-monospace,monospace;box-shadow:0 4px 16px rgba(0,0,0,.35);padding:0;cursor:pointer`;
      chip.textContent = 'TC';
      chip.addEventListener('click', () => this.actions.onToggleExpand());
      this.chipEl = chip;
      this.panelEl = null;
      this.host.appendChild(chip);
      this.applyFloatPosition();
      this.attachDrag(chip, chip, CHIP_SIZE, CHIP_SIZE);
      return;
    }

    const pinned = this.state.alwaysOn;
    const panel = document.createElement('div');
    panel.style.cssText =
      baseStyle +
      `;background:#0a0c10;border:1px solid rgba(23,195,178,.3);box-shadow:${pinned ? 'none' : '0 8px 28px rgba(0,0,0,.45)'};overflow:hidden;box-sizing:border-box`;

    if (pinned) {
      panel.style.borderRadius = '0';
      panel.style.borderRight = 'none';
      panel.style.borderTop = 'none';
      panel.style.borderBottom = 'none';
    } else {
      panel.style.borderRadius = '10px';
      panel.style.width = `${this.state.panelWidth}px`;
      panel.style.height = `${this.state.panelHeight}px`;
      panel.style.display = 'flex';
      panel.style.flexDirection = 'column';
    }

    const pinActive = pinned ? 'color:#17c3b2;border-color:rgba(23,195,178,.6)' : 'color:#6b7280;border-color:rgba(107,114,128,.4)';

    const header = document.createElement('div');
    header.style.cssText = pinned
      ? 'display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:rgba(23,195,178,.08);border-bottom:1px solid rgba(23,195,178,.2);flex-shrink:0'
      : 'display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:rgba(23,195,178,.08);border-bottom:1px solid rgba(23,195,178,.2);cursor:grab;flex-shrink:0';
    header.innerHTML = `
      <strong data-tc-drag-handle style="font-size:12px;color:#17c3b2">TC</strong>
      <div style="display:flex;gap:4px" data-tc-no-drag>
        <button type="button" data-tc-pin title="Pin right (shrink page)" style="background:transparent;border:1px solid;${pinActive};cursor:pointer;font-size:11px;line-height:1;padding:2px 6px;border-radius:4px">Pin</button>
        <button type="button" data-tc-minimize title="Minimize" style="background:transparent;border:none;color:#9ca3af;cursor:pointer;font-size:15px;line-height:1;padding:2px 6px">−</button>
      </div>`;

    const userLine = this.state.loggedIn
      ? `@${this.state.username ?? 'player'}`
      : '<button type="button" data-tc-login style="background:transparent;border:none;color:#17c3b2;cursor:pointer;padding:0;font:inherit">Connect</button>';

    const armed = this.state.sessionCapArmed
      ? `Armed ${this.state.sessionCapMinutes}m`
      : 'Lockout off';
    const demo = this.state.demoMode ? ' · Demo' : '';
    const sens = RISK_SHORT[this.state.riskProfile];

    const body = document.createElement('div');
    body.style.cssText = 'padding:8px 10px 10px;display:flex;flex-direction:column;gap:8px;flex:1;min-height:0;overflow-y:auto';

    body.innerHTML = `
      <div style="font-size:11px;line-height:1.5">
        <div>${userLine} · ${sens}${demo}</div>
        <div style="color:#9ca3af">${armed} · ${this.state.gameExclusions.length} blocks</div>
        <div style="margin-top:4px">${this.alertLine()}</div>
      </div>
      <div data-tc-no-drag style="font-size:10px;color:#6b7280;line-height:1.45;padding:6px 8px;background:#12161e;border-radius:6px;border:1px solid rgba(30,37,51,.8)">
        <div><span style="color:#5eead4">Tilt</span> — pulse check → last call → Touch Grass</div>
        <div><span style="color:#5eead4">Blocks</span> — edit on Web → Sync here</div>
        <div><span style="color:#5eead4">Lockout</span> — arms when connected, demo off</div>
      </div>
      <div data-tc-no-drag style="display:flex;gap:6px;align-items:center">
        <input type="number" data-tc-lockout-min min="1" max="60" value="${this.draftLockoutMinutes}" ${this.state.loggedIn ? '' : 'disabled'} title="Touch Grass lockout length (minutes)" style="width:48px;padding:4px 6px;border-radius:6px;border:1px solid rgba(23,195,178,.35);background:#12161e;color:#e6e6e6;font:inherit" />
        <span style="color:#6b7280;font-size:10px">min lock</span>
        <button type="button" data-tc-save-lockout style="margin-left:auto;padding:4px 8px;border-radius:6px;border:1px solid rgba(23,195,178,.35);background:transparent;color:#17c3b2;cursor:pointer;font:inherit;font-size:10px" ${this.state.loggedIn ? '' : 'disabled'}>Save</button>
      </div>
      <div data-tc-no-drag style="display:flex;gap:6px">
        <button type="button" data-tc-sync style="flex:1;padding:6px 8px;border-radius:6px;border:1px solid rgba(23,195,178,.35);background:#17c3b2;color:#0a0c10;cursor:pointer;font:inherit;font-size:11px;font-weight:600">Sync</button>
        <button type="button" data-tc-settings-more style="padding:6px 8px;border-radius:6px;border:1px solid rgba(23,195,178,.2);background:transparent;color:#9ca3af;cursor:pointer;font:inherit;font-size:10px">Web</button>
      </div>
      ${this.state.saveStatus ? `<p data-tc-no-drag style="margin:0;font-size:10px;color:#6b7280">${this.state.saveStatus}</p>` : ''}
    `;

    if (this.state.autoVaultSite) {
      const avWrap = document.createElement('div');
      avWrap.setAttribute('data-tc-no-drag', '1');
      avWrap.style.cssText =
        'border-top:1px solid rgba(23,195,178,.2);padding-top:8px;margin-top:2px;flex-shrink:0';
      if (!this.avMountEl) {
        this.avMountEl = document.createElement('div');
        this.avMountEl.id = 'tc-panel-av-mount';
        this.actions.onAvMountReady(this.avMountEl);
      }
      avWrap.appendChild(this.avMountEl);
      body.appendChild(avWrap);
    }

    if (pinned) {
      const resizeLeft = document.createElement('div');
      resizeLeft.setAttribute('data-tc-resize-left', '1');
      resizeLeft.style.cssText =
        'position:absolute;left:0;top:0;bottom:0;width:6px;cursor:ew-resize;z-index:2';
      resizeLeft.title = 'Resize';
      panel.appendChild(resizeLeft);
    } else {
      const resizeBottom = document.createElement('div');
      resizeBottom.setAttribute('data-tc-resize-bottom', '1');
      resizeBottom.style.cssText =
        'position:absolute;left:0;right:0;bottom:0;height:6px;cursor:ns-resize;z-index:2';
      resizeBottom.title = 'Resize';
      panel.appendChild(resizeBottom);
    }

    panel.appendChild(header);
    panel.appendChild(body);
    panel.style.position = 'fixed';
    this.panelEl = panel;
    this.chipEl = null;
    this.host.appendChild(panel);

    if (pinned) {
      this.applyPinnedLayout();
    } else {
      this.applyPanelSize();
      this.applyFloatPosition();
      const dragHandle = header.querySelector('[data-tc-drag-handle]') as HTMLElement | null;
      if (dragHandle) {
        this.attachDrag(panel, dragHandle, this.state.panelWidth, this.state.panelHeight);
      }
    }
    this.attachResize(panel);
    this.syncPageMargin();

    header.querySelector('[data-tc-minimize]')?.addEventListener('pointerdown', (e) => e.stopPropagation());
    header.querySelector('[data-tc-minimize]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.actions.onToggleExpand();
    });
    header.querySelector('[data-tc-pin]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.actions.onToggleAlwaysOn();
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

  destroy() {
    document.getElementById(PAGE_MARGIN_STYLE_ID)?.remove();
    this.host.innerHTML = '';
  }
}
