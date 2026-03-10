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
    'door-sidelight':'Click wall sections to add door+sidelight (36″ door + 8″ sidelight) · Right-click painted section to flip sidelight side',
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
  const offset=(wallLen-width)/2; // center it
  ln.openings.push({id:crypto.randomUUID(),offset,width});
  selOpening={lineId:ln.id,openingId:ln.openings[ln.openings.length-1].id};
  render();
  setStatus(`${Math.round(width/SC*12)}″ opening added — drag to reposition`);
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

let stTimer;
function setStatus(m){
  const el=document.getElementById('status');
  el.textContent=m||''; el.style.opacity='1';
  clearTimeout(stTimer);
  if(m)stTimer=setTimeout(()=>el.style.opacity='.35',5000);
}
