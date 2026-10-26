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
