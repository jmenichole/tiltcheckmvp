import type { ExclusionSuggestion } from '@tiltcheck/shared';
import { webBaseUrl } from './config.js';
import { dismissExclusionSuggestion } from './tilt-pattern-learn.js';

const TOAST_ID = 'tiltcheck-tilt-suggestion-root';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type TiltSuggestionToastActions = {
  onAddAsWarn: (label: string) => void;
};

export function dismissTiltSuggestionToast(): void {
  document.getElementById(TOAST_ID)?.remove();
}

export function showTiltSuggestionToast(
  suggestion: ExclusionSuggestion,
  actions: TiltSuggestionToastActions,
): void {
  dismissTiltSuggestionToast();

  const root = document.createElement('div');
  root.id = TOAST_ID;
  root.setAttribute('role', 'status');
  root.style.cssText =
    'position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:2147483646;max-width:min(460px,calc(100vw - 20px));padding:12px 14px 12px 16px;border-radius:10px;border:1px solid rgba(23,195,178,.55);background:#12161e;color:#f3f4f6;font:13px/1.45 system-ui,-apple-system,sans-serif;box-shadow:0 12px 36px rgba(0,0,0,.6);pointer-events:auto';

  const settingsUrl = `${webBaseUrl()}/settings#game-exclusion`;

  root.innerHTML = `
    <button type="button" data-tc-suggest-dismiss aria-label="Dismiss" style="position:absolute;top:8px;right:8px;background:transparent;border:none;color:#9ca3af;cursor:pointer;font-size:18px;line-height:1;padding:4px">×</button>
    <p style="margin:0 0 6px;font:700 10px/1 ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:#5eead4">TC · BLOCK SUGGESTION</p>
    <p style="margin:0;font-size:14px;font-weight:700;color:#f3f4f6">Past-you might want ${escapeHtml(suggestion.label)} on the list</p>
    <p style="margin:6px 0 10px;font-size:12px;color:#9ca3af;line-height:1.45">${escapeHtml(suggestion.reason)} — we noticed a pattern.</p>
    <div style="display:flex;flex-wrap:wrap;gap:8px">
      <button type="button" data-tc-suggest-add style="padding:6px 10px;border-radius:6px;border:none;background:#17c3b2;color:#0a0c10;font:inherit;font-size:11px;font-weight:700;cursor:pointer">Add warning</button>
      <a href="${settingsUrl}" target="_blank" rel="noopener" data-tc-suggest-settings style="padding:6px 10px;border-radius:6px;border:1px solid rgba(23,195,178,.35);background:transparent;color:#17c3b2;font:inherit;font-size:11px;font-weight:600;text-decoration:none;line-height:1.35">Settings</a>
    </div>
  `;

  document.documentElement.appendChild(root);

  root.querySelector('[data-tc-suggest-dismiss]')?.addEventListener('click', () => {
    void dismissExclusionSuggestion(suggestion.label);
    dismissTiltSuggestionToast();
  });

  root.querySelector('[data-tc-suggest-add]')?.addEventListener('click', () => {
    actions.onAddAsWarn(suggestion.label);
  });
}
