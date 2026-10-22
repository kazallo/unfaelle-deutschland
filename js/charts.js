/* =========================================================
   GENERIC HORIZONTAL BAR CHART (single severity color, ghost total)
   dim: filters key, dataKey: agg field, names: label map, sortDesc bool
   ========================================================= */
/* =========================================================
   CHOROPLETHENKARTE — Bundesländer (Session 6: Maps & Spatial Vis)
   d3.geoMercator + geoPath, Farbe = Unfallzahl (sequenziell, wie Session 5
   empfiehlt), Klick filtert dasselbe Bundesland-Filter wie das Ranking daneben.
   ========================================================= */
let landMapProjection = null, landMapPath = null;

function drawLandMap(agg){
  const svg = d3.select('#landMapChart'); svg.selectAll('*').remove();
  const el = document.getElementById('landMapChart');
  const width = el.clientWidth||560, height=420;
  svg.attr('viewBox',`0 0 ${width} ${height}`);

  landMapProjection = d3.geoMercator().fitSize([width-4,height-4], BUNDESLAND_GEO);
  landMapPath = d3.geoPath().projection(landMapProjection);

  const maxCur = d3.max(Object.values(agg.land))||1;
  const colorScale = d3.scaleSequentialSqrt(d3.interpolateYlOrRd).domain([0, maxCur]);

  const g = svg.append('g').attr('transform','translate(2,2)');

  g.selectAll('path.land-shape').data(BUNDESLAND_GEO.features).join('path')
    .attr('class','land-shape')
    .attr('d', landMapPath)
    .attr('fill', d=>{
      const code = d.properties.code;
      const cur = agg.land[code]||0;
      if(anyFilterActive() && cur===0) return '#1B1E24';
      return colorScale(cur);
    })
    .attr('stroke', d=> filters.land.has(d.properties.code) ? '#fff' : '#0D0F13')
    .attr('stroke-width', d=> filters.land.has(d.properties.code) ? 2 : 0.75)
    .style('cursor','pointer')
    .on('click',(evt,d)=>{ toggle(filters.land, d.properties.code); update(); })
    .on('mousemove',(evt,d)=>{
      const code = d.properties.code;
      const cur = agg.land[code]||0, total = TOTAL_AGG.land[code]||0;
      showTip(`<b>${LAND_NAMES[code]}</b><br>Unfälle (Auswahl): ${fmt(cur)}<br>Gesamtjahr: ${fmt(total)}`, evt);
    }).on('mouseleave',hideTip);
}


let landPrevRanks = null;

function drawRankedBar(svgId, agg, dimKey, namesMap, opts={}){
  const svg = d3.select('#'+svgId);
  const el = document.getElementById(svgId);
  const isLand = dimKey==='land';
  const width = el.clientWidth || 560;
  const margin = {top:4,right:54,bottom:4,left: opts.leftWidth || (isLand? 195:150)};
  const keys = Object.keys(namesMap).map(Number);
  let entries = keys.map(k=>({key:k,total:TOTAL_AGG[dimKey][k]||0, val: agg[dimKey][k]||0}));

  // Beim Bundesland-Ranking: Reihenfolge folgt der aktuellen Auswahl, nicht dem Jahresgesamtwert
  if(isLand) entries.sort((a,b)=> b.val-a.val || b.total-a.total);
  else entries.sort((a,b)=>b.total-a.total);
  entries.forEach((e,i)=>{ e.rank = i+1; });

  // Rang-Änderung ggü. der vorherigen Anzeige ermitteln (nur Bundesland-Ranking)
  if(isLand){
    if(!anyFilterActive()){
      entries.forEach(e=>{ e.delta = 0; });
      landPrevRanks = {}; entries.forEach(e=>{ landPrevRanks[e.key]=e.rank; });
    } else {
      const prev = landPrevRanks || {};
      entries.forEach(e=>{ e.delta = (prev[e.key]!==undefined)? prev[e.key]-e.rank : 0; });
      landPrevRanks = {}; entries.forEach(e=>{ landPrevRanks[e.key]=e.rank; });
    }
  } else {
    entries.forEach(e=>{ e.delta = 0; });
  }

  const height = opts.height || (entries.length*(opts.rowH||24) + 8);
  const rowH = opts.height ? (opts.height-8)/entries.length : (opts.rowH || 24);
  svg.attr('height',height).attr('viewBox',`0 0 ${width} ${height}`);
  const innerW = width-margin.left-margin.right;
  const maxCur = d3.max(entries,d=>d.val)||1;
  const x = d3.scaleLinear().domain([0, maxCur*1.08]).range([0,innerW]);
  const colorScale = d3.scaleSequentialSqrt(d3.interpolateYlOrRd).domain([0, maxCur]);

  let g = svg.select('g.rb-root');
  if(g.empty()) g = svg.append('g').attr('class','rb-root').attr('transform',`translate(${margin.left},${margin.top})`);

  const rows = g.selectAll('g.row').data(entries, d=>d.key);

  const rowsEnter = rows.enter().append('g').attr('class','row')
    .attr('transform',(d,i)=>`translate(0,${i*rowH})`);

  rowsEnter.append('text').attr('class','bar-rank-delta').attr('x',-margin.left+6).attr('y',rowH/2+4).attr('text-anchor','start');
  rowsEnter.append('text').attr('class','bar-rank-num').attr('x',-152).attr('y',rowH/2+4).attr('text-anchor','end');
  rowsEnter.append('text').attr('class','bar-label').attr('x',-144).attr('y',rowH/2+4).attr('text-anchor','start')
    .append('title');
  rowsEnter.append('rect').attr('class','bar-cat').attr('x',0).attr('y',2).attr('height',rowH-6).attr('rx',1.5)
    .on('click',(evt,d)=>{ toggle(filters[dimKey], d.key); update(); })
    .on('mousemove',(evt,d)=>{
      showTip(`<b>${namesMap[d.key]}</b><br>Ausgewählt: ${fmt(d.val)}<br>Gesamt: ${fmt(d.total)}`, evt);
    })
    .on('mouseleave',hideTip);
  rowsEnter.append('text').attr('class','bar-value').attr('y',rowH/2+4);

  const rowsMerge = rowsEnter.merge(rows);

  rowsMerge.select('text.bar-rank-delta')
    .text(d=> d.delta>0? `▲${d.delta}` : d.delta<0? `▼${Math.abs(d.delta)}` : '')
    .attr('fill', d=> d.delta>0? 'var(--signal-teal, #2FBF8F)' : d.delta<0? 'var(--signal-red)' : 'transparent');

  rowsMerge.select('text.bar-rank-num').text(d=>`${d.rank}.`);

  rowsMerge.select('text.bar-label')
    .text(d=>{
      const lbl = namesMap[d.key]; return lbl.length>20? lbl.slice(0,18)+'…':lbl;
    })
    .select('title').text(d=>namesMap[d.key]);

  rowsMerge.select('rect.bar-cat')
    .attr('fill', d=> isLand
      ? ((anyFilterActive() && d.val===0)? '#1B1E24' : colorScale(d.val))
      : (opts.color||'#4E7FFF'))
    .attr('opacity', d=> filters[dimKey].size===0 || filters[dimKey].has(d.key) ? 1 : 0.28);

  rowsMerge.select('text.bar-value').text(d=>fmt(d.val));

  const t = g.transition().duration(2200).ease(d3.easeCubicInOut);
  rowsMerge.transition(t).attr('transform',(d,i)=>`translate(0,${i*rowH})`);
  rowsMerge.select('rect.bar-cat').transition(t).attr('width',d=>x(d.val));
  rowsMerge.select('text.bar-value').transition(t).attr('x',d=>x(d.val)+6);

  rows.exit().remove();
}

