/** Full-viewport Touch Grass lockout — undismissable until timer ends. */

import { webBaseUrl } from './config.js';
import { pactLineHtml, pactNoteHtml, triggerCardHtml } from './pact-ui.js';

const LOCKDOWN_ROOT_ID = 'tiltcheck-lockdown-root';
const TIMER_ID = 'lockdown-timer';

let overlayActive = false;

export type TouchGrassOptions = {
  triggerReason: string;
  triggerInsight?: string;
  durationMs: number;
  durationMinutes: number;
  futureMeNote?: string;
};

export function isTouchGrassActive(): boolean {
  return overlayActive;
}

export function blockBettingUI(block: boolean): void {
  const betButtons = document.querySelectorAll<HTMLElement>(
    'button[class*="bet"], button[class*="spin"], [data-action="bet"], [data-action="spin"]',
  );
  betButtons.forEach((btn) => {
    if (block) {
      if (btn instanceof HTMLButtonElement) btn.disabled = true;
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';
      btn.dataset.tiltguardBlocked = 'true';
    } else if (btn.dataset.tiltguardBlocked) {
      if (btn instanceof HTMLButtonElement) btn.disabled = false;
      btn.style.opacity = '';
      btn.style.cursor = '';
      delete btn.dataset.tiltguardBlocked;
    }
  });
}

export function triggerTouchGrassTimeout(opts: TouchGrassOptions): void {
  if (overlayActive) return;
  overlayActive = true;
  blockBettingUI(true);

  const root = document.createElement('div');
  root.id = LOCKDOWN_ROOT_ID;
  root.style.cssText =
    'position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem 1.5rem;text-align:center;user-select:none;background:radial-gradient(ellipse 80% 60% at 50% 40%,rgba(23,195,178,.08),transparent 70%),#0a0c10;color:#fff;font:15px/1.5 system-ui,-apple-system,sans-serif;animation:tiltcheck-lockdown-in .45s ease-out';
  root.innerHTML = `
    <style>
      @keyframes tiltcheck-lockdown-in{from{opacity:0;transform:scale(1.015)}to{opacity:1;transform:scale(1)}}
      @keyframes tiltcheck-timer-pulse{0%,100%{opacity:1}50%{opacity:.82}}
    </style>
    <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,#17c3b2,transparent)"></div>
    ${pactNoteHtml(opts.futureMeNote)}
    ${pactLineHtml(opts.durationMinutes)}
    <p style="margin:0 0 1rem;letter-spacing:.2em;font:700 9px/1 ui-monospace,monospace;color:#6b7280;text-transform:uppercase">TiltCheck · Made for degens</p>
    <h1 style="margin:0;font:900 clamp(2rem,8vw,3.5rem)/1 ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;text-shadow:0 0 40px rgba(23,195,178,.35)">Touch Grass</h1>
    <p style="margin:.75rem 0 0;font-size:1.05rem;font-weight:600;color:#f3f4f6">Tab locked before the hole got deeper.</p>
    ${triggerCardHtml(opts.triggerReason, opts.triggerInsight)}
    <p id="${TIMER_ID}" style="margin:1.5rem 0 0;font:700 clamp(3rem,12vw,5rem)/1 ui-monospace,monospace;font-variant-numeric:tabular-nums;color:#17c3b2;animation:tiltcheck-timer-pulse 2.5s ease-in-out infinite">--:--</p>
    <p style="margin:1rem 0 0;max-width:22rem;font-size:13px;color:#9ca3af;line-height:1.5">Timer hits zero — table unlocks. <a href="${webBaseUrl()}/touch-grass" target="_blank" rel="noopener" style="color:#17c3b2">Break ideas</a></p>
  `;
  document.documentElement.appendChild(root);

  const timerEl = root.querySelector(`#${TIMER_ID}`);
  const endsAt = Date.now() + opts.durationMs;

  const tick = () => {
    const remaining = Math.max(0, endsAt - Date.now());
    const sec = Math.ceil(remaining / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (timerEl) timerEl.textContent = `${m}:${String(s).padStart(2, '0')}`;
    if (remaining <= 0) {
      clearInterval(interval);
      root.remove();
      overlayActive = false;
      blockBettingUI(false);
    }
  };
  tick();
  const interval = window.setInterval(tick, 250);

  const stop = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const optsCapture = { capture: true };
  root.addEventListener('click', stop, optsCapture);
  root.addEventListener('keydown', stop, optsCapture);
}
