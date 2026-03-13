// ── COORDINATE HELPERS ──
function svgPt(ev){
  const pt=svg.createSVGPoint();
  pt.x=ev.clientX; pt.y=ev.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}
function snap(v){return Math.round(v/SC)*SC;}
function clampI(pt){return{x:Math.max(W_PX,Math.min(W_PX+IPW,pt.x)),y:Math.max(W_PX,Math.min(W_PX+IPH,pt.y))};}
function clampFurn(x,y,def,rot,iw,ih){
  const r=rot||0;
  const bw=iw||def.w, bh=ih||def.h;
  const pw=bw*SC, ph=bh*SC;
  if(r%180===90){
    // SVG rotates around the original center, so the visual box is offset from (x,y):
    // visual left = x + (pw-ph)/2,  visual width  = ph
    // visual top  = y + (ph-pw)/2,  visual height = pw
    const offX=(pw-ph)/2, offY=(ph-pw)/2;
    return{
      x:Math.max(W_PX-offX, Math.min(W_PX+IPW-offX-ph, x)),
      y:Math.max(W_PX-offY, Math.min(W_PX+IPH-offY-pw, y))
    };
  }
  return{x:Math.max(W_PX,Math.min(W_PX+IPW-pw,x)),y:Math.max(W_PX,Math.min(W_PX+IPH-ph,y))};
}
function snapFurnToWalls(x,y,def,rot,iw,ih){
  const r=rot||0;
  const bw=iw||def.w, bh=ih||def.h;
  const pw=bw*SC, ph=bh*SC;
  const rotated=r%180===90;
  const fw=rotated?ph:pw;
  const fh=rotated?pw:ph;
  // Visual box offset when rotated (same logic as clampFurn)
  const offX=rotated?(pw-ph)/2:0;
  const offY=rotated?(ph-pw)/2:0;
  const SNAP=16;
  let sx=x,sy=y;
  const vL=x+offX, vR=x+offX+fw, vT=y+offY, vB=y+offY+fh;
  // Perimeter wall inner faces
  if(Math.abs(vL-W_PX)<=SNAP)               sx=W_PX-offX;
  if(Math.abs(vR-(W_PX+IPW))<=SNAP)         sx=W_PX+IPW-offX-fw;
  if(Math.abs(vT-W_PX)<=SNAP)               sy=W_PX-offY;
  if(Math.abs(vB-(W_PX+IPH))<=SNAP)         sy=W_PX+IPH-offY-fh;
  // Interior walls (floorLines)
  for(const ln of floorLines){
    if(ln.y1===ln.y2){
      const wy=ln.y1;
      if(Math.abs(vT-(wy+W_PX/2))<=SNAP)    sy=wy+W_PX/2-offY;
      if(Math.abs(vB-(wy-W_PX/2))<=SNAP)    sy=wy-W_PX/2-offY-fh;
    } else {
      const wx=ln.x1;
      if(Math.abs(vL-(wx+W_PX/2))<=SNAP)    sx=wx+W_PX/2-offX;
      if(Math.abs(vR-(wx-W_PX/2))<=SNAP)    sx=wx-W_PX/2-offX-fw;
    }
  }
  return{x:sx,y:sy};
}
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

function toggleSnap(){
  snapEnabled=!snapEnabled;
  const btn=document.getElementById('snap-btn');
  if(btn) btn.classList.toggle('active',snapEnabled);
  setStatus(snapEnabled?'Snap on':'Snap off — position freely');
}

