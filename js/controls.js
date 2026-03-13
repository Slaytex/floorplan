// ── UNDO ──
function saveHistory(){
  history.push({
    secs:JSON.parse(JSON.stringify(secs)),
    floorLines:JSON.parse(JSON.stringify(floorLines)),
    furniture:JSON.parse(JSON.stringify(furniture)),
    IW,IH,SL,SS,
  });
  if(history.length>MAX_HISTORY)history.shift();
}
function undo(){
  if(!history.length){setStatus('Nothing to undo');return;}
  const snap=history.pop();
  ['top','bottom','left','right'].forEach(s=>secs[s]=snap.secs[s]);
  floorLines=snap.floorLines;
  furniture=snap.furniture;
  IW=snap.IW;IH=snap.IH;SL=snap.SL;SS=snap.SS;
  recalcDims();updateSvgDimensions();
  selLine=null;selFurn=null;selOpening=null;
  dragWall=null;dragOpening=null;
  updateDimDisplay();
  render();
  setStatus('Undo');
}

// ── CONTROLS ──
function setTool(t){
  tool=t; hoverEndpoint=null;
  document.querySelectorAll('.tbtn[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===t));
  svg.style.cursor=t==='floor-line'?'crosshair':t==='select'?'default':'pointer';
  const msgs={
    'wall':'Click wall sections to paint solid',
    'window':'Click wall sections to add windows',
    'door':'Click wall sections to add doors',
    'floor-line':'Click & drag to draw room divider lines (snaps to 1ft grid)',
    'door-sidelight':'Click wall sections to add door+sidelight (36″ door + 8″ sidelight) · Right-click cycles 4 variants: sidelight left/right × swing in/out',
    'select':'Click walls/furniture to select · Delete key removes · Right-click rotates 90° · ⌥Right-click rotates 45°',
  };
  setStatus(msgs[t]||'');
}
function deleteSelected(){
  saveHistory();
  if(selOpening!==null){
    const ln=floorLines.find(l=>l.id===selOpening.lineId);
    if(ln&&ln.openings) ln.openings=ln.openings.filter(o=>o.id!==selOpening.openingId);
    selOpening=null;
  } else if(selLine!==null){
    floorLines=floorLines.filter(l=>l.id!==selLine);
    selLine=null;
  } else if(selFurn!==null){
    furniture=furniture.filter(f=>f.id!==selFurn);
    selFurn=null;
  }
  render();
}
function addOpening(width=OPENING_STD){
  if(selLine===null){setStatus('Select a wall first, then add opening');return;}
  const ln=floorLines.find(l=>l.id===selLine);
  if(!ln)return;
  const wallLen=Math.abs(ln.x2-ln.x1)+Math.abs(ln.y2-ln.y1);
  if(wallLen<width+8){setStatus(`Wall too short for a ${Math.round(width/SC*12)}″ opening`);return;}
  saveHistory();
  if(!ln.openings) ln.openings=[];
  // If an opening on this wall is already selected, replace it rather than stack a new one
  const existing=selOpening&&selOpening.lineId===ln.id
    ?ln.openings.find(o=>o.id===selOpening.openingId):null;
  if(existing){
    existing.width=width;
    existing.offset=Math.max(0,Math.min(wallLen-width,existing.offset));
  } else {
    const offset=(wallLen-width)/2;
    ln.openings.push({id:crypto.randomUUID(),offset,width});
    selOpening={lineId:ln.id,openingId:ln.openings[ln.openings.length-1].id};
  }
  render();
  setStatus(`${Math.round(width/SC*12)}″ opening — drag to reposition`);
}
function clearLines(){if(confirm('Clear all interior walls?')){saveHistory();floorLines=[];selLine=null;selOpening=null;render();}}
function resetPlan(){
  if(!confirm('Reset entire plan?'))return;
  saveHistory();
  IW=32;IH=20;SL=8;SS=5;recalcDims();updateSvgDimensions();
  secs.top=Array(SL).fill('wall');secs.bottom=Array(SL).fill('wall');
  secs.left=Array(SS).fill('wall');secs.right=Array(SS).fill('wall');
  floorLines=[];furniture=[];
  selLine=null;selFurn=null;selOpening=null;
  dragWall=null;dragOpening=null;
  snapIndicator=null;hoverEndpoint=null;
  defaults();updateDimDisplay();render();
}
function resizePlan(direction){
  if(direction==='right-'&&SL<=2){setStatus('Minimum width reached (8ft)');return;}
  if(direction==='bottom-'&&SS<=2){setStatus('Minimum height reached (8ft)');return;}
  if(direction==='bottom'&&IH>=32){setStatus('⚠ 32′ depth is reaching the structural limit of this system — consider adding a second structure');return;}
  saveHistory();
  if(direction==='right') {IW+=4;SL+=1;secs.top.push('wall');secs.bottom.push('wall');}
  if(direction==='right-'){IW-=4;SL-=1;secs.top.pop();secs.bottom.pop();}
  if(direction==='bottom') {IH+=4;SS+=1;secs.left.push('wall');secs.right.push('wall');}
  if(direction==='bottom-'){IH-=4;SS-=1;secs.left.pop();secs.right.pop();}
  recalcDims();updateSvgDimensions();
  updateDimDisplay();
  render();
  setStatus(`Plan resized to ${IW}′ × ${IH}′`);
}
function updateDimDisplay(){
  const el=id=>document.getElementById(id);
  if(el('dim-interior'))el('dim-interior').textContent=`${IW}′ × ${IH}′`;
  const owFt=Math.floor(TW/SC),owIn=Math.round((TW/SC-owFt)*12);
  const ohFt=Math.floor(TH/SC),ohIn=Math.round((TH/SC-ohFt)*12);
  if(el('dim-overall'))el('dim-overall').textContent=`${owFt}′${owIn}″ × ${ohFt}′${ohIn}″`;
  if(el('dim-sections'))el('dim-sections').textContent=`4′ × ${SL}+${SS}=${SL+SS}`;
}

// ── COUNTER SIZE MODAL ──
let _cmFurnId=null;
function svgToScreen(sx,sy){
  const pt=svg.createSVGPoint();pt.x=sx;pt.y=sy;
  const r=pt.matrixTransform(svg.getScreenCTM());
  return{x:r.x,y:r.y};
}
function showCounterModal(f,svgCx,svgCy){
  _cmFurnId=f.id;
  const sc=svgToScreen(svgCx,svgCy);
  const m=document.getElementById('counter-modal');
  const iw=f.w||FURN.counter.w, ih=f.h||FURN.counter.h;
  document.getElementById('cm-w').value=Math.round(iw*12);
  document.getElementById('cm-h').value=Math.round(ih*12);
  m.style.left=(sc.x+14)+'px';
  m.style.top=(sc.y-30)+'px';
  m.style.display='block';
  const wi=document.getElementById('cm-w');wi.focus();wi.select();
}
function hideCounterModal(){
  document.getElementById('counter-modal').style.display='none';
  _cmFurnId=null;
}
function applyCounterSize(){
  if(!_cmFurnId)return;
  const f=furniture.find(f=>f.id===_cmFurnId);
  if(!f)return;
  const wIn=parseFloat(document.getElementById('cm-w').value);
  const hIn=parseFloat(document.getElementById('cm-h').value);
  if(isNaN(wIn)||isNaN(hIn)||wIn<6||hIn<6)return;
  saveHistory();
  f.w=wIn/12; f.h=hIn/12;
  hideCounterModal();
  render();
}
document.addEventListener('keydown',ev=>{
  if(ev.key==='Escape'&&_cmFurnId){ev.stopImmediatePropagation();hideCounterModal();}
  if(ev.key==='Enter'&&_cmFurnId){ev.preventDefault();applyCounterSize();}
},{capture:true});
document.addEventListener('click',ev=>{
  const m=document.getElementById('counter-modal');
  if(_cmFurnId&&m&&!m.contains(ev.target))hideCounterModal();
});

let stTimer;
function setStatus(m){
  const el=document.getElementById('status');
  el.textContent=m||''; el.style.opacity='1';
  clearTimeout(stTimer);
  if(m)stTimer=setTimeout(()=>el.style.opacity='.35',5000);
}
