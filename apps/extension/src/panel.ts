/** TiltCheck toolbar panel — status, rules, and AutoVault controls. */

import { getSessionCapConfig, type VaultRuleSnapshot } from './vault-sync.js';
import { normalizeVaultPledgeConfig, isPledgeActive } from '@tiltcheck/shared';
import { webBaseUrl, chromeWebStoreUrl, extensionInstallHref } from './config.js';
import { resolveApiBaseUrl } from './config.js';
import { pushSuggestedGameExclusion } from './settings-sync.js';
import type { TcLiveState } from './alert-summary.js';
import type { ExclusionSuggestion } from '@tiltcheck/shared';
import type { LockoutStyle } from '@tiltcheck/shared';

const RISK_LABEL = {
  conservative: 'Conservative',
  moderate: 'Moderate',
  degen: 'Degen',
} as const;

type AvSnapshot = {
  site: string;
  onboarded: boolean;
  running: boolean;
  vaultedLabel: string;
  saveAmount: number;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function getActiveTabId(): Promise<number | null> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0]?.id ?? null;
}

async function queryAvSnapshot(): Promise<AvSnapshot | null> {
  const tabId = await getActiveTabId();
  if (!tabId) return null;
  try {
    const res = (await chrome.tabs.sendMessage(tabId, { type: 'tc-av-snapshot' })) as {
      ok?: boolean;
      snap?: AvSnapshot | null;
    };
    return res?.snap ?? null;
  } catch {
    return null;
  }
}

async function sendAvCommand(type: string, extra: Record<string, unknown> = {}): Promise<void> {
  const tabId = await getActiveTabId();
  if (!tabId) return;
  try {
    await chrome.tabs.sendMessage(tabId, { type, ...extra });
  } catch {
    /* tab may not be stake/nuts */
  }
}

function lockoutLabel(style: LockoutStyle): string {
  return style === 'hard_stop' ? 'Hard stop' : 'Friction first';
}

function renderPledgeLine(rules: VaultRuleSnapshot[]): string {
  const rule = rules.find((r) => r.ruleType === 'vault_pledge' && r.enabled);
  if (!rule) return 'No vault pledge';
  const config = normalizeVaultPledgeConfig(rule.config);
  if (!isPledgeActive(config)) return 'No vault pledge';
  const ms = Date.parse(config.releaseAt) - Date.now();
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `Vault pledge: ${h}h ${m}m left`;
}

function renderPactLine(
  capArmed: boolean,
  cap: ReturnType<typeof getSessionCapConfig>,
  blocks: number,
  profile: keyof typeof RISK_LABEL,
): string {
  if (!capArmed) return 'Exit line not set — save My Line on dashboard, then Sync rules';
  const parts = [
    `${RISK_LABEL[profile]} sensitivity`,
    `${cap.durationMinutes}m · ${lockoutLabel(cap.lockoutStyle)}`,
    `${blocks} block${blocks === 1 ? '' : 's'}`,
  ];
  if (cap.snoozeEnabled) parts.push('snooze on');
  if (cap.futureMeNote) {
    const note =
      cap.futureMeNote.length > 60 ? `${cap.futureMeNote.slice(0, 60)}…` : cap.futureMeNote;
    parts.push(`"${note}"`);
  }
  return parts.join(' · ');
}

function renderSuggestion(suggestion: ExclusionSuggestion | null): string {
  if (!suggestion) return '';
  return `
    <div class="card card--warn">
      <p class="eyebrow">Block suggestion</p>
      <p class="title">${escapeHtml(suggestion.label)}</p>
      <p class="copy">${escapeHtml(suggestion.reason)}</p>
      <div class="row">
        <button type="button" class="btn btn-primary" data-add-warn="${escapeHtml(suggestion.label)}">Add warning</button>
        <button type="button" class="btn btn-ghost" data-dismiss-suggest>Dismiss</button>
      </div>
    </div>`;
}