document.addEventListener('keydown',ev=>{
  if(ev.target.matches('input,textarea'))return;
  if(ev.code==='Space'&&!ev.repeat){
    spaceDown=true; ca.style.cursor='grab'; document.body.style.cursor='grab'; ev.preventDefault();
  }
  if(ev.key==='g'||ev.key==='G'){toggleSnap();return;}
  if(ev.key==='f'){setTool('floor-line');return;}
  if(ev.key==='s'){setTool('select');return;}
  if(ev.key==='d'){addOpening(OPENING_STD);return;}
  if(ev.key==='p'){addOpening(OPENING_POCKET);return;}
  if(ev.key==='Escape'){
    drawLine=null; snapIndicator=null; hoverEndpoint=null;
    selLine=null; selFurn=null; selOpening=null;
    setTool('wall');
    render();
  }
  if(ev.key==='Delete'||ev.key==='Backspace'){
    ev.preventDefault();
    deleteSelected();
  }
  if((ev.metaKey||ev.ctrlKey)&&ev.key==='z'){
    ev.preventDefault();
    undo();
  }
  // Z-order: Cmd/Ctrl+[ (send back), Cmd/Ctrl+] (bring forward)
  if(ev.shiftKey&&ev.key==='D'){
    ev.preventDefault();
    if(selFurn){
      const f=furniture.find(f=>f.id===selFurn);
      if(f){
        const copy={...f,id:crypto.randomUUID(),x:f.x+10,y:f.y+10};
        furniture.push(copy);
        selFurn=copy.id;
        saveHistory();render();
      }
    }
  }
  if((ev.metaKey||ev.ctrlKey)&&(ev.key==='['||ev.key===']')){
    ev.preventDefault();
    if(selFurn){
      const idx=furniture.findIndex(f=>f.id===selFurn);
      if(idx===-1)return;
      if(ev.key==='['&&idx>0){
        [furniture[idx-1],furniture[idx]]=[furniture[idx],furniture[idx-1]];
        saveHistory(); render();
      } else if(ev.key===']'&&idx<furniture.length-1){
        [furniture[idx],furniture[idx+1]]=[furniture[idx+1],furniture[idx]];
        saveHistory(); render();
      }
    }
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
let _svgAbort=null;
function bindSvgEvents(){
  if(_svgAbort)_svgAbort.abort();
  _svgAbort=new AbortController();
  const sig={signal:_svgAbort.signal};
  svg.addEventListener('mousedown',onSvgDown,sig);
  svg.addEventListener('mousemove',onSvgMove,sig);
  svg.addEventListener('mouseup',onSvgUp,sig);
  // Click on background (nothing stopped propagation) → deselect
  svg.addEventListener('click',()=>{
    if(selLine!==null||selFurn!==null||selOpening!==null){
      selLine=null;selFurn=null;selOpening=null;render();
    }
  },sig);
}

function onSvgDown(ev){
  if(spaceDown)return;
  if(tool!=='floor-line')return;
  const pt=clampI(svgPt(ev));
  const gx=snapEnabled?snapI(pt.x):Math.round(pt.x), gy=snapEnabled?snapI(pt.y):Math.round(pt.y);
  const sp=snapEnabled?findSnapEndpoint(gx,gy):null;
  const sx=sp?sp.x:gx, sy=sp?sp.y:gy;
  drawLine={x1:sx,y1:sy,x2:sx,y2:sy};
  ev.stopPropagation();
}
function onSvgMove(ev){
  if(isPanning)return;
  if(tool==='floor-line'){
    const pt=clampI(svgPt(ev));
    const sx=snapEnabled?snapI(pt.x):Math.round(pt.x), sy=snapEnabled?snapI(pt.y):Math.round(pt.y);
    const he=snapEnabled?findSnapEndpoint(sx,sy):null;
    if(he!==hoverEndpoint){hoverEndpoint=he;if(!drawLine){const old=document.getElementById('lines-g');if(old)old.remove();renderLines(false);}}
    if(drawLine){
      const dx=sx-drawLine.x1,dy=sy-drawLine.y1;
      let ex,ey;
      if(Math.abs(dx)>=Math.abs(dy)){ex=sx;ey=drawLine.y1;}
      else{ex=drawLine.x1;ey=sy;}
      const sp=snapEnabled?findSnapEndpoint(ex,ey):null;
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
        const dx=(snapEnabled?snapI(pt.x):Math.round(pt.x))-(snapEnabled?snapI(dragWall.startX):Math.round(dragWall.startX));
        const dy=(snapEnabled?snapI(pt.y):Math.round(pt.y))-(snapEnabled?snapI(dragWall.startY):Math.round(dragWall.startY));
        ln.x1=dragWall.ox1+dx; ln.y1=dragWall.oy1+dy;
        ln.x2=dragWall.ox2+dx; ln.y2=dragWall.oy2+dy;
        snapIndicator=null;
      } else {
        const horiz=dragWall.axis==='h';
        const tx=snapEnabled?snapI(pt.x):Math.round(pt.x), ty=snapEnabled?snapI(pt.y):Math.round(pt.y);
        const sp=snapEnabled?findSnapEndpoint(horiz?tx:ln.x1, horiz?ln.y1:ty, dragWall.id):null;
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
  if(dragFurnResize){
    const pt=svgPt(ev);
    const f=furniture.find(f=>f.id===dragFurnResize.id);
    if(f){
      const SNAP=16;
      if(dragFurnResize.axis==='w'){
        let newW=Math.max(0.5,dragFurnResize.startW+(pt.x-dragFurnResize.startVal)/SC);
        if(snapEnabled){
          const rPx=f.x+newW*SC;
          if(Math.abs(rPx-(W_PX+IPW))<=SNAP) newW=(W_PX+IPW-f.x)/SC;
          else for(const ln of floorLines){
            if(ln.x1===ln.x2){
              if(Math.abs(rPx-(ln.x1-W_PX/2))<=SNAP){newW=(ln.x1-W_PX/2-f.x)/SC;break;}
              if(Math.abs(rPx-(ln.x1+W_PX/2))<=SNAP){newW=(ln.x1+W_PX/2-f.x)/SC;break;}
            }
          }
        }
        f.w=Math.max(0.5,Math.min(newW,(W_PX+IPW-f.x)/SC));
      } else {
        let newH=Math.max(0.5,dragFurnResize.startH+(pt.y-dragFurnResize.startVal)/SC);
        if(snapEnabled){
          const bPx=f.y+newH*SC;
          if(Math.abs(bPx-(W_PX+IPH))<=SNAP) newH=(W_PX+IPH-f.y)/SC;
          else for(const ln of floorLines){
            if(ln.y1===ln.y2){
              if(Math.abs(bPx-(ln.y1-W_PX/2))<=SNAP){newH=(ln.y1-W_PX/2-f.y)/SC;break;}
              if(Math.abs(bPx-(ln.y1+W_PX/2))<=SNAP){newH=(ln.y1+W_PX/2-f.y)/SC;break;}
            }
          }
        }
        f.h=Math.max(0.5,Math.min(newH,(W_PX+IPH-f.y)/SC));
      }
    }
    const old=document.getElementById('furn-g');
    if(old)old.remove();
    renderFurniture(false);
  }
  if(dragFurn){
    const pt=svgPt(ev);
    const f=furniture.find(f=>f.id===dragFurn.id);
    if(f){const def=FURN[f.type];const c=clampFurn(pt.x-dragFurn.ox,pt.y-dragFurn.oy,def,f.rot,f.w,f.h);f.x=c.x;f.y=c.y;}
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
    const ln=floorLines.find(l=>l.id===dragWall.id);
    if(ln){
      const moved=dragWall.type!=='move'||(ln.x1!==dragWall.ox1||ln.y1!==dragWall.oy1);
      if(moved) saveHistory();
      clampOpenings(ln);
    }
    dragWall=null; snapIndicator=null; render();
  }
  if(dragOpening){saveHistory();dragOpening=null; render();}
  if(dragFurn){
    const f=furniture.find(f=>f.id===dragFurn.id);
    if(f){const def=FURN[f.type];if(def.wallSnap&&snapEnabled){const c=snapFurnToWalls(f.x,f.y,def,f.rot,f.w,f.h);f.x=c.x;f.y=c.y;}}
    saveHistory();dragFurn=null;render();
  }
  if(dragFurnResize){saveHistory();dragFurnResize=null; render();}
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
    const def=FURN[f.type];if(!def||def.noRotate)return;
    const iw=f.w||def.w, ih=f.h||def.h;
    if(pt.x>=f.x&&pt.x<=f.x+iw*SC&&pt.y>=f.y&&pt.y<=f.y+ih*SC){
      f.rot=((f.rot||0)+deg)%360; render();
    }
  });
});

ca.addEventListener('dragover',ev=>ev.preventDefault());
ca.addEventListener('drop',ev=>{
  ev.preventDefault();
  const type=ev.dataTransfer.getData('ftype');
  if(!type||!FURN[type])return;
  const def=FURN[type];
  const raw=svgPt(ev);
  let c=clampFurn(raw.x-def.w*SC/2,raw.y-def.h*SC/2,def,0);
  if(def.wallSnap&&snapEnabled) c=snapFurnToWalls(c.x,c.y,def,0);
  furniture.push({id:crypto.randomUUID(),type,x:c.x,y:c.y,rot:0});
  render();
});
