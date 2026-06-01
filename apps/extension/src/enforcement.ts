/** Full-viewport Touch Grass lockout — undismissable until timer ends. */

const LOCKDOWN_ROOT_ID = 'tiltcheck-lockdown-root';
const TIMER_ID = 'lockdown-timer';

let overlayActive = false;

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

export function triggerTouchGrassTimeout(reason: string, durationMs: number): void {
  if (overlayActive) return;
  overlayActive = true;
  blockBettingUI(true);

  const root = document.createElement('div');
  root.id = LOCKDOWN_ROOT_ID;
  root.style.cssText =
    'position:fixed;inset:0;z-index:2147483647;background:#0f1115;color:#ff4a4a;display:flex;flex-direction:column;align-items:center;justify-content:center;font:14px ui-monospace,monospace;padding:1.5rem;text-align:center;user-select:none';
  root.innerHTML = `
    <p style="letter-spacing:.2em;font-size:11px;font-weight:800">TOUCH GRASS</p>
    <h2 style="font-size:1.25rem;margin:1rem 0">Session cap enforced</h2>
    <p style="max-width:24rem;color:#ccc;line-height:1.5">${reason}</p>
    <p id="${TIMER_ID}" style="font-size:2rem;margin-top:1.5rem">--:--</p>
    <p style="font-size:11px;color:#888;margin-top:1rem">This tab stays locked until the timer hits zero.</p>
  `;
  document.documentElement.appendChild(root);

  const timerEl = root.querySelector(`#${TIMER_ID}`);
  const endsAt = Date.now() + durationMs;

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
  const opts = { capture: true };
  root.addEventListener('click', stop, opts);
  root.addEventListener('keydown', stop, opts);
}
