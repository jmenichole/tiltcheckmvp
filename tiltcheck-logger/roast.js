// TiltCheck Mouth v0.2: never blocks you. Talks shit, drops facts, offers a breather. You stay in control.
(() => {
const pick = a => a[Math.floor(Math.random() * a.length)];
const LINES = {
  speed: [
    "Clicking like the RNG owes you rent. It doesn't. It doesn't even know you.",
    "That's {n} clicks in 10 seconds. The slot isn't scared, babe.",
    "Speedrunning broke? Bold strategy.",
    "Fact: faster spins don't change odds. They just change how fast the edge eats you.",
    "Your finger's on tilt before your brain is. Breathe, then click.",
    "At this pace, a 96% slot shaves ~4% off every dollar you cycle. Fast = more cycles = more shave."
  ],
  speed2: [
    "Back-to-back hot streak of clicks again. Is this you or the tilt driving?",
    "Same speed, same result, different balance. Want 60 seconds to reset?",
    "I'm not stopping you. I'm just the friend going 'bro.'"
  ],
  time: [
    "{t} in. The house doesn't get tired. You do.",
    "{t} straight. Water, snack, stretch. The casino will still be here, unfortunately.",
    "Fun check at {t}: still fun, or just habit?",
    "{t}. Long sessions are where the edge does its best work."
  ],
  redeposit: [
    "Cashed out {m} min ago and you're back on deposit? That's the house's favorite move.",
    "Redeposit alert. Past you cashed out for a reason. Trust that guy.",
    "Winning and redepositing is how wins become 'I was up once.'"
  ],
  late: [
    "It's {clock}. Nothing good happens on slots after midnight.",
    "Late-night degen hours. Decision-making is on its last bar."
  ],
  praise: [
    "You slowed down. Huge. That's the whole game.",
    "Took a breather. Your future balance says thanks."
  ]
};
const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
const fmt = ms => { const m = Math.round(ms/60000); return m >= 60 ? `${Math.floor(m/60)}h ${m%60}m` : `${m}m`; };
let lastToast = 0, speedHits = 0;
function log(kind, detail) { try { chrome.runtime.sendMessage({ type: 'tc-event', kind, detail, site: location.hostname, t: Date.now() }); } catch (_) {} }
function toast(kind, vars = {}, offerBreak = false) {
  const now = Date.now();
  if (now - lastToast < 45000 && kind !== 'praise') return;   // no spam
  lastToast = now;
  const msg = fill(pick(LINES[kind]), vars);
  log('toast:' + kind, msg);
  const el = document.createElement('div'); el.dataset.tc = '1';
  el.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:2147483647;max-width:320px;background:#0b0b0f;color:#eee;border:2px solid #7CFF6B;border-radius:12px;padding:12px 14px;font:600 14px/1.35 system-ui;box-shadow:0 8px 30px #0008;cursor:default';
  el.innerHTML = `<div style="color:#7CFF6B;font-size:11px;letter-spacing:.08em;margin-bottom:4px">TILTCHECK</div><div></div>
  <div style="display:flex;gap:8px;margin-top:10px">${offerBreak ? '<button data-b tabindex="-1" style="flex:1;padding:6px;border:0;border-radius:8px;background:#7CFF6B;font-weight:700;cursor:pointer">60s breather</button>' : ''}<button data-x tabindex="-1" style="flex:1;padding:6px;border:1px solid #444;border-radius:8px;background:none;color:#aaa;cursor:pointer">I'm good</button></div>`;
  el.children[1].textContent = msg;
  document.body.appendChild(el);
  const kill = () => el.remove();
  el.querySelector('[data-x]').onclick = () => { log('dismiss', kind); kill(); };
  const b = el.querySelector('[data-b]');
  if (b) b.onclick = e => { if (e.detail === 0) return; log('breather', kind); kill(); breather(); };  // mouse click only, never a keypress
  setTimeout(kill, 12000);
}
function breather() {
  const o = document.createElement('div'); o.dataset.tc = '1';
  o.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#0b0b0fee;color:#eee;display:flex;flex-direction:column;align-items:center;justify-content:center;font:700 22px system-ui;text-align:center';
  let s = 60;
  o.innerHTML = '<div>Breathe. In 4, hold 4, out 6.</div><div style="font-size:64px;color:#7CFF6B;margin:16px" data-c>60</div><button style="padding:8px 16px;border:1px solid #555;border-radius:8px;background:none;color:#aaa;font-size:14px;cursor:pointer">Skip (you chose this, you can leave)</button>';
  document.body.appendChild(o);
  const iv = setInterval(() => { s--; o.querySelector('[data-c]').textContent = s; if (s <= 0) { clearInterval(iv); o.remove(); toast('praise'); } }, 1000);
  o.querySelector('button').onclick = () => { clearInterval(iv); o.remove(); log('breather-skip', 60 - s); };
}
// 1) Click speed: count clicks + spacebar in the last 10s. Clicks inside a provider's game iframe may not reach us.
let clicks = [];
const hit = () => {
  const now = Date.now(); clicks = clicks.filter(t => now - t < 10000); clicks.push(now);
  if (clicks.length >= 12) { speedHits++; log('fast-clicks', clicks.length); toast(speedHits > 2 ? 'speed2' : 'speed', { n: clicks.length }, speedHits > 1); clicks = []; }
};
// Typing (chat, search, forms) never counts as betting.
const isTyping = el => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || !!el.closest?.('[contenteditable=""],[contenteditable="true"],[role=textbox]'));
const ours = el => !!el?.closest?.('[data-tc]');
addEventListener('click', e => { if (!isTyping(e.target) && !ours(e.target)) hit(); }, true);
addEventListener('keydown', e => {
  if (e.repeat || isTyping(e.target) || isTyping(document.activeElement)) return;
  if (e.code === 'Space' || e.code === 'Enter') hit();
}, true);
// 2) Session time milestones (from the logger's current session)
const MIL = [30, 60, 90, 120, 180, 240, 300].map(m => m * 60000); let said = new Set();
setInterval(() => chrome.storage.local.get({ cur: null }, ({ cur }) => {
  if (!cur) return; const m = MIL.filter(x => cur.activeMs >= x).pop();
  if (m && !said.has(m)) { said.add(m); toast('time', { t: fmt(cur.activeMs) }, m >= 60*60000); }
  const h = new Date().getHours();
  if (h >= 0 && h < 5 && !said.has('late')) { said.add('late'); toast('late', { clock: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) }); }
}), 30000);
// 3) Redeposit after cashout: watches URL + clicked button text
const CASH = /withdraw|cash ?out|redeem/i, DEP = /deposit|buy coins|get coins|cashier/i;
function check(text) {
  if (!text) return;
  if (CASH.test(text)) chrome.storage.local.set({ lastCashout: Date.now() }), log('cashout-intent', text.slice(0, 40));
  else if (DEP.test(text)) chrome.storage.local.get({ lastCashout: 0 }, ({ lastCashout }) => {
    const m = Math.round((Date.now() - lastCashout) / 60000);
    log('deposit-intent', text.slice(0, 40));
    if (lastCashout && m <= 60) toast('redeposit', { m }, true);
  });
}
addEventListener('click', e => { const b = e.target.closest('button,a,[role=button]'); if (b) check((b.innerText || '').trim()); }, true);
let lastUrl = location.href;
setInterval(() => { if (location.href !== lastUrl) { lastUrl = location.href; check(location.pathname + location.search); } }, 1500);
})();
