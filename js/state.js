// DOM refs (safe — scripts load at end of <body>)
const svg=document.getElementById('fp-svg');
const ca=document.getElementById('canvas-area');
function updateSvgDimensions(){
  svg.setAttribute('width',TW); svg.setAttribute('height',TH);
  svg.setAttribute('viewBox',`0 0 ${TW} ${TH}`);
}
updateSvgDimensions();

// Tool state
let tool='wall';
const secs={
  top:   Array(SL).fill('wall'),
  bottom:Array(SL).fill('wall'),
  left:  Array(SS).fill('wall'),
  right: Array(SS).fill('wall'),
};

// Floor lines / interior walls
let floorLines=[], lineId=0, drawLine=null, selLine=null;
let dragWall=null, snapIndicator=null, hoverEndpoint=null;
const SNAP_DIST=14;

// Openings (gaps in interior walls)
let selOpening=null, dragOpening=null, openingId=0;
const OPENING_STD=72;    // 36" — standard door
const OPENING_POCKET=64; // 32" — pocket door

// Furniture
let furniture=[], furnId=0, selFurn=null, dragFurn=null, dragFurnResize=null;

// Zoom & pan
let zoom=1, panX=0, panY=0, isPanning=false, panStart=null, spaceDown=false;

// Undo history
const history=[];
const MAX_HISTORY=50;

function defaults(){
  secs.top[1]=secs.top[2]=secs.top[5]=secs.top[6]='window';
  secs.bottom[3]='door'; secs.bottom[1]=secs.bottom[6]='window';
  secs.left[1]=secs.left[3]='window';
  secs.right[1]=secs.right[3]='window'; secs.right[2]='door';
}