function renderAv(av: AvSnapshot | null, liveSite: string | null): string {
  if (!av && !liveSite) {
    return `<div class="card card--muted"><p class="copy">AutoVault on Stake.us & nuts.gg — open a casino tab.</p></div>`;
  }
  if (!av) {
    return `<div class="card card--muted"><p class="copy">Switch to ${escapeHtml(liveSite ?? 'stake/nuts')} for AutoVault.</p></div>`;
  }
  if (!av.onboarded) {
    return `
      <div class="card">
        <p class="eyebrow">AutoVault · ${escapeHtml(av.site)}</p>
        <p class="copy">Skim wins to vault. One-time setup.</p>
        <button type="button" class="btn btn-primary" data-av-onboard>Get started</button>
      </div>`;
  }
  return `
    <div class="card">
      <p class="eyebrow">AutoVault · ${escapeHtml(av.site)}</p>
      <p class="stat">${escapeHtml(av.vaultedLabel)}</p>
      <p class="copy">Skim ${av.saveAmount}% · ${av.running ? 'Watching' : 'Paused'}</p>
      <button type="button" class="btn ${av.running ? 'btn-danger' : 'btn-primary'}" data-av-toggle>
        ${av.running ? 'Turn off' : 'Turn on'}
      </button>
    </div>`;
}

function injectStyles(): void {
  if (document.getElementById('tc-panel-styles')) return;
  const style = document.createElement('style');
  style.id = 'tc-panel-styles';
  style.textContent = `
    .panel-header {
      position: sticky; top: 0; z-index: 2;
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 16px; border-bottom: 1px solid rgba(23,195,178,.2);
      background: #0a0c10;
    }
    .panel-header::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
      background: linear-gradient(90deg, transparent, #17c3b2, transparent);
    }
    .logo { font:800 20px/1 ui-monospace,monospace; color:#17c3b2; letter-spacing:.08em; }
    .user { font-size:11px; color:#9ca3af; text-align:right; max-width:50%; }
    .panel-body { padding: 12px 16px 8px; }
    .quick-links {
      display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;
    }
    .quick-link {
      padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(30,37,51,.9);
      background: #12161e; font-size: 11px; font-weight: 700; color: #17c3b2;
      text-decoration: none; text-align: center;
    }
    .quick-link:hover { border-color: rgba(23,195,178,.45); background: #151a22; }
    .status {
      padding: 14px 16px; border-radius: 12px; margin-bottom: 12px;
      border: 1px solid rgba(23,195,178,.35); background: #12161e;
    }
    .status--heat { border-color: rgba(255,120,90,.55); background: #181012; }
    .status__label { margin:0 0 6px; font:700 10px/1 ui-monospace,monospace; letter-spacing:.14em; text-transform:uppercase; color:#5eead4; }
    .status--heat .status__label { color:#ff8a72; }
    .status__line { margin:0; font-size:15px; font-weight:700; color:#f3f4f6; line-height:1.35; }
    .status__sub { margin:8px 0 0; font-size:11px; color:#9ca3af; line-height:1.5; }
    .card { padding:14px 16px; border-radius:12px; margin-bottom:12px; border:1px solid rgba(30,37,51,.9); background:#12161e; }
    .card--warn { border-color:rgba(251,191,36,.4); background:#1a1510; }
    .card--muted { border-color:rgba(30,37,51,.6); }
    .eyebrow { margin:0 0 6px; font:700 10px/1 ui-monospace,monospace; letter-spacing:.12em; text-transform:uppercase; color:#6b7280; }
    .title { margin:0; font-size:14px; font-weight:700; color:#fbbf24; }
    .stat { margin:0 0 4px; font-size:14px; font-weight:700; color:#17c3b2; }
    .copy { margin:0 0 10px; font-size:12px; color:#9ca3af; line-height:1.5; }
    .copy:last-child { margin-bottom:0; }
    .row { display:flex; gap:8px; flex-wrap:wrap; }
    .actions { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px; }
    .btn {
      display:block; width:100%; padding:11px 12px; border-radius:10px; border:none;
      font:inherit; font-size:12px; font-weight:700; cursor:pointer; text-align:center;
    }
    .btn-primary { background:#17c3b2; color:#041210; }
    .btn-secondary { background:transparent; color:#17c3b2; border:1px solid rgba(23,195,178,.4); }
    .btn-ghost { background:transparent; color:#9ca3af; border:1px solid rgba(30,37,51,.9); padding:8px 10px; width:auto; }
    .btn-danger { background:#3f1515; color:#ffb4b4; border:1px solid rgba(255,92,92,.45); }
    .panel-footer {
      padding: 12px 16px 16px; border-top: 1px solid rgba(30,37,51,.8);
      font-size:10px; color:#4b5563; line-height:1.55; text-align:center;
      background: #0a0c10;
    }
    .panel-footer a { color:#17c3b2; text-decoration:none; }
    .msg { font-size:11px; color:#6b7280; min-height:16px; margin-bottom:10px; }
  `;
  document.head.appendChild(style);
}

