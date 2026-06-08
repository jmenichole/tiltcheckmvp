import type { AutoVaultConfig, AutoVaultSite, StatusType, VaultEngine } from './types.js';
import { webBaseUrl } from '../config.js';
import type { createSessionWatch } from './session-watch.js';

const BRAND = {
  teal: '#17c3b2',
  tealDark: '#129d8f',
  danger: '#ef4444',
  bg: '#0a0c10',
  bgCard: '#12161e',
  text: '#ffffff',
  muted: '#8a97a8',
  border: '#1e2533',
  font: '"Inter", "Segoe UI", Roboto, system-ui, sans-serif',
  tagline: 'Made for Degens. By Degens.',
};

type SessionWatch = ReturnType<typeof createSessionWatch>;

export type AutoVaultUiApi = {
  render: () => void;
  destroy: () => void;
  setStatus: (message: string, type?: StatusType) => void;
};

export type AutoVaultUiOptions = {
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

export function mountAutoVaultUi(options: AutoVaultUiOptions): AutoVaultUiApi {
  let config = { ...options.config };
  let drawerOpen = false;
  let panelHidden = false;
  let statusMessage = 'Ready';
  let statusType: StatusType = 'info';

  function injectStyles() {
    if (document.getElementById('tc-av-share-styles')) return;
    const style = document.createElement('style');
    style.id = 'tc-av-share-styles';
    style.textContent = `
        #tc-av-share-root {
            position: fixed; bottom: 56px; right: calc(var(--tc-tilt-dock-offset, 0px) + 12px); z-index: 2147483647;
            font-family: ${BRAND.font}; font-size: 14px; color: ${BRAND.text};
            min-width: 280px; max-width: min(360px, calc(100vw - var(--tc-tilt-dock-offset, 0px) - 24px));
            background: ${BRAND.bgCard}; border: 1px solid ${BRAND.border};
            border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,0.55);
            user-select: none; overflow: hidden;
        }
        #tc-av-share-root.hidden-panel { display: none; }
        #tc-av-share-root .tc-hdr {
            display: flex; align-items: center; justify-content: space-between;
            padding: 10px 12px; background: ${BRAND.bg}; border-bottom: 1px solid ${BRAND.border};
            cursor: grab;
        }
        #tc-av-share-root .tc-title { font-weight: 700; font-size: 13px; color: ${BRAND.teal}; }
        #tc-av-share-root .tc-site { font-size: 10px; color: ${BRAND.muted}; margin-left: 6px; }
        #tc-av-share-root .tc-hdr-btns { display: flex; gap: 4px; }
        #tc-av-share-root .tc-icon-btn {
            background: transparent; border: 1px solid ${BRAND.border}; color: ${BRAND.muted};
            width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-size: 14px; line-height: 1;
        }
        #tc-av-share-root .tc-icon-btn:hover { color: ${BRAND.text}; border-color: ${BRAND.teal}; }
        #tc-av-share-root .tc-body { padding: 12px; display: flex; flex-direction: column; gap: 10px; }
        #tc-av-share-root .tc-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        #tc-av-share-root .tc-label { color: ${BRAND.muted}; font-size: 12px; }
        #tc-av-share-root input[type="number"] {
            width: 72px; padding: 6px 8px; border-radius: 6px; border: 1px solid ${BRAND.border};
            background: #080a0d; color: ${BRAND.text}; text-align: right; font-size: 13px;
        }
        #tc-av-share-root input[type="checkbox"] { accent-color: ${BRAND.teal}; width: 16px; height: 16px; }
        #tc-av-share-root .tc-tip-row { font-size: 11px; color: ${BRAND.muted}; line-height: 1.35; gap: 8px; align-items: flex-start; }
        #tc-av-share-root .tc-master {
            width: 100%; min-height: 48px; border: none; border-radius: 10px; font-weight: 800;
            font-size: 15px; letter-spacing: 0.04em; cursor: pointer;
        }
        #tc-av-share-root .tc-master.off { background: ${BRAND.border}; color: ${BRAND.muted}; }
        #tc-av-share-root .tc-master.on { background: ${BRAND.teal}; color: #041210; }
        #tc-av-share-root .tc-stat { font-size: 12px; color: ${BRAND.teal}; font-weight: 600; }
        #tc-av-share-root .tc-wager { font-size: 11px; color: ${BRAND.muted}; line-height: 1.35; font-family: ui-monospace, monospace; }
        #tc-av-share-root .tc-status {
            font-size: 12px; color: #e6e6e6; line-height: 1.45; word-break: break-word;
            padding: 8px 10px; border-radius: 8px; background: #080a0d; border: 1px solid ${BRAND.border};
        }
        #tc-av-share-root .tc-status.success { color: #5eead4; border-color: rgba(23,195,178,.45); background: #0a1412; }
        #tc-av-share-root .tc-status.warning { color: #ffe8e0; border-color: rgba(255,138,114,.5); background: #1a1210; }
        #tc-av-share-root .tc-status.error { color: #ffb4b4; border-color: rgba(239,68,68,.55); background: #1a0e0e; }
        #tc-av-share-root .tc-status.profit, #tc-av-share-root .tc-status.bigwin { color: #5eead4; border-color: rgba(23,195,178,.4); background: #0a1412; }
        #tc-av-share-root .tc-status .tc-time { color: #6b7280; margin-right: 6px; }
        #tc-av-share-root .tc-btn-primary {
            width: 100%; min-height: 44px; border: none; border-radius: 10px; font-weight: 700;
            background: ${BRAND.teal}; color: #041210; cursor: pointer; font-size: 14px;
        }
        #tc-av-share-root .tc-drawer { max-height: 0; overflow: hidden; transition: max-height 0.25s ease; }
        #tc-av-share-root .tc-drawer.open { max-height: 520px; border-top: 1px solid ${BRAND.border}; padding-top: 10px; }
        #tc-av-share-root .tc-drawer-inner { display: flex; flex-direction: column; gap: 10px; }
        #tc-av-share-root .tc-link { color: ${BRAND.teal}; font-size: 12px; text-decoration: none; }
        #tc-av-share-root .tc-reset { background: transparent; border: 1px solid ${BRAND.danger}; color: ${BRAND.danger};
            padding: 8px; border-radius: 8px; cursor: pointer; font-size: 12px; }
        #tc-av-share-root .tc-footer { text-align: center; font-size: 10px; color: ${BRAND.muted };
            padding: 8px; border-top: 1px solid ${BRAND.border}; }
        #tc-av-share-stealth {
            position: fixed; bottom: 14px; right: calc(var(--tc-tilt-dock-offset, 0px) + 14px); width: 14px; height: 14px; border-radius: 50%;
            background: #4B5563; z-index: 2147483647; cursor: pointer;
        }
        #tc-av-share-stealth.running { background: ${BRAND.teal}; }
        #tc-av-share-stealth.hidden { display: none; }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function settingsHtml(): string {
    const nutsExtra =
      options.site.mode === 'nuts-ws'
        ? `
            <div class="tc-row"><span class="tc-label">Min deposit (SOL)</span>
                <input type="number" id="tc-min-dep" min="0" step="0.0001" value="${config.minDepositSol}"></div>
            <div class="tc-row tc-tip-row">
                <input type="checkbox" id="tc-auto-tip" ${config.autoTipEnabled ? 'checked' : ''}>
                <label for="tc-auto-tip">Auto-tip 1% on vault withdraw (optional)</label>
            </div>`
        : '';
    return `
            <div class="tc-row"><span class="tc-label">Skim % of profit</span>
                <input type="number" id="tc-save" min="0" max="1" step="0.01" value="${config.saveAmount}"></div>
            <div class="tc-row"><span class="tc-label">Heater threshold (×)</span>
                <input type="number" id="tc-big-t" min="1" step="0.1" value="${config.bigWinThreshold}"></div>
            <div class="tc-row"><span class="tc-label">Heater multiplier</span>
                <input type="number" id="tc-big-m" min="1" step="0.1" value="${config.bigWinMultiplier}"></div>
            <div class="tc-row"><span class="tc-label">Check interval (sec)</span>
                <input type="number" id="tc-interval" min="10" step="1" value="${config.checkInterval}"></div>
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
  document.getElementById('tc-av-share-root')?.remove();
  document.getElementById('tc-av-share-stealth')?.remove();

  const stealth = document.createElement('div');
  stealth.id = 'tc-av-share-stealth';
  stealth.className = 'hidden';
  stealth.title = 'TiltCheck AutoVault (tap to show)';

  const root = document.createElement('div');
  root.id = 'tc-av-share-root';

  const header = document.createElement('div');
  header.className = 'tc-hdr';
  header.innerHTML = `
            <span class="tc-title">TC · AutoVault<span class="tc-site">· ${options.site.name}</span></span>
            <div class="tc-hdr-btns">
                <button type="button" class="tc-icon-btn" id="tc-min" title="Minimize">−</button>
                <button type="button" class="tc-icon-btn" id="tc-stealth" title="Stealth">○</button>
                <button type="button" class="tc-icon-btn" id="tc-gear" title="Settings">⚙</button>
            </div>`;

  const body = document.createElement('div');
  body.className = 'tc-body';

  if (!options.onboarded) {
    body.innerHTML =
      settingsHtml() + `<button type="button" class="tc-btn-primary" id="tc-start-onboard">Get started</button>`;
  } else {
    body.innerHTML = `
                <button type="button" class="tc-master off" id="tc-master">AUTOVAULT OFF</button>
                <div class="tc-stat" id="tc-vaulted-stat">0 vaulted</div>
                <div class="tc-wager" id="tc-wager-stat">Session: waiting for bets…</div>
                <div class="tc-status" id="tc-status-line"><span class="tc-time"></span><span class="tc-msg">Ready</span></div>
                <div class="tc-drawer" id="tc-drawer"><div class="tc-drawer-inner" id="tc-drawer-inner"></div></div>`;
  }

  const footer = document.createElement('div');
  footer.className = 'tc-footer';
  footer.textContent = BRAND.tagline;

  root.appendChild(header);
  root.appendChild(body);
  root.appendChild(footer);
  document.body.appendChild(stealth);
  document.body.appendChild(root);

  const drawer = root.querySelector('#tc-drawer');
  const drawerInner = root.querySelector('#tc-drawer-inner');

  function setStatus(msg: string, type?: StatusType) {
    statusMessage = msg;
    statusType = type || 'info';
    options.onStatus(msg, type);
    const line = root.querySelector('#tc-status-line');
    if (!line) return;
    line.className = 'tc-status ' + (type || 'info');
    line.innerHTML = `<span class="tc-time">${formatStatusTime()} </span><span class="tc-msg">${msg}</span>`;
  }

  function render() {
    const stat = root.querySelector('#tc-vaulted-stat');
    if (stat) stat.textContent = options.engine.formatVaulted();
    const snap = options.sessionWatch.tracker.snapshot();
    const unit = options.sessionWatch.sessionUnitLabel();
    const wagerEl = root.querySelector('#tc-wager-stat');
    if (wagerEl) wagerEl.textContent = `${options.sessionWatch.formatWagerLine()} (${unit})`;
    const master = root.querySelector('#tc-master') as HTMLButtonElement | null;
    if (master) {
      const on = options.engine.isRunning();
      master.classList.toggle('on', on);
      master.classList.toggle('off', !on);
      master.textContent = on ? 'AUTOVAULT ON' : 'AUTOVAULT OFF';
    }
    stealth.classList.toggle('running', options.engine.isRunning());
    if (!panelHidden) stealth.classList.add('hidden');
  }

  root.querySelector('#tc-min')?.addEventListener('click', (e) => {
    e.stopPropagation();
    root.classList.add('hidden-panel');
    panelHidden = true;
  });
  root.querySelector('#tc-stealth')?.addEventListener('click', (e) => {
    e.stopPropagation();
    root.classList.add('hidden-panel');
    stealth.classList.remove('hidden');
    stealth.classList.toggle('running', options.engine.isRunning());
    panelHidden = true;
  });
  stealth.addEventListener('click', () => {
    root.classList.remove('hidden-panel');
    stealth.classList.add('hidden');
    panelHidden = false;
  });

  root.querySelector('#tc-gear')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!options.onboarded) return;
    drawerOpen = !drawerOpen;
    drawer?.classList.toggle('open', drawerOpen);
    if (drawerOpen && drawerInner && !drawerInner.innerHTML) {
      drawerInner.innerHTML =
        settingsHtml() +
        `<button type="button" class="tc-reset" id="tc-reset-session">Reset session stats</button>` +
        `<a class="tc-link" href="${webBaseUrl()}/tools/auto-vault" target="_blank" rel="noopener">AutoVault docs</a>`;
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

  root.querySelector('#tc-start-onboard')?.addEventListener('click', () => {
    readSettingsFromDom(body);
    options.onOnboardComplete();
  });

  const master = root.querySelector('#tc-master') as HTMLButtonElement | null;
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
      root.remove();
      stealth.remove();
    },
  };
}
