// ── RENDER ──
function buildDefs(){
  const defs=e('defs');
  const pat=e('pattern',{id:'g4',width:SEC,height:SEC,patternUnits:'userSpaceOnUse',x:W_PX,y:W_PX});
  pat.appendChild(e('rect',{width:SEC,height:SEC,fill:'none',stroke:'#c8c0b0','stroke-width':.4}));
  for(let i=1;i<4;i++){
    pat.appendChild(e('line',{x1:i*SC,y1:0,x2:i*SC,y2:SEC,stroke:'#ddd8cc','stroke-width':.22}));
    pat.appendChild(e('line',{x1:0,y1:i*SC,x2:SEC,y2:i*SC,stroke:'#ddd8cc','stroke-width':.22}));
  }
  defs.appendChild(pat);
  const hatch=e('pattern',{id:'wall-hatch',width:8,height:8,patternUnits:'userSpaceOnUse',patternTransform:'rotate(45)'});
  hatch.appendChild(e('line',{x1:0,y1:0,x2:0,y2:8,stroke:'#8a7a6e','stroke-width':1.2}));
  defs.appendChild(hatch);
  const cp=e('clipPath',{id:'iclip'});
  cp.appendChild(e('rect',{x:W_PX,y:W_PX,width:IPW,height:IPH}));
  defs.appendChild(cp);
  return defs;
}

function render(){
  svg.innerHTML='';
  svg.appendChild(buildDefs());

  svg.appendChild(e('rect',{x:W_PX,y:W_PX,width:IPW,height:IPH,fill:'#fdfaf4'}));
  svg.appendChild(e('rect',{x:W_PX,y:W_PX,width:IPW,height:IPH,fill:'url(#g4)'}));

  renderLines();
  renderFurniture();
  ['top','bottom','left','right'].forEach(drawSide);
  drawCorners();
  drawDoorSwings();
  drawDims();
  drawPortalFrame();
  drawResizeButtons();
  bindSvgEvents();
}

// Returns bounding rect for an axis-aligned interior wall
function wallR(ln){
  if(ln.y1===ln.y2){
    return{x:Math.min(ln.x1,ln.x2),y:ln.y1-W_PX/2,width:Math.abs(ln.x2-ln.x1),height:W_PX};
  } else {
    return{x:ln.x1-W_PX/2,y:Math.min(ln.y1,ln.y2),width:W_PX,height:Math.abs(ln.y2-ln.y1)};
  }
}

