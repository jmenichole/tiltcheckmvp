import type { AutoVaultConfig, AutoVaultSite, StatusType, VaultEngine } from './types.js';
import { webBaseUrl } from '../config.js';
import type { createSessionWatch } from './session-watch.js';

const BRAND = {
  teal: '#17c3b2',
  danger: '#ef4444',
  bgCard: '#12161e',
  text: '#ffffff',
  muted: '#8a97a8',
  border: '#1e2533',
  font: '"Inter", "Segoe UI", Roboto, system-ui, sans-serif',
};

type SessionWatch = ReturnType<typeof createSessionWatch>;

export type AutoVaultUiApi = {
  render: () => void;
  destroy: () => void;
  setStatus: (message: string, type?: StatusType) => void;
};

export type AutoVaultUiOptions = {
  mount: HTMLElement;
  site: AutoVaultSite;
  engine: VaultEngine;
  sessionWatch: SessionWatch;
  config: AutoVaultConfig;
  onboarded: boolean;
  lastRunning: boolean;
  onConfigChange: (config: AutoVaultConfig) => void;
  onEngineStart: () => void;
  onEngineStop: (clearLast: boolean) => void;
  onEngineKill: () => void;
  onOnboardComplete: () => void;
  onResetOnboarding: () => void;
  onStatus: (message: string, type?: StatusType) => void;
};

const STYLE_ID = 'tc-av-embed-styles';

