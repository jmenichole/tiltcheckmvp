// TiltCheck Bets v0.4: reads YOUR rows from Bink's on-page bet tables (live feed / My Bets).
// Bink shows: GAME | PLAYER | WAGER | MULTI | PAYOUT | BET ID, amounts like "$2.24 B". Local only.
(() => {
if (!/bink\.bet$/.test(location.hostname)) return;
const S = '[\\t\\n]+';
const AMT = '\\$?([\\d,]+(?:\\.\\d+)?)\\s?(?:B|GC|SC)?';
// with player column (public feed) and without (My Bets tab)
const RX_P = new RegExp(`([^\\t\\n]+)${S}([^\\t\\n]{2,30})${S}${AMT}${S}([\\d.,]+)\\s?[x×]${S}(—|-|${AMT})${S}([0-9A-Fa-f]{6,12})(?=[\\t\\n]|$)`, 'g');
const RX_M = new RegExp(`([^\\t\\n]+)${S}${AMT}${S}([\\d.,]+)\\s?[x×]${S}(—|-|${AMT})${S}([0-9A-Fa-f]{6,12})(?=[\\t\\n]|$)`, 'g');
const num = s => parseFloat(String(s || '0').replace(/,/g, '')) || 0;
const ORIG = /^(blackjack|keno|plinko|mines|dice|limbo|crash|chicken rush|nutted|dragon tower|slider|whack.?a.?mole|cased|packs|snakes|hilo|roulette|wheel|tower)/i;
const cat = game => ORIG.test(game) ? 'Originals' : 'Slots/other';
let me = '', seen = new Set();
chrome.storage.local.get({ binkUser: '', betIds: [] }, r => { me = r.binkUser.trim().toLowerCase(); seen = new Set(r.betIds); });
chrome.storage.onChanged.addListener(c => { if (c.binkUser) me = (c.binkUser.newValue || '').trim().toLowerCase(); });
const onMyTab = () => [...document.querySelectorAll('[aria-selected="true"],[data-state="active"],.active,[class*="active"]')].some(el => /^\s*my bets\s*$/i.test(el.textContent || ''));
function scan() {
  const text = (document.querySelector('main') || document.body).innerText || '';
  if (!/\bbet id\b/i.test(text)) return;
  const found = [];
  if (me) for (const m of text.matchAll(RX_P)) {
    if (m[2].trim().toLowerCase() !== me) continue;
    found.push({ id: m[7], game: m[1].trim(), wager: num(m[3]), multi: num(m[4]), payout: m[5] === '—' || m[5] === '-' ? 0 : num(m[6]) });
  }
  if (onMyTab()) for (const m of text.matchAll(RX_M)) {
    found.push({ id: m[6], game: m[1].trim(), wager: num(m[2]), multi: num(m[3]), payout: m[4] === '—' || m[4] === '-' ? 0 : num(m[5]) });
  }
  const fresh = found.filter(b => !seen.has(b.id) && b.wager > 0);
  if (!fresh.length) return;
  fresh.forEach(b => { seen.add(b.id); b.cat = cat(b.game); b.t = Date.now(); b.path = location.pathname; });
  try { chrome.runtime.sendMessage({ type: 'tc-bets', bets: fresh }); } catch (_) {}
}
setInterval(scan, 2500);
})();
