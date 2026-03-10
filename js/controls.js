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
    'select':'Drag furniture to move · Right-click to rotate 90°',
    'erase-wall':'Click sections to reset to wall · Click lines to select & delete',
  };
  setStatus(msgs[t]||'');
}
function deleteSelected(){
  if(selLine!==null){floorLines=floorLines.filter(l=>l.id!==selLine);selLine=null;}
  if(selFurn!==null){furniture=furniture.filter(f=>f.id!==selFurn);selFurn=null;}
  render();
}
function clearLines(){if(confirm('Clear all floor lines?')){floorLines=[];selLine=null;render();}}
function resetPlan(){
  if(!confirm('Reset entire plan?'))return;
  ['top','bottom','left','right'].forEach(s=>{secs[s]=secs[s].map(()=>'wall');});
  floorLines=[];furniture=[];selLine=null;selFurn=null;dragWall=null;snapIndicator=null;hoverEndpoint=null;
  defaults(); render();
}

let stTimer;
function setStatus(m){
  const el=document.getElementById('status');
  el.textContent=m||''; el.style.opacity='1';
  clearTimeout(stTimer);
  if(m)stTimer=setTimeout(()=>el.style.opacity='.35',5000);
}
