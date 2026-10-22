/* =========================================================
   HELPERS
   ========================================================= */
const fmt = d3.format(',.0f');
const fmtPct = d3.format('.1%');
function showTip(html, evt){
  const tip = document.getElementById('tooltip');
  tip.innerHTML = html; tip.style.display='block';
  tip.style.left = (evt.clientX+16)+'px'; tip.style.top=(evt.clientY+12)+'px';
}
function hideTip(){ document.getElementById('tooltip').style.display='none'; }

/* =========================================================
   ANALYSE-KLAPPTEXTE — schweben als Overlay über der Kachel
   statt den Rest der Seite nach unten zu verschieben
   ========================================================= */
document.querySelectorAll('details.insight-toggle').forEach(det=>{
  const panel = det.closest('.panel');
  det.addEventListener('toggle', ()=>{
    if(panel) panel.classList.toggle('insight-open', det.open);
  });
});

/* =========================================================
   STICKY-STAPEL (Subheader → KPI-Gantry) — misst die tatsächliche
   Subheader-Höhe, damit die Gantry beim Scrollen immer vollständig
   sichtbar bleibt statt teilweise unter der Filterleiste zu verschwinden.
   ========================================================= */
function syncStickyOffsets(){
  const subheader = document.querySelector('.subheader');
  if(subheader) document.documentElement.style.setProperty('--subheader-h', subheader.getBoundingClientRect().height+'px');
}
window.addEventListener('resize', syncStickyOffsets);
window.addEventListener('load', syncStickyOffsets);
setTimeout(syncStickyOffsets, 0);

function updateActiveFilterChips(){
  // Einzelne aktive Filter werden nicht mehr als Chip-Liste ausgegeben —
  // die Markierung im jeweiligen Dropdown selbst reicht dafür aus.
  let any=false;
  for(const dim in filters){
    if(dim==='year') continue; // Pflichtauswahl, bereits über die Jahres-Buttons sichtbar
    if(filters[dim].size>0) any=true;
  }
  document.getElementById('resetBtn').classList.toggle('active', any);
  syncStickyOffsets();
}

/* =========================================================
   RENDER: KPI GANTRY
   ========================================================= */
function renderKPI(agg){
  document.getElementById('kpiTotal').textContent = fmt(agg.total);
  document.getElementById('kpiDead').textContent = fmt(agg.kat[1]);
  document.getElementById('kpiDeadSub').textContent = agg.total? fmtPct(agg.kat[1]/agg.total)+' der Auswahl':'—';
  document.getElementById('kpiSevere').textContent = fmt(agg.kat[2]);
  document.getElementById('kpiSevereSub').textContent = agg.total? fmtPct(agg.kat[2]/agg.total)+' der Auswahl':'—';
  document.getElementById('kpiLight').textContent = fmt(agg.kat[3]);
  document.getElementById('kpiLightSub').textContent = agg.total? fmtPct(agg.kat[3]/agg.total)+' der Auswahl':'—';
  document.getElementById('kpiShare').textContent = fmtPct(agg.total/TOTAL_AGG.total);
}

