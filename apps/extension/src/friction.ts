/** First-strike friction screen — 15s pause before play resumes (friction_first only). */

import type { SessionCapConfig } from '@tiltcheck/shared';
import { blockBettingUI } from './enforcement.js';
import { pactLineHtml, pactNoteHtml, triggerCardHtml } from './pact-ui.js';

const FRICTION_ROOT_ID = 'tiltcheck-friction-root';
const FRICTION_TIMER_ID = 'friction-timer';
const FRICTION_MS = 15_000;

let frictionActive = false;

export type FrictionScreenOptions = {
  pact: SessionCapConfig;
  triggerReason: string;
  triggerInsight?: string;
  durationMinutes: number;
  futureMeNote?: string;
  onSnooze?: () => void;
  onComplete?: () => void;
};

export function isFrictionActive(): boolean {
  return frictionActive;
}

export function dismissFrictionIfActive(): void {
  const root = document.getElementById(FRICTION_ROOT_ID);
  if (root) dismissFriction(root);
}

function dismissFriction(root: HTMLElement, onComplete?: () => void) {
  root.remove();
  frictionActive = false;
  blockBettingUI(false);
  onComplete?.();
}

export function triggerFrictionScreen(opts: FrictionScreenOptions): void {
  if (frictionActive) return;
  frictionActive = true;
  blockBettingUI(true);

  const root = document.createElement('div');
  root.id = FRICTION_ROOT_ID;
  root.style.cssText =
    'position:fixed;inset:0;z-index:2147483646;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem 1.5rem;text-align:center;user-select:none;background:rgba(0,0,0,.85);color:#fff;font:15px/1.5 system-ui,-apple-system,sans-serif;animation:tiltcheck-friction-in .35s ease-out';

  const snoozeBtn = opts.onSnooze
    ? `<button type="button" id="tiltcheck-friction-snooze" style="margin:1.25rem 0 0;padding:.75rem 1.25rem;border-radius:8px;border:1px solid rgba(23,195,178,.55);background:transparent;color:#17c3b2;font:inherit;font-size:13px;font-weight:600;cursor:pointer">Use my one snooze</button>
       <p style="margin:.5rem 0 0;max-width:22rem;font-size:12px;color:#9ca3af;line-height:1.45">Past you allowed one pass — this is it.</p>`
    : '';

  root.innerHTML = `
    <style>
      @keyframes tiltcheck-friction-in{from{opacity:0}to{opacity:1}}
    </style>
    ${pactNoteHtml(opts.futureMeNote)}
    ${pactLineHtml(opts.durationMinutes)}
    <p style="margin:0 0 1rem;letter-spacing:.2em;font:700 9px/1 ui-monospace,monospace;color:#6b7280;text-transform:uppercase">TiltCheck · Made for degens</p>
    <h1 style="margin:0;font:800 clamp(1.5rem,6vw,2.25rem)/1.2 system-ui,-apple-system,sans-serif;color:#f3f4f6">Pause — your line is armed</h1>
    <p style="margin:.75rem 0 0;font-size:1rem;color:#d1d5db">Past you set a break before the tab locks.</p>
    ${triggerCardHtml(opts.triggerReason, opts.triggerInsight)}
    <p id="${FRICTION_TIMER_ID}" style="margin:1.5rem 0 0;font:700 clamp(2rem,8vw,3rem)/1 ui-monospace,monospace;font-variant-numeric:tabular-nums;color:#17c3b2">0:15</p>
    <p style="margin:.75rem 0 0;max-width:22rem;font-size:13px;color:#9ca3af;line-height:1.5">Bets unlock when the timer hits zero. Next critical spike → Touch Grass.</p>
    ${snoozeBtn}
  `;
  document.documentElement.appendChild(root);

  const timerEl = root.querySelector(`#${FRICTION_TIMER_ID}`);
  const endsAt = Date.now() + FRICTION_MS;
  let interval: number | null = null;

  const finish = () => {
    if (interval !== null) clearInterval(interval);
    dismissFriction(root, opts.onComplete);
  };

  const tick = () => {
    const remaining = Math.max(0, endsAt - Date.now());
    const sec = Math.ceil(remaining / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (timerEl) timerEl.textContent = `${m}:${String(s).padStart(2, '0')}`;
    if (remaining <= 0) finish();
  };

  tick();
  interval = window.setInterval(tick, 250);

  const snoozeEl = root.querySelector<HTMLButtonElement>('#tiltcheck-friction-snooze');
  snoozeEl?.addEventListener('click', () => {
    opts.onSnooze?.();
    finish();
  });
}
