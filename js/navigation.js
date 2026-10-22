/* =========================================================
   GLOBALES FILTERSYSTEM (Dropdowns oben neben dem Titel)
   Ersetzt die früheren Einzel-Filter je Visualisierung.
   ========================================================= */
const FILTER_DIMS = [
  {key:'land',    label:'Bundesland',     options:()=>Object.keys(LAND_NAMES).map(Number),  labelFn:v=>LAND_NAMES[v]},
  {key:'month',   label:'Monat',          options:()=>Object.keys(MONTH_NAMES).map(Number), labelFn:v=>MONTH_NAMES[v]},
  {key:'weekday', label:'Wochentag',      options:()=>[1,2,3,4,5,6,7],                       labelFn:v=>WD_FULL[v]},
  {key:'hour',    label:'Stunde',         options:()=>d3.range(0,24),                        labelFn:v=>v+':00'},
  {key:'licht',   label:'Lichtverhältnis',options:()=>[0,1,2],                                labelFn:v=>LICHT_NAMES[v]},
  {key:'strasse', label:'Straßenzustand', options:()=>[0,1,2],                                labelFn:v=>STR_NAMES[v]},
  {key:'part',    label:'Verkehrsmittel', options:()=>PART_DEFS.map(p=>p.bit),                labelFn:v=>PART_DEFS.find(p=>p.bit===v).label},
  {key:'kat',     label:'Schwere',        options:()=>KAT_DEFS.map(k=>k.k),                   labelFn:v=>KAT_NAMES[v]},
];

// Jahr ist eine Pflicht-Einzelauswahl (kein Mehrfach, kein Leer) — bekommt aber
// optisch/strukturell dasselbe Dropdown-Element wie die übrigen Filter.
const YEAR_OPTIONS = [2020,2021,2022,2023,2024];

function selectYear(yr){
  document.querySelectorAll('.gf-dropdown.open').forEach(d=>d.classList.remove('open'));
  if(filters.year.has(yr)) return; // schon ausgewählt, nichts zu tun
  filters.year = new Set([yr]);
  TOTAL_AGG = aggregateAllPass();
  update();
}

function buildYearDropdown(bar){
  const wrap = document.createElement('div');
  wrap.className='gf-dropdown'; wrap.dataset.dim='year';

  const trigger = document.createElement('button');
  trigger.className='gf-trigger active';
  trigger.innerHTML = `Jahr <span class="gf-count"></span><span class="gf-arrow">▾</span>`;
  trigger.addEventListener('click',(e)=>{
    e.stopPropagation();
    const wasOpen = wrap.classList.contains('open');
    document.querySelectorAll('.gf-dropdown.open').forEach(d=>d.classList.remove('open'));
    if(!wasOpen) wrap.classList.add('open');
  });

  const menu = document.createElement('div');
  menu.className='gf-menu';
  YEAR_OPTIONS.forEach(yr=>{
    const row = document.createElement('div');
    row.className='gf-option'; row.dataset.val = yr;
    row.innerHTML = `<span class="gf-check"></span><span>${yr}</span>`;
    row.addEventListener('click',(e)=>{ e.stopPropagation(); selectYear(yr); });
    menu.appendChild(row);
  });

  wrap.appendChild(trigger); wrap.appendChild(menu);
  bar.appendChild(wrap);
}

function buildGlobalFilterBar(){
  const bar = document.getElementById('globalFilterBar');
  buildYearDropdown(bar);
  FILTER_DIMS.forEach(dim=>{
    const wrap = document.createElement('div');
    wrap.className='gf-dropdown'; wrap.dataset.dim = dim.key;

    const trigger = document.createElement('button');
    trigger.className='gf-trigger';
    trigger.innerHTML = `${dim.label} <span class="gf-count"></span><span class="gf-arrow">▾</span>`;
    trigger.addEventListener('click',(e)=>{
      e.stopPropagation();
      const wasOpen = wrap.classList.contains('open');
      document.querySelectorAll('.gf-dropdown.open').forEach(d=>d.classList.remove('open'));
      if(!wasOpen) wrap.classList.add('open');
    });

    const menu = document.createElement('div');
    menu.className='gf-menu';
    dim.options().forEach(opt=>{
      const row = document.createElement('div');
      row.className='gf-option'; row.dataset.val = opt;
      row.innerHTML = `<span class="gf-check"></span><span>${dim.labelFn(opt)}</span>`;
      row.addEventListener('click',(e)=>{
        e.stopPropagation();
        toggle(filters[dim.key], opt);
        update();
      });
      menu.appendChild(row);
    });
    const clearRow = document.createElement('div');
    clearRow.className='gf-clear'; clearRow.textContent='Auswahl leeren';
    clearRow.addEventListener('click',(e)=>{ e.stopPropagation(); filters[dim.key].clear(); update(); });
    menu.appendChild(clearRow);

    wrap.appendChild(trigger); wrap.appendChild(menu);
    bar.appendChild(wrap);
  });
  document.addEventListener('click',()=>{
    document.querySelectorAll('.gf-dropdown.open').forEach(d=>d.classList.remove('open'));
  });
}

