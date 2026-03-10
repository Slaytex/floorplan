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
    'select':'Click walls/furniture to select · Delete key removes · Right-click rotates 90° · ⌥Right-click rotates 45°',
  };
  setStatus(msgs[t]||'');
}
function deleteSelected(){
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
function addOpening(){
  if(selLine===null){setStatus('Select a wall first, then add opening');return;}
  const ln=floorLines.find(l=>l.id===selLine);
  if(!ln)return;
  const wallLen=Math.abs(ln.x2-ln.x1)+Math.abs(ln.y2-ln.y1);
  if(wallLen<OPENING_W+8){setStatus('Wall too short for an opening');return;}
  if(!ln.openings) ln.openings=[];
  const offset=(wallLen-OPENING_W)/2; // center it
  ln.openings.push({id:openingId++,offset,width:OPENING_W});
  selOpening={lineId:ln.id,openingId:ln.openings[ln.openings.length-1].id};
  render();
  setStatus('Opening added — drag it to reposition along the wall');
}
function clearLines(){if(confirm('Clear all interior walls?')){floorLines=[];selLine=null;selOpening=null;render();}}
function resetPlan(){
  if(!confirm('Reset entire plan?'))return;
  ['top','bottom','left','right'].forEach(s=>{secs[s]=secs[s].map(()=>'wall');});
  floorLines=[];furniture=[];
  selLine=null;selFurn=null;selOpening=null;
  dragWall=null;dragOpening=null;
  snapIndicator=null;hoverEndpoint=null;
  defaults(); render();
}

let stTimer;
function setStatus(m){
  const el=document.getElementById('status');
  el.textContent=m||''; el.style.opacity='1';
  clearTimeout(stTimer);
  if(m)stTimer=setTimeout(()=>el.style.opacity='.35',5000);
}