/* =========================================================
   STACKED SEVERITY BAR (typ / art) — bars split by Kat 1/2/3
   ========================================================= */
function drawStackedSeverity(svgId, agg, dimKey, namesMap, katMapKey){
  const svg = d3.select('#'+svgId);
  svg.selectAll('*').remove();
  const el = document.getElementById(svgId);
  const width = el.clientWidth || 560;
  const margin = {top:4,right:60,bottom:4,left:200};
  const keys = Object.keys(namesMap).map(Number);
  let entries = keys.map(k=>{
    const total = TOTAL_AGG[dimKey][k]||0;
    const c1 = TOTAL_AGG[katMapKey][k*10+1]||0, c2=TOTAL_AGG[katMapKey][k*10+2]||0, c3=TOTAL_AGG[katMapKey][k*10+3]||0;
    return {key:k, total, c1,c2,c3, val: agg[dimKey][k]||0};
  });
  entries.sort((a,b)=>b.total-a.total);
  const rowH = 30;
  const height = entries.length*rowH+8;
  svg.attr('height',height).attr('viewBox',`0 0 ${width} ${height}`);
  const innerW = width-margin.left-margin.right;
  const x = d3.scaleLinear().domain([0,d3.max(entries,d=>d.total)*1.05]).range([0,innerW]);
  const g = svg.append('g').attr('transform',`translate(${margin.left},${margin.top})`);

  const rows = g.selectAll('g.row').data(entries).join('g').attr('class','row')
    .attr('transform',(d,i)=>`translate(0,${i*rowH})`);

  rows.append('text').attr('x',-8).attr('y',rowH/2+4).attr('text-anchor','end').attr('class','bar-label')
    .text(d=>{const lbl=namesMap[d.key]; return lbl.length>30? lbl.slice(0,28)+'…':lbl;})
    .append('title').text(d=>namesMap[d.key]);

  rows.append('rect').attr('class','bar-ghost').attr('y',3).attr('height',rowH-8).attr('width',d=>x(d.total)).attr('rx',1.5);

  rows.each(function(d){
    const gRow = d3.select(this);
    const isSel = filters[dimKey].has(d.key);
    const dim = filters[dimKey].size>0 && !isSel;
    const segs = [
      {k:'c3',color:'#8891A0'}, {k:'c2',color:'#F5A623'}, {k:'c1',color:'#E8483A'}
    ];
    let cum=0;
    const frac = d.total? d.val/d.total : 0;
    segs.forEach(seg=>{
      const segTotal = d[seg.k];
      const segFiltered = segTotal * (d.total? d.val/d.total : 0); // approx proportional (for visual only)
      const w = x(segTotal);
      gRow.append('rect')
        .attr('x', x(cum)).attr('y',3).attr('height',rowH-8).attr('width',w)
        .attr('fill',seg.color).attr('opacity', dim?0.22:0.95)
        .attr('class','bar-cat')
        .on('click',()=>{ toggle(filters[dimKey], d.key); update(); })
        .on('mousemove',(evt)=>{
          showTip(`<b>${namesMap[d.key]}</b><br>Getötete: ${fmt(d.c1)}<br>Schwerverletzte: ${fmt(d.c2)}<br>Leichtverletzte: ${fmt(d.c3)}<br>Schwer+tödlich: ${fmtPct((d.c1+d.c2)/d.total)}`, evt);
        })
        .on('mouseleave',hideTip);
      cum += segTotal;
    });
  });

  rows.append('text').attr('class','bar-value').attr('x',d=>x(d.total)+6).attr('y',rowH/2+4)
    .text(d=> fmtPct((d.c1+d.c2)/d.total) + ' schwer' );
}

/* =========================================================
   JAHRESVERGLEICH — nach Verkehrsmittel
   Wird live aus ACC_DATA berechnet (gruppiert nach Jahr) und respektiert
   Bundesland/Monat/Wochentag/Stunde/Licht/Straße — bewusst OHNE
   Verkehrsmittel- (Legende übernimmt das), Schwere- und Jahresfilter
   (Jahr ist die X-Achse selbst). Dadurch auf 2020–2024 begrenzt, den
   Jahren, die im 2024er-Rohdatensatz enthalten sind.
   ========================================================= */
const YC_MODE_DEFS = [
  {key:'Rad', bit:1, label:'Fahrrad', color:'#4E7FFF'},
  {key:'PKW', bit:2, label:'Pkw', color:'#9AA1AC'},
  {key:'Fuss', bit:4, label:'Fußgänger', color:'#2FBF8F'},
  {key:'Krad', bit:8, label:'Kraftrad', color:'#F5A623'},
  {key:'Gkfz', bit:16, label:'Güterverkehr', color:'#B98CE8'},
  {key:'Sonstige', bit:32, label:'Sonstige', color:'#E8483A'},
];
const YC_YEARS = [...new Set(ACC_DATA.map(r=>r[COL.YEAR]))].sort((a,b)=>a-b);
let ycMetric = 'count';

