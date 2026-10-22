/* =========================================================
   FILTER STATE
   ========================================================= */
const filters = {land:new Set(),year:new Set([2024]),month:new Set(),weekday:new Set(),hour:new Set(),licht:new Set(),strasse:new Set(),part:new Set(),kat:new Set()};

function toggle(set,val){ set.has(val) ? set.delete(val) : set.add(val); }
function anyFilterActive(){ return Object.keys(filters).some(k=> k!=='year' && filters[k].size>0); }

function rowPasses(r){
  if(filters.land.size && !filters.land.has(r[COL.LAND])) return false;
  if(filters.year.size && !filters.year.has(r[COL.YEAR])) return false;
  if(filters.month.size && !filters.month.has(r[COL.MONTH])) return false;
  if(filters.weekday.size && !filters.weekday.has(r[COL.WD])) return false;
  if(filters.hour.size && !filters.hour.has(r[COL.HOUR])) return false;
  if(filters.licht.size && !filters.licht.has(r[COL.LICHT])) return false;
  if(filters.strasse.size && !filters.strasse.has(r[COL.STR])) return false;
  if(filters.kat.size && !filters.kat.has(r[COL.KAT])) return false;
  if(filters.part.size){
    let ok=false; for(const b of filters.part){ if(r[COL.MASK]&b){ok=true;break;} }
    if(!ok) return false;
  }
  return true;
}

/* =========================================================
   AGGREGATION (single pass)
   ========================================================= */
function aggregate(){
  const agg = {
    total:0, kat:{1:0,2:0,3:0},
    land:{}, month:{}, weekday:{}, hour:{}, typ:{}, art:{}, licht:{}, strasse:{},
    part:{1:0,2:0,4:0,8:0,16:0,32:0},
    solo:{1:0,2:0,4:0,8:0,16:0,32:0},
    selfColl:{1:0,2:0,4:0,8:0,16:0,32:0}, selfCollSevere:{1:0,2:0,4:0,8:0,16:0,32:0},
    landKat:{}, typKat:{}, artKat:{},
    hourKat:{}, coOcc:{}, coOccSevere:{}, hourByPart:{}, weekdayByPart:{}, monthByPart:{}
  };
  for(let k=1;k<=16;k++) agg.land[k]=0;
  for(let k=1;k<=12;k++){ agg.month[k]=0; }
  for(let k=1;k<=7;k++) agg.weekday[k]=0;
  for(let k=0;k<=23;k++) agg.hour[k]=0;
  for(let k=1;k<=7;k++) agg.typ[k]=0;
  for(let k=0;k<=9;k++) agg.art[k]=0;
  for(let k=0;k<=2;k++){ agg.licht[k]=0; agg.strasse[k]=0; }
  for(const p of PART_DEFS) agg.hourByPart[p.bit]=new Array(24).fill(0);
  for(const p of PART_DEFS) agg.weekdayByPart[p.bit]=new Array(7).fill(0);
  for(const p of PART_DEFS) agg.monthByPart[p.bit]=new Array(12).fill(0);
  agg.hourCond = Array.from({length:24},()=>new Array(9).fill(0));
  agg.hourCondSevere = Array.from({length:24},()=>new Array(9).fill(0));
  agg.hourCondDead = Array.from({length:24},()=>new Array(9).fill(0));

  const data = ACC_DATA;
  for(let i=0;i<data.length;i++){
    const r = data[i];
    if(!rowPasses(r)) continue;
    agg.total++;
    agg.kat[r[COL.KAT]]++;
    agg.land[r[COL.LAND]]++;
    agg.month[r[COL.MONTH]]++;
    agg.weekday[r[COL.WD]]++;
    agg.hour[r[COL.HOUR]]++;
    agg.typ[r[COL.TYP]]++;
    agg.art[r[COL.ART]]++;
    agg.licht[r[COL.LICHT]]++;
    agg.strasse[r[COL.STR]]++;

    for(const p of PART_DEFS){ if(r[COL.MASK]&p.bit){
      agg.part[p.bit]++; agg.hourByPart[p.bit][r[COL.HOUR]]++;
      agg.weekdayByPart[p.bit][r[COL.WD]-1]++;
      agg.monthByPart[p.bit][r[COL.MONTH]-1]++;
    } }
    { const m=r[COL.MASK]; if(m===1||m===2||m===4||m===8||m===16||m===32){
        agg.solo[m]=(agg.solo[m]||0)+1;
        if(r[COL.TYP]!==1){
          agg.selfColl[m]=(agg.selfColl[m]||0)+1;
          if(r[COL.KAT]===1||r[COL.KAT]===2) agg.selfCollSevere[m]=(agg.selfCollSevere[m]||0)+1;
        }
      }
    }
    for(const pair of PART_PAIRS){
      if((r[COL.MASK]&pair[0].bit) && (r[COL.MASK]&pair[1].bit)){
        const ck = pair[0].bit+'-'+pair[1].bit;
        agg.coOcc[ck] = (agg.coOcc[ck]||0)+1;
        if(r[COL.KAT]===1||r[COL.KAT]===2) agg.coOccSevere[ck] = (agg.coOccSevere[ck]||0)+1;
      }
    }

    const tk = r[COL.TYP]*10+r[COL.KAT]; agg.typKat[tk]=(agg.typKat[tk]||0)+1;
    const ak = r[COL.ART]*10+r[COL.KAT]; agg.artKat[ak]=(agg.artKat[ak]||0)+1;
    const hk = r[COL.HOUR]*10+r[COL.KAT]; agg.hourKat[hk]=(agg.hourKat[hk]||0)+1;
    const ringIdx = r[COL.LICHT]*3 + r[COL.STR];
    agg.hourCond[r[COL.HOUR]][ringIdx]++;
    if(r[COL.KAT]===1||r[COL.KAT]===2) agg.hourCondSevere[r[COL.HOUR]][ringIdx]++;
    if(r[COL.KAT]===1) agg.hourCondDead[r[COL.HOUR]][ringIdx]++;
  }
  return scaleCounts(agg);
}