// Renders a wall with openings into group g. showHandles adds drag/resize handles.
function renderWallBody(g, ln, sel, showHandles){
  const horiz=ln.y1===ln.y2;
  const r=wallR(ln);
  const wallLen=horiz?r.width:r.height;
  const openings=(ln.openings||[]).slice().sort((a,b)=>a.offset-b.offset);

  // Build filled segments around openings
  const segs=[];
  let pos=0;
  for(const op of openings){
    const o=Math.max(0,Math.min(wallLen-op.width,op.offset));
    if(o>pos) segs.push({start:pos,len:o-pos});
    pos=o+op.width;
  }
  if(pos<wallLen) segs.push({start:pos,len:wallLen-pos});

  // Render wall segments
  const sc=sel?'#c4853a':COL_WALL_STROKE, sw=sel?1.5:.5;
  for(const seg of segs){
    const sr=horiz
      ?{x:r.x+seg.start,y:r.y,width:Math.max(0,seg.len),height:r.height}
      :{x:r.x,y:r.y+seg.start,width:r.width,height:Math.max(0,seg.len)};
    if(sr.width>0&&sr.height>0){
      g.appendChild(e('rect',{...sr,fill:COL_WALL_FILL,stroke:sc,'stroke-width':sw}));
      g.appendChild(e('rect',{...sr,fill:'url(#wall-hatch)',stroke:'none'}));
    }
  }

  // Transparent hit area for selecting the wall
  const hit=e('rect',{...r,fill:'transparent',stroke:'none'});
  hit.style.cursor='move';
  hit.addEventListener('mousedown',ev=>{
    ev.stopPropagation();
    selLine=ln.id; selOpening=null;
    const pt=svgPt(ev);
    dragWall={id:ln.id,type:'move',startX:pt.x,startY:pt.y,ox1:ln.x1,oy1:ln.y1,ox2:ln.x2,oy2:ln.y2};
    render();
  });
  hit.addEventListener('click',ev=>ev.stopPropagation());
  g.appendChild(hit);

  // Length label
  const mx=(ln.x1+ln.x2)/2,my=(ln.y1+ln.y2)/2;
  const len=(Math.abs(ln.x2-ln.x1)+Math.abs(ln.y2-ln.y1))/SC;
  const lx=horiz?mx:mx-10,ly=horiz?my-6:my;
  const t=e('text',{x:lx,y:ly,fill:'#9a8aaa','font-family':'DM Mono,monospace','font-size':'7','text-anchor':'middle'});
  t.textContent=len.toFixed(1)+'′'; g.appendChild(t);

  // Openings: bookend lines + draggable hit areas
  for(const op of openings){
    const opSel=selOpening&&selOpening.lineId===ln.id&&selOpening.openingId===op.id;
    const cOff=Math.max(0,Math.min(wallLen-op.width,op.offset));
    const bk='#c8b080';

    // ── Sliding (bypass) door — fill wall gap with two overlapping panel lines ──
    if(op.type==='sliding'){
      const pw=op.width*0.65; // each panel = 65% of total width
      const selFill='rgba(196,133,58,.15)', selStroke='#c4853a';
      if(horiz){
        const ox=r.x+cOff, oy=r.y, ow=op.width, oh=r.height;
        // Panel A (front, upper track)
        g.appendChild(e('rect',{x:ox,y:oy+oh*.18,width:pw,height:oh*.3,
          fill:COL_DOOR_FILL,stroke:opSel?selStroke:'#8a7a6a','stroke-width':opSel?1.2:.7}));
        // Panel B (behind, lower track)
        g.appendChild(e('rect',{x:ox+ow-pw,y:oy+oh*.52,width:pw,height:oh*.3,
          fill:COL_DOOR_FILL,stroke:opSel?selStroke:'#8a7a6a','stroke-width':opSel?1.2:.7}));
        // Transparent hit area (select/delete)
        const hit=e('rect',{x:ox,y:oy,width:ow,height:oh,
          fill:opSel?selFill:'transparent',stroke:'none'});
        hit.style.cursor='pointer';
        hit.addEventListener('mousedown',ev=>{ev.stopPropagation();selOpening={lineId:ln.id,openingId:op.id};render();});
        hit.addEventListener('click',ev=>ev.stopPropagation());
        g.appendChild(hit);
      } else {
        const ox=r.x, oy=r.y+cOff, ow=r.width, oh=op.width;
        // Panel A (front, left track)
        g.appendChild(e('rect',{x:ox+ow*.18,y:oy,width:ow*.3,height:pw,
          fill:COL_DOOR_FILL,stroke:opSel?selStroke:'#8a7a6a','stroke-width':opSel?1.2:.7}));
        // Panel B (behind, right track)
        g.appendChild(e('rect',{x:ox+ow*.52,y:oy+oh-pw,width:ow*.3,height:pw,
          fill:COL_DOOR_FILL,stroke:opSel?selStroke:'#8a7a6a','stroke-width':opSel?1.2:.7}));
        const hit=e('rect',{x:ox,y:oy,width:ow,height:oh,
          fill:opSel?selFill:'transparent',stroke:'none'});
        hit.style.cursor='pointer';
        hit.addEventListener('mousedown',ev=>{ev.stopPropagation();selOpening={lineId:ln.id,openingId:op.id};render();});
        hit.addEventListener('click',ev=>ev.stopPropagation());
        g.appendChild(hit);
      }
      continue;
    }

    if(horiz){
      const ox=r.x+cOff, oy=r.y;
      g.appendChild(e('line',{x1:ox,y1:oy-3,x2:ox,y2:oy+r.height+3,stroke:bk,'stroke-width':2.5}));
      g.appendChild(e('line',{x1:ox+op.width,y1:oy-3,x2:ox+op.width,y2:oy+r.height+3,stroke:bk,'stroke-width':2.5}));
      const oh=e('rect',{x:ox,y:oy,width:op.width,height:r.height,
        fill:opSel?'rgba(196,133,58,.2)':'rgba(200,176,128,.08)',
        stroke:opSel?'#c4853a':bk,'stroke-width':opSel?1.5:.8,
        'stroke-dasharray':opSel?'':'3,2'});
      oh.style.cursor='ew-resize';
      oh.addEventListener('mousedown',ev=>{
        ev.stopPropagation();
        selOpening={lineId:ln.id,openingId:op.id};
        dragOpening={lineId:ln.id,openingId:op.id,startOffset:cOff,startPx:svgPt(ev).x};
        render();
      });
      oh.addEventListener('click',ev=>ev.stopPropagation());
      g.appendChild(oh);
    } else {
      const oy=r.y+cOff, ox=r.x;
      g.appendChild(e('line',{x1:ox-3,y1:oy,x2:ox+r.width+3,y2:oy,stroke:bk,'stroke-width':2.5}));
      g.appendChild(e('line',{x1:ox-3,y1:oy+op.width,x2:ox+r.width+3,y2:oy+op.width,stroke:bk,'stroke-width':2.5}));
      const oh=e('rect',{x:ox,y:oy,width:r.width,height:op.width,
        fill:opSel?'rgba(196,133,58,.2)':'rgba(200,176,128,.08)',
        stroke:opSel?'#c4853a':bk,'stroke-width':opSel?1.5:.8,
        'stroke-dasharray':opSel?'':'3,2'});
      oh.style.cursor='ns-resize';
      oh.addEventListener('mousedown',ev=>{
        ev.stopPropagation();
        selOpening={lineId:ln.id,openingId:op.id};
        dragOpening={lineId:ln.id,openingId:op.id,startOffset:cOff,startPx:svgPt(ev).y};
        render();
      });
      oh.addEventListener('click',ev=>ev.stopPropagation());
      g.appendChild(oh);
    }
  }

  // Resize / move handles (full render only)
  if(sel&&showHandles){
    [[ln.x1,ln.y1,'end1'],[ln.x2,ln.y2,'end2']].forEach(([hx,hy,type])=>{
      const h=e('circle',{cx:hx,cy:hy,r:5,fill:'#c4853a',stroke:'#ffd090','stroke-width':1.2});
      h.style.cursor=horiz?'ew-resize':'ns-resize';
      h.addEventListener('mousedown',ev=>{ev.stopPropagation();dragWall={id:ln.id,type,axis:horiz?'h':'v'};});
      g.appendChild(h);
    });
    const mh=e('circle',{cx:mx,cy:my,r:5,fill:'#7a9e7e',stroke:'#a0c8a0','stroke-width':1.2});
    mh.style.cursor='move';
    mh.addEventListener('mousedown',ev=>{
      ev.stopPropagation();
      const pt=svgPt(ev);
      dragWall={id:ln.id,type:'move',startX:pt.x,startY:pt.y,ox1:ln.x1,oy1:ln.y1,ox2:ln.x2,oy2:ln.y2};
    });
    g.appendChild(mh);
  }
}