function ycValue(ycAgg, year, def, metric){
  const yd = ycAgg[year];
  if(!yd) return null;
  const totalStats = {total:yd.total, dead:yd.dead, severe:yd.severe, light:yd.light};
  const stats = def.key==='total' ? totalStats : yd.part[def.bit];
  if(!stats) return null;

  if(metric==='count') return stats.total;
  if(metric==='share') return totalStats.total? stats.total/totalStats.total*100 : null;
  if(metric==='rate') return stats.total? (stats.dead+stats.severe)/stats.total*100 : null;
  return null;
}

const YC_ALL_DEFS = [{key:'total',label:'Gesamt',color:'#EDEEF1'}, ...YC_MODE_DEFS];
let ycVisible = new Set(['total', ...YC_MODE_DEFS.map(m=>m.key)]);

function ycActiveDefs(){
  return YC_ALL_DEFS.filter(d=>ycVisible.has(d.key));
}

function buildYCLegend(){
  const box = document.getElementById('ycLegend');
  if(!box) return;
  YC_ALL_DEFS.forEach(d=>{
    const item = document.createElement('div');
    item.className='yc-legend-item';
    item.dataset.key = d.key;
    item.innerHTML = `<span class="sw" style="background:${d.color}"></span>${d.label}`;
    item.addEventListener('click',()=>{
      if(ycVisible.has(d.key)) ycVisible.delete(d.key); else ycVisible.add(d.key);
      drawYearCompare();
    });
    box.appendChild(item);
  });
  document.querySelectorAll('.yc-metric-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.yc-metric-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      ycMetric = btn.dataset.metric;
      drawYearCompare();
    });
  });
}

function renderYCLegendState(){
  document.querySelectorAll('#ycLegend .yc-legend-item').forEach(item=>{
    item.classList.toggle('off', !ycVisible.has(item.dataset.key));
  });
}

function drawYearCompare(){
  const svg = d3.select('#ycChart');
  const el = document.getElementById('ycChart');
  if(!el) return;
  const width = el.clientWidth||900, height=420;
  const margin={top:16,right:20,bottom:42,left:54};
  svg.attr('viewBox',`0 0 ${width} ${height}`);
  const innerW=width-margin.left-margin.right, innerH=height-margin.top-margin.bottom;

  let g = svg.select('g.yc-root');
  if(g.empty()) g = svg.append('g').attr('class','yc-root').attr('transform',`translate(${margin.left},${margin.top})`);

  const activeDefs = ycActiveDefs();
  const ycAgg = aggregateYearCompare();

  // äußere Bandskala = Jahr-Gruppen, innere Bandskala = ein Balken je sichtbarer Serie
  const x0 = d3.scaleBand().domain(YC_YEARS).range([0,innerW]).paddingInner(0.32).paddingOuter(0.12);
  const x1 = d3.scaleBand().domain(activeDefs.map(d=>d.key)).range([0,x0.bandwidth()]).padding(0.12);

  let allVals = [];
  activeDefs.forEach(d=>{ YC_YEARS.forEach(yr=>{ const v=ycValue(ycAgg,yr,d,ycMetric); if(v!==null && !isNaN(v)) allVals.push(v); }); });
  const yMax = d3.max(allVals)||1;
  const y = d3.scaleLinear().domain([0, yMax*1.08]).range([innerH,0]).nice();

  const t = g.transition().duration(900).ease(d3.easeCubicInOut);

  // Hintergrund (Gridlines, Achsenbeschriftung) — unverändert bei jedem Aufruf neu gezeichnet,
  // da hier keine Verschiebung nötig ist (Fokus liegt auf den Balken selbst)
  g.selectAll('g.yc-bg').remove();
  const bg = g.insert('g',':first-child').attr('class','yc-bg');
  y.ticks(5).forEach(tk=>{
    bg.append('line').attr('class','gridline').attr('x1',0).attr('x2',innerW).attr('y1',y(tk)).attr('y2',y(tk));
    const label = ycMetric==='count'? d3.format('.2s')(tk) : tk.toFixed(0)+'%';
    bg.append('text').attr('class','yc-land-label').attr('x',-8).attr('y',y(tk)+3).attr('text-anchor','end').text(label);
  });
  YC_YEARS.forEach(yr=>{
    bg.append('text').attr('class','yc-year-label').attr('x',x0(yr)+x0.bandwidth()/2).attr('y',innerH+22).attr('text-anchor','middle').text(yr);
  });

  // Balken — pro Jahr eine Gruppe, ein Balken je sichtbarer Serie (per Key gejoint,
  // dadurch sanfte Übergänge bei Metrik-/Legendenwechsel statt Neuaufbau)
  let barData = [];
  YC_YEARS.forEach(yr=>{
    activeDefs.forEach(d=>{
      const v = ycValue(ycAgg, yr, d, ycMetric);
      const valid = v!==null && !isNaN(v);
      barData.push({key:d.key+'-'+yr, seriesKey:d.key, color:d.color, yr, v: valid?v:0, valid});
    });
  });

  const barSel = g.selectAll('rect.yc-bar').data(barData, d=>d.key);
  barSel.exit().transition(t).attr('y',innerH).attr('height',0).style('opacity',0).remove();

  const barEnter = barSel.enter().append('rect').attr('class','yc-bar')
    .attr('x', d=>x0(d.yr)+x1(d.seriesKey)).attr('width', x1.bandwidth())
    .attr('y', innerH).attr('height',0).attr('rx',1.5)
    .attr('fill', d=>d.color).style('opacity',0)
    .on('mousemove',function(evt){
      const d = d3.select(this).datum();
      const defLabel = YC_ALL_DEFS.find(o=>o.key===d.seriesKey).label;
      showTip(`<b>${defLabel} · ${d.yr}</b><br>Wert: ${ycMetric==='count'?fmt(d.v):d.v.toFixed(1)+'%'}`, evt);
    })
    .on('mouseleave',hideTip);

  barEnter.merge(barSel).attr('fill', d=>d.color).style('opacity', d=>d.valid?1:0)
    .transition(t)
    .attr('x', d=>x0(d.yr)+x1(d.seriesKey)).attr('width', x1.bandwidth())
    .attr('y', d=> d.valid? y(d.v) : innerH)
    .attr('height', d=> d.valid? innerH-y(d.v) : 0);

  // Trendlinien — verbinden die Balkenspitzen je Serie über die Jahre,
  // damit der Verlauf trotz gruppierter Balken sofort ablesbar ist
  const centerX = d => x0(d.yr)+x1(d.seriesKey)+x1.bandwidth()/2;
  const lineGen = pts => d3.line().curve(d3.curveMonotoneX).x(centerX).y(p=>y(p.v))(pts);

  const trendSeries = activeDefs.map(d=>{
    const pts = YC_YEARS.map(yr=>{
      const v = ycValue(ycAgg, yr, d, ycMetric);
      return {seriesKey:d.key, yr, v: (v!==null && !isNaN(v))? v : null};
    }).filter(p=>p.v!==null);
    return {key:d.key, color:d.color, pts};
  });

  let trendG = g.select('g.yc-trend');
  if(trendG.empty()) trendG = g.append('g').attr('class','yc-trend').style('pointer-events','none');

  const haloSel = trendG.selectAll('path.yc-trend-halo').data(trendSeries, d=>d.key);
  haloSel.exit().transition(t).style('opacity',0).remove();
  const haloEnter = haloSel.enter().append('path').attr('class','yc-trend-halo')
    .attr('fill','none').attr('stroke','#0D0F13').attr('stroke-width',2.6)
    .attr('stroke-linecap','round').attr('stroke-linejoin','round').style('opacity',0);
  haloEnter.merge(haloSel).transition(t).attr('d',d=>lineGen(d.pts)).style('opacity',0.8);

  const lineSel = trendG.selectAll('path.yc-trend-line').data(trendSeries, d=>d.key);
  lineSel.exit().transition(t).style('opacity',0).remove();
  const lineEnter = lineSel.enter().append('path').attr('class','yc-trend-line')
    .attr('fill','none').attr('stroke-width',1.3).attr('stroke-dasharray','4,3')
    .attr('stroke-linecap','round').attr('stroke-linejoin','round').style('opacity',0);
  lineEnter.merge(lineSel).attr('stroke', d=>d.color)
    .transition(t).attr('d',d=>lineGen(d.pts)).style('opacity',1);

  let trendDots = [];
  trendSeries.forEach(s=> s.pts.forEach(p=> trendDots.push({key:s.key+'-'+p.yr, color:s.color, v:p.v, cx:centerX(p)})));
  const dotSel = trendG.selectAll('circle.yc-trend-dot').data(trendDots, d=>d.key);
  dotSel.exit().transition(t).style('opacity',0).remove();
  const trendDotEnter = dotSel.enter().append('circle').attr('class','yc-trend-dot')
    .attr('r',3.2).attr('stroke','#0D0F13').attr('stroke-width',1.3).style('opacity',0)
    .attr('cx', d=>d.cx).attr('cy', d=>y(d.v));
  trendDotEnter.merge(dotSel).attr('fill', d=>d.color)
    .transition(t).attr('cx', d=>d.cx).attr('cy', d=>y(d.v)).style('opacity',1);

  trendG.raise();

  renderYCLegendState();
}

