/** Full-viewport Touch Grass lockout — undismissable until timer ends. */

import { webBaseUrl } from './config.js';

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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

  const noteBlock = opts.futureMeNote
    ? `<blockquote style="margin:0 0 1.25rem;max-width:26rem;padding:1rem 1.25rem;border-left:3px solid #17c3b2;border-radius:0 8px 8px 0;background:#12161e;color:#f3f4f6;font-size:1.05rem;font-weight:600;line-height:1.45;text-align:left">${escapeHtml(opts.futureMeNote)}</blockquote>`
    : '';

  const insightBlock = opts.triggerInsight
    ? `<p style="margin:.5rem 0 0;font-size:12px;color:#9ca3af;line-height:1.45">${escapeHtml(opts.triggerInsight)}</p>`
    : '';

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
    ${noteBlock}
    <p style="margin:0 0 1rem;font-size:14px;font-weight:600;color:#17c3b2">Your line: ${opts.durationMinutes} min · you set this in Settings</p>
    <p style="margin:0 0 1rem;letter-spacing:.2em;font:700 9px/1 ui-monospace,monospace;color:#6b7280;text-transform:uppercase">TiltCheck · Made for degens</p>
    <h1 style="margin:0;font:900 clamp(2rem,8vw,3.5rem)/1 ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;text-shadow:0 0 40px rgba(23,195,178,.35)">Touch Grass</h1>
    <p style="margin:.75rem 0 0;font-size:1.05rem;font-weight:600;color:#f3f4f6">Tab locked before the hole got deeper.</p>
    <div style="margin:1.25rem 0 0;max-width:26rem;padding:1rem 1.25rem;border:1px solid rgba(23,195,178,.35);border-radius:8px;background:#12161e;color:#e6e6e6;line-height:1.55;text-align:left">
      <span style="display:block;margin-bottom:.35rem;font:700 10px/1 ui-monospace,monospace;letter-spacing:.15em;color:#5eead4;text-transform:uppercase">What triggered this</span>
      <p style="margin:0;font-size:14px;color:#f3f4f6">${escapeHtml(opts.triggerReason)}</p>
      ${insightBlock}
    </div>
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
