/** Full-screen opaque interrupt when a warn-mode game block is counting down. */

import { escapeHtml } from './pact-ui.js';
import { blockBettingUI } from './enforcement.js';

const ROOT_ID = 'tiltcheck-game-warn-root';

let active = false;

export function isGameWarnOverlayVisible(): boolean {
  return active;
}

export function dismissGameWarnOverlay(): void {
  document.getElementById(ROOT_ID)?.remove();
  if (active) {
    active = false;
    blockBettingUI(false);
  }
}

export function showGameWarnOverlay(label: string, countdownSec: number): void {
  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement('div');
    root.id = ROOT_ID;
    root.setAttribute('role', 'alertdialog');
    root.setAttribute('aria-modal', 'true');
    root.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:2147483646',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'padding:clamp(1rem,4vw,2rem)',
      'box-sizing:border-box',
      'background:#000',
      'color:#fff',
      'font:16px/1.55 system-ui,-apple-system,sans-serif',
      'user-select:none',
    ].join(';');
    document.documentElement.appendChild(root);
    active = true;
    blockBettingUI(true);
  }

  root.innerHTML = `
    <div style="max-width:min(36rem,calc(100vw - 2rem));width:100%;text-align:center">
      <p style="margin:0 0 1rem;font:700 11px/1 ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase;color:#ff8a72">TC · GAME BLOCK</p>
      <h1 style="margin:0;font:800 clamp(2rem,10vw,4rem)/1.05 system-ui,-apple-system,sans-serif;color:#f9fafb;text-wrap:balance">
        ${escapeHtml(label)} is on your no-play list
      </h1>
      <p style="margin:1.25rem 0 0;font-size:clamp(1.05rem,2.5vw,1.35rem);color:#e5e7eb;line-height:1.45">
        Leave this game or the tab locks.
      </p>
      <p id="tc-game-warn-count" style="margin:2rem 0 0;font:800 clamp(3rem,14vw,5.5rem)/1 ui-monospace,monospace;font-variant-numeric:tabular-nums;color:#ff8a72">
        ${countdownSec}
      </p>
      <p style="margin:.75rem 0 0;font-size:clamp(.95rem,2vw,1.05rem);color:#9ca3af">seconds until Touch Grass</p>
    </div>
  `;
}