// Fill the W_PX×W_PX square at every perpendicular wall junction to eliminate corner gaps
function drawJunctions(g){
  const seen=new Set();
  for(let i=0;i<floorLines.length;i++){
    const a=floorLines[i];
    const aH=a.y1===a.y2;
    const ax1=Math.min(a.x1,a.x2),ax2=Math.max(a.x1,a.x2);
    const ay1=Math.min(a.y1,a.y2),ay2=Math.max(a.y1,a.y2);
    for(let j=i+1;j<floorLines.length;j++){
      const b=floorLines[j];
      const bH=b.y1===b.y2;
      if(aH===bH) continue; // parallel walls — no perpendicular junction
      const bx1=Math.min(b.x1,b.x2),bx2=Math.max(b.x1,b.x2);
      const by1=Math.min(b.y1,b.y2),by2=Math.max(b.y1,b.y2);
      const ix=aH?b.x1:a.x1, iy=aH?a.y1:b.y1;
      const inA=aH?(ix>=ax1&&ix<=ax2):(iy>=ay1&&iy<=ay2);
      const inB=bH?(ix>=bx1&&ix<=bx2):(iy>=by1&&iy<=by2);
      if(!inA||!inB) continue;
      const key=`${ix},${iy}`;
      if(seen.has(key)) continue;
      seen.add(key);
      const jx=ix-W_PX/2, jy=iy-W_PX/2;
      g.appendChild(e('rect',{x:jx,y:jy,width:W_PX,height:W_PX,fill:COL_WALL_FILL,stroke:'none'}));
      g.appendChild(e('rect',{x:jx,y:jy,width:W_PX,height:W_PX,fill:'url(#wall-hatch)',stroke:'none'}));
    }
  }
}

// showHandles=true  → full render, appends to svg (used by render())
// showHandles=false → partial refresh, inserts before furn-g (used by event handlers)
function renderLines(showHandles = true){
  const g=e('g',{id:'lines-g','clip-path':'url(#iclip)'});
  floorLines.forEach(ln=>renderWallBody(g,ln,ln.id===selLine,showHandles));
  drawJunctions(g);

  if(hoverEndpoint&&tool==='floor-line'&&!drawLine){
    const{x:hx,y:hy}=hoverEndpoint;
    g.appendChild(e('circle',{cx:hx,cy:hy,r:9,fill:'rgba(196,133,58,.15)',stroke:'#c4853a','stroke-width':1.2}));
    g.appendChild(e('line',{x1:hx-5,y1:hy,x2:hx+5,y2:hy,stroke:'#c4853a','stroke-width':1.8}));
    g.appendChild(e('line',{x1:hx,y1:hy-5,x2:hx,y2:hy+5,stroke:'#c4853a','stroke-width':1.8}));
  }
  if(snapIndicator){
    g.appendChild(e('circle',{cx:snapIndicator.x,cy:snapIndicator.y,r:8,fill:'none',stroke:'#c4853a','stroke-width':1.5,opacity:.9}));
    g.appendChild(e('circle',{cx:snapIndicator.x,cy:snapIndicator.y,r:2,fill:'#c4853a'}));
  }
  if(drawLine){
    const dl={x1:drawLine.x1,y1:drawLine.y1,x2:drawLine.x2??drawLine.x1,y2:drawLine.y2??drawLine.y1};
    const r=wallR(dl);
    g.appendChild(e('rect',{...r,fill:'#6a5a50',stroke:'#c4853a','stroke-width':1,'stroke-dasharray':'4,3',opacity:.75}));
  }
  if(!showHandles){
    const fg=document.getElementById('furn-g');
    if(fg) svg.insertBefore(g,fg); else svg.appendChild(g);
  } else {
    svg.appendChild(g);
  }
}

