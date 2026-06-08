/**
 * MAIN-world script for nuts.gg — hooks WebSocket before page scripts run.
 * No chrome.* APIs; bundled as standalone IIFE.
 */

const NUTS_MSG_SOURCE = 'tc-av-nuts-main';
const ISOLATED_SOURCE = 'tc-av-nuts-isolated';
const WS_URL_MATCH = 'nuts.tools/graphql';

function post(msg: Record<string, unknown>) {
  window.postMessage({ source: NUTS_MSG_SOURCE, ...msg }, '*');
}

function nutsUuid(): string {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

let nutsSocket: WebSocket | null = null;
let socketAuthenticated = false;
const attachedSockets = new WeakSet<WebSocket>();
const pendingDeposits = new Map<string, { resolve: () => void; reject: (e: Error) => void }>();
const pendingTips = new Map<string, { resolve: () => void; reject: (e: Error) => void }>();
let lastPlayBalance: number | null = null;
let lastVaultBalance: number | null = null;

function nutsOnIncoming(raw: string) {
  try {
    const msg = JSON.parse(raw) as {
      type?: string;
      id?: string;
      payload?: { data?: Record<string, unknown> };
    };
    if (msg.type === 'connection_ack' || msg.type === 'next' || msg.type === 'data') {
      if (!socketAuthenticated) {
        socketAuthenticated = true;
        post({ type: 'socket-ready' });
      }
    }
    if (msg.type === 'next' && msg.payload?.data) {
      const d = msg.payload.data;
      if ('balance' in d && (d.balance as { after?: number })?.after !== undefined) {
        const next = Number((d.balance as { after: number }).after);
        post({ type: 'balance', prev: lastPlayBalance, next });
        lastPlayBalance = next;
      }
      if ('vaultBalance' in d && (d.vaultBalance as { after?: number })?.after !== undefined) {
        const next = Number((d.vaultBalance as { after: number }).after);
        post({ type: 'vault-balance', prev: lastVaultBalance, next });
        lastVaultBalance = next;
      }
      if ('depositToVault' in d && msg.id && pendingDeposits.has(msg.id)) {
        pendingDeposits.get(msg.id)!.resolve();
        pendingDeposits.delete(msg.id);
        post({ type: 'deposit-result', id: msg.id, ok: true });
      }
      if ('tip' in d && msg.id && pendingTips.has(msg.id)) {
        pendingTips.get(msg.id)!.resolve();
        pendingTips.delete(msg.id);
        post({ type: 'tip-result', id: msg.id, ok: true });
      }
    }
  } catch {
    /* ignore */
  }
}

function attachNutsSocket(ws: WebSocket) {
  if (!ws || attachedSockets.has(ws)) return;
  attachedSockets.add(ws);
  nutsSocket = ws;
  ws.addEventListener('message', (evt) => nutsOnIncoming(String(evt.data)));
  ws.addEventListener('close', () => {
    if (nutsSocket === ws) {
      nutsSocket = null;
      socketAuthenticated = false;
    }
  });
}

try {
  const OriginalSend = WebSocket.prototype.send;
  WebSocket.prototype.send = function (data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    try {
      if (typeof this.url === 'string' && this.url.includes(WS_URL_MATCH)) attachNutsSocket(this);
    } catch {
      /* ignore */
    }
    return OriginalSend.apply(this, arguments as unknown as [string | ArrayBufferLike | Blob | ArrayBufferView]);
  };
} catch (e) {
  console.error('[TiltCheck AutoVault]', 'WS send patch failed', e);
}

try {
  const OriginalWS = window.WebSocket;
  function HookedWS(this: WebSocket, url: string | URL, protocols?: string | string[]) {
    const ws = protocols !== undefined ? new OriginalWS(url, protocols) : new OriginalWS(url);
    try {
      if (String(url).includes(WS_URL_MATCH)) attachNutsSocket(ws);
    } catch {
      /* ignore */
    }
    return ws;
  }
  HookedWS.prototype = OriginalWS.prototype;
  Object.assign(HookedWS, {
    CONNECTING: OriginalWS.CONNECTING,
    OPEN: OriginalWS.OPEN,
    CLOSING: OriginalWS.CLOSING,
    CLOSED: OriginalWS.CLOSED,
  });
  window.WebSocket = HookedWS as unknown as typeof WebSocket;
} catch {
  /* ignore */
}

function sendVaultDeposit(amountUnits: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!nutsSocket || nutsSocket.readyState !== 1 || !socketAuthenticated) {
      return reject(new Error('Socket not ready'));
    }
    const id = nutsUuid();
    const payload = {
      id,
      type: 'subscribe',
      payload: {
        query: 'mutation depositToVault($amount: Float!) {\n  depositToVault(amount: $amount)\n}',
        operationName: 'depositToVault',
        variables: { amount: Math.floor(amountUnits) },
      },
    };
    const timeout = setTimeout(() => {
      if (pendingDeposits.has(id)) {
        pendingDeposits.delete(id);
        reject(new Error('Deposit timed out'));
      }
    }, 15000);
    pendingDeposits.set(id, {
      resolve: () => {
        clearTimeout(timeout);
        resolve();
      },
      reject: (e) => {
        clearTimeout(timeout);
        reject(e);
      },
    });
    try {
      nutsSocket.send(JSON.stringify(payload));
    } catch (e) {
      clearTimeout(timeout);
      pendingDeposits.delete(id);
      reject(e instanceof Error ? e : new Error('send failed'));
    }
  });
}

function sendDevTip(amountUnits: number, recipient: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!nutsSocket || nutsSocket.readyState !== 1 || !socketAuthenticated) {
      return reject(new Error('Socket not ready'));
    }
    const id = nutsUuid();
    const payload = {
      id,
      type: 'subscribe',
      payload: {
        query:
          'mutation tip($recipient: String!, $amount: Float!, $private: Boolean!) {\n tip(recipient: $recipient, amount: $amount, private: $private) { amount }\n}',
        operationName: 'tip',
        variables: { amount: Math.floor(amountUnits), recipient, private: true },
      },
    };
    const timeout = setTimeout(() => {
      if (pendingTips.has(id)) {
        pendingTips.delete(id);
        reject(new Error('Tip timed out'));
      }
    }, 15000);
    pendingTips.set(id, {
      resolve: () => {
        clearTimeout(timeout);
        resolve();
      },
      reject: (e) => {
        clearTimeout(timeout);
        reject(e);
      },
    });
    try {
      nutsSocket.send(JSON.stringify(payload));
    } catch (e) {
      clearTimeout(timeout);
      pendingTips.delete(id);
      reject(e instanceof Error ? e : new Error('send failed'));
    }
  });
}

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const data = event.data as {
    source?: string;
    type?: string;
    amountUnits?: number;
    recipient?: string;
  };
  if (data?.source !== ISOLATED_SOURCE) return;
  if (data.type === 'request-deposit' && typeof data.amountUnits === 'number') {
    sendVaultDeposit(data.amountUnits).catch((e) => {
      post({ type: 'deposit-result', id: 'err', ok: false, error: e.message });
    });
  }
  if (data.type === 'request-tip' && typeof data.amountUnits === 'number' && data.recipient) {
    sendDevTip(data.amountUnits, data.recipient).catch((e) => {
      post({ type: 'tip-result', id: 'err', ok: false, error: e.message });
    });
  }
});