function renderGlobalFilterBar(){
  document.querySelectorAll('.gf-dropdown').forEach(wrap=>{
    const dimKey = wrap.dataset.dim;
    const trigger = wrap.querySelector('.gf-trigger');
    if(dimKey==='year'){
      const yr = [...filters.year][0];
      trigger.querySelector('.gf-count').textContent = `(${yr})`;
      wrap.querySelectorAll('.gf-option').forEach(row=>{
        row.classList.toggle('active', Number(row.dataset.val)===yr);
      });
      return;
    }
    const set = filters[dimKey];
    trigger.classList.toggle('active', set.size>0);
    trigger.querySelector('.gf-count').textContent = set.size? `(${set.size})` : '';
    wrap.querySelectorAll('.gf-option').forEach(row=>{
      row.classList.toggle('active', set.has(Number(row.dataset.val)));
    });
  });
}

/* =========================================================
   MAIN UPDATE
   ========================================================= */
let updateScheduled=false;
function update(){
  if(updateScheduled) return;
  updateScheduled=true;
  requestAnimationFrame(()=>{
    updateScheduled=false;
    const agg = aggregate();
    renderKPI(agg);
    const landAgg = aggregateIgnoreLand();
    drawRankedBar('landChart', landAgg, 'land', LAND_NAMES, {height:420});
    drawLandMap(landAgg);
    drawOrbit(aggregateIgnorePart());
    drawRadialClock(agg);
    drawRidgeline(agg);
    drawYearCompare();
    updateActiveFilterChips();
    renderGlobalFilterBar();
  });
}

/* =========================================================
   INIT (Verkehrsstatistik) — läuft erst, wenn die Ansicht
   zum ersten Mal geöffnet wird (lazy), damit alle Karten/3D-
   Elemente korrekte Container-Maße vorfinden.
   ========================================================= */
