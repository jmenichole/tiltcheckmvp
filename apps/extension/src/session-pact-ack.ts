/** Once-per-tab session start — full-screen ack with checkbox (sessionStorage only, not persisted). */

import type { GameExclusionEntry, SessionCapConfig } from '@tiltcheck/shared';
import type { RiskProfile } from './tilt-detector.js';
import { escapeHtml } from './pact-ui.js';

const ROOT_ID = 'tiltcheck-session-pact-ack';
const ACK_KEY = 'tc_pact_session_ack';

const RISK_LABEL: Record<RiskProfile, string> = {
  conservative: 'Conservative — early brakes',
  moderate: 'Moderate — balanced',
  degen: 'Degen — let me cook',
};

export type SessionPactAckContext = {
  loggedIn: boolean;
  demoMode: boolean;
  username?: string;
  riskProfile: RiskProfile;
  cap: SessionCapConfig;
  capArmed: boolean;
  gameExclusions: GameExclusionEntry[];
};

export function isSessionPactAcknowledged(): boolean {
  return sessionStorage.getItem(ACK_KEY) === '1';
}

export function dismissSessionPactAck(): void {
  document.getElementById(ROOT_ID)?.remove();
}

function formatBlockList(entries: GameExclusionEntry[]): string {
  if (entries.length === 0) return 'None yet — add in Settings';
  const blocks = entries.filter((e) => e.mode === 'block');
  const warns = entries.filter((e) => e.mode === 'warn');
  const parts: string[] = [];
  if (blocks.length) parts.push(`${blocks.length} block${blocks.length === 1 ? '' : 's'}`);
  if (warns.length) parts.push(`${warns.length} warn${warns.length === 1 ? '' : 's'}`);
  const labels = entries.map((e) => e.label);
  const list = labels.length <= 4 ? labels.join(', ') : `${labels.slice(0, 4).join(', ')} +${labels.length - 4} more`;
  return `${parts.join(' · ')} — ${list}`;
}

function lockoutLabel(style: SessionCapConfig['lockoutStyle']): string {
  return style === 'hard_stop' ? 'Hard stop' : 'Friction first';
}

