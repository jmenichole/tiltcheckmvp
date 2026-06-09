/** Full-width page toasts — dark card, high contrast, TC brand (no yellow-on-yellow). */

export type ToastTone = 'info' | 'pulse' | 'heat' | 'lock' | 'demo';

const TONE: Record<
  ToastTone,
  { border: string; bg: string; accent: string; text: string; sub: string }
> = {
  info: {
    border: 'rgba(23,195,178,.55)',
    bg: '#12161e',
    accent: '#17c3b2',
    text: '#f3f4f6',
    sub: '#9ca3af',
  },
  pulse: {
    border: 'rgba(23,195,178,.65)',
    bg: '#0d1218',
    accent: '#5eead4',
    text: '#ffffff',
    sub: '#b8c5d0',
  },
  heat: {
    border: 'rgba(255,120,90,.75)',
    bg: '#181012',
    accent: '#ff8a72',
    text: '#ffffff',
    sub: '#d4b8b0',
  },
  lock: {
    border: 'rgba(255,74,74,.8)',
    bg: '#160c0c',
    accent: '#ff5c5c',
    text: '#ffffff',
    sub: '#e8b4b4',
  },
  demo: {
    border: 'rgba(138,151,168,.5)',
    bg: '#141820',
    accent: '#8a97a8',
    text: '#e6e6e6',
    sub: '#9ca3af',
  },
};

export type PageToastOptions = {
  tone: ToastTone;
  tag: string;
  headline: string;
  sub?: string;
  dismissible?: boolean;
  autoDismissMs?: number;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function showPageToast(elementId: string, opts: PageToastOptions): void {
  dismissPageToast(elementId);
  const t = TONE[opts.tone];
  const interactive = Boolean(opts.dismissible || opts.autoDismissMs);
  const root = document.createElement('div');
  root.id = elementId;
  root.setAttribute('role', 'status');
  root.setAttribute('aria-live', 'polite');
  root.style.cssText = [
    'position:fixed',
    'top:14px',
    'left:50%',
    'transform:translateX(-50%)',
    'z-index:2147483646',
    'max-width:min(440px,calc(100vw - 20px))',
    'padding:12px 16px',
    'border-radius:10px',
    `border:1px solid ${t.border}`,
    `background:${t.bg}`,
    `color:${t.text}`,
    'font:13px/1.45 system-ui,-apple-system,sans-serif',
    'box-shadow:0 12px 36px rgba(0,0,0,.6)',
    interactive ? 'pointer-events:auto' : 'pointer-events:none',
  ].join(';');

  const closeBtn = opts.dismissible
    ? `<button type="button" data-tc-toast-dismiss aria-label="Dismiss" style="position:absolute;top:8px;right:8px;background:transparent;border:none;color:${t.sub};cursor:pointer;font-size:18px;line-height:1;padding:4px">×</button>`
    : '';

  root.style.position = 'fixed';
  if (opts.dismissible) root.style.paddingRight = '36px';

  root.innerHTML = `
    ${closeBtn}
    <p style="margin:0 0 6px;font:700 10px/1 ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:${t.accent}">${escapeHtml(opts.tag)}</p>
    <p style="margin:0;font-size:14px;font-weight:700;color:${t.text}">${escapeHtml(opts.headline)}</p>
    ${opts.sub ? `<p style="margin:6px 0 0;font-size:12px;color:${t.sub};line-height:1.45;white-space:pre-line">${escapeHtml(opts.sub)}</p>` : ''}
  `;
  document.documentElement.appendChild(root);

  const dismiss = () => dismissPageToast(elementId);

  root.querySelector('[data-tc-toast-dismiss]')?.addEventListener('click', dismiss);

  if (opts.autoDismissMs && opts.autoDismissMs > 0) {
    window.setTimeout(dismiss, opts.autoDismissMs);
  }
}

export function dismissPageToast(elementId: string): void {
  document.getElementById(elementId)?.remove();
}
