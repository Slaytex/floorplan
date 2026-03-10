// ── COORDINATE HELPERS ──
function svgPt(ev){
  const pt=svg.createSVGPoint();
  pt.x=ev.clientX; pt.y=ev.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}
function snap(v){return Math.round(v/SC)*SC;}
function clampI(pt){return{x:Math.max(W_PX,Math.min(W_PX+IPW,pt.x)),y:Math.max(W_PX,Math.min(W_PX+IPH,pt.y))};}
function snapI(v){return Math.round((v-W_PX)/SC)*SC+W_PX;}
function findSnapEndpoint(x,y,excludeId=null){
  for(const ln of floorLines){
    if(ln.id===excludeId)continue;
    for(const[ex,ey]of[[ln.x1,ln.y1],[ln.x2,ln.y2]]){
      if(Math.hypot(x-ex,y-ey)<SNAP_DIST)return{x:ex,y:ey};
    }
  }
  return null;
}

// Clamp / remove openings that no longer fit after wall resize
function clampOpenings(ln){
  if(!ln.openings||!ln.openings.length)return;
  const wallLen=Math.abs(ln.x2-ln.x1)+Math.abs(ln.y2-ln.y1);
  ln.openings=ln.openings
    .filter(op=>op.width+4<=wallLen)
    .map(op=>({...op,offset:Math.max(0,Math.min(wallLen-op.width,op.offset))}));
}

// ── ZOOM & PAN ──
function applyTransform(){
  document.getElementById('zoom-layer').style.transform=`translate(${panX}px,${panY}px) scale(${zoom})`;
  document.getElementById('zoom-display').textContent=Math.round(zoom*100)+'%';
}
function initView(){
  panX=(ca.clientWidth-TW)/2; panY=(ca.clientHeight-TH)/2;
  applyTransform();
}

ca.addEventListener('wheel',ev=>{
  if(!ev.altKey)return;
  ev.preventDefault();
  const caRect=ca.getBoundingClientRect();
  const mx=ev.clientX-caRect.left, my=ev.clientY-caRect.top;
  const prev=zoom;
  zoom=Math.max(1,Math.min(4,zoom*(ev.deltaY<0?1.1:1/1.1)));
  panX=mx-(mx-panX)*(zoom/prev); panY=my-(my-panY)*(zoom/prev);
  applyTransform();
},{passive:false});

document.addEventListener('keydown',ev=>{
  if(ev.target.matches('input,textarea'))return;
  if(ev.code==='Space'&&!ev.repeat){
    spaceDown=true; ca.style.cursor='grab'; document.body.style.cursor='grab'; ev.preventDefault();
  }
  if(ev.key==='Delete'||ev.key==='Backspace'){
    ev.preventDefault();
    deleteSelected();
  }
  if((ev.metaKey||ev.ctrlKey)&&ev.key==='z'){
    ev.preventDefault();
    undo();
  }
});
document.addEventListener('keyup',ev=>{
  if(ev.code==='Space'){spaceDown=false;isPanning=false;ca.style.cursor='';document.body.style.cursor='';}
});
ca.addEventListener('mousedown',ev=>{
  if(spaceDown){isPanning=true;panStart={x:ev.clientX-panX,y:ev.clientY-panY};ca.style.cursor='grabbing';document.body.style.cursor='grabbing';}
});
ca.addEventListener('mousemove',ev=>{
  if(isPanning){panX=ev.clientX-panStart.x;panY=ev.clientY-panStart.y;applyTransform();}
});
ca.addEventListener('mouseup',()=>{isPanning=false;if(spaceDown){ca.style.cursor='grab';document.body.style.cursor='grab';}});

// ── SVG DRAWING EVENTS ──
function bindSvgEvents(){
  svg.addEventListener('mousedown',onSvgDown);
  svg.addEventListener('mousemove',onSvgMove);
  svg.addEventListener('mouseup',onSvgUp);
  // Click on background (nothing stopped propagation) → deselect
  svg.addEventListener('click',()=>{
    if(selLine!==null||selFurn!==null||selOpening!==null){
      selLine=null;selFurn=null;selOpening=null;render();
    }
  });
}