async function loadContext(): Promise<{
  stored: Record<string, unknown>;
  live: TcLiveState | null;
}> {
  const [local, session] = await Promise.all([
    chrome.storage.local.get([
      'tc_session_token',
      'tc_username',
      'tc_demo',
      'tc_risk_profile',
      'tc_vault_rules',
      'tc_game_exclusions',
    ]),
    chrome.storage.session.get(['tc_live']),
  ]);
  return {
    stored: local,
    live: (session.tc_live as TcLiveState | undefined) ?? null,
  };
}

async function render(): Promise<void> {
  injectStyles();
  const app = document.getElementById('app');
  if (!app) return;

  const { stored, live } = await loadContext();
  const loggedIn = Boolean(stored.tc_session_token);
  const demoMode = !loggedIn || stored.tc_demo !== false;
  const username = stored.tc_username as string | undefined;
  const riskProfile = (stored.tc_risk_profile as keyof typeof RISK_LABEL) ?? 'moderate';
  const vaultRules = (stored.tc_vault_rules as VaultRuleSnapshot[]) ?? [];
  const gameExclusions = Array.isArray(stored.tc_game_exclusions)
    ? (stored.tc_game_exclusions as unknown[])
    : [];
  const cap = getSessionCapConfig(vaultRules);
  const capArmed =
    loggedIn && !demoMode && vaultRules.some((r) => r.ruleType === 'session_cap' && r.enabled);

  const av = await queryAvSnapshot();
  const alert = live?.alertSummary ?? 'Open a casino tab to see live status.';
  const isHeat =
    live &&
    (live.gameMatchStatus === 'warn' ||
      live.tiltStage >= 2 ||
      alert.includes('Rapid clicks') ||
      alert.includes('heating up') ||
      alert.startsWith('Last call') ||
      alert.startsWith('Locked'));

  const web = webBaseUrl();
  const installHref = extensionInstallHref();
  const installLinkLabel = chromeWebStoreUrl() ? 'Chrome Web Store' : 'Extension setup';

  app.innerHTML = `
    <header class="panel-header">
      <span class="logo">TiltCheck</span>
      <span class="user">${loggedIn ? `@${escapeHtml(username ?? 'player')}` : 'Not connected'}${demoMode && loggedIn ? ' · Demo mode' : ''}</span>
    </header>
    <div class="panel-body">
      <nav class="quick-links" aria-label="Quick links">
        <a class="quick-link" href="${escapeHtml(web)}/dashboard" target="_blank" rel="noopener">My vault</a>
        <a class="quick-link" href="${escapeHtml(web)}/touch-grass" target="_blank" rel="noopener">Touch Grass</a>
        <a class="quick-link" href="${escapeHtml(web)}/casinos" target="_blank" rel="noopener">Casino trust</a>
        <a class="quick-link" href="${escapeHtml(web)}/settings" target="_blank" rel="noopener">Settings</a>
      </nav>
      <div class="status ${isHeat ? 'status--heat' : ''}">
        <p class="status__label">${isHeat ? 'Needs attention' : 'This tab'}</p>
        <p class="status__line">${escapeHtml(alert)}</p>
        <p class="status__sub">${escapeHtml(renderPactLine(capArmed, cap, gameExclusions.length, riskProfile))}</p>
        <p class="status__sub">${escapeHtml(renderPledgeLine(vaultRules))}</p>
      </div>
      ${renderSuggestion(live?.tiltSuggestion ?? null)}
      ${renderAv(av, live?.autoVaultSite ?? null)}
      <p class="msg" id="tc-panel-msg"></p>
      <div class="actions">
        <button type="button" class="btn btn-primary" id="tc-sync">Sync rules</button>
        ${loggedIn ? `<button type="button" class="btn btn-secondary" id="tc-settings">Settings</button>` : `<button type="button" class="btn btn-secondary" id="tc-connect">Connect Discord</button>`}
      </div>
      ${loggedIn ? '' : `<p class="copy">Connect to sync game blocks, tilt sensitivity, and your exit line.</p>`}
    </div>
    <footer class="panel-footer">
      <a href="${escapeHtml(installHref)}" target="_blank" rel="noopener noreferrer">${escapeHtml(installLinkLabel)}</a>
    </footer>
  `;

  const setMsg = (t: string) => {
    const el = document.getElementById('tc-panel-msg');
    if (el) el.textContent = t;
  };

  document.getElementById('tc-sync')?.addEventListener('click', () => {
    setMsg('Syncing…');
    chrome.runtime.sendMessage({ type: 'sync-vault' }, (res) => {
      if (!res?.ok) {
        setMsg('Sync failed.');
      } else if (loggedIn && res.settingsSynced === false) {
        setMsg('Couldn\'t load settings — reconnect or save on the dashboard.');
      } else {
        setMsg('Synced.');
      }
      void render();
    });
  });

  document.getElementById('tc-connect')?.addEventListener('click', async () => {
    const api = await resolveApiBaseUrl();
    chrome.windows.create({
      url: `${api}/auth/discord/login?source=ext`,
      type: 'popup',
      width: 520,
      height: 720,
    });
  });

  document.getElementById('tc-settings')?.addEventListener('click', () => {
    chrome.tabs.create({ url: `${webBaseUrl()}/settings` });
  });

  app.querySelector('[data-av-toggle]')?.addEventListener('click', async () => {
    if (!av) return;
    await sendAvCommand('tc-av-set-master', { on: !av.running });
    void render();
  });

  app.querySelector('[data-av-onboard]')?.addEventListener('click', async () => {
    await sendAvCommand('tc-av-onboard');
    void render();
  });

  app.querySelector('[data-add-warn]')?.addEventListener('click', async (e) => {
    const label = (e.currentTarget as HTMLElement).getAttribute('data-add-warn');
    const token = stored.tc_session_token as string | undefined;
    if (!label || !token) {
      setMsg('Connect first.');
      return;
    }
    setMsg('Adding…');
    const result = await pushSuggestedGameExclusion(token, label, 'warn');
    setMsg(result.ok ? `Added a warning for ${label}.` : result.error);
    if (result.ok) void render();
  });

  app.querySelector('[data-dismiss-suggest]')?.addEventListener('click', () => {
    const label = live?.tiltSuggestion?.label;
    if (label) {
      chrome.storage.local.get(['tc_tilt_suggestion_dismissed'], (s) => {
        const raw = (s.tc_tilt_suggestion_dismissed as { label: string; at: number }[]) ?? [];
        chrome.storage.local.set({
          tc_tilt_suggestion_dismissed: [...raw, { label, at: Date.now() }],
        });
      });
    }
    void render();
  });
}