/* =========================================================
   KOLLISIONS-ORBIT — interaktive Auswahl des Zentrums
   Klick auf einen Verkehrsteilnehmer (Auswahlleiste oder Planet)
   macht ihn zum Zentrum; die anderen ordnen sich als "Planeten"
   an — näher & größer = häufigere gemeinsame Unfälle.
   ========================================================= */
const ORBIT_COLORS = {1:'#4E7FFF',2:'#9AA1AC',4:'#2FBF8F',8:'#F5A623',16:'#B98CE8',32:'#E8483A'};
let orbitCenter = 2; // Standard: Pkw
let lastOrbitAgg = null;

function coOccVal(agg,bitA,bitB){
  const lo=Math.min(bitA,bitB), hi=Math.max(bitA,bitB);
  return agg.coOcc[lo+'-'+hi]||0;
}
function coOccSevereVal(agg,bitA,bitB){
  const lo=Math.min(bitA,bitB), hi=Math.max(bitA,bitB);
  return agg.coOccSevere[lo+'-'+hi]||0;
}

function buildOrbitSelector(){
  const box = document.getElementById('orbitSelector');
  if(!box) return;
  PART_DEFS.forEach(p=>{
    const btn = document.createElement('button');
    btn.className='orbit-btn'; btn.dataset.bit = p.bit;
    btn.style.setProperty('--oc', ORBIT_COLORS[p.bit]);
    btn.innerHTML = `<span class="dot"></span>${p.label}`;
    btn.addEventListener('click', ()=>{ orbitCenter = p.bit; drawOrbit(lastOrbitAgg||TOTAL_AGG); });
    box.appendChild(btn);
  });
  // unsichtbarer Zwilling in der Unfall-Uhr-Kachel, damit deren Zentrum
  // exakt auf Höhe des Orbit-Zentrums liegt (gleiche Zeilenumbrüche garantiert)
  const spacer = document.getElementById('clockSpacer');
  if(spacer) spacer.innerHTML = box.innerHTML;
}
function renderOrbitSelectorState(){
  document.querySelectorAll('#orbitSelector .orbit-btn').forEach(btn=>{
    btn.classList.toggle('active', Number(btn.dataset.bit)===orbitCenter);
  });
}

// Skaliert eine SVG-Textauswahl so herunter, dass sie nie breiter als der
// verfügbare Kreisdurchmesser wird — verhindert überstehende Zahlen/Labels
// in kleinen Orbit-Planeten, unabhängig von Ziffernanzahl oder Textlänge.
function fitCircleText(sel, diameter, maxSize, minSize){
  sel.style('font-size', maxSize+'px');
  const avail = diameter*0.82;
  const width = sel.node().getBBox().width;
  if(width > avail){
    sel.style('font-size', Math.max(minSize, maxSize*avail/width)+'px');
  }
}