// ACC_DATA enthält seit dem Umstieg auf den vollständigen Unfallatlas 100% der
// Zeilen (keine Stichprobe mehr) — SAMPLE_SCALE bleibt als No-Op-Faktor stehen,
// damit hier keine weiteren Aufrufer angepasst werden mussten.
const SAMPLE_SCALE = 1;
function scaleCounts(obj){
  if(typeof obj === 'number') return Math.round(obj*SAMPLE_SCALE);
  if(Array.isArray(obj)) return obj.map(scaleCounts);
  if(obj && typeof obj === 'object'){
    const out = {};
    for(const k in obj) out[k] = scaleCounts(obj[k]);
    return out;
  }
  return obj;
}

// precompute static totals (unfiltered) once for "ghost" bars & rates
// "Gesamt"-Referenz bezieht sich auf das aktuell gewählte Jahr (Pflichtauswahl) ohne
// sonstige Filter — wird bei jedem Jahreswechsel neu berechnet (siehe selectYear()).
let TOTAL_AGG = aggregateAllPass();
function aggregateAllPass(){
  const empty = {land:new Set(),year:filters.year,month:new Set(),weekday:new Set(),hour:new Set(),licht:new Set(),strasse:new Set(),part:new Set(),kat:new Set()};
  const bak = {}; for(const k in filters){ bak[k]=filters[k]; filters[k]=empty[k]; }
  const a = aggregate();
  for(const k in filters){ filters[k]=bak[k]; }
  return a;
}

// Für den Kollisions-Orbit: alle Filter respektieren AUSSER Verkehrsmittel,
// damit dieser Filter gezielt keinen Effekt auf diese eine Visualisierung hat.
function aggregateIgnorePart(){
  const bakPart = filters.part;
  filters.part = new Set();
  const a = aggregate();
  filters.part = bakPart;
  return a;
}

// Für Karte + Ranking "Unfälle je Land": alle Filter respektieren AUSSER
// Bundesland, damit ein ausgewähltes Land dort nicht alle anderen wegfiltert
// und den Vergleich zunichtemacht — der Bundesland-Filter wirkt aber weiterhin
// auf alle anderen Panels.
function aggregateIgnoreLand(){
  const bak = filters.land;
  filters.land = new Set();
  const a = aggregate();
  filters.land = bak;
  return a;
}

// Für den Jahresvergleich: gruppiert ACC_DATA nach Jahr (statt nach dem
// Pflicht-Jahresfilter zu filtern) und respektiert Bundesland/Monat/Wochentag/
// Stunde/Licht/Straße — bewusst OHNE Verkehrsmittel-, Schwere- und Jahresfilter,
// da diese im Jahresvergleich über die Legende bzw. die X-Achse selbst bedient werden.
function aggregateYearCompare(){
  const result = {};
  const data = ACC_DATA;
  for(let i=0;i<data.length;i++){
    const r = data[i];
    if(filters.land.size && !filters.land.has(r[COL.LAND])) continue;
    if(filters.month.size && !filters.month.has(r[COL.MONTH])) continue;
    if(filters.weekday.size && !filters.weekday.has(r[COL.WD])) continue;
    if(filters.hour.size && !filters.hour.has(r[COL.HOUR])) continue;
    if(filters.licht.size && !filters.licht.has(r[COL.LICHT])) continue;
    if(filters.strasse.size && !filters.strasse.has(r[COL.STR])) continue;

    const yr = r[COL.YEAR];
    let yd = result[yr];
    if(!yd) yd = result[yr] = {total:0,dead:0,severe:0,light:0,part:{}};
    yd.total++;
    if(r[COL.KAT]===1) yd.dead++; else if(r[COL.KAT]===2) yd.severe++; else if(r[COL.KAT]===3) yd.light++;

    for(const p of PART_DEFS){
      if(r[COL.MASK] & p.bit){
        let pd = yd.part[p.bit];
        if(!pd) pd = yd.part[p.bit] = {total:0,dead:0,severe:0,light:0};
        pd.total++;
        if(r[COL.KAT]===1) pd.dead++; else if(r[COL.KAT]===2) pd.severe++; else if(r[COL.KAT]===3) pd.light++;
      }
    }
  }
  return scaleCounts(result);
}

