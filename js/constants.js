/* =========================================================
   DATA  (vollständiger Unfallatlas 2020-2024, siehe js/data/accidents_data.js)
   columns: [lat, lon, land, month, weekday, hour, kategorie, art, typ1, licht, strasse, participantMask, year]
   Die eigentlichen Daten werden aus js/data/*.js geladen (siehe index.html).
   ========================================================= */

/* =========================================================
   LABELS
   ========================================================= */
const COL = {LAT:0,LON:1,LAND:2,MONTH:3,WD:4,HOUR:5,KAT:6,ART:7,TYP:8,LICHT:9,STR:10,MASK:11,YEAR:12};
const LAND_NAMES = {1:'Schleswig-Holstein',2:'Hamburg',3:'Niedersachsen',4:'Bremen',5:'Nordrhein-Westfalen',6:'Hessen',7:'Rheinland-Pfalz',8:'Baden-Württemberg',9:'Bayern',10:'Saarland',11:'Berlin',12:'Brandenburg',13:'Mecklenburg-Vorpommern',14:'Sachsen',15:'Sachsen-Anhalt',16:'Thüringen'};
const WD_NAMES = {1:'So',2:'Mo',3:'Di',4:'Mi',5:'Do',6:'Fr',7:'Sa'};
const WD_FULL = {1:'Sonntag',2:'Montag',3:'Dienstag',4:'Mittwoch',5:'Donnerstag',6:'Freitag',7:'Samstag'};
const MONTH_NAMES = {1:'Jan',2:'Feb',3:'Mär',4:'Apr',5:'Mai',6:'Jun',7:'Jul',8:'Aug',9:'Sep',10:'Okt',11:'Nov',12:'Dez'};
const ART_NAMES = {0:'Sonstiger Unfall',1:'Zusammenstoß m. anfahrendem/ruhendem Fzg.',2:'Zusammenstoß m. vorausfahrendem/wartendem Fzg.',3:'Zusammenstoß seitlich, gleiche Richtung',4:'Zusammenstoß mit entgegenkommendem Fzg.',5:'Zusammenstoß mit einbiegendem/kreuzendem Fzg.',6:'Zusammenstoß mit Fußgänger',7:'Aufprall auf Fahrbahnhindernis',8:'Abkommen von Fahrbahn nach rechts',9:'Abkommen von Fahrbahn nach links'};
const TYP_NAMES = {1:'Fahrunfall',2:'Abbiegeunfall',3:'Einbiegen / Kreuzen-Unfall',4:'Überschreiten-Unfall',5:'Unfall durch ruhenden Verkehr',6:'Unfall im Längsverkehr',7:'Sonstiger Unfall'};
const LICHT_NAMES = {0:'Tageslicht',1:'Dämmerung',2:'Dunkelheit'};
const STR_NAMES = {0:'Trocken',1:'Nass / feucht',2:'Winterglatt'};
const KAT_COLOR = {1:'var(--signal-red)',2:'var(--kat-severe)',3:'var(--signal-gray)'};
const KAT_NAMES = {1:'Getötete',2:'Schwerverletzte',3:'Leichtverletzte'};
const KAT_DEFS = [{k:1,label:'Getötete',color:'#E8483A'},{k:2,label:'Schwerverletzte',color:'#F2C14E'},{k:3,label:'Leichtverletzte',color:'#8891A0'}];
const PART_DEFS = [
  {bit:1,label:'Fahrrad'},{bit:2,label:'Pkw'},{bit:4,label:'Fußgänger'},
  {bit:8,label:'Kraftrad'},{bit:16,label:'Güterverkehr'},{bit:32,label:'Sonstige'}
];
const PART_PAIRS = [];
for(let i=0;i<PART_DEFS.length;i++){
  for(let j=i+1;j<PART_DEFS.length;j++){ PART_PAIRS.push([PART_DEFS[i],PART_DEFS[j]]); }
}
const N_TOTAL = ACC_DATA.length;