export function mountAutoVaultUi(options: AutoVaultUiOptions): AutoVaultUiApi {
  let config = { ...options.config };
  let drawerOpen = false;
  let statusMessage = 'Ready — flip ON when you\'re in.';
  let statusType: StatusType = 'info';

  const mount = options.mount;
  mount.innerHTML = '';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
        #tc-panel-av-mount {
            display: flex; flex-direction: column; gap: 8px;
            font-family: ${BRAND.font}; font-size: 12px; color: ${BRAND.text};
        }
        #tc-panel-av-mount .tc-av-head {
            display: flex; align-items: center; justify-content: space-between; gap: 6px;
        }
        #tc-panel-av-mount .tc-av-title { font-weight: 700; font-size: 11px; color: ${BRAND.teal}; letter-spacing: .04em; }
        #tc-panel-av-mount .tc-av-site { font-size: 10px; color: ${BRAND.muted}; font-weight: 500; }
        #tc-panel-av-mount .tc-av-hint { margin: 0; font-size: 10px; color: #6b7280; line-height: 1.45; }
        #tc-panel-av-mount .tc-icon-btn {
            background: transparent; border: 1px solid ${BRAND.border}; color: ${BRAND.muted};
            width: 26px; height: 26px; border-radius: 6px; cursor: pointer; font-size: 13px; line-height: 1;
        }
        #tc-panel-av-mount .tc-icon-btn:hover { color: ${BRAND.text}; border-color: ${BRAND.teal}; }
        #tc-panel-av-mount .tc-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        #tc-panel-av-mount .tc-label { color: ${BRAND.muted}; font-size: 11px; }
        #tc-panel-av-mount .tc-field-hint { font-size: 9px; color: #4b5563; margin-top: 2px; }
        #tc-panel-av-mount input[type="number"] {
            width: 64px; padding: 4px 6px; border-radius: 6px; border: 1px solid ${BRAND.border};
            background: #080a0d; color: ${BRAND.text}; text-align: right; font-size: 12px;
        }
        #tc-panel-av-mount input[type="checkbox"] { accent-color: ${BRAND.teal}; width: 14px; height: 14px; }
        #tc-panel-av-mount .tc-tip-row { font-size: 10px; color: ${BRAND.muted}; line-height: 1.35; gap: 6px; align-items: flex-start; }
        #tc-panel-av-mount .tc-master {
            width: 100%; min-height: 40px; border: none; border-radius: 8px; font-weight: 800;
            font-size: 13px; letter-spacing: 0.04em; cursor: pointer;
        }
        #tc-panel-av-mount .tc-master.off { background: ${BRAND.border}; color: ${BRAND.muted}; }
        #tc-panel-av-mount .tc-master.on { background: ${BRAND.teal}; color: #041210; }
        #tc-panel-av-mount .tc-stat { font-size: 11px; color: ${BRAND.teal}; font-weight: 600; }
        #tc-panel-av-mount .tc-wager { font-size: 10px; color: ${BRAND.muted}; line-height: 1.35; font-family: ui-monospace, monospace; }
        #tc-panel-av-mount .tc-status {
            font-size: 11px; color: #e6e6e6; line-height: 1.4; word-break: break-word;
            padding: 6px 8px; border-radius: 6px; background: #080a0d; border: 1px solid ${BRAND.border};
        }
        #tc-panel-av-mount .tc-status.success { color: #5eead4; border-color: rgba(23,195,178,.45); background: #0a1412; }
        #tc-panel-av-mount .tc-status.warning { color: #ffe8e0; border-color: rgba(255,138,114,.5); background: #1a1210; }
        #tc-panel-av-mount .tc-status.error { color: #ffb4b4; border-color: rgba(239,68,68,.55); background: #1a0e0e; }
        #tc-panel-av-mount .tc-status.profit, #tc-panel-av-mount .tc-status.bigwin { color: #5eead4; border-color: rgba(23,195,178,.4); background: #0a1412; }
        #tc-panel-av-mount .tc-status .tc-time { color: #6b7280; margin-right: 4px; }
        #tc-panel-av-mount .tc-btn-primary {
            width: 100%; min-height: 38px; border: none; border-radius: 8px; font-weight: 700;
            background: ${BRAND.teal}; color: #041210; cursor: pointer; font-size: 12px;
        }
        #tc-panel-av-mount .tc-drawer { max-height: 0; overflow: hidden; transition: max-height 0.25s ease; }
        #tc-panel-av-mount .tc-drawer.open { max-height: 480px; border-top: 1px solid ${BRAND.border}; padding-top: 8px; }
        #tc-panel-av-mount .tc-drawer-inner { display: flex; flex-direction: column; gap: 8px; }
        #tc-panel-av-mount .tc-link { color: ${BRAND.teal}; font-size: 10px; text-decoration: none; }
        #tc-panel-av-mount .tc-reset { background: transparent; border: 1px solid ${BRAND.danger}; color: ${BRAND.danger};
            padding: 6px; border-radius: 6px; cursor: pointer; font-size: 10px; }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function settingsHtml(): string {
    const nutsExtra =
      options.site.mode === 'nuts-ws'
        ? `
            <div>
                <div class="tc-row"><span class="tc-label">Min deposit (SOL)</span>
                    <input type="number" id="tc-min-dep" min="0" step="0.0001" value="${config.minDepositSol}"></div>
                <div class="tc-field-hint">Skip skims below this balance floor.</div>
            </div>
            <div class="tc-row tc-tip-row">
                <input type="checkbox" id="tc-auto-tip" ${config.autoTipEnabled ? 'checked' : ''}>
                <label for="tc-auto-tip">Auto-tip 1% on vault withdraw</label>
            </div>`
        : '';
    return `
            <div>
                <div class="tc-row"><span class="tc-label">Skim % of profit</span>
                    <input type="number" id="tc-save" min="0" max="1" step="0.01" value="${config.saveAmount}"></div>
                <div class="tc-field-hint">Share of session profit sent to vault.</div>
            </div>
            <div>
                <div class="tc-row"><span class="tc-label">Heater threshold (×)</span>
                    <input type="number" id="tc-big-t" min="1" step="0.1" value="${config.bigWinThreshold}"></div>
                <div class="tc-field-hint">Win size vs avg bet to count as a heater.</div>
            </div>
            <div>
                <div class="tc-row"><span class="tc-label">Heater multiplier</span>
                    <input type="number" id="tc-big-m" min="1" step="0.1" value="${config.bigWinMultiplier}"></div>
                <div class="tc-field-hint">Extra skim % when you hit that heater.</div>
            </div>
            <div>
                <div class="tc-row"><span class="tc-label">Check interval (sec)</span>
                    <input type="number" id="tc-interval" min="10" step="1" value="${config.checkInterval}"></div>
                <div class="tc-field-hint">How often we peek at profit (min 10s).</div>
            </div>
            ${nutsExtra}`;
  }

  function readSettingsFromDom(root: ParentNode) {
    const g = (id: string) => root.querySelector(id) as HTMLInputElement | null;
    const save = parseFloat(g('#tc-save')?.value ?? '');
    const bigT = parseFloat(g('#tc-big-t')?.value ?? '');
    const bigM = parseFloat(g('#tc-big-m')?.value ?? '');
    const chk = parseInt(g('#tc-interval')?.value ?? '', 10);
    if (!isNaN(save) && save >= 0) config.saveAmount = Math.min(save, 1);
    if (!isNaN(bigT) && bigT >= 1) config.bigWinThreshold = bigT;
    if (!isNaN(bigM) && bigM >= 1) config.bigWinMultiplier = bigM;
    if (!isNaN(chk) && chk >= 10) config.checkInterval = chk;
    if (options.site.mode === 'nuts-ws') {
      const minD = parseFloat(g('#tc-min-dep')?.value ?? '');
      if (!isNaN(minD) && minD >= 0) config.minDepositSol = minD;
      config.autoTipEnabled = !!g('#tc-auto-tip')?.checked;
    }
    options.onConfigChange(config);
  }

  function formatStatusTime() {
    const d = new Date();
    return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':');
  }

  injectStyles();

  const head = document.createElement('div');
  head.className = 'tc-av-head';
  head.innerHTML = `
    <span class="tc-av-title">AutoVault <span class="tc-av-site">· ${options.site.name}</span></span>
    <button type="button" class="tc-icon-btn" id="tc-gear" title="Skim settings">⚙</button>`;

  const hint = document.createElement('p');
  hint.className = 'tc-av-hint';
  hint.textContent = 'Skims green to vault while you play. Hold OFF 0.8s to hard-stop.';

  const body = document.createElement('div');
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.gap = '8px';

  if (!options.onboarded) {
    body.innerHTML =
      settingsHtml() +
      `<p class="tc-av-hint">Set your skim once — we remember it on this site.</p>` +
      `<button type="button" class="tc-btn-primary" id="tc-start-onboard">Lock in & start</button>`;
  } else {
    body.innerHTML = `
      <button type="button" class="tc-master off" id="tc-master">AUTOVAULT OFF</button>
      <div class="tc-stat" id="tc-vaulted-stat">0 vaulted</div>
      <div class="tc-wager" id="tc-wager-stat">Session: waiting for bets…</div>
      <div class="tc-status" id="tc-status-line"><span class="tc-time"></span><span class="tc-msg">Ready</span></div>
      <div class="tc-drawer" id="tc-drawer"><div class="tc-drawer-inner" id="tc-drawer-inner"></div></div>`;
  }

  mount.appendChild(head);
  mount.appendChild(hint);
  mount.appendChild(body);

  const drawer = mount.querySelector('#tc-drawer');
  const drawerInner = mount.querySelector('#tc-drawer-inner');

  function setStatus(msg: string, type?: StatusType) {
    statusMessage = msg;
    statusType = type || 'info';
    options.onStatus(msg, type);
    const line = mount.querySelector('#tc-status-line');
    if (!line) return;
    line.className = 'tc-status ' + (type || 'info');
    line.innerHTML = `<span class="tc-time">${formatStatusTime()} </span><span class="tc-msg">${msg}</span>`;
  }

  function render() {
    const stat = mount.querySelector('#tc-vaulted-stat');
    if (stat) stat.textContent = options.engine.formatVaulted();
    const unit = options.sessionWatch.sessionUnitLabel();
    const wagerEl = mount.querySelector('#tc-wager-stat');
    if (wagerEl) wagerEl.textContent = `${options.sessionWatch.formatWagerLine()} (${unit})`;
    const master = mount.querySelector('#tc-master') as HTMLButtonElement | null;
    if (master) {
      const on = options.engine.isRunning();
      master.classList.toggle('on', on);
      master.classList.toggle('off', !on);
      master.textContent = on ? 'AUTOVAULT ON' : 'AUTOVAULT OFF';
    }
  }

  mount.querySelector('#tc-gear')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!options.onboarded) return;
    drawerOpen = !drawerOpen;
    drawer?.classList.toggle('open', drawerOpen);
    if (drawerOpen && drawerInner && !drawerInner.innerHTML) {
      drawerInner.innerHTML =
        settingsHtml() +
        `<button type="button" class="tc-reset" id="tc-reset-session">Reset session stats</button>` +
        `<a class="tc-link" href="${webBaseUrl()}/tools/auto-vault" target="_blank" rel="noopener">AutoVault docs ↗</a>`;
      drawerInner.querySelectorAll('input').forEach((inp) => {
        inp.addEventListener('change', () => {
          readSettingsFromDom(drawerInner);
          if (options.engine.isRunning()) {
            options.onEngineStop(false);
            options.onEngineStart();
          }
          render();
        });
      });
      drawerInner.querySelector('#tc-reset-session')?.addEventListener('click', () => {
        options.sessionWatch.resetSession();
        render();
      });
    }
  });

  mount.querySelector('#tc-start-onboard')?.addEventListener('click', () => {
    readSettingsFromDom(body);
    options.onOnboardComplete();
  });

  const master = mount.querySelector('#tc-master') as HTMLButtonElement | null;
  if (master) {
    let pressTimer: ReturnType<typeof setTimeout> | null = null;
    let killJustFired = false;
    master.addEventListener('click', () => {
      if (killJustFired) return;
      if (options.engine.isRunning()) options.onEngineStop(true);
      else {
        if (drawerOpen && drawerInner) readSettingsFromDom(drawerInner);
        options.onEngineStart();
      }
      render();
    });
    const armKill = () => {
      if (!options.engine.isRunning()) return;
      pressTimer = setTimeout(() => {
        killJustFired = true;
        options.onEngineKill();
        render();
        setTimeout(() => {
          killJustFired = false;
        }, 400);
      }, 800);
    };
    master.addEventListener('mousedown', armKill);
    master.addEventListener('mouseup', () => clearTimeout(pressTimer ?? undefined));
    master.addEventListener('mouseleave', () => clearTimeout(pressTimer ?? undefined));
  }

  render();
  if (options.onboarded) {
    options.sessionWatch.start();
    if (options.lastRunning) {
      setTimeout(() => {
        if (!options.engine.isRunning()) options.onEngineStart();
      }, 1200);
    }
  }

  setStatus(statusMessage, statusType);

  return {
    render,
    setStatus,
    destroy() {
      mount.innerHTML = '';
    },
  };
}