function registerSidePanelWindowSync(): void {
  let windowId: number | undefined;
  let lastWidth = 0;

  void chrome.windows.getCurrent().then((win) => {
    windowId = win.id;
  });

  const reportWidth = (width: number) => {
    const rounded = Math.round(width);
    if (rounded < 200 || Math.abs(rounded - lastWidth) < 6) return;
    lastWidth = rounded;
    chrome.runtime.sendMessage({ type: 'sidepanel-width', width: rounded, windowId });
  };

  const ro = new ResizeObserver((entries) => {
    const w = entries[0]?.contentRect.width ?? 0;
    if (w > 0) reportWidth(w);
  });
  ro.observe(document.documentElement);
  reportWidth(document.documentElement.clientWidth);

  window.addEventListener('pagehide', () => {
    chrome.runtime.sendMessage({ type: 'sidepanel-closed', windowId });
    ro.disconnect();
  });
}

registerSidePanelWindowSync();

void (async () => {
  const { stored } = await loadContext();
  if (stored.tc_session_token) {
    chrome.runtime.sendMessage({ type: 'sync-vault' }, () => {
      void render();
    });
    return;
  }
  await render();
})();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' || area === 'session') {
    if (
      changes.tc_live ||
      changes.tc_vault_rules ||
      changes.tc_game_exclusions ||
      changes.tc_session_token
    ) {
      void render();
    }
  }
});