function drawOrbit(agg){
  lastOrbitAgg = agg;
  const svg = d3.select('#orbitChart'); svg.selectAll('*').remove();
  const el = document.getElementById('orbitChart');
  const width = el.clientWidth||560, height=420;
  svg.attr('viewBox',`0 0 ${width} ${height}`);
  const cx = width/2, cy = height/2+6;
  const maxOrbitR = Math.min(width,height)/2 - 46;
  const minOrbitR = 44;

  const centerDef = PART_DEFS.find(p=>p.bit===orbitCenter);
  const others = PART_DEFS.filter(p=>p.bit!==orbitCenter);
  const pairs = others.map(p=>{
    const count = coOccVal(agg, orbitCenter, p.bit);
    const severe = coOccSevereVal(agg, orbitCenter, p.bit);
    return { def:p, count, severe, rate: count? severe/count : null, isSelf:false };
  });
  const selfCount = agg.selfColl[orbitCenter]||0;
  const selfSevere = agg.selfCollSevere[orbitCenter]||0;
  pairs.push({
    def:{bit:null, label:centerDef.label+' × '+centerDef.label},
    count:selfCount, severe:selfSevere,
    rate: selfCount? selfSevere/selfCount : null, isSelf:true
  });
  const maxCount = d3.max(pairs, d=>d.count) || 1;

  const rScale = d3.scaleLinear().domain([0,maxCount]).range([maxOrbitR,minOrbitR]);
  const sizeScale = d3.scaleSqrt().domain([0,maxCount]).range([11,32]);
  const widthScale = d3.scaleLinear().domain([0,maxCount]).range([1,9]);

  const validRates = pairs.map(p=>p.rate).filter(r=>r!==null);
  const rateColor = d3.scaleSequential(d3.interpolateYlOrRd)
    .domain([(d3.min(validRates)||0.05)*0.85, d3.max(validRates)||0.3]);

  const g = svg.append('g');

  [0.3,0.55,0.8,1].forEach(f=>{
    g.append('circle').attr('cx',cx).attr('cy',cy).attr('r', minOrbitR+f*(maxOrbitR-minOrbitR))
      .attr('fill','none').attr('stroke','var(--hairline)').attr('stroke-dasharray','2,4');
  });

  const angleStep = (2*Math.PI)/Math.max(1,pairs.length);
  pairs.forEach((pr,i)=>{
    const angle = -Math.PI/2 + i*angleStep;
    const r = rScale(pr.count);
    pr.x = cx+Math.cos(angle)*r; pr.y = cy+Math.sin(angle)*r; pr.r = r;
  });

  pairs.forEach(pr=>{
    g.append('line').attr('class','orbit-link')
      .attr('x1',cx).attr('y1',cy).attr('x2',pr.x).attr('y2',pr.y)
      .attr('stroke', ORBIT_COLORS[pr.def.bit||orbitCenter]).attr('stroke-width', widthScale(pr.count))
      .attr('stroke-dasharray', pr.isSelf? '4,3' : null);
  });

  const centerTotal = agg.part[orbitCenter]||0;
  const centerR = Math.max(30, Math.min(52, 22+Math.sqrt(centerTotal)/10));
  const soloN = agg.solo[orbitCenter]||0;
  const soloPct = centerTotal? (soloN/centerTotal*100) : 0;

  const centerG = g.append('g').style('cursor','default')
    .on('mousemove',(evt)=>{
      showTip(`<b>${centerDef.label}</b><br>Gesamt-Beteiligungen: ${fmt(centerTotal)}<br>Alleinunfälle: ${fmt(soloN)} (${soloPct.toFixed(1)}%)`, evt);
    }).on('mouseleave',hideTip);
  centerG.append('circle').attr('cx',cx).attr('cy',cy).attr('r',centerR)
    .attr('fill', ORBIT_COLORS[orbitCenter]).attr('stroke','#0D0F13').attr('stroke-width',2);
  const centerLabelText = centerG.append('text').attr('x',cx).attr('y',cy-3).attr('text-anchor','middle')
    .style('font-family','var(--font-mono)').style('font-weight',700).style('fill','#0D0F13')
    .text(centerDef.label);
  fitCircleText(centerLabelText, centerR*2, 12.5, 7);
  const centerCountText = centerG.append('text').attr('x',cx).attr('y',cy+13).attr('text-anchor','middle')
    .style('font-family','var(--font-mono)').style('fill','#0D0F13')
    .text(fmt(centerTotal));
  fitCircleText(centerCountText, centerR*2, 9.5, 6.5);

  pairs.forEach(pr=>{
    const nr = sizeScale(pr.count);
    const node = g.append('g').attr('class','orbit-node')
      .style('cursor', pr.isSelf? 'default':'pointer')
      .on('click', ()=>{ if(!pr.isSelf){ orbitCenter = pr.def.bit; drawOrbit(agg); } })
      .on('mousemove',(evt)=>{
        const body = pr.isSelf
          ? `Unfälle mit mehreren ${centerDef.label}<br>(Schätzung: kein Fahrunfall, nur ${centerDef.label} beteiligt): ${fmt(pr.count)}<br>davon schwer/tödlich: ${pr.rate===null?'–':fmtPct(pr.rate)}`
          : `gemeinsame Unfälle: ${fmt(pr.count)}<br>davon schwer/tödlich: ${pr.rate===null?'–':fmtPct(pr.rate)}`;
        showTip(`<b>${pr.def.label}</b><br>${body}`, evt);
      }).on('mouseleave',hideTip);
    if(pr.rate!==null){
      node.append('circle').attr('cx',pr.x).attr('cy',pr.y).attr('r',nr+5)
        .attr('fill','none').attr('stroke', rateColor(pr.rate)).attr('stroke-width',3.5).attr('opacity',0.95);
    }
    node.append('circle').attr('cx',pr.x).attr('cy',pr.y).attr('r',nr)
      .attr('fill', ORBIT_COLORS[pr.def.bit||orbitCenter]).attr('opacity',0.92)
      .attr('stroke','#0D0F13').attr('stroke-width',1.5)
      .attr('stroke-dasharray', pr.isSelf? '3,2' : null);
    node.append('text').attr('x',pr.x).attr('y',pr.y-nr-12).attr('text-anchor','middle')
      .attr('class','orbit-label').text(pr.isSelf? centerDef.label+' ×2':pr.def.label);
    const nodeCountText = node.append('text').attr('x',pr.x).attr('y',pr.y+3.5).attr('text-anchor','middle')
      .style('font-family','var(--font-mono)').style('fill','#0D0F13').style('pointer-events','none')
      .text(fmt(pr.count));
    fitCircleText(nodeCountText, nr*2, 9.5, 6);
  });

  renderOrbitSelectorState();
}

