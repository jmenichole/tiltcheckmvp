import type { TiltEducation } from './tilt-education.js';
import { escapeHtml } from './pact-ui.js';
import { blockBettingUI } from './enforcement.js';

const ROOT_ID = 'tiltcheck-tilt-warning-root';

let active = false;

export function showTiltWarningOverlay(
  education: TiltEducation,
  stage: 1 | 2,
  demoMode: boolean,
  sessionCapMinutes?: number,
  onDismiss?: () => void,
): void {
  dismissTiltWarningOverlay();

  const isUrgent = stage === 2;
  const accent = isUrgent ? '#ff8a72' : '#5eead4';

  const headline =
    stage === 1
      ? `${education.patternLabel} — heating up`
      : `${education.patternLabel} — last call`;

  const urgencyLine = isUrgent
    ? demoMode
      ? 'Demo mode — no lockout yet. Still walk it off.'
      : `Your ${sessionCapMinutes ?? '?'} min exit line is active. Another spike locks the tab.`
    : 'Slow down before past-you has to drag you out.';

  const root = document.createElement('div');
  root.id = ROOT_ID;
  root.setAttribute('role', 'alertdialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'tc-tilt-warn-title');
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
    'animation:tc-tilt-warn-in .25s ease-out',
  ].join(';');

  const dismissBtn =
    stage === 1
      ? `<button type="button" id="tc-tilt-warn-dismiss" style="margin:2rem 0 0;padding:.85rem 1.5rem;border-radius:10px;border:1px solid rgba(148,163,184,.45);background:transparent;color:#e5e7eb;font:inherit;font-size:.95rem;font-weight:700;cursor:pointer">I&apos;m slowing down</button>`
      : '';

  root.innerHTML = `
    <style>
      @keyframes tc-tilt-warn-in{from{opacity:0}to{opacity:1}}
    </style>
    <div style="max-width:min(40rem,calc(100vw - 2rem));width:100%;text-align:center">
      <p style="margin:0 0 1rem;font:700 11px/1 ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase;color:${accent}">
        ${isUrgent ? 'TC · LAST CALL' : 'TC · PULSE CHECK'}
      </p>
      <h1 id="tc-tilt-warn-title" style="margin:0;font:800 clamp(2.25rem,11vw,4.5rem)/1.02 system-ui,-apple-system,sans-serif;color:#f9fafb;text-wrap:balance">
        ${escapeHtml(headline)}
      </h1>
      <p style="margin:1.35rem 0 0;font-size:clamp(1.1rem,2.8vw,1.45rem);font-weight:650;color:#e5e7eb;line-height:1.45">
        ${escapeHtml(education.metricLine)}
      </p>
      <p style="margin:.85rem 0 0;font-size:clamp(1rem,2.2vw,1.2rem);color:#b8c5d0;line-height:1.55;max-width:32rem;margin-left:auto;margin-right:auto">
        ${escapeHtml(education.insightLine)}
      </p>
      <div style="margin:2rem auto 0;max-width:30rem;padding:1.25rem 1.4rem;border:2px solid ${isUrgent ? 'rgba(255,120,90,.55)' : 'rgba(23,195,178,.4)'};border-radius:14px;background:#12161e">
        <p style="margin:0;font-size:clamp(1.05rem,2.2vw,1.2rem);font-weight:700;color:${accent};line-height:1.5">
          ${escapeHtml(urgencyLine)}
        </p>
      </div>
      ${dismissBtn}
    </div>
  `;

  document.documentElement.appendChild(root);
  active = true;
  blockBettingUI(true);

  root.querySelector('#tc-tilt-warn-dismiss')?.addEventListener('click', () => {
    dismissTiltWarningOverlay();
    onDismiss?.();
  });
}

export function dismissTiltWarningOverlay(): void {
  document.getElementById(ROOT_ID)?.remove();
  if (active) {
    active = false;
    blockBettingUI(false);
  }
}

export function isTiltWarningOverlayVisible(): boolean {
  return active;
}