export function maybeShowSessionPactAck(ctx: SessionPactAckContext): void {
  if (isSessionPactAcknowledged()) return;
  if (!ctx.loggedIn) return;
  if (document.getElementById(ROOT_ID)) return;

  const hasProtection = ctx.capArmed || ctx.gameExclusions.length > 0;
  const who = ctx.username ? `@${ctx.username}` : 'You';

  const root = document.createElement('div');
  root.id = ROOT_ID;
  root.setAttribute('role', 'alertdialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'tc-pact-ack-title');
  root.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:2147483647',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'padding:clamp(1rem,4vw,2rem)',
    'box-sizing:border-box',
    'background:#000',
    'color:#fff',
    'font:16px/1.55 system-ui,-apple-system,sans-serif',
    'user-select:none',
    'animation:tc-pact-ack-in .3s ease-out',
  ].join(';');

  const configBlock = hasProtection
    ? `
      <ul style="margin:1.25rem 0 0;padding:0;list-style:none;text-align:left;max-width:28rem;width:100%">
        <li style="padding:.65rem 0;border-bottom:1px solid rgba(52,67,90,.6);font-size:clamp(.95rem,2vw,1.05rem);color:#e5e7eb">
          <span style="display:block;font:700 10px/1 ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:#6b7280;margin-bottom:.25rem">Tilt sensitivity</span>
          ${escapeHtml(RISK_LABEL[ctx.riskProfile])}
        </li>
        <li style="padding:.65rem 0;border-bottom:1px solid rgba(52,67,90,.6);font-size:clamp(.95rem,2vw,1.05rem);color:#e5e7eb">
          <span style="display:block;font:700 10px/1 ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:#6b7280;margin-bottom:.25rem">My Line</span>
          ${
            ctx.capArmed
              ? `${ctx.cap.durationMinutes} min lockout · ${lockoutLabel(ctx.cap.lockoutStyle)}${ctx.cap.snoozeEnabled ? ' · snooze on' : ''}`
              : 'Not armed — save on dashboard + Sync'
          }
        </li>
        <li style="padding:.65rem 0;font-size:clamp(.95rem,2vw,1.05rem);color:#e5e7eb">
          <span style="display:block;font:700 10px/1 ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:#6b7280;margin-bottom:.25rem">Game blocks</span>
          ${escapeHtml(formatBlockList(ctx.gameExclusions))}
        </li>
      </ul>
      ${
        ctx.cap.futureMeNote
          ? `<p style="margin:1rem 0 0;max-width:28rem;padding:1rem 1.15rem;border-left:3px solid #17c3b2;border-radius:0 10px 10px 0;background:#12161e;font-size:clamp(.95rem,2vw,1.05rem);font-weight:600;color:#f3f4f6;text-align:left;line-height:1.45">“${escapeHtml(ctx.cap.futureMeNote.length > 140 ? `${ctx.cap.futureMeNote.slice(0, 140)}…` : ctx.cap.futureMeNote)}”</p>`
          : ''
      }
      ${ctx.demoMode ? '<p style="margin:1rem 0 0;font-size:.9rem;color:#9ca3af">Demo mode — warnings only until demo is off.</p>' : ''}
    `
    : `
      <p style="margin:1.25rem 0 0;max-width:28rem;font-size:clamp(1rem,2.2vw,1.15rem);color:#b8c5d0;line-height:1.55">
        Set <strong style="color:#e5e7eb">My Line</strong> on the dashboard and game blocks in Settings, then Sync from the TC toolbar icon.
      </p>
    `;

  const headline = hasProtection
    ? `${who} — past you set this session`
    : 'Arm your line before you play';

  root.innerHTML = `
    <style>
      @keyframes tc-pact-ack-in{from{opacity:0}to{opacity:1}}
      #tc-pact-ack-panel{max-width:min(36rem,calc(100vw - 2rem));width:100%;text-align:center;display:flex;flex-direction:column;align-items:center}
      #tc-pact-ack-check{display:flex;align-items:flex-start;gap:.65rem;max-width:28rem;margin:1.75rem 0 0;text-align:left;cursor:pointer;font-size:clamp(.9rem,2vw,1rem);color:#d1d5db;line-height:1.5}
      #tc-pact-ack-check input{margin-top:.2rem;width:18px;height:18px;accent-color:#17c3b2;flex-shrink:0;cursor:pointer}
      #tc-pact-ack-btn{margin-top:1.25rem;padding:1rem 2rem;border:none;border-radius:10px;background:#17c3b2;color:#041210;font:inherit;font-size:clamp(.95rem,2vw,1.05rem);font-weight:800;cursor:pointer;width:100%;max-width:28rem}
      #tc-pact-ack-btn:disabled{opacity:.35;cursor:not-allowed}
    </style>
    <div id="tc-pact-ack-panel">
      <p style="margin:0 0 1rem;font:700 11px/1 ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase;color:#5eead4">TC · SESSION START</p>
      <h1 id="tc-pact-ack-title" style="margin:0;font:800 clamp(1.75rem,7vw,3.25rem)/1.08 system-ui,-apple-system,sans-serif;color:#f9fafb;text-wrap:balance">
        ${escapeHtml(headline)}
      </h1>
      <p style="margin:1rem 0 0;max-width:28rem;font-size:clamp(1rem,2.2vw,1.12rem);color:#b8c5d0;line-height:1.55">
        TiltCheck works best when you don&apos;t fight the rules you chose. Acknowledge once — this tab won&apos;t ask again until you close it.
      </p>
      ${configBlock}
      <label id="tc-pact-ack-check">
        <input type="checkbox" id="tc-pact-ack-box" />
        <span>I set these protections (or will). When they fire, I won&apos;t fight past-me — that&apos;s the whole point.</span>
      </label>
      <button type="button" id="tc-pact-ack-btn" disabled>Start session</button>
    </div>
  `;

  document.documentElement.appendChild(root);

  const box = root.querySelector<HTMLInputElement>('#tc-pact-ack-box');
  const btn = root.querySelector<HTMLButtonElement>('#tc-pact-ack-btn');

  box?.addEventListener('change', () => {
    if (btn) btn.disabled = !box.checked;
  });

  btn?.addEventListener('click', () => {
    if (!box?.checked) return;
    sessionStorage.setItem(ACK_KEY, '1');
    dismissSessionPactAck();
  });
}
