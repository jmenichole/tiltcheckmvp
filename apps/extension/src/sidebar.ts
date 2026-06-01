import { apiBaseUrl } from './config.js';

export type SidebarState = {
  loggedIn: boolean;
  demoMode: boolean;
  username?: string;
};

export async function loadSidebarState(): Promise<SidebarState> {
  const stored = await chrome.storage.local.get(['tc_demo', 'tc_username']);
  return {
    loggedIn: Boolean(stored.tc_username),
    demoMode: stored.tc_demo !== false,
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
  panel.querySelector('#tc-login')?.addEventListener('click', () => {
    const url = `${apiBaseUrl()}/auth/discord/login?source=ext`;
    window.open(url, '_blank', 'width=520,height=720');
  });
  panel.querySelector('#tc-vault')?.addEventListener('click', () => {
    const web = (typeof process !== 'undefined' && process.env?.EXTENSION_WEB_URL) || 'http://localhost:3000';
    window.open(`${web}/dashboard`, '_blank');
  });
}