// showSelection=true  → full render, draws selection outline (used by render())
// showSelection=false → partial refresh, no selection rect (used by event handlers)
function renderFurniture(showSelection = true){
  const g=e('g',{id:'furn-g'});
  furniture.forEach(f=>{
    const def=FURN[f.type]; if(!def)return;
    const iw=f.w||def.w, ih=f.h||def.h;
    const pw=iw*SC,ph=ih*SC;
    const fg=e('g',{transform:`translate(${f.x},${f.y}) rotate(${f.rot||0},${pw/2},${ph/2})`,'data-fid':f.id});
    const sel=f.id===selFurn;
    def.draw(fg,SC,sel,iw,ih);
    // Keep text labels readable — counter-rotate when item is flipped 180°
    if(((f.rot||0)%360+360)%360===180){
      fg.querySelectorAll('text').forEach(t=>{
        t.setAttribute('transform',`rotate(-180,${pw/2},${ph/2})`);
      });
    }
    if(showSelection&&sel){
      fg.appendChild(e('rect',{x:-2,y:-2,width:pw+4,height:ph+4,fill:'none',stroke:'#c4853a','stroke-width':1.5,'stroke-dasharray':'4,2',rx:2}));
      if(def.resizable){
        // East handle — resize width
        const eh=e('rect',{x:pw-4,y:ph/2-4,width:8,height:8,fill:'#c4853a',stroke:'#ffd090','stroke-width':1,rx:2});
        eh.style.cursor='ew-resize';
        eh.addEventListener('mousedown',ev=>{
          ev.stopPropagation();
          dragFurnResize={id:f.id,axis:'w',startVal:svgPt(ev).x,startW:iw,startH:ih};
        });
        fg.appendChild(eh);
        // South handle — resize height
        const sh=e('rect',{x:pw/2-4,y:ph-4,width:8,height:8,fill:'#c4853a',stroke:'#ffd090','stroke-width':1,rx:2});
        sh.style.cursor='ns-resize';
        sh.addEventListener('mousedown',ev=>{
          ev.stopPropagation();
          dragFurnResize={id:f.id,axis:'h',startVal:svgPt(ev).y,startW:iw,startH:ih};
        });
        fg.appendChild(sh);
      }
    }
    // Hit area covers the body (below dot in paint order so dot stays clickable)
    const hit=e('rect',{x:0,y:0,width:pw,height:ph,fill:'transparent',stroke:'none'});
    hit.style.cursor='move';
    hit.addEventListener('mousedown',ev=>onFurnDown(ev,f.id));
    hit.addEventListener('click',ev=>ev.stopPropagation());
    fg.appendChild(hit);
    // Dot on top — hover-only, must be last so it receives pointer events
    if(def.sizeModal){
      const dot=e('circle',{cx:pw/2,cy:ph/2,r:5,fill:'#9a8a7a',stroke:'#fdfaf4','stroke-width':1.2,opacity:0});
      dot.style.cursor='pointer';
      dot.addEventListener('mouseenter',()=>dot.setAttribute('opacity',.9));
      dot.addEventListener('mouseleave',()=>dot.setAttribute('opacity',0));
      dot.addEventListener('mousedown',ev=>ev.stopPropagation());
      dot.addEventListener('click',ev=>{ev.stopPropagation();showCounterModal(f,f.x+pw/2,f.y+ph/2);});
      fg.appendChild(dot);
    }
    g.appendChild(fg);
  });
  svg.appendChild(g);
}

// ── WALL SECTIONS ──
function sRect(side,i){
  if(side==='top')   return{x:W_PX+i*SEC,y:0,         w:SEC,h:W_PX};
  if(side==='bottom')return{x:W_PX+i*SEC,y:W_PX+IPH,  w:SEC,h:W_PX};
  if(side==='left')  return{x:0,         y:W_PX+i*SEC, w:W_PX,h:SEC};
  return                   {x:W_PX+IPW,  y:W_PX+i*SEC, w:W_PX,h:SEC};
}
function drawSide(side){secs[side].forEach((t,i)=>{const r=sRect(side,i);drawSec(side,i,t,r.x,r.y,r.w,r.h);});}

function makeSectionHit(x,y,w,h,side,i,type){
  const hit=e('rect',{x,y,width:w,height:h,fill:'transparent',stroke:'none'});
  hit.style.cursor='pointer';
  const DS_CYCLE=['door-sidelight','door-sidelight-flip','door-sidelight-out','door-sidelight-flip-out'];
  const isDoorSl=DS_CYCLE.includes(type);
  hit.addEventListener('contextmenu',ev=>{
    if(!isDoorSl)return;
    ev.preventDefault(); ev.stopPropagation();
    saveHistory();
    secs[side][i]=DS_CYCLE[(DS_CYCLE.indexOf(type)+1)%4];
    render();
  });
  hit.addEventListener('mouseenter',()=>{if(tool==='wall'||tool==='window'||tool==='door'||tool==='door-sidelight'){hit.setAttribute('fill','rgba(196,133,58,.15)');hit.setAttribute('stroke','#c4853a');hit.setAttribute('stroke-width','1.5');}});
  hit.addEventListener('mouseleave',()=>{hit.setAttribute('fill','transparent');hit.setAttribute('stroke','none');});
  hit.addEventListener('click',ev=>{
    if(tool==='wall'||tool==='window'||tool==='door'||tool==='door-sidelight'){saveHistory();secs[side][i]=tool;render();}
    ev.stopPropagation();
  });
  return hit;
}

