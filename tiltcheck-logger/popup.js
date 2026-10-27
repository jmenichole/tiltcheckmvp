const fmt = ms => { const m = Math.round(ms / 60000); return m >= 60 ? `${Math.floor(m/60)}h ${m%60}m` : `${m}m`; };
chrome.storage.local.get({ sessions: [], cur: null }, ({ sessions, cur }) => {
  const day = new Date(); day.setHours(0,0,0,0);
  const all = cur ? [...sessions, cur] : sessions;
  const today = all.filter(s => (s.last || s.end) >= day.getTime());
  const sum = today.reduce((a, s) => a + s.activeMs, 0);
  document.getElementById('today').textContent = fmt(sum);
  document.getElementById('n').textContent = today.length;
  document.getElementById('cur').textContent = cur ? fmt(cur.activeMs) : 'none';
  document.getElementById('streak').textContent = fmt(Math.max(0, ...today.map(s => s.longestStreakMs || 0)));
  const sites = {}; today.forEach(s => Object.entries(s.sites).forEach(([k, v]) => sites[k] = (sites[k] || 0) + v));
  document.getElementById('sites').innerHTML = Object.entries(sites).map(([k, v]) => `<div class="row"><span>${k}</span><b>${fmt(v)}</b></div>`).join('');
  document.getElementById('csv').onclick = () => {
    const rows = [['start','end','active_min','wall_min','longest_run_min','sites','top_game_path']];
    all.forEach(s => {
      const top = Object.entries(s.paths).sort((a,b)=>b[1]-a[1])[0]?.[0] || '';
      rows.push([new Date(s.start).toISOString(), new Date(s.end || s.last).toISOString(),
        (s.activeMs/60000).toFixed(1), (((s.end||s.last)-s.start)/60000).toFixed(1),
        ((s.longestStreakMs||0)/60000).toFixed(1),
        Object.entries(s.sites).map(([k,v])=>`${k}:${(v/60000).toFixed(0)}m`).join(' '), top]);
    });
    const blob = new Blob([rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `tiltcheck-sessions-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };
});
document.getElementById('ev').onclick = () => chrome.storage.local.get({ events: [] }, ({ events }) => {
  const rows = [['time','site','event','detail'], ...events.map(e => [new Date(e.t).toISOString(), e.site, e.kind, e.detail])];
  const blob = new Blob([rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `tiltcheck-events-${new Date().toISOString().slice(0,10)}.csv`; a.click();
});

const hb = document.getElementById('hud');
chrome.storage.local.get({ hud: true }, ({ hud }) => { hb.checked = hud; });
hb.onchange = () => chrome.storage.local.set({ hud: hb.checked });

// ---- Bets ----
const money = n => (n < 0 ? '-' : '') + '$' + Math.abs(n).toFixed(2);
const ui = document.getElementById('user');
chrome.storage.local.get({ binkUser: '' }, r => ui.value = r.binkUser);
ui.onchange = () => chrome.storage.local.set({ binkUser: ui.value.trim() });
chrome.storage.local.get({ bets: [] }, ({ bets }) => {
  const box = document.getElementById('bets');
  if (!bets.length) return;
  const day = new Date(); day.setHours(0,0,0,0);
  const sum = (a, k) => a.reduce((s, b) => s + b[k], 0);
  const block = (label, a) => {
    const w = sum(a, 'wager'), p = sum(a, 'payout');
    return `<div class="row"><span>${label} wagered</span><b>${money(w)}</b></div>
      <div class="row"><span>${label} net</span><b style="color:${p-w>=0?'#7CFF6B':'#ff6b6b'}">${money(p-w)}</b></div>`;
  };
  const today = bets.filter(b => b.t >= day.getTime());
  const big = bets.reduce((m, b) => (b.payout - b.wager) > (m ? m.payout - m.wager : 0) ? b : m, null);
  const games = {}; bets.forEach(b => { const g = games[b.game] ||= { n: 0, w: 0, p: 0 }; g.n++; g.w += b.wager; g.p += b.payout; });
  const topG = Object.entries(games).sort((a, b) => b[1].w - a[1].w).slice(0, 3);
  const cats = {}; bets.forEach(b => cats[b.cat] = (cats[b.cat] || 0) + b.wager);
  // Pattern after a win: what does the next bet look like?
  let ups = 0, wins = 0, nextAfterWin = 0, gaps = [];
  for (let i = 0; i < bets.length - 1; i++) if (bets[i].payout > bets[i].wager) {
    wins++; const nx = bets[i+1]; nextAfterWin += nx.wager; if (nx.wager > bets[i].wager) ups++;
    gaps.push((nx.t - bets[i].t) / 1000);
  }
  const avgBet = sum(bets, 'wager') / bets.length;
  box.innerHTML = block('Today', today) + block('All-time', bets) +
    `<div class="row"><span>Bets logged</span><b>${today.length} today · ${bets.length} total</b></div>` +
    (big ? `<div class="row"><span>Biggest win</span><b>${money(big.payout)} (${big.multi}×)</b></div><div class="row"><small>${big.game}, ${new Date(big.t).toLocaleDateString()}</small></div>` : '') +
    `<div style="margin-top:6px;color:#7CFF6B;font-size:12px">TOP GAMES</div>` +
    topG.map(([g, v]) => `<div class="row"><span>${g}</span><b>${money(v.w)} · ${v.n}</b></div>`).join('') +
    Object.entries(cats).map(([c, v]) => `<div class="row"><span>${c}</span><b>${money(v)}</b></div>`).join('') +
    (wins ? `<div style="margin-top:6px;color:#7CFF6B;font-size:12px">AFTER A WIN</div>
      <div class="row"><span>Bet went up next</span><b>${Math.round(ups/wins*100)}% of ${wins}</b></div>
      <div class="row"><span>Avg next bet vs usual</span><b>${money(nextAfterWin/wins)} vs ${money(avgBet)}</b></div>
      <div class="row"><span>Kept playing within 1 min</span><b>${Math.round(gaps.filter(s => s < 60).length/wins*100)}%</b></div>` : '');
});
document.getElementById('bcsv').onclick = () => chrome.storage.local.get({ bets: [] }, ({ bets }) => {
  const rows = [['time','game','category','wager','multiplier','payout','net','bet_id','page'], ...bets.map(b => [new Date(b.t).toISOString(), b.game, b.cat, b.wager, b.multi, b.payout, (b.payout-b.wager).toFixed(2), b.id, b.path])];
  const blob = new Blob([rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `tiltcheck-bets-${new Date().toISOString().slice(0,10)}.csv`; a.click();
});
