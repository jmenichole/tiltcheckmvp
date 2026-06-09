/** Full-screen vault pledge lockout — blocks withdraw UX until releaseAt. */

import { pactNoteHtml } from './pact-ui.js';
import { openTouchGrassHub, touchGrassUrl } from './touch-grass-link.js';
import type { VaultPledgeConfig } from '@tiltcheck/shared';

const PLEDGE_ROOT_ID = 'tiltcheck-pledge-root';
const TIMER_ID = 'pledge-timer';

const PLEDGE_DISCLOSURE =
  'Works in this browser with TiltCheck installed. You can still withdraw on mobile or another browser — a nudge from past-you, not a bank lock.';

let overlayActive = false;
let tickInterval: number | null = null;

export function isVaultPledgeOverlayActive(): boolean {
  return overlayActive;
}

export function dismissVaultPledgeOverlay(): void {
  if (tickInterval !== null) {
    window.clearInterval(tickInterval);
    tickInterval = null;
  }
  document.getElementById(PLEDGE_ROOT_ID)?.remove();
  overlayActive = false;
}

function formatCountdown(ms: number): string {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function showVaultPledgeOverlay(config: VaultPledgeConfig): void {
  if (overlayActive) return;
  overlayActive = true;

  const releaseAt = Date.parse(config.releaseAt);
  const hubUrl = touchGrassUrl('pledge', {
    until: config.releaseAt,
    note: config.futureMeNote || undefined,
  });

  const root = document.createElement('div');
  root.id = PLEDGE_ROOT_ID;
  root.style.cssText =
    'position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem 1.5rem;text-align:center;user-select:none;background:#000;color:#fff;font:15px/1.5 system-ui,-apple-system,sans-serif;animation:tiltcheck-pledge-in .45s ease-out';
  root.innerHTML = `
    <style>
      @keyframes tiltcheck-pledge-in{from{opacity:0;transform:scale(1.015)}to{opacity:1;transform:scale(1)}}
      @keyframes tiltcheck-pledge-pulse{0%,100%{opacity:1}50%{opacity:.82}}
    </style>
    <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,#17c3b2,transparent)"></div>
    ${pactNoteHtml(config.futureMeNote || undefined)}
    <p style="margin:0 0 1rem;letter-spacing:.2em;font:700 9px/1 ui-monospace,monospace;color:#6b7280;text-transform:uppercase">TiltCheck · Vault pledge</p>
    <h1 style="margin:0;font:900 clamp(1.75rem,7vw,3rem)/1 ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;text-shadow:0 0 40px rgba(23,195,178,.35)">Bag stays in vault</h1>
    <p style="margin:.75rem 0 0;font-size:1.05rem;font-weight:600;color:#f3f4f6">Past you pledged not to pull until the timer hits zero.</p>
    <p id="${TIMER_ID}" style="margin:1.5rem 0 0;font:700 clamp(3rem,12vw,5rem)/1 ui-monospace,monospace;font-variant-numeric:tabular-nums;color:#17c3b2;animation:tiltcheck-pledge-pulse 2.5s ease-in-out infinite">--:--</p>
    <p style="margin:1rem 0 0;max-width:22rem;font-size:13px;color:#9ca3af;line-height:1.5">Timer ends — withdraw unlocks in this browser.</p>
    <a href="${hubUrl}" target="_blank" rel="noopener" style="display:inline-flex;margin-top:1.25rem;padding:.85rem 1.75rem;border-radius:999px;background:#17c3b2;color:#0a0c10;font:700 14px/1 system-ui,sans-serif;text-decoration:none;letter-spacing:.02em">Open break hub →</a>
    <p style="margin:1.5rem 0 0;max-width:24rem;font-size:11px;color:#6b7280;line-height:1.5">${PLEDGE_DISCLOSURE}</p>
  `;
  document.documentElement.appendChild(root);

  openTouchGrassHub('pledge', {
    until: config.releaseAt,
    note: config.futureMeNote || undefined,
  });

  const timerEl = root.querySelector(`#${TIMER_ID}`);

  const tick = () => {
    const remaining = releaseAt - Date.now();
    if (timerEl) timerEl.textContent = formatCountdown(remaining);
    if (remaining <= 0) {
      dismissVaultPledgeOverlay();
    }
  };
  tick();
  tickInterval = window.setInterval(tick, 250);

  const stop = (e: Event) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest('a[href]')) return;
    e.preventDefault();
    e.stopPropagation();
  };
  const optsCapture = { capture: true };
  root.addEventListener('click', stop, optsCapture);
  root.addEventListener('keydown', stop, optsCapture);
}
