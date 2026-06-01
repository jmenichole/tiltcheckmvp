/** Full-screen enforcement overlay (minimal port from v1). */

const LOCKDOWN_ROOT_ID = 'tiltcheck-lockdown-root';
const DEFAULT_DURATION_MS = 45_000;

let overlayActive = false;

export function triggerTouchGrassTimeout(reason: string, durationMs: number = DEFAULT_DURATION_MS): void {
  if (overlayActive) return;
  overlayActive = true;

  const root = document.createElement('div');
  root.id = LOCKDOWN_ROOT_ID;
  root.style.cssText =
    'position:fixed;inset:0;z-index:2147483647;background:#0f1115;color:#ff4a4a;display:flex;flex-direction:column;align-items:center;justify-content:center;font:14px system-ui;text-align:center;padding:24px;';
  root.innerHTML = `
    <p style="letter-spacing:.2em;font-weight:700;margin:0 0 8px">TILTCHECK ENFORCEMENT</p>
    <p style="color:#e6e6e6;max-width:28rem;margin:0 0 16px">${reason}</p>
    <p id="tiltcheck-lockdown-timer" style="font-size:2rem;margin:0">—</p>
    <p style="color:#9ca3af;font-size:12px;margin-top:12px">This overlay clears automatically. Step away from the table.</p>
  `;
  document.documentElement.appendChild(root);

  const timerEl = root.querySelector('#tiltcheck-lockdown-timer');
  const endsAt = Date.now() + durationMs;
  const tick = () => {
    const left = Math.max(0, endsAt - Date.now());
    const sec = Math.ceil(left / 1000);
    if (timerEl) timerEl.textContent = `${sec}s`;
    if (left <= 0) {
      root.remove();
      overlayActive = false;
      return;
    }
    requestAnimationFrame(tick);
  };
  tick();
}
