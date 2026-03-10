// ── RENDER ──
function render(){
  svg.innerHTML='';
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
  svg.appendChild(defs);

  svg.appendChild(e('rect',{x:W_PX,y:W_PX,width:IPW,height:IPH,fill:'#fdfaf4'}));
  svg.appendChild(e('rect',{x:W_PX,y:W_PX,width:IPW,height:IPH,fill:'url(#g4)'}));

  renderLines();
  renderFurniture();
  ['top','bottom','left','right'].forEach(drawSide);
  drawCorners();
  drawDims();
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
  const sc=sel?'#c4853a':'#1a1410', sw=sel?1.5:.5;
  for(const seg of segs){
    const sr=horiz
      ?{x:r.x+seg.start,y:r.y,width:Math.max(0,seg.len),height:r.height}
      :{x:r.x,y:r.y+seg.start,width:r.width,height:Math.max(0,seg.len)};
    if(sr.width>0&&sr.height>0){
      g.appendChild(e('rect',{...sr,fill:'#2a2420',stroke:sc,'stroke-width':sw}));
      g.appendChild(e('rect',{...sr,fill:'url(#wall-hatch)',stroke:'none'}));
    }
  }

  // Transparent hit area for selecting the wall
  const hit=e('rect',{...r,fill:'transparent',stroke:'none'});
  hit.style.cursor='pointer';
  hit.addEventListener('click',ev=>{
    ev.stopPropagation();
    if(tool==='select'){selLine=(selLine===ln.id)?null:ln.id;selOpening=null;render();}
  });
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

function renderLines(){
  const g=e('g',{id:'lines-g','clip-path':'url(#iclip)'});
  floorLines.forEach(ln=>renderWallBody(g,ln,ln.id===selLine,true));

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
  svg.appendChild(g);
}

function renderFurniture(){
  const g=e('g',{id:'furn-g'});
  furniture.forEach(f=>{
    const def=FURN[f.type]; if(!def)return;
    const pw=def.w*SC,ph=def.h*SC;
    const fg=e('g',{transform:`translate(${f.x},${f.y}) rotate(${f.rot||0},${pw/2},${ph/2})`,'data-fid':f.id});
    const sel=f.id===selFurn;
    def.draw(fg,SC,sel);
    if(sel){
      fg.appendChild(e('rect',{x:-2,y:-2,width:pw+4,height:ph+4,fill:'none',stroke:'#c4853a','stroke-width':1.5,'stroke-dasharray':'4,2',rx:2}));
    }
    const hit=e('rect',{x:0,y:0,width:pw,height:ph,fill:'transparent',stroke:'none'});
    hit.style.cursor='move';
    hit.addEventListener('mousedown',ev=>onFurnDown(ev,f.id));
    hit.addEventListener('click',ev=>ev.stopPropagation());
    fg.appendChild(hit);
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
function drawSec(side,i,type,x,y,w,h){
  const g=e('g');
  const horiz=side==='top'||side==='bottom';
  if(type==='wall'){
    g.appendChild(e('rect',{x,y,width:w,height:h,fill:'#5a4e46',stroke:'#3a2e28','stroke-width':.5}));
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
    g.appendChild(e('rect',{x,y,width:w,height:h,fill:'#e8d8b0',stroke:'#b09040','stroke-width':1.5}));
    const r=horiz?w*.88:h*.88;
    if(horiz){
      g.appendChild(e('line',{x1:x+w*.1,y1:y,x2:x+w*.1,y2:y+h,stroke:'#b09040','stroke-width':1.5}));
      const sw=side==='top'?1:0;
      const by=side==='top'?y+h:y;
      g.appendChild(e('path',{d:`M ${x+w*.1} ${by} A ${r} ${r} 0 0 ${sw} ${x+w} ${by}`,
        fill:'rgba(176,144,64,.1)',stroke:'#b09040','stroke-width':.9,'stroke-dasharray':'3,2'}));
    } else {
      g.appendChild(e('line',{x1:x,y1:y+h*.1,x2:x+w,y2:y+h*.1,stroke:'#b09040','stroke-width':1.5}));
      const sw=side==='left'?1:0;
      const bx=side==='left'?x+w:x;
      g.appendChild(e('path',{d:`M ${bx} ${y+h*.1} A ${r} ${r} 0 0 ${sw} ${bx} ${y+h}`,
        fill:'rgba(176,144,64,.1)',stroke:'#b09040','stroke-width':.9,'stroke-dasharray':'3,2'}));
    }
  }
  const hit=e('rect',{x,y,width:w,height:h,fill:'transparent',stroke:'none'});
  hit.style.cursor='pointer';
  hit.addEventListener('mouseenter',()=>{if(tool==='wall'||tool==='window'||tool==='door'){hit.setAttribute('fill','rgba(196,133,58,.15)');hit.setAttribute('stroke','#c4853a');hit.setAttribute('stroke-width','1.5');}});
  hit.addEventListener('mouseleave',()=>{hit.setAttribute('fill','transparent');hit.setAttribute('stroke','none');});
  hit.addEventListener('click',ev=>{
    if(tool==='wall'||tool==='window'||tool==='door'){secs[side][i]=tool;render();}
    ev.stopPropagation();
  });
  g.appendChild(hit);
  svg.appendChild(g);
}
function drawCorners(){
  [[0,0],[W_PX+IPW,0],[0,W_PX+IPH],[W_PX+IPW,W_PX+IPH]].forEach(([x,y])=>{
    svg.appendChild(e('rect',{x,y,width:W_PX,height:W_PX,fill:'#5a4e46',stroke:'#3a2e28','stroke-width':.5}));
    svg.appendChild(e('rect',{x,y,width:W_PX,height:W_PX,fill:'url(#wall-hatch)',stroke:'none'}));
  });
}
function drawDims(){
  const ds={'font-family':'DM Mono,monospace','font-size':'8','text-anchor':'middle',fill:'#9a8a7a'};
  svg.appendChild(e('line',{x1:W_PX,y1:-14,x2:W_PX+IPW,y2:-14,stroke:'#9a8a7a','stroke-width':.6}));
  [W_PX,W_PX+IPW].forEach(x=>{svg.appendChild(e('line',{x1:x,y1:-18,x2:x,y2:-10,stroke:'#9a8a7a','stroke-width':.6}));});
  const t1=e('text',{x:W_PX+IPW/2,y:-19,...ds});t1.textContent="32′-0″ interior";svg.appendChild(t1);
  svg.appendChild(e('line',{x1:-16,y1:W_PX,x2:-16,y2:W_PX+IPH,stroke:'#9a8a7a','stroke-width':.6}));
  [W_PX,W_PX+IPH].forEach(y=>{svg.appendChild(e('line',{x1:-20,y1:y,x2:-12,y2:y,stroke:'#9a8a7a','stroke-width':.6}));});
  const t2=e('text',{x:-28,y:W_PX+IPH/2,...ds,transform:`rotate(-90,-28,${W_PX+IPH/2})`});t2.textContent="20′-0″ interior";svg.appendChild(t2);
}

function renderLinesOnly(){
  const g=e('g',{id:'lines-g','clip-path':'url(#iclip)'});
  floorLines.forEach(ln=>renderWallBody(g,ln,ln.id===selLine,false));
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
    const dl={x1:drawLine.x1,y1:drawLine.y1,x2:drawLine.x2,y2:drawLine.y2};
    const r=wallR(dl);
    g.appendChild(e('rect',{...r,fill:'#6a5a50',stroke:'#c4853a','stroke-width':1,'stroke-dasharray':'4,3',opacity:.75}));
  }
  const fg=document.getElementById('furn-g');
  if(fg)svg.insertBefore(g,fg); else svg.appendChild(g);
}
function renderFurnitureOnly(){
  const g=e('g',{id:'furn-g'});
  furniture.forEach(f=>{
    const def=FURN[f.type];if(!def)return;
    const pw=def.w*SC,ph=def.h*SC;
    const fg=e('g',{transform:`translate(${f.x},${f.y}) rotate(${f.rot||0},${pw/2},${ph/2})`,'data-fid':f.id});
    def.draw(fg,SC,f.id===selFurn);
    const hit=e('rect',{x:0,y:0,width:pw,height:ph,fill:'transparent',stroke:'none'});
    hit.style.cursor='move';
    hit.addEventListener('mousedown',ev=>onFurnDown(ev,f.id));
    hit.addEventListener('click',ev=>ev.stopPropagation());
    fg.appendChild(hit);
    g.appendChild(fg);
  });
  svg.appendChild(g);
}