/* =========================================================
   RADIAL CLOCK — 24h Kreisdiagramm, Radius=Anzahl, Farbe=Schwere-Rate
   ========================================================= */
function drawRadialClock(agg){
  const svg = d3.select('#clockChart'); svg.selectAll('*').remove();
  const el = document.getElementById('clockChart');
  const width = el.clientWidth||560, height=420;
  svg.attr('viewBox',`0 0 ${width} ${height}`);
  const cx=width/2, cy=height/2+6;
  const outerR = Math.min(width,height)/2 - 46, innerR = 22;
  const g = svg.append('g').attr('transform',`translate(${cx},${cy})`);

  const hours = d3.range(0,24);
  const maxCount = d3.max(hours,h=>TOTAL_AGG.hour[h]); // stable scale domain
  const r = d3.scaleSqrt().domain([0,maxCount]).range([innerR,outerR]);
  const angle = d3.scaleLinear().domain([0,24]).range([0,2*Math.PI]);

  function severityRateHour(h){
    const total = agg.hour[h]||0;
    if(!total) return null;
    const sev = (agg.hourKat[h*10+1]||0)+(agg.hourKat[h*10+2]||0);
    return sev/total;
  }
  const rates = hours.map(severityRateHour).filter(v=>v!==null);
  const maxRate = d3.max(rates)||0.3, minRate = d3.min(rates)||0.1;
  const color = d3.scaleSequential(d3.interpolateYlOrRd).domain([minRate*0.9,maxRate]);

  const ghostArc = d3.arc().innerRadius(innerR).outerRadius(h=>r(TOTAL_AGG.hour[h]))
    .startAngle(h=>angle(h)).endAngle(h=>angle(h+1)).padAngle(0.012).padRadius(innerR);
  const valArc = d3.arc().innerRadius(innerR).outerRadius(h=>r(agg.hour[h]||0))
    .startAngle(h=>angle(h)).endAngle(h=>angle(h+1)).padAngle(0.012).padRadius(innerR);

  // hour ring guides (track)
  hours.forEach(h=>{
    g.append('path')
      .attr('d', d3.arc().innerRadius(innerR).outerRadius(outerR).startAngle(angle(h)).endAngle(angle(h+1)).padAngle(0.012)())
      .attr('fill','#171A1F');
  });

  // ghost = total dataset shape
  g.selectAll('.clockghost').data(hours).join('path')
    .attr('d',h=>ghostArc(h)).attr('fill','#2A2F38').style('pointer-events','none');

  // filled = current filtered selection, colored by severity rate
  g.selectAll('.clockwedge').data(hours).join('path')
    .attr('d',h=>valArc(h))
    .attr('fill',h=>{ const rate=severityRateHour(h); return rate===null? '#2A2F38' : color(rate); })
    .attr('opacity',h=> filters.hour.size===0 || filters.hour.has(h) ? 1 : 0.35)
    .attr('stroke',h=>filters.hour.has(h)?'#fff':'#0D0F13').attr('stroke-width',h=>filters.hour.has(h)?2:1)
    .style('cursor','pointer')
    .on('click',(evt,h)=>{ toggle(filters.hour,h); update(); })
    .on('mousemove',(evt,h)=>{
      const rate = severityRateHour(h);
      showTip(`<b>${h}:00–${h+1}:00</b><br>Unfälle (Auswahl): ${fmt(agg.hour[h]||0)}<br>Gesamt: ${fmt(TOTAL_AGG.hour[h])}<br>Schwer/tödlich: ${rate===null?'–':fmtPct(rate)}`, evt);
    }).on('mouseleave',hideTip);

  hours.forEach(h=>{
    if(h%3!==0) return;
    const a = angle(h+0.5)-Math.PI/2;
    const lx = Math.cos(a)*(outerR+16), ly = Math.sin(a)*(outerR+16);
    g.append('text').attr('x',lx).attr('y',ly).attr('text-anchor','middle').attr('dy','0.35em')
      .attr('class','cell-hm-label').text(h+':00');
  });
  g.append('text').attr('text-anchor','middle').attr('dy','0.35em').attr('class','bar-label').text('24h');
}

/* =========================================================
   HORIZON GRAPH — Tagesrhythmus je Verkehrsmittel (normalisiert)
   Statt hoher überlappender Ridgeline-Kurven wird der Wertebereich
   in Bänder gefaltet: mehr Bänder übereinander = kräftigere Farbe,
   dadurch bleibt jede Zeile kompakt bei voller Detailtiefe.
   ========================================================= */
let ridgeMode = 'hour';
let lastRidgeAgg = null;
const WD_ORDER = [2,3,4,5,6,7,1]; // Mo..So (Rohdaten: 1=Sonntag..7=Samstag)
const HORIZON_BANDS = 4;
const HORIZON_BAND_OPACITY = [0.30,0.55,0.78,1];
const HORIZON_BAND_OPACITY_DIM = [0.05,0.09,0.13,0.17];
const horizonColorCache = {};
function horizonBandColor(baseHex, b){
  const key = baseHex+'|'+b;
  if(horizonColorCache[key]) return horizonColorCache[key];
  const light = d3.rgb(baseHex).brighter(1.7);
  const dark = d3.rgb(baseHex).darker(1.6);
  const t = b/(HORIZON_BANDS-1);
  const c = d3.interpolateRgb(light, dark)(t);
  horizonColorCache[key] = c;
  return c;
}