function drawSec(side,i,type,x,y,w,h){
  const g=e('g');
  const horiz=side==='top'||side==='bottom';
  if(type==='wall'){
    g.appendChild(e('rect',{x,y,width:w,height:h,fill:COL_SEC_FILL,stroke:COL_SEC_STROKE,'stroke-width':.5}));
    g.appendChild(e('rect',{x,y,width:w,height:h,fill:'url(#wall-hatch)',stroke:'none'}));
  } else if(type==='window'){
    g.appendChild(e('rect',{x,y,width:w,height:h,fill:'#c2dce8',stroke:'#5b9ab5','stroke-width':1.5}));
    for(let k=1;k<3;k++){
      if(horiz) g.appendChild(e('line',{x1:x+w*k/3,y1:y+1,x2:x+w*k/3,y2:y+h-1,stroke:'#4a8aaa','stroke-width':.9}));
      else      g.appendChild(e('line',{x1:x+1,y1:y+h*k/3,x2:x+w-1,y2:y+h*k/3,stroke:'#4a8aaa','stroke-width':.9}));
    }
    const da=horiz?{x1:x+1,y1:y+h/2,x2:x+w-1,y2:y+h/2}:{x1:x+w/2,y1:y+1,x2:x+w/2,y2:y+h-1};
    g.appendChild(e('line',{...da,stroke:'#4a8aaa','stroke-width':.6,'stroke-dasharray':'2,2'}));
    g.appendChild(e('rect',{x:x+2,y:y+2,width:w*.22,height:h-4,fill:'rgba(255,255,255,.28)',rx:1}));
  } else if(type==='door'){
    // jamb(4px) + door leaf(72px) + wall fill(20px) — swing arc in drawDoorSwings()
    if(horiz){
      // Wall fill (right, 20px)
      g.appendChild(e('rect',{x:x+76,y,width:20,height:h,fill:COL_SEC_FILL,stroke:COL_SEC_STROKE,'stroke-width':.5}));
      g.appendChild(e('rect',{x:x+76,y,width:20,height:h,fill:'url(#wall-hatch)',stroke:'none'}));
      // Door leaf
      g.appendChild(e('rect',{x:x+4,y,width:72,height:h,fill:COL_DOOR_FILL,stroke:COL_DOOR_STROKE,'stroke-width':1.5}));
      g.appendChild(e('line',{x1:x+4,y1:y,x2:x+4,y2:y+h,stroke:COL_DOOR_STROKE,'stroke-width':1.5}));
      // Jamb
      g.appendChild(e('rect',{x,y,width:4,height:h,fill:COL_SEC_FILL,stroke:COL_SEC_STROKE,'stroke-width':.5}));
      g.appendChild(e('rect',{x,y,width:4,height:h,fill:'url(#wall-hatch)',stroke:'none'}));
    } else {
      // Wall fill (bottom, 20px)
      g.appendChild(e('rect',{x,y:y+76,width:w,height:20,fill:COL_SEC_FILL,stroke:COL_SEC_STROKE,'stroke-width':.5}));
      g.appendChild(e('rect',{x,y:y+76,width:w,height:20,fill:'url(#wall-hatch)',stroke:'none'}));
      // Door leaf
      g.appendChild(e('rect',{x,y:y+4,width:w,height:72,fill:COL_DOOR_FILL,stroke:COL_DOOR_STROKE,'stroke-width':1.5}));
      g.appendChild(e('line',{x1:x,y1:y+4,x2:x+w,y2:y+4,stroke:COL_DOOR_STROKE,'stroke-width':1.5}));
      // Jamb
      g.appendChild(e('rect',{x,y,width:w,height:4,fill:COL_SEC_FILL,stroke:COL_SEC_STROKE,'stroke-width':.5}));
      g.appendChild(e('rect',{x,y,width:w,height:4,fill:'url(#wall-hatch)',stroke:'none'}));
    }
  } else if(type==='door-sidelight'||type==='door-sidelight-flip'
          ||type==='door-sidelight-out'||type==='door-sidelight-flip-out'){
    // 4 layouts (all 96px wide), always swing inward. -out = hinge on near side of sidelight.
    // 1: [JAMB(4)|DOOR(72)|MULLION(4)|SIDELIGHT(16)]  hinge-left,  sl-right
    // 2: [SIDELIGHT(16)|MULLION(4)|DOOR(72)|JAMB(4)]  hinge-right, sl-left
    // 3: [DOOR(72)|JAMB(4)|MULLION(4)|SIDELIGHT(16)]  hinge-right, sl-right  (-out)
    // 4: [SIDELIGHT(16)|MULLION(4)|JAMB(4)|DOOR(72)]  hinge-left,  sl-left   (-flip-out)
    const flip=type==='door-sidelight-flip'||type==='door-sidelight-flip-out';
    const rev =type==='door-sidelight-out' ||type==='door-sidelight-flip-out';
    if(horiz){
      let jx,dx,mx,slx,jeLine,slCx;
      if(!flip&&!rev){ jx=x;    dx=x+4;  mx=x+76; slx=x+80; jeLine=x+4;  slCx=x+88; }
      if( flip&&!rev){ jx=x+92; dx=x+20; mx=x+16; slx=x;    jeLine=x+92; slCx=x+8;  }
      if(!flip&& rev){ jx=x+72; dx=x;    mx=x+76; slx=x+80; jeLine=x+72; slCx=x+88; }
      if( flip&& rev){ jx=x+20; dx=x+24; mx=x+16; slx=x;    jeLine=x+24; slCx=x+8;  }
      // Jamb
      g.appendChild(e('rect',{x:jx,y,width:4,height:h,fill:COL_SEC_FILL,stroke:COL_SEC_STROKE,'stroke-width':.5}));
      g.appendChild(e('rect',{x:jx,y,width:4,height:h,fill:'url(#wall-hatch)',stroke:'none'}));
      // Door leaf
      g.appendChild(e('rect',{x:dx,y,width:72,height:h,fill:COL_DOOR_FILL,stroke:COL_DOOR_STROKE,'stroke-width':1.5}));
      g.appendChild(e('line',{x1:jeLine,y1:y,x2:jeLine,y2:y+h,stroke:COL_DOOR_STROKE,'stroke-width':1.5}));
      // Mullion
      g.appendChild(e('rect',{x:mx,y,width:4,height:h,fill:COL_SEC_FILL,stroke:COL_SEC_STROKE,'stroke-width':.5}));
      g.appendChild(e('rect',{x:mx,y,width:4,height:h,fill:'url(#wall-hatch)',stroke:'none'}));
      // Sidelight
      g.appendChild(e('rect',{x:slx,y,width:16,height:h,fill:'#c2dce8',stroke:'#5b9ab5','stroke-width':1.5}));
      g.appendChild(e('line',{x1:slCx,y1:y+1,x2:slCx,y2:y+h-1,stroke:'#4a8aaa','stroke-width':.9}));
    } else {
      let jy,dy,my,sly,jeLine,slCy;
      if(!flip&&!rev){ jy=y;    dy=y+4;  my=y+76; sly=y+80; jeLine=y+4;  slCy=y+88; }
      if( flip&&!rev){ jy=y+92; dy=y+20; my=y+16; sly=y;    jeLine=y+92; slCy=y+8;  }
      if(!flip&& rev){ jy=y+72; dy=y;    my=y+76; sly=y+80; jeLine=y+72; slCy=y+88; }
      if( flip&& rev){ jy=y+20; dy=y+24; my=y+16; sly=y;    jeLine=y+24; slCy=y+8;  }
      // Jamb
      g.appendChild(e('rect',{x,y:jy,width:w,height:4,fill:COL_SEC_FILL,stroke:COL_SEC_STROKE,'stroke-width':.5}));
      g.appendChild(e('rect',{x,y:jy,width:w,height:4,fill:'url(#wall-hatch)',stroke:'none'}));
      // Door leaf
      g.appendChild(e('rect',{x,y:dy,width:w,height:72,fill:COL_DOOR_FILL,stroke:COL_DOOR_STROKE,'stroke-width':1.5}));
      g.appendChild(e('line',{x1:x,y1:jeLine,x2:x+w,y2:jeLine,stroke:COL_DOOR_STROKE,'stroke-width':1.5}));
      // Mullion
      g.appendChild(e('rect',{x,y:my,width:w,height:4,fill:COL_SEC_FILL,stroke:COL_SEC_STROKE,'stroke-width':.5}));
      g.appendChild(e('rect',{x,y:my,width:w,height:4,fill:'url(#wall-hatch)',stroke:'none'}));
      // Sidelight
      g.appendChild(e('rect',{x,y:sly,width:w,height:16,fill:'#c2dce8',stroke:'#5b9ab5','stroke-width':1.5}));
      g.appendChild(e('line',{x1:x+1,y1:slCy,x2:x+w-1,y2:slCy,stroke:'#4a8aaa','stroke-width':.9}));
    }
  }
  g.appendChild(makeSectionHit(x,y,w,h,side,i,type));
  svg.appendChild(g);
}
// Door swing arcs drawn last so they sit on top of all wall section elements
function drawDoorSwings(){
  ['top','bottom','left','right'].forEach(side=>{
    secs[side].forEach((type,i)=>{
      const DS=['door-sidelight','door-sidelight-flip','door-sidelight-out','door-sidelight-flip-out'];
      if(type!=='door'&&!DS.includes(type))return;
      const r=sRect(side,i);
      const{x,y,w,h}=r;
      const horiz=side==='top'||side==='bottom';
      const flip=type==='door-sidelight-flip'||type==='door-sidelight-flip-out';
      const rev =type==='door-sidelight-out' ||type==='door-sidelight-flip-out';
      let x1c,y1c,x2c,y2c, x1o,y1o,x2o,y2o, d;
      if(horiz){
        const hy=side==='top'?y+h:y;
        // aHx = hinge x, aTx = door-tip x (free end) — all 4 states always swing inward
        let aHx,aTx;
        if(!flip&&!rev){ aHx=x+4;  aTx=x+76; }
        if( flip&&!rev){ aHx=x+92; aTx=x+20; }
        if(!flip&& rev){ aHx=x+72; aTx=x;    }
        if( flip&& rev){ aHx=x+24; aTx=x+96; }
        const aOy=side==='top'?y+h+72:y-72; // always inward
        x1c=aHx;y1c=hy;x2c=aTx;y2c=hy;   // closed position line
        x1o=aHx;y1o=hy;x2o=aHx;y2o=aOy;  // open position line
        // Quarter-circle bezier: from door-tip-closed (aTx,hy) to door-tip-open (aHx,aOy)
        const inDir=Math.sign(aOy-hy), sideDir=Math.sign(aTx-aHx);
        d=`M ${aTx} ${hy} C ${aTx} ${hy+inDir*19} ${aHx+sideDir*64} ${hy+inDir*37} ${aHx+sideDir*51} ${hy+inDir*51} C ${aHx+sideDir*37} ${hy+inDir*64} ${aHx+sideDir*19} ${aOy} ${aHx} ${aOy}`;
      } else {
        const wx=side==='left'?x+w:x;
        let aHy,aTy;
        if(!flip&&!rev){ aHy=y+4;  aTy=y+76; }
        if( flip&&!rev){ aHy=y+92; aTy=y+20; }
        if(!flip&& rev){ aHy=y+72; aTy=y;    }
        if( flip&& rev){ aHy=y+24; aTy=y+96; }
        const aOx=side==='left'?x+w+72:x-72; // always inward
        x1c=wx;y1c=aHy;x2c=wx;y2c=aTy;   // closed position line
        x1o=wx;y1o=aHy;x2o=aOx;y2o=aHy;  // open position line
        // Quarter-circle bezier: from door-tip-closed (wx,aTy) to door-tip-open (aOx,aHy)
        const inDir=Math.sign(aOx-wx), sideDir=Math.sign(aTy-aHy);
        d=`M ${wx} ${aTy} C ${wx+inDir*19} ${aTy} ${wx+inDir*37} ${aHy+sideDir*64} ${wx+inDir*51} ${aHy+sideDir*51} C ${wx+inDir*64} ${aHy+sideDir*37} ${aOx} ${aHy+sideDir*19} ${aOx} ${aHy}`;
      }
      svg.appendChild(e('line',{x1:x1c,y1:y1c,x2:x2c,y2:y2c,stroke:COL_DOOR_STROKE,'stroke-width':1.5}));
      svg.appendChild(e('line',{x1:x1o,y1:y1o,x2:x2o,y2:y2o,stroke:COL_DOOR_STROKE,'stroke-width':1.5}));
      svg.appendChild(e('path',{d,fill:'none',stroke:COL_DOOR_STROKE,'stroke-width':1,'stroke-dasharray':'4,3'}));
    });
  });
}
function drawCorners(){
  [[0,0],[W_PX+IPW,0],[0,W_PX+IPH],[W_PX+IPW,W_PX+IPH]].forEach(([x,y])=>{
    svg.appendChild(e('rect',{x,y,width:W_PX,height:W_PX,fill:COL_SEC_FILL,stroke:COL_SEC_STROKE,'stroke-width':.5}));
    svg.appendChild(e('rect',{x,y,width:W_PX,height:W_PX,fill:'url(#wall-hatch)',stroke:'none'}));
  });
}
function drawDims(){
  const ds={'font-family':'DM Mono,monospace','font-size':'8','text-anchor':'middle',fill:'#9a8a7a'};
  svg.appendChild(e('line',{x1:W_PX,y1:-14,x2:W_PX+IPW,y2:-14,stroke:'#9a8a7a','stroke-width':.6}));
  [W_PX,W_PX+IPW].forEach(x=>{svg.appendChild(e('line',{x1:x,y1:-18,x2:x,y2:-10,stroke:'#9a8a7a','stroke-width':.6}));});
  const t1=e('text',{x:W_PX+IPW/2,y:-19,...ds});t1.textContent=`${IW}′-0″ interior`;svg.appendChild(t1);
  svg.appendChild(e('line',{x1:-16,y1:W_PX,x2:-16,y2:W_PX+IPH,stroke:'#9a8a7a','stroke-width':.6}));
  [W_PX,W_PX+IPH].forEach(y=>{svg.appendChild(e('line',{x1:-20,y1:y,x2:-12,y2:y,stroke:'#9a8a7a','stroke-width':.6}));});
  const t2=e('text',{x:-28,y:W_PX+IPH/2,...ds,transform:`rotate(-90,-28,${W_PX+IPH/2})`});t2.textContent=`${IH}′-0″ interior`;svg.appendChild(t2);
}

