/** Expand the browser window when the side panel opens so page content keeps its width. */

export const DEFAULT_SIDE_PANEL_WIDTH = 360;
const SESSION_KEY = 'tc_sidepanel_expand';
const MIN_WINDOW_WIDTH = 480;

type ExpandRecord = Record<number, { deltaWidth: number }>;

type PanelLifecycleInfo = { windowId?: number; tabId?: number };

async function readExpandMap(): Promise<ExpandRecord> {
  const stored = await chrome.storage.session.get(SESSION_KEY);
  return (stored[SESSION_KEY] as ExpandRecord) ?? {};
}

async function writeExpandMap(map: ExpandRecord): Promise<void> {
  await chrome.storage.session.set({ [SESSION_KEY]: map });
}

async function getWindowIdFromTab(tabId?: number): Promise<number | null> {
  if (tabId == null) return null;
  try {
    const tab = await chrome.tabs.get(tabId);
    return tab.windowId ?? null;
  } catch {
    return null;
  }
}

async function resolveWindowId(info: PanelLifecycleInfo): Promise<number | null> {
  if (info.windowId != null) return info.windowId;
  return getWindowIdFromTab(info.tabId);
}

export async function expandWindowForSidePanel(
  windowId: number,
  panelWidth: number,
): Promise<void> {
  const width = Math.max(240, Math.round(panelWidth));
  const map = await readExpandMap();
  const existing = map[windowId];

  try {
    const win = await chrome.windows.get(windowId);
    if (win.width == null) return;

    if (existing) {
      const diff = width - existing.deltaWidth;
      if (diff === 0) return;
      await chrome.windows.update(windowId, {
        width: Math.max(MIN_WINDOW_WIDTH, win.width + diff),
      });
      map[windowId] = { deltaWidth: width };
      await writeExpandMap(map);
      return;
    }

    await chrome.windows.update(windowId, {
      width: Math.max(MIN_WINDOW_WIDTH, win.width + width),
    });
    map[windowId] = { deltaWidth: width };
    await writeExpandMap(map);
  } catch {
    // Window may have closed between events.
  }
}

export async function restoreWindowAfterSidePanel(windowId: number): Promise<void> {
  const map = await readExpandMap();
  const existing = map[windowId];
  if (!existing) return;

  delete map[windowId];
  await writeExpandMap(map);

  try {
    const win = await chrome.windows.get(windowId);
    if (win.width == null) return;
    await chrome.windows.update(windowId, {
      width: Math.max(MIN_WINDOW_WIDTH, win.width - existing.deltaWidth),
    });
  } catch {
    // Window closed.
  }
}

export function registerSidePanelWindowResize(): void {
  const sidePanel = chrome.sidePanel as typeof chrome.sidePanel & {
    onOpened?: chrome.events.Event<(info: PanelLifecycleInfo) => void>;
    onClosed?: chrome.events.Event<(info: PanelLifecycleInfo) => void>;
  };

  sidePanel.onOpened?.addListener((info) => {
    void (async () => {
      const windowId = await resolveWindowId(info);
      if (windowId == null) return;
      await expandWindowForSidePanel(windowId, DEFAULT_SIDE_PANEL_WIDTH);
    })();
  });

  sidePanel.onClosed?.addListener((info) => {
    void (async () => {
      const windowId = await resolveWindowId(info);
      if (windowId == null) return;
      await restoreWindowAfterSidePanel(windowId);
    })();
  });

  chrome.windows.onRemoved.addListener((windowId) => {
    void (async () => {
      const map = await readExpandMap();
      if (!map[windowId]) return;
      delete map[windowId];
      await writeExpandMap(map);
    })();
  });
}