const RIDGE_ROW_H = 78, RIDGE_ROW_GAP = 20;
const RIDGE_T_MS = 1000;
let ridgeBuiltMode = null;

function ridgeSeriesConfig(mode){
  if(mode==='weekday'){
    return {
      n:7, seriesFn: (agg,bit) => WD_ORDER.map(wd=> agg.weekdayByPart[bit][wd-1]),
      tickIdx: d3.range(0,7), tickLabelFn: idx => WD_FULL[WD_ORDER[idx]].slice(0,2),
      peakLabelFn: idx => WD_FULL[WD_ORDER[idx]]
    };
  } else if(mode==='month'){
    return {
      n:12, seriesFn: (agg,bit) => d3.range(1,13).map(m=> agg.monthByPart[bit][m-1]),
      tickIdx: d3.range(0,12), tickLabelFn: idx => MONTH_NAMES[idx+1], peakLabelFn: idx => MONTH_NAMES[idx+1]
    };
  }
  return {
    n:24, seriesFn: (agg,bit) => agg.hourByPart[bit],
    tickIdx: d3.range(0,24,3), tickLabelFn: idx => idx+':00', peakLabelFn: idx => idx+':00 Uhr'
  };
}

// Ein ausgewähltes Verkehrsmittel (angeklickte Zeile) blendet sanft von den
// gefalteten Horizon-Bändern auf eine normale, ungefaltete Flächenkurve um —
// so bleibt der Vergleich kompakt, während die Detailform der Auswahl in
// gewohnter Form sichtbar wird.
function drawRidgeline(agg){
  lastRidgeAgg = agg;
  const svg = d3.select('#ridgeChart');
  const existing = svg.select('g.ridge-content');
  if(existing.empty() || ridgeBuiltMode!==ridgeMode){
    svg.selectAll('*').remove();
    buildRidgeContent(svg, agg, 1);
    ridgeBuiltMode = ridgeMode;
  } else {
    updateRidgeContent(existing, agg);
  }
}

const RIDGE_OVERLAP = 1.6;

function buildRidgeContent(svg, agg, startOpacity){
  const el = document.getElementById('ridgeChart');
  const width = el.clientWidth||900;
  const rowH = RIDGE_ROW_H, rowGap = RIDGE_ROW_GAP;
  // margin.top reserviert Platz für die ausgewählte Zeile: die wächst wie im
  // klassischen Ridgeline-Diagramm über ihre eigene Zeile hinaus nach oben.
  const margin={top:56,right:24,bottom:34,left:130};
  const innerH = PART_DEFS.length*(rowH+rowGap) - rowGap;
  const height = margin.top+innerH+margin.bottom;
  svg.attr('viewBox',`0 0 ${width} ${height}`).attr('height',height);
  const innerW=width-margin.left-margin.right;
  const g = svg.append('g').attr('class','ridge-content').style('opacity',startOpacity)
    .attr('transform',`translate(${margin.left},${margin.top})`);

  const colors = ['#4E7FFF','#E8483A','#F5A623','#2FBF8F','#B98CE8','#8891A0'];
  const cfg = ridgeSeriesConfig(ridgeMode);
  const { seriesFn, tickIdx, tickLabelFn, peakLabelFn } = cfg;

  const x = d3.scalePoint().domain(d3.range(cfg.n)).range([0,innerW]).padding(0.5);

  tickIdx.forEach(idx=>{
    g.append('line').attr('class','gridline').attr('x1',x(idx)).attr('x2',x(idx)).attr('y1',0).attr('y2',innerH);
  });

  const rowsData = [];
  PART_DEFS.forEach((p,i)=>{
    const series = seriesFn(agg,p.bit);
    const total = d3.sum(series);
    const dens = series.map(v=> total? v/total : 0);
    const maxDens = d3.max(dens) || 0;
    const rowY = i*(rowH+rowGap);
    const isDim = filters.part.size>0 && !filters.part.has(p.bit);
    const isSelected = filters.part.has(p.bit);
    rowsData.push({p,color:colors[i],series,total,dens,maxDens,rowY,isDim,isSelected});
    const rowG = g.append('g').attr('class','ridge-row').attr('data-bit',p.bit).attr('transform',`translate(0,${rowY})`);

    rowG.append('rect').attr('class','horizon-track').attr('width',innerW).attr('height',rowH)
      .attr('fill','#171A1F').attr('rx',2);

    if(total>0){
      const clipId = `ridge-clip-${ridgeMode}-${i}`;
      rowG.append('clipPath').attr('id',clipId).append('rect').attr('width',innerW).attr('height',rowH);

      const clippedG = rowG.append('g').attr('clip-path',`url(#${clipId})`).style('pointer-events','none');

      const bandMax = maxDens/HORIZON_BANDS || 1e-9;
      const bandsG = clippedG.append('g').attr('class','horizon-bands')
        .style('opacity', isSelected? 0 : (isDim? 0.35 : 1));
      for(let b=0;b<HORIZON_BANDS;b++){
        const y1 = d => rowH - (d/bandMax)*rowH + b*rowH;
        const area = d3.area().curve(d3.curveBasis).x((d,idx)=>x(idx)).y0(rowH).y1(y1);
        bandsG.append('path').datum(dens)
          .attr('d',area).attr('fill',horizonBandColor(colors[i],b))
          .attr('opacity', isDim? HORIZON_BAND_OPACITY_DIM[b] : HORIZON_BAND_OPACITY[b]);
      }
    } else {
      rowG.append('line').attr('x1',0).attr('x2',innerW).attr('y1',rowH).attr('y2',rowH)
        .attr('stroke','var(--hairline)').attr('stroke-width',1);
    }

    rowG.append('rect').attr('class','ridge-hit').attr('width',innerW).attr('height',rowH)
      .datum({total,dens,maxDens,peakLabelFn,p})
      .attr('fill','transparent').style('cursor','pointer')
      .on('click',()=>{ toggle(filters.part,p.bit); update(); })
      .on('mousemove',function(evt){
        const d = d3.select(this).datum();
        if(d.total===0){ showTip(`<b>${d.p.label}</b><br>n=0`, evt); return; }
        const peakIdx = d.dens.indexOf(d.maxDens);
        showTip(`<b>${d.p.label}</b><br>Peak: ${d.peakLabelFn(peakIdx)} (${fmtPct(d.maxDens)} der ${d.p.label}-Unfälle in dieser Auswahl)<br>n=${fmt(d.total)}`, evt);
      }).on('mouseleave',hideTip);

    g.append('text').attr('x',-10).attr('y',rowY+rowH/2+4).attr('text-anchor','end')
      .attr('class','bar-label').style('cursor','pointer')
      .on('click',()=>{ toggle(filters.part,p.bit); update(); })
      .text(p.label);
  });

  // Overlay-Ebene: normale, ungefaltete Kurve für die aktuell ausgewählte(n)
  // Zeile(n) — bewusst über allen Zeilen und clip-technisch bis in den
  // reservierten Rand oben, damit sie wie im klassischen Ridgeline-Diagramm
  // über ihre eigene Zeile hinaus in die Zeile(n) darüber hineinwachsen kann.
  const overlayClipId = `ridge-overlay-clip-${ridgeMode}`;
  g.append('clipPath').attr('id',overlayClipId).append('rect')
    .attr('x',0).attr('y',-margin.top).attr('width',innerW).attr('height',innerH+margin.top);
  const overlayG = g.append('g').attr('class','ridge-overlay')
    .attr('clip-path',`url(#${overlayClipId})`).style('pointer-events','none');

  rowsData.forEach(({p,color,dens,maxDens,total,rowY,isDim,isSelected})=>{
    if(total===0) return;
    const areaUnfold = ridgeUnfoldArea(x, maxDens, rowH);
    overlayG.append('g').attr('class','ridge-normal-wrap').attr('data-bit',p.bit)
      .attr('transform',`translate(0,${rowY})`)
      .append('path').attr('class','ridge-normal-area').datum(dens)
      .attr('d',areaUnfold).attr('fill',color).attr('stroke',color).attr('stroke-width',1.6)
      .style('opacity', isSelected? (isDim?0.3:1) : 0);
  });

  g.append('g').attr('transform',`translate(0,${innerH})`).selectAll('text').data(tickIdx).join('text')
    .attr('class','cell-hm-label').attr('x',idx=>x(idx)).attr('y',14).attr('text-anchor','middle').text(tickLabelFn);

  return g;
}