let verkehrInitialized = false;
function initVerkehrsDashboard(){
  document.getElementById('resetBtn').addEventListener('click',()=>{
    for(const k in filters){ if(k!=='year') filters[k].clear(); }
    update();
  });

  window.addEventListener('resize', ()=>{ if(verkehrInitialized){ update(); drawYearCompare(); } });

  buildGlobalFilterBar();
  buildYCLegend();
  buildOrbitSelector();
  drawYearCompare();
  document.getElementById('ycInsight').innerHTML = "In der Legende unten frei auswählen, welche Verkehrsteilnehmer verglichen werden sollen — auch <b>Gesamt</b> lässt sich ausblenden. Diese Auswahl ist unabhängig vom Verkehrsmittel-Filter oben, und die <b>Schwere-Auswahl</b> (Getötete/Schwer/Leicht) wirkt hier bewusst nicht — beides wird stattdessen über Legende bzw. die Metrik-Buttons oben gesteuert. <b>Bundesland, Monat, Wochentag, Stunde, Licht- und Straßenverhältnis wirken dagegen wie überall sonst im Dashboard.</b> Zeitraum <b>2020–2024</b> (die Jahre des zugrunde liegenden Rohdatensatzes). Pro Jahr steht eine Gruppe gebündelter Balken, ein Balken je sichtbarer Serie — die <b>Y-Achse beginnt bei 0</b>, wie bei Balkendiagrammen üblich, damit Balkenhöhen direkt vergleichbar bleiben. Zusätzlich verbindet eine dünne <b>Trendlinie</b> die Balkenspitzen jeder Serie über die Jahre hinweg, damit der Verlauf trotz gruppierter Balken sofort sichtbar ist.";

  // static insight text (grounded in the full 2024 dataset)
  document.getElementById('landMapInsight').innerHTML = "Choroplethenkarte: Farbe = Unfallzahl, von blassem Gelb (wenig) über Orange bis Dunkelrot (viel). <b>Der Bundesland-Filter wirkt bewusst nicht auf diese Karte</b> — sonst würde die Auswahl eines Landes alle anderen wegfiltern und den Vergleich unmöglich machen; alle anderen Filter (Zeit, Verkehrsmittel, Schwere, Licht/Straße) gelten weiterhin. Bewusst eine <b>sequenzielle Mehrfarbskala</b> (ColorBrewer YlOrRd) statt eines Grün-Rot-Verlaufs: Unfallzahlen haben keinen natürlichen Mittelpunkt, und Rot-Grün ist für die ca.\u20099&nbsp;% der Menschen mit Rot-Grün-Sehschwäche kaum unterscheidbar. Die Skala ist außerdem <b>wurzelbasiert statt linear</b>, damit auch Unterschiede im Mittelfeld sichtbar bleiben. Bewusst <b>keine Fläche-pro-Einwohner-Normierung</b>. Klick auf ein Bundesland filtert wie im Ranking rechts.";
  document.getElementById('landInsight').innerHTML = "Die <b>Reihenfolge, die Zahl rechts und die Balkenlänge beziehen sich alle nur auf die aktuelle Filterauswahl</b> — keine Anzeige des Anteils am Jahresgesamtwert, die Skala rechnet sich bei jeder Filteränderung komplett neu. <b>Der Bundesland-Filter wirkt bewusst nicht auf dieses Ranking</b> (wie bei der Karte links) — alle anderen Filter schon, auch der neue <b>Jahresfilter</b>. Der Wechsel läuft animiert ab, damit man die Bewegung verfolgen kann, und <b>▲/▼ zeigt die Platzierung ggü. der vorherigen Auswahl</b> (grün = aufgestiegen, rot = abgestiegen). Balkenfarbe = dieselbe wurzelbasierte Gelb-Orange-Rot-Skala wie auf der Karte links. Ohne Jahresfilter (2020–2024 kumuliert): <b>Nordrhein-Westfalen</b> führt bei der Gesamtzahl (271.117), aber <b>Bayern</b> zählt mit 2.217 die meisten <b>Getöteten</b>, vor NRW (1.965) und Niedersachsen (1.566).";
  document.getElementById('orbitInsight').innerHTML = "<b>Größe &amp; Nähe</b> eines Planeten = wie oft diese Kombination vorkommt, der <b>Ring</b> (blass→rot) = wie oft sie schwer/tödlich endet. <b>Verkehrsmittel-Filter wirkt hier bewusst nicht</b> (sonst würde die Auswahl die Kombinationen selbst verzerren) — Bundesland, Jahr, Zeit, Licht/Straße und Schwere-Filter gelten weiterhin. Klick auf ein Verkehrsmittel — oben in der Leiste oder direkt auf einen Planeten — macht es zum Zentrum. Der <b>gestrichelte Planet</b> ('X × X') schätzt Unfälle mit <b>mehreren Fahrzeugen desselben Typs</b> — z.\u2009B. Pkw-mit-Pkw oder Rad-mit-Rad (Schätzung über den Unfalltyp, keine exakte Zahl). Nur 10,4&nbsp;% aller Güterverkehr-Unfälle (2020–2024) sind Alleinunfälle — Lkw sind fast immer in Kollisionen mit anderen verwickelt, Pkw dagegen zu 47,8&nbsp;% allein.";
  document.getElementById('clockInsight').innerHTML = "Radius = Unfallmenge, Farbe = Schwere-Rate. Tagsüber ist die <b>Menge</b> hoch, aber die <b>Schwere gering</b> (7–8&nbsp;Uhr: 14,3–15,2&nbsp;%). Nachts kehrt sich das um: wenige Unfälle, aber um 1–3&nbsp;Uhr enden 25–26&nbsp;% schwer oder tödlich — knapp doppelt so viel wie im Berufsverkehr.";
  document.getElementById('ridgeInsight').innerHTML = "<b>Horizon Graph</b>: jede Zeile ist eine gefaltete Kurve — je kräftiger/dunkler die Farbe an einer Stelle, desto höher der Anteil zu diesem Zeitpunkt (mehrere Farbebenen liegen übereinander und werden zusätzlich von hell nach dunkel eingefärbt, statt die Kurve in die Höhe wachsen zu lassen). So bleibt jedes Verkehrsmittel in einer kompakten Zeile vergleichbar. <b>Klick auf eine Zeile oder ihr Label</b> setzt dieses Verkehrsmittel als Filter (wirkt wie überall im Dashboard auf alle anderen Ansichten) und lässt die gewählte Zeile weich aus der gefalteten Ansicht in eine klassische, frei nach oben wachsende Kurve aufklappen, die auch in die Zeile darüber hineinragen darf. Mit den Buttons oben zwischen <b>Tagesrhythmus</b>, <b>Wochenverlauf</b> und <b>Jahresverlauf</b> umschalten — der Wechsel läuft als sanfter Übergang, nicht abrupt. Im Tagesrhythmus hat jedes Verkehrsmittel einen eigenen Fingerabdruck: <b>Güterverkehr</b> ist flach über den Arbeitstag verteilt (Peak 7&nbsp;Uhr, Lieferverkehr), <b>Fußgänger</b> und <b>Fahrrad</b> zeigen einen scharfen Nachmittagspeak (16–17&nbsp;Uhr, Schulschluss/Feierabend), während <b>Krafträder</b> am Wochenende auf 14&nbsp;Uhr verschieben — Freizeitfahrten statt Pendelverkehr.";

  update();
}

/* =========================================================
   ANSICHTS-NAVIGATION (Start / Verkehrsstatistik)
   ========================================================= */

function showView(name){
  ['start','verkehr'].forEach(v=>{
    document.getElementById('view-'+v).style.display = (v===name)? '':'none';
  });
  if(name==='verkehr'){
    if(!verkehrInitialized){
      verkehrInitialized = true;
      initVerkehrsDashboard();
    } else {
      update();
      drawYearCompare();
    }
  }
  if(name==='start' && typeof window.__tlOnShow==='function'){
    window.__tlOnShow();
  }
}

document.querySelectorAll('[data-view]').forEach(el=>{
  el.addEventListener('click', ()=> showView(el.dataset.view));
});

showView('start');

