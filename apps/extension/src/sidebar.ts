import { resolveApiBaseUrl, webBaseUrl } from './config.js';

export type SidebarState = {
  loggedIn: boolean;
  demoMode: boolean;
  username?: string;
};

export async function loadSidebarState(): Promise<SidebarState> {
  const stored = await chrome.storage.local.get(['tc_demo', 'tc_username', 'tc_session_token']);
  const loggedIn = Boolean(stored.tc_session_token);
  return {
    loggedIn,
    demoMode: !loggedIn || stored.tc_demo !== false,
    username: stored.tc_username,
  };
}

export function renderSidebar(root: HTMLElement, state: SidebarState) {
  root.innerHTML = '';
  const panel = document.createElement('div');
  panel.style.cssText =
    'position:fixed;bottom:16px;right:16px;z-index:2147483646;background:#0a0c10;color:#e6e6e6;border:1px solid rgba(23,195,178,.3);border-radius:8px;padding:12px 14px;font:12px system-ui;max-width:260px';
  panel.innerHTML = state.loggedIn
    ? `<strong>TiltCheck</strong><br/>Hi ${state.username}<br/><button id="tc-vault">Vault</button>`
    : `<strong>TiltCheck Demo</strong><br/>Local tilt detection active.<br/><button id="tc-login">Connect Discord</button>`;
  root.appendChild(panel);
  panel.querySelector('#tc-login')?.addEventListener('click', async () => {
    const api = await resolveApiBaseUrl();
    const url = `${api}/auth/discord/login?source=ext`;
    const popup = window.open(url, 'tiltcheck-discord-auth', 'width=520,height=720');
    if (!popup) {
      window.open(url, '_blank');
    }
  });
  panel.querySelector('#tc-vault')?.addEventListener('click', () => {
    window.open(`${webBaseUrl()}/dashboard`, '_blank');
  });
}