// Erzeugt die "entfaltete" Flächenform einer Zeile: Grundlinie am unteren
// Rand der eigenen Zeile, Spitze darf bis zum RIDGE_OVERLAP-fachen der
// Zeilenhöhe nach oben wachsen (klassischer Ridgeline-Überlapp-Effekt).
function ridgeUnfoldArea(x, maxDens, rowH){
  const y = d3.scaleLinear().domain([0,maxDens||1]).range([0, rowH*RIDGE_OVERLAP]);
  return d3.area().curve(d3.curveBasis).x((d,idx)=>x(idx)).y0(rowH).y1(d=> rowH - y(d));
}

// Update ohne Neuaufbau: bestehende Zeilen bleiben erhalten, nur Kurvenform
// und Bänder-/Normalansicht-Deckkraft transitionieren sanft in die neue Form.
function updateRidgeContent(g, agg){
  const el = document.getElementById('ridgeChart');
  const width = el.clientWidth||900;
  const rowH = RIDGE_ROW_H;
  const margin={left:130,right:24};
  const innerW = width-margin.left-margin.right;
  const cfg = ridgeSeriesConfig(ridgeMode);
  const x = d3.scalePoint().domain(d3.range(cfg.n)).range([0,innerW]).padding(0.5);
  const t = d3.transition().duration(RIDGE_T_MS).ease(d3.easeCubicInOut);

  PART_DEFS.forEach(p=>{
    const series = cfg.seriesFn(agg,p.bit);
    const total = d3.sum(series);
    const dens = series.map(v=> total? v/total : 0);
    const maxDens = d3.max(dens) || 0;
    const isDim = filters.part.size>0 && !filters.part.has(p.bit);
    const isSelected = filters.part.has(p.bit);
    const rowG = g.select(`g.ridge-row[data-bit="${p.bit}"]`);
    if(rowG.empty() || total===0) return;

    const bandsG = rowG.select('g.horizon-bands');
    const bandMax = maxDens/HORIZON_BANDS || 1e-9;
    bandsG.selectAll('path').each(function(_,b){
      const y1 = d => rowH - (d/bandMax)*rowH + b*rowH;
      const area = d3.area().curve(d3.curveBasis).x((d,idx)=>x(idx)).y0(rowH).y1(y1);
      d3.select(this).datum(dens).attr('opacity', isDim? HORIZON_BAND_OPACITY_DIM[b] : HORIZON_BAND_OPACITY[b])
        .transition(t).attr('d',area);
    });
    bandsG.transition(t).style('opacity', isSelected? 0 : (isDim? 0.35 : 1));

    const areaUnfold = ridgeUnfoldArea(x, maxDens, rowH);
    g.select(`g.ridge-overlay g.ridge-normal-wrap[data-bit="${p.bit}"] path.ridge-normal-area`).datum(dens)
      .transition(t).attr('d',areaUnfold).style('opacity', isSelected? (isDim?0.3:1) : 0);

    rowG.select('rect.ridge-hit').datum({total,dens,maxDens,peakLabelFn:cfg.peakLabelFn,p});
  });
}

function switchRidgeMode(mode){
  if(mode===ridgeMode) return;
  ridgeMode = mode;
  document.querySelectorAll('.ridge-mode-btn').forEach(b=> b.classList.toggle('active', b.dataset.mode===mode));

  const svg = d3.select('#ridgeChart');
  const oldG = svg.select('g.ridge-content');
  if(!oldG.empty()){
    oldG.transition().duration(650).ease(d3.easeCubicInOut).style('opacity',0).remove();
  }
  const newG = buildRidgeContent(svg, lastRidgeAgg||TOTAL_AGG, 0);
  newG.transition().duration(1100).ease(d3.easeCubicInOut).style('opacity',1);
  ridgeBuiltMode = ridgeMode;
}
document.querySelectorAll('.ridge-mode-btn').forEach(btn=>{
  btn.addEventListener('click', ()=> switchRidgeMode(btn.dataset.mode));
});

