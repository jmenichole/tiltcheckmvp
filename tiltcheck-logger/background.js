// A session ends after 10 min with no active heartbeat. Everything stays in chrome.storage.local.
const GAP = 10 * 60 * 1000, TICK = 15000;
async function get() { return (await chrome.storage.local.get({ sessions: [], cur: null })); }
chrome.runtime.onMessage.addListener((m) => { if (m?.type === 'tc-beat') handle(m); });
let q = Promise.resolve();
function handle(m) { q = q.then(() => step(m)).catch(() => {}); }
async function step(m) {
  let { sessions, cur } = await get();
  const active = m.visible && !m.idle;
  if (cur && m.t - cur.last > GAP) { sessions.push(close(cur)); cur = null; }
  if (!active) { if (cur) cur.lastSeen = m.t; await chrome.storage.local.set({ sessions, cur }); return; }
  if (!cur) cur = { id: m.t, start: m.t, last: m.t, activeMs: 0, sites: {}, paths: {}, beats: 0, longestStreakMs: 0, streakStart: m.t };
  const dt = Math.min(m.t - cur.last, TICK * 2);
  if (m.t - cur.last > TICK * 3) cur.streakStart = m.t;
  cur.activeMs += dt; cur.beats++; cur.last = m.t;
  cur.sites[m.site] = (cur.sites[m.site] || 0) + dt;
  cur.paths[m.site + m.path] = (cur.paths[m.site + m.path] || 0) + dt;
  cur.longestStreakMs = Math.max(cur.longestStreakMs, m.t - cur.streakStart);
  await chrome.storage.local.set({ sessions, cur });
  badge(cur);
}
function badge(cur) {
  const m = cur ? Math.floor(cur.activeMs / 60000) : 0;
  const txt = !cur ? '' : m >= 60 ? Math.floor(m / 60) + 'h' : String(m || '0');
  chrome.action.setBadgeText({ text: txt }).catch(() => {});
  chrome.action.setBadgeBackgroundColor({ color: m >= 120 ? '#FF5A5A' : m >= 60 ? '#FFB020' : '#2EBD4E' }).catch(() => {});
}
function close(c) { return { ...c, end: c.last, wallMs: c.last - c.start }; }
chrome.alarms.create('tc-sweep', { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener(async () => {
  let { sessions, cur } = await get();
  if (cur && Date.now() - cur.last > GAP) { sessions.push(close(cur)); await chrome.storage.local.set({ sessions, cur: null }); badge(null); }
});
chrome.runtime.onMessage.addListener((m) => {
  if (m?.type !== 'tc-event') return;
  q = q.then(async () => {
    const { events } = await chrome.storage.local.get({ events: [] });
    events.push({ t: m.t, site: m.site, kind: m.kind, detail: String(m.detail ?? '').slice(0, 160) });
    if (events.length > 20000) events.splice(0, events.length - 20000);
    await chrome.storage.local.set({ events });
  }).catch(() => {});
});
