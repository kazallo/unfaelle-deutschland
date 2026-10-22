/* =========================================================
   ZEITRAFFER (embedded, self-contained IIFE to avoid name clashes)
   ========================================================= */
(function(){
const YEAR_SECONDS = 366*86400;
const N = TL_DATA.length;
const KAT_COLOR_RGB = {1:'232,72,58', 2:'242,193,78', 3:'185,192,203'};
const FLASH_MS = 2000;

const GERMANY_BOUNDS = [[47.27,5.87],[55.06,15.04]];
// Vereinfachte Landesgrenze Deutschlands [lon,lat] (Natural Earth / world.geo.json, ID "DEU")
const GERMANY_OUTLINE = [[9.921906,54.983104],[9.93958,54.596642],[10.950112,54.363607],[10.939467,54.008693],[11.956252,54.196486],[12.51844,54.470371],[13.647467,54.075511],[14.119686,53.757029],[14.353315,53.248171],[14.074521,52.981263],[14.4376,52.62485],[14.685026,52.089947],[14.607098,51.745188],[15.016996,51.106674],[14.570718,51.002339],[14.307013,51.117268],[14.056228,50.926918],[13.338132,50.733234],[12.966837,50.484076],[12.240111,50.266338],[12.415191,49.969121],[12.521024,49.547415],[13.031329,49.307068],[13.595946,48.877172],[13.243357,48.416115],[12.884103,48.289146],[13.025851,47.637584],[12.932627,47.467646],[12.62076,47.672388],[12.141357,47.703083],[11.426414,47.523766],[10.544504,47.566399],[10.402084,47.302488],[9.896068,47.580197],[9.594226,47.525058],[8.522612,47.830828],[8.317301,47.61358],[7.466759,47.620582],[7.593676,48.333019],[8.099279,49.017784],[6.65823,49.201958],[6.18632,49.463803],[6.242751,49.902226],[6.043073,50.128052],[6.156658,50.803721],[5.988658,51.851616],[6.589397,51.852029],[6.84287,52.22844],[7.092053,53.144043],[6.90514,53.482162],[7.100425,53.693932],[7.936239,53.748296],[8.121706,53.527792],[8.800734,54.020786],[8.572118,54.395646],[8.526229,54.962744],[9.282049,54.830865],[9.921906,54.983104]];

const tlMap = L.map('tlMap',{
  scrollWheelZoom:false, zoomControl:false, dragging:false, doubleClickZoom:false,
  touchZoom:false, boxZoom:false, keyboard:false, tap:false
});
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',{
  attribution:'&copy; OpenStreetMap &copy; CARTO', subdomains:'abcd', maxZoom:19
}).addTo(tlMap);

// Seitenverhältnis der Deutschland-Bounds in der Kartenprojektion (nicht das
// simple Lat/Lon-Verhältnis!) — damit der Kartencontainer exakt zur Silhouette
// passt statt oben/unten oder links/rechts Leerraum übrig zu lassen.
const tlBoundsSW = L.CRS.EPSG3857.project(L.latLng(GERMANY_BOUNDS[0][0], GERMANY_BOUNDS[0][1]));
const tlBoundsNE = L.CRS.EPSG3857.project(L.latLng(GERMANY_BOUNDS[1][0], GERMANY_BOUNDS[1][1]));
const GERMANY_ASPECT = Math.abs(tlBoundsNE.x-tlBoundsSW.x) / Math.abs(tlBoundsNE.y-tlBoundsSW.y);
function tlFitMapAspect(){
  const mapEl = document.getElementById('tlMap');
  const w = mapEl.parentElement.clientWidth;
  if(w>0) mapEl.style.height = Math.round(w/GERMANY_ASPECT)+'px';
}
tlFitMapAspect();
tlMap.fitBounds(GERMANY_BOUNDS, {padding:[6,6]});

// Rechte Statistik-Spalte bleibt rechts neben der Karte, startet aber erst
// auf Höhe des Fließtexts unter der Überschrift statt oben bündig mit ihr.
function tlAlignStatsColumn(){
  const header = document.querySelector('.start-header');
  const stats = document.querySelector('.tl-stats-live');
  if(header && stats) stats.style.marginTop = header.getBoundingClientRect().height+'px';
}
tlAlignStatsColumn();

// SVG-ClipPath, das die Karte auf die Silhouette Deutschlands zuschneidet
const clipSvgNS = 'http://www.w3.org/2000/svg';
const clipSvg = document.createElementNS(clipSvgNS,'svg');
clipSvg.setAttribute('width','0'); clipSvg.setAttribute('height','0');
clipSvg.style.position = 'absolute';
const clipDefs = document.createElementNS(clipSvgNS,'defs');
const clipPathEl = document.createElementNS(clipSvgNS,'clipPath');
clipPathEl.setAttribute('id','germanyClip');
clipPathEl.setAttribute('clipPathUnits','userSpaceOnUse');
const clipPathShape = document.createElementNS(clipSvgNS,'path');
clipPathEl.appendChild(clipPathShape);
clipDefs.appendChild(clipPathEl);
clipSvg.appendChild(clipDefs);
document.getElementById('tlMap').parentElement.appendChild(clipSvg);