function onSvgDown(ev){
  if(spaceDown)return;
  if(tool!=='floor-line')return;
  const pt=clampI(svgPt(ev));
  const sp=findSnapEndpoint(snapI(pt.x),snapI(pt.y));
  const sx=sp?sp.x:snapI(pt.x), sy=sp?sp.y:snapI(pt.y);
  drawLine={x1:sx,y1:sy,x2:sx,y2:sy};
  ev.stopPropagation();
}
function onSvgMove(ev){
  if(isPanning)return;
  if(tool==='floor-line'){
    const pt=clampI(svgPt(ev));
    const sx=snapI(pt.x),sy=snapI(pt.y);
    const he=findSnapEndpoint(sx,sy);
    if(he!==hoverEndpoint){hoverEndpoint=he;if(!drawLine){const old=document.getElementById('lines-g');if(old)old.remove();renderLines(false);}}
    if(drawLine){
      const dx=sx-drawLine.x1,dy=sy-drawLine.y1;
      let ex,ey;
      if(Math.abs(dx)>=Math.abs(dy)){ex=sx;ey=drawLine.y1;}
      else{ex=drawLine.x1;ey=sy;}
      const sp=findSnapEndpoint(ex,ey);
      if(sp){ex=sp.x;ey=sp.y;snapIndicator=sp;}
      else snapIndicator=null;
      drawLine.x2=ex; drawLine.y2=ey;
      const old=document.getElementById('lines-g');
      if(old)old.remove();
      renderLines(false);
    }
  }
  if(dragWall){
    const pt=svgPt(ev);
    const ln=floorLines.find(l=>l.id===dragWall.id);
    if(ln){
      if(dragWall.type==='move'){
        const dx=snapI(pt.x)-snapI(dragWall.startX);
        const dy=snapI(pt.y)-snapI(dragWall.startY);
        ln.x1=dragWall.ox1+dx; ln.y1=dragWall.oy1+dy;
        ln.x2=dragWall.ox2+dx; ln.y2=dragWall.oy2+dy;
        snapIndicator=null;
      } else {
        const horiz=dragWall.axis==='h';
        const tx=snapI(pt.x), ty=snapI(pt.y);
        const sp=findSnapEndpoint(horiz?tx:ln.x1, horiz?ln.y1:ty, dragWall.id);
        if(sp){snapIndicator=sp;}
        else snapIndicator=null;
        if(dragWall.type==='end1'){
          if(horiz) ln.x1=sp?sp.x:tx; else ln.y1=sp?sp.y:ty;
        } else {
          if(horiz) ln.x2=sp?sp.x:tx; else ln.y2=sp?sp.y:ty;
        }
      }
    }
    const old=document.getElementById('lines-g');
    if(old)old.remove();
    renderLines(false);
  }
  if(dragOpening){
    const ln=floorLines.find(l=>l.id===dragOpening.lineId);
    if(ln){
      const horiz=ln.y1===ln.y2;
      const pt=svgPt(ev);
      const delta=(horiz?pt.x:pt.y)-dragOpening.startPx;
      const wallLen=Math.abs(ln.x2-ln.x1)+Math.abs(ln.y2-ln.y1);
      const op=ln.openings&&ln.openings.find(o=>o.id===dragOpening.openingId);
      if(op) op.offset=Math.max(0,Math.min(wallLen-op.width,dragOpening.startOffset+delta));
    }
    const old=document.getElementById('lines-g');
    if(old)old.remove();
    renderLines(false);
  }
  if(dragFurn){
    const pt=svgPt(ev);
    const f=furniture.find(f=>f.id===dragFurn.id);
    if(f){f.x=pt.x-dragFurn.ox;f.y=pt.y-dragFurn.oy;}
    const old=document.getElementById('furn-g');
    if(old)old.remove();
    renderFurniture(false);
  }
}
function onSvgUp(ev){
  if(tool==='floor-line'&&drawLine){
    const dx=drawLine.x2-drawLine.x1,dy=drawLine.y2-drawLine.y1;
    if(Math.abs(dx)>4||Math.abs(dy)>4){saveHistory();floorLines.push({id:crypto.randomUUID(),x1:drawLine.x1,y1:drawLine.y1,x2:drawLine.x2,y2:drawLine.y2,openings:[]});}
    drawLine=null; snapIndicator=null; render();
  }
  if(dragWall){
    saveHistory();
    const ln=floorLines.find(l=>l.id===dragWall.id);
    if(ln) clampOpenings(ln);
    dragWall=null; snapIndicator=null; render();
  }
  if(dragOpening){saveHistory();dragOpening=null; render();}
  if(dragFurn){saveHistory();dragFurn=null; render();}
}

// ── FURNITURE DRAG & DROP ──
function onFurnDown(ev,id){
  ev.stopPropagation();
  const pt=svgPt(ev);
  const f=furniture.find(f=>f.id===id);
  if(!f)return;
  selFurn=id; selLine=null; selOpening=null;
  dragFurn={id,ox:pt.x-f.x,oy:pt.y-f.y};
  render();
}

// Right-click: rotate 90°; alt+right-click: rotate 45°
svg.addEventListener('contextmenu',ev=>{
  ev.preventDefault();
  const pt=svgPt(ev);
  const deg=ev.altKey?45:90;
  furniture.forEach(f=>{
    const def=FURN[f.type];if(!def)return;
    if(pt.x>=f.x&&pt.x<=f.x+def.w*SC&&pt.y>=f.y&&pt.y<=f.y+def.h*SC){
      f.rot=((f.rot||0)+deg)%360; render();
    }
  });
});

ca.addEventListener('dragover',ev=>ev.preventDefault());
ca.addEventListener('drop',ev=>{
  ev.preventDefault();
  const type=ev.dataTransfer.getData('ftype');
  if(!type||!FURN[type])return;
  const r=svg.getBoundingClientRect();
  const def=FURN[type];
  const x=ev.clientX-r.left-def.w*SC/2;
  const y=ev.clientY-r.top-def.h*SC/2;
  furniture.push({id:crypto.randomUUID(),type,x,y,rot:0});
  render();
});
