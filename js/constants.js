const NS='http://www.w3.org/2000/svg';
// Scale: 24px = 1ft  (1/4"=1ft, displayed at comfortable screen size)
const SC=24, W_PX=Math.round(4/12*SC); // 8px wall
const SEC=4*SC; // 96px per 4ft section
let IW=32,IH=20;
let IPW=IW*SC,IPH=IH*SC; // 768 x 480
let TW=IPW+W_PX*2,TH=IPH+W_PX*2; // 784 x 496
let SL=8,SS=5; // sections long/short

// ── WALL / SECTION COLOURS ──
const COL_WALL_FILL   = '#2a2420';
const COL_WALL_STROKE = '#1a1410';
const COL_SEC_FILL    = '#5a4e46';
const COL_SEC_STROKE  = '#3a2e28';
const COL_DOOR_FILL   = '#e8d8b0';
const COL_DOOR_STROKE = '#b09040';

function recalcDims(){
  IPW=IW*SC; IPH=IH*SC;
  TW=IPW+W_PX*2; TH=IPH+W_PX*2;
}

function e(tag,a={}){
  const el=document.createElementNS(NS,tag);
  for(const[k,v]of Object.entries(a))el.setAttribute(k,v);
  return el;
}