function updateGermanyClip(){
  let d = '';
  GERMANY_OUTLINE.forEach((pt,i)=>{
    const p = tlMap.latLngToContainerPoint(L.latLng(pt[1], pt[0]));
    d += (i===0?'M':'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1) + ' ';
  });
  d += 'Z';
  clipPathShape.setAttribute('d', d);
}
updateGermanyClip();

const tlCanvas = document.getElementById('tlFlashCanvas');
const tlCtx = tlCanvas.getContext('2d');
function tlResizeCanvas(){
  const mapEl = document.getElementById('tlMap');
  tlCanvas.width = mapEl.clientWidth; tlCanvas.height = mapEl.clientHeight;
  tlCanvas.style.width = mapEl.clientWidth+'px'; tlCanvas.style.height = mapEl.clientHeight+'px';
}
tlResizeCanvas();
window.addEventListener('resize', ()=>{ tlFitMapAspect(); tlAlignStatsColumn(); tlMap.invalidateSize(); tlMap.fitBounds(GERMANY_BOUNDS,{padding:[6,6]}); tlResizeCanvas(); updateGermanyClip(); });
tlMap.on('resize', tlResizeCanvas);
setTimeout(()=>{ tlFitMapAspect(); tlAlignStatsColumn(); tlMap.invalidateSize(); tlMap.fitBounds(GERMANY_BOUNDS,{padding:[6,6]}); tlResizeCanvas(); updateGermanyClip(); }, 250);

let tlPlaying=true, hoursPerSec=1, simSeconds=0, ptr=0, lastFrameTime=null;
let activeFlashes=[], counts={total:0,kat:{1:0,2:0,3:0}};
const tlSeekEl = document.getElementById('tlSeek');
let tlSeeking = false;
if(tlSeekEl){
  tlSeekEl.max = String(YEAR_SECONDS);
  tlSeekEl.addEventListener('input', ()=>{ tlSeekTo(Number(tlSeekEl.value)); });
  const seekStart = ()=>{ tlSeeking=true; tlPlaying=false; };
  const seekEnd = ()=>{ tlSeeking=false; tlPlaying=true; };
  tlSeekEl.addEventListener('pointerdown', seekStart);
  tlSeekEl.addEventListener('pointerup', seekEnd);
  tlSeekEl.addEventListener('pointercancel', seekEnd);
}

const TL_SPEEDS = [0.25,0.5,1,2,4,8,16,32];
const tlSpeedSlider = document.getElementById('tlSpeedSlider');
const tlSpeedSliderLabel = document.getElementById('tlSpeedSliderLabel');
if(tlSpeedSlider){
  tlSpeedSlider.addEventListener('input', ()=>{
    hoursPerSec = TL_SPEEDS[Number(tlSpeedSlider.value)];
    if(tlSpeedSliderLabel) tlSpeedSliderLabel.textContent = hoursPerSec+'×';
  });
}

// Monatsmarken unter dem Zeit-Regler (Tagesoffset ab 1.1.2024 in % der Jahreslänge)
const tlMonthTicksEl = document.getElementById('tlMonthTicks');
if(tlMonthTicksEl){
  const monthAbbr = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
  for(let m=0;m<12;m++){
    const dayOffset = (Date.UTC(2024,m,1) - Date.UTC(2024,0,1))/86400000;
    const tick = document.createElement('span');
    tick.className = 'tl-month-tick';
    tick.style.left = (dayOffset/366*100)+'%';
    tick.textContent = monthAbbr[m];
    tlMonthTicksEl.appendChild(tick);
  }
}

const MAX_NEW_PER_FRAME=600;
function tlFmt(n){ return n.toLocaleString('de-DE'); }

function tlDateFromSeconds(s){
  const d = new Date(Date.UTC(2024,0,1,0,0,0) + s*1000);
  const dd=String(d.getUTCDate()).padStart(2,'0'), mm=String(d.getUTCMonth()+1).padStart(2,'0');
  const hh=String(d.getUTCHours()).padStart(2,'0'), mi=String(d.getUTCMinutes()).padStart(2,'0');
  return `${dd}.${mm}.2024 · ${hh}:${mi}`;
}

function tlBinarySearch(sec){
  let lo=0, hi=N;
  while(lo<hi){ const mid=(lo+hi)>>1; if(TL_DATA[mid][0]<sec) lo=mid+1; else hi=mid; }
  return lo;
}
function tlSeekTo(sec){
  simSeconds = Math.max(0,Math.min(YEAR_SECONDS,sec));
  ptr = tlBinarySearch(simSeconds);
  activeFlashes = [];
  counts = {total:ptr, kat:{1:0,2:0,3:0}};
  for(let i=0;i<ptr;i++){ counts.kat[TL_DATA[i][3]]++; }
  tlUpdateReadout();
  tlDrawFrame();
}
function tlUpdateReadout(){
  document.getElementById('tlCurDate').textContent = tlDateFromSeconds(simSeconds);
  document.getElementById('tlCurTotal').textContent = tlFmt(counts.total);
  document.getElementById('tlCurDead').textContent = tlFmt(counts.kat[1]);
  document.getElementById('tlCurSevere').textContent = tlFmt(counts.kat[2]);
  document.getElementById('tlCurLight').textContent = tlFmt(counts.kat[3]);
  // Alle Balken teilen sich denselben Maßstab (Gesamt-Endsumme N), damit ihre
  // Längen direkt die tatsächlichen Größenverhältnisse zwischen den Kategorien zeigen.
  document.getElementById('tlBarTotal').style.width = (N? counts.total/N*100 : 0)+'%';
  document.getElementById('tlBarDead').style.width = (N? counts.kat[1]/N*100 : 0)+'%';
  document.getElementById('tlBarSevere').style.width = (N? counts.kat[2]/N*100 : 0)+'%';
  document.getElementById('tlBarLight').style.width = (N? counts.kat[3]/N*100 : 0)+'%';
  if(!tlSeeking) tlSeekEl.value = Math.round(simSeconds);
}

function tlDrawFrame(){
  tlCtx.clearRect(0,0,tlCanvas.width,tlCanvas.height);
  const now = performance.now();
  let visible=0;
  for(const f of activeFlashes){
    const age = now-f.start;
    if(age>FLASH_MS) continue;
    visible++;
    const t = age/FLASH_MS;
    const pt = tlMap.latLngToContainerPoint([f.lat,f.lon]);
    if(pt.x<-20||pt.y<-20||pt.x>tlCanvas.width+20||pt.y>tlCanvas.height+20) continue;
    const radius = 2.5+6*(1-Math.pow(1-t,2));
    const opacity = Math.max(0,1-Math.pow(t,1.6));
    const rgb = KAT_COLOR_RGB[f.kat];
    const grad = tlCtx.createRadialGradient(pt.x,pt.y,0,pt.x,pt.y,radius*2.2);
    grad.addColorStop(0,`rgba(${rgb},${opacity})`);
    grad.addColorStop(0.45,`rgba(${rgb},${opacity*0.4})`);
    grad.addColorStop(1,`rgba(${rgb},0)`);
    tlCtx.fillStyle=grad;
    tlCtx.beginPath(); tlCtx.arc(pt.x,pt.y,radius*2.2,0,2*Math.PI); tlCtx.fill();
    tlCtx.fillStyle=`rgba(255,255,255,${Math.min(1,opacity*1.1)})`;
    tlCtx.beginPath(); tlCtx.arc(pt.x,pt.y,Math.max(1,radius*0.35),0,2*Math.PI); tlCtx.fill();
  }
  const diag = document.getElementById('tlDiag');
  if(diag) diag.textContent = `aktive Punkte: ${visible} · Zeiger: ${tlFmt(ptr)}/${tlFmt(N)}`;
}

let tlLastDomUpdate=0;
function tlFrame(ts){
  requestAnimationFrame(tlFrame);
  if(lastFrameTime===null) lastFrameTime=ts;
  const realDeltaMs = ts-lastFrameTime;
  lastFrameTime = ts;

  if(tlPlaying && ptr<N){
    const simDeltaSec = (realDeltaMs/1000)*hoursPerSec*3600;
    const newSimSeconds = Math.min(YEAR_SECONDS, simSeconds+simDeltaSec);
    const startPtr = ptr;
    while(ptr<N && TL_DATA[ptr][0]<=newSimSeconds){ ptr++; }
    const consumed = ptr-startPtr;
    if(consumed>0){
      counts.total += consumed;
      let sampleStep = consumed>MAX_NEW_PER_FRAME ? Math.ceil(consumed/MAX_NEW_PER_FRAME) : 1;
      for(let i=startPtr;i<ptr;i++){
        const row = TL_DATA[i];
        counts.kat[row[3]]++;
        if((i-startPtr)%sampleStep===0){
          activeFlashes.push({lat:row[1],lon:row[2],kat:row[3],start:performance.now()});
        }
      }
    }
    simSeconds = newSimSeconds;
    if(activeFlashes.length>4000) activeFlashes.splice(0,activeFlashes.length-4000);
    activeFlashes = activeFlashes.filter(f=>performance.now()-f.start<=FLASH_MS);
    if(ptr>=N){
      tlSeekTo(0);
    } else if(ts-tlLastDomUpdate>90){
      tlLastDomUpdate=ts;
      tlUpdateReadout();
    }
  }
  tlDrawFrame();
}
requestAnimationFrame(tlFrame);

tlSeekTo(0);

window.__tlOnShow = function(){
  tlFitMapAspect();
  tlAlignStatsColumn();
  tlMap.invalidateSize();
  tlMap.fitBounds(GERMANY_BOUNDS,{padding:[6,6]});
  tlResizeCanvas();
  updateGermanyClip();
};
})();