function drawResizeButtons(){
  function makeBtn(cx,cy,label,dir,fill){
    const g=e('g');g.style.cursor='pointer';
    const c=e('circle',{cx,cy,r:12,fill,stroke:'none'});
    const t=e('text',{x:cx,y:cy,'text-anchor':'middle','dominant-baseline':'central',
      fill:'#fff','font-size':'16','font-family':'DM Mono,monospace','font-weight':'bold'});
    t.textContent=label;
    g.appendChild(c);g.appendChild(t);
    const hov=label==='+'?'#5a7e5e':'#7e4a4a';
    g.addEventListener('mouseenter',()=>c.setAttribute('fill',hov));
    g.addEventListener('mouseleave',()=>c.setAttribute('fill',fill));
    g.addEventListener('mousedown',ev=>ev.stopPropagation());
    g.addEventListener('click',ev=>{ev.stopPropagation();resizePlan(dir);});
    return g;
  }
  svg.appendChild(makeBtn(TW+26, TH/2-14, '+', 'right',   '#7a9e7e'));
  svg.appendChild(makeBtn(TW+26, TH/2+14, '−', 'right-',  '#9e7a7a'));
  svg.appendChild(makeBtn(TW/2-14, TH+26, '+', 'bottom',  '#7a9e7e'));
  svg.appendChild(makeBtn(TW/2+14, TH+26, '−', 'bottom-', '#9e7a7a'));
}

