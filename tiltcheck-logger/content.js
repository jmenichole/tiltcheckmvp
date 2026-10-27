// Sends a heartbeat every 15s while the casino tab is visible. Idle = no input for 3 min.
let lastInput = Date.now();
['mousemove','mousedown','keydown','wheel','touchstart'].forEach(e =>
  addEventListener(e, () => { lastInput = Date.now(); }, { passive: true }));
function beat(kind) {
  try {
    chrome.runtime.sendMessage({
      type: 'tc-beat', kind,
      site: location.hostname.replace(/^www\./, ''),
      path: location.pathname.slice(0, 120),
      visible: document.visibilityState === 'visible',
      idle: Date.now() - lastInput > 180000,
      t: Date.now()
    });
  } catch (_) {}
}
beat('open');
setInterval(() => beat('tick'), 15000);
document.addEventListener('visibilitychange', () => beat('vis'));
addEventListener('pagehide', () => beat('close'));
