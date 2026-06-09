/** Shared pact overlay blocks for friction + Touch Grass screens. */

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function pactNoteHtml(note?: string): string {
  if (!note) return '';
  return `<blockquote style="margin:0 0 1.25rem;max-width:26rem;padding:1rem 1.25rem;border-left:3px solid #17c3b2;border-radius:0 8px 8px 0;background:#12161e;color:#f3f4f6;font-size:1.05rem;font-weight:600;line-height:1.45;text-align:left">${escapeHtml(note)}</blockquote>`;
}

export function pactLineHtml(durationMinutes: number): string {
  return `<p style="margin:0 0 1rem;font-size:14px;font-weight:600;color:#17c3b2">Your line: ${durationMinutes} min · you set this in Settings</p>`;
}

export function triggerCardHtml(triggerReason: string, triggerInsight?: string): string {
  const insightBlock = triggerInsight
    ? `<p style="margin:.5rem 0 0;font-size:12px;color:#9ca3af;line-height:1.45">${escapeHtml(triggerInsight)}</p>`
    : '';
  return `<div style="margin:1.25rem 0 0;max-width:26rem;padding:1rem 1.25rem;border:1px solid rgba(23,195,178,.35);border-radius:8px;background:#12161e;color:#e6e6e6;line-height:1.55;text-align:left">
      <span style="display:block;margin-bottom:.35rem;font:700 10px/1 ui-monospace,monospace;letter-spacing:.15em;color:#5eead4;text-transform:uppercase">What triggered this</span>
      <p style="margin:0;font-size:14px;color:#f3f4f6">${escapeHtml(triggerReason)}</p>
      ${insightBlock}
    </div>`;
}