function drawPortalFrame(){
  // Axial portal frame ("compass") — feet are 3" wide (X) × 8" tall (Y), 56" apart edge-to-edge
  // Frame count based on IW only (depth does not affect structure):
  //   N = max(1, ceil(IW / 20) - 1)  — max bay = 20ft fixed
  //   N=1 → single center frame
  //   N≥2 → outer bay = (IW - (N-1)×20) / 2 from each wall, frames every 20ft
  const FOOT_W = Math.round(3/12 * SC);   // 3"  = 6px
  const FOOT_H = Math.round(8/12 * SC);   // 8"  = 16px
  const SEP    = Math.round(56/12 * SC);  // 56" edge-to-edge = 112px
  const CTC    = SEP + FOOT_H;            // center-to-center = 128px
  const cy     = W_PX + IPH / 2;
  const f1y    = cy - CTC / 2 - FOOT_H / 2;
  const f2y    = cy + CTC / 2 - FOOT_H / 2;
  const CH     = 5;

  // Compute frame column positions in SVG px along the X axis.
  // Max structural bay = 20ft (fixed constant — depth does not affect frame count).
  const MAX_BAY = 20;
  const N = Math.max(1, Math.ceil(IW / MAX_BAY) - 1);
  const frameXs = [];
  if(N === 1){
    frameXs.push(W_PX + IPW / 2);
  } else {
    const outerFt = (IW - (N - 1) * MAX_BAY) / 2; // ft from interior left wall
    for(let i = 0; i < N; i++){
      frameXs.push(W_PX + (outerFt + i * MAX_BAY) * SC);
    }
  }

  const g = e('g',{id:'portal-frame'});

  for(const cx of frameXs){
    const fx = cx - FOOT_W / 2;

    // Dashed axis line between the feet
    g.appendChild(e('line',{x1:cx,y1:f1y+FOOT_H,x2:cx,y2:f2y,
      stroke:'#9a8a7a','stroke-width':.6,'stroke-dasharray':'3,3',opacity:.7}));

    // Feet — dark fill + wall hatch
    for(const fy of [f1y, f2y]){
      g.appendChild(e('rect',{x:fx,y:fy,width:FOOT_W,height:FOOT_H,
        fill:COL_WALL_FILL,stroke:COL_WALL_STROKE,'stroke-width':.5}));
      g.appendChild(e('rect',{x:fx,y:fy,width:FOOT_W,height:FOOT_H,
        fill:'url(#wall-hatch)',stroke:'none'}));
    }

    // Crosshair at plan center for this frame column
    g.appendChild(e('line',{x1:cx-CH,y1:cy,x2:cx+CH,y2:cy,stroke:'#9a8a7a','stroke-width':.6,opacity:.7}));
    g.appendChild(e('line',{x1:cx,y1:cy-CH,x2:cx,y2:cy+CH,stroke:'#9a8a7a','stroke-width':.6,opacity:.7}));
  }

  // Label above the first frame
  const lbl=e('text',{x:frameXs[0]+5,y:f1y-3,fill:'#9a8a7a',
    'font-family':'DM Mono,monospace','font-size':'6','letter-spacing':'.08em'});
  lbl.textContent='compass frame';
  g.appendChild(lbl);

  svg.appendChild(g);
}
