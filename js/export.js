// ── EXPORTS ──

function exportSVG(){
  const blob=new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='floorplan.svg'; a.click();
}

function exportPDF(){
  window.print();
}

function exportDXF(){
  // Coordinate conversion: SVG px → feet (DXF units), flip Y axis
  const dxfX=px=>+(px/SC).toFixed(4);
  const dxfY=px=>+((TH-px)/SC).toFixed(4);

  // Build a closed LWPOLYLINE rectangle from SVG px rect {x,y,width,height}
  function lwRect(r,layer){
    const x1=dxfX(r.x), y1=dxfY(r.y+r.height);
    const x2=dxfX(r.x+r.width), y2=dxfY(r.y);
    return[
      '0','LWPOLYLINE',
      '8',layer,
      '90','4',   // 4 vertices
      '70','1',   // closed flag
      '10',x1,'20',y1,
      '10',x2,'20',y1,
      '10',x2,'20',y2,
      '10',x1,'20',y2,
    ].join('\n');
  }

  // Door+sidelight swing arc (36" door). flip=true → sidelight on left/top, jamb at far end.
  function doorSlArc(side,i,flip){
    const r=sRect(side,i);
    const {x,y,w,h}=r;
    const radius=+(72/SC).toFixed(4); // 3 ft = 36"
    let cx,cy,startAngle,endAngle;
    if(side==='top'){
      cx=dxfX(flip?x+92:x+4); cy=dxfY(y+h); startAngle=flip?90:0; endAngle=flip?180:90;
    } else if(side==='bottom'){
      cx=dxfX(flip?x+92:x+4); cy=dxfY(y); startAngle=flip?180:270; endAngle=flip?270:360;
    } else if(side==='left'){
      cx=dxfX(x+w); cy=dxfY(flip?y+92:y+4); startAngle=flip?0:90; endAngle=flip?90:180;
    } else {
      cx=dxfX(x); cy=dxfY(flip?y+92:y+4); startAngle=flip?90:0; endAngle=flip?180:90;
    }
    return['0','ARC','8','DOORS','10',cx,'20',cy,'30','0','40',radius,'50',startAngle,'51',endAngle].join('\n');
  }

  // Door swing arc entity
  function doorArc(side,i){
    const r=sRect(side,i);
    const {x,y,w,h}=r;
    const radius=+(72/SC).toFixed(4); // 3ft = 36"
    let cx,cy,startAngle,endAngle;
    if(side==='top'){
      cx=dxfX(x+4); cy=dxfY(y+h); startAngle=0; endAngle=90;
    } else if(side==='bottom'){
      cx=dxfX(x+4); cy=dxfY(y); startAngle=270; endAngle=360;
    } else if(side==='left'){
      cx=dxfX(x+w); cy=dxfY(y+4); startAngle=90; endAngle=180;
    } else { // right
      cx=dxfX(x); cy=dxfY(y+4); startAngle=0; endAngle=90;
    }
    return[
      '0','ARC',
      '8','DOORS',
      '10',cx,'20',cy,'30','0',
      '40',radius,
      '50',startAngle,
      '51',endAngle,
    ].join('\n');
  }

  const layers=[
    {name:'WALLS',   color:7},
    {name:'WINDOWS', color:4},
    {name:'DOORS',   color:2},
    {name:'INTERIOR',color:6},
  ];

  const layerDefs=layers.map(l=>[
    '0','LAYER','2',l.name,'70','0','62',l.color,'6','CONTINUOUS'
  ].join('\n')).join('\n');

  // Entities
  const entities=[];

  // Perimeter wall sections + corners
  ['top','bottom','left','right'].forEach(side=>{
    secs[side].forEach((type,i)=>{
      const r=sRect(side,i);
      const layer=type==='wall'?'WALLS':type==='window'?'WINDOWS':'DOORS';
      entities.push(lwRect({x:r.x,y:r.y,width:r.w,height:r.h},layer));
      if(type==='door') entities.push(doorArc(side,i));
      if(type==='door-sidelight') entities.push(doorSlArc(side,i,false));
      if(type==='door-sidelight-flip') entities.push(doorSlArc(side,i,true));
    });
  });

  // Corners
  [[0,0],[W_PX+IPW,0],[0,W_PX+IPH],[W_PX+IPW,W_PX+IPH]].forEach(([x,y])=>{
    entities.push(lwRect({x,y,width:W_PX,height:W_PX},'WALLS'));
  });

  // Interior walls
  floorLines.forEach(ln=>{
    entities.push(lwRect(wallR(ln),'INTERIOR'));
  });

  const dxf=[
    '0','SECTION','2','HEADER',
    '9','$ACADVER','1','AC1015',
    '9','$INSUNITS','70','2',  // feet
    '0','ENDSEC',
    '0','SECTION','2','TABLES',
    '0','TABLE','2','LAYER','70',String(layers.length),
    layerDefs,
    '0','ENDTABLE',
    '0','ENDSEC',
    '0','SECTION','2','ENTITIES',
    entities.join('\n'),
    '0','ENDSEC',
    '0','EOF',
  ].join('\n');

  const blob=new Blob([dxf],{type:'application/octet-stream'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='floorplan.dxf'; a.click();
}
