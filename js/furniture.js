// ── FURNITURE DEFINITIONS ──
const FURN={
  sofa:{label:'Sofa 7′',w:7,h:3,
    draw(g,s,sel){
      const w=this.w*s,h=this.h*s;
      g.appendChild(e('rect',{x:0,y:0,width:w,height:h,fill:'#e8e0d0',stroke:sel?'#c4853a':'#8a7a60','stroke-width':sel?1.8:1,rx:4}));
      g.appendChild(e('rect',{x:0,y:0,width:w,height:h*.3,fill:'#d0c4a8',stroke:'#8a7a60','stroke-width':.5,rx:2}));
      for(let i=0;i<3;i++) g.appendChild(e('rect',{x:i*w/3+3,y:h*.32,width:w/3-6,height:h*.62,fill:'#ede5d5',stroke:'#8a7a60','stroke-width':.5,rx:3}));
      const t=e('text',{x:w/2,y:h*.72,fill:'#6a5a40','font-family':'DM Mono,monospace','font-size':'7','text-anchor':'middle'});
      t.textContent='sofa 7′';g.appendChild(t);
    }},
  loveseat:{label:'Loveseat',w:4.5,h:3,
    draw(g,s,sel){
      const w=this.w*s,h=this.h*s;
      g.appendChild(e('rect',{x:0,y:0,width:w,height:h,fill:'#e8e0d0',stroke:sel?'#c4853a':'#8a7a60','stroke-width':sel?1.8:1,rx:4}));
      g.appendChild(e('rect',{x:0,y:0,width:w,height:h*.3,fill:'#d0c4a8',stroke:'#8a7a60','stroke-width':.5,rx:2}));
      for(let i=0;i<2;i++) g.appendChild(e('rect',{x:i*w/2+3,y:h*.32,width:w/2-6,height:h*.62,fill:'#ede5d5',stroke:'#8a7a60','stroke-width':.5,rx:3}));
    }},
  chair:{label:'Arm Chair',w:3,h:3,
    draw(g,s,sel){
      const w=this.w*s,h=this.h*s;
      g.appendChild(e('rect',{x:0,y:0,width:w,height:h,fill:'#ddd5c5',stroke:sel?'#c4853a':'#8a7a60','stroke-width':sel?1.8:1,rx:3}));
      g.appendChild(e('rect',{x:0,y:0,width:w,height:h*.28,fill:'#c8bea8',stroke:'#8a7a60','stroke-width':.5,rx:2}));
      g.appendChild(e('rect',{x:4,y:h*.32,width:w-8,height:h*.62,fill:'#ede5d5',stroke:'#8a7a60','stroke-width':.5,rx:3}));
    }},
  bed_queen:{label:'Queen Bed',w:5,h:6.67,
    draw(g,s,sel){
      const w=this.w*s,h=this.h*s;
      g.appendChild(e('rect',{x:0,y:0,width:w,height:h,fill:'#f0ece0',stroke:sel?'#c4853a':'#9a8a70','stroke-width':sel?1.8:1,rx:2}));
      g.appendChild(e('rect',{x:0,y:0,width:w,height:h*.12,fill:'#c8b890',stroke:'#9a8a70','stroke-width':.5}));
      g.appendChild(e('rect',{x:5,y:h*.15,width:w/2-9,height:h*.18,fill:'#fffaf0',stroke:'#9a8a70','stroke-width':.5,rx:3}));
      g.appendChild(e('rect',{x:w/2+4,y:h*.15,width:w/2-9,height:h*.18,fill:'#fffaf0',stroke:'#9a8a70','stroke-width':.5,rx:3}));
      g.appendChild(e('rect',{x:4,y:h*.36,width:w-8,height:h*.58,fill:'#e0d8c8',stroke:'#9a8a70','stroke-width':.5,rx:2}));
      const t=e('text',{x:w/2,y:h*.72,fill:'#6a5a40','font-family':'DM Mono,monospace','font-size':'7','text-anchor':'middle'});
      t.textContent='queen';g.appendChild(t);
    }},
  bed_twin:{label:'Twin Bed',w:3.25,h:6.5,
    draw(g,s,sel){
      const w=this.w*s,h=this.h*s;
      g.appendChild(e('rect',{x:0,y:0,width:w,height:h,fill:'#f0ece0',stroke:sel?'#c4853a':'#9a8a70','stroke-width':sel?1.8:1,rx:2}));
      g.appendChild(e('rect',{x:0,y:0,width:w,height:h*.12,fill:'#c8b890',stroke:'#9a8a70','stroke-width':.5}));
      g.appendChild(e('rect',{x:4,y:h*.15,width:w-8,height:h*.18,fill:'#fffaf0',stroke:'#9a8a70','stroke-width':.5,rx:3}));
      g.appendChild(e('rect',{x:4,y:h*.36,width:w-8,height:h*.58,fill:'#e0d8c8',stroke:'#9a8a70','stroke-width':.5,rx:2}));
    }},
  dining_round:{label:'Round Table',w:4,h:4,
    draw(g,s,sel){
      const w=this.w*s,h=this.h*s;
      g.appendChild(e('ellipse',{cx:w/2,cy:h/2,rx:w/2-2,ry:h/2-2,fill:'#d8ccb0',stroke:sel?'#c4853a':'#9a8060','stroke-width':sel?1.8:1.2}));
      [{cx:w/2,cy:4},{cx:w/2,cy:h-4},{cx:4,cy:h/2},{cx:w-4,cy:h/2}]
        .forEach(c=>g.appendChild(e('circle',{cx:c.cx,cy:c.cy,r:5,fill:'#e8ddc8',stroke:'#9a8060','stroke-width':.8})));
      const t=e('text',{x:w/2,y:h/2+3,fill:'#6a5040','font-family':'DM Mono,monospace','font-size':'7','text-anchor':'middle'});
      t.textContent='round 4′';g.appendChild(t);
    }},
  dining_chair:{label:'Dining Chair',w:1.5,h:1.75,
    draw(g,s,sel){
      const w=this.w*s,h=this.h*s;
      // back rail
      g.appendChild(e('rect',{x:0,y:0,width:w,height:h*.22,fill:'#c8b890',stroke:sel?'#c4853a':'#8a7050','stroke-width':sel?1.8:1,rx:2}));
      // seat
      g.appendChild(e('rect',{x:2,y:h*.26,width:w-4,height:h*.7,fill:'#ddd0a8',stroke:sel?'#c4853a':'#8a7050','stroke-width':sel?1.8:.8,rx:2}));
    }},
  dining_tbl:{label:'Dining 6′',w:3,h:6,
    draw(g,s,sel){
      const w=this.w*s,h=this.h*s;
      g.appendChild(e('ellipse',{cx:w/2,cy:h/2,rx:w/2-2,ry:h/2-2,fill:'#d8ccb0',stroke:sel?'#c4853a':'#9a8060','stroke-width':sel?1.8:1.2}));
      [{cx:w/2,cy:5},{cx:w/2,cy:h-5},{cx:6,cy:h/3},{cx:w-6,cy:h/3},{cx:6,cy:h*2/3},{cx:w-6,cy:h*2/3}]
        .forEach(c=>g.appendChild(e('circle',{cx:c.cx,cy:c.cy,r:6,fill:'#e8ddc8',stroke:'#9a8060','stroke-width':.8})));
      const t=e('text',{x:w/2,y:h/2+3,fill:'#6a5040','font-family':'DM Mono,monospace','font-size':'7','text-anchor':'middle'});
      t.textContent='dining';g.appendChild(t);
    }},
  coffee_tbl:{label:'Coffee Tbl',w:4,h:2,
    draw(g,s,sel){
      const w=this.w*s,h=this.h*s;
      g.appendChild(e('rect',{x:4,y:4,width:w-8,height:h-8,fill:'#c8b880',stroke:'#8a7840','stroke-width':.5,rx:1}));
      g.appendChild(e('rect',{x:0,y:0,width:w,height:h,fill:'#ddd0a8',stroke:sel?'#c4853a':'#8a7840','stroke-width':sel?1.8:1,rx:2}));
    }},
  desk:{label:'Desk 4′',w:4,h:2,
    draw(g,s,sel){
      const w=this.w*s,h=this.h*s;
      g.appendChild(e('rect',{x:0,y:0,width:w,height:h,fill:'#d4c8a8',stroke:sel?'#c4853a':'#8a7850','stroke-width':sel?1.8:1,rx:1}));
      g.appendChild(e('rect',{x:0,y:0,width:w*.35,height:h,fill:'#c4b898',stroke:'#8a7850','stroke-width':.5,rx:1}));
      const t=e('text',{x:w/2,y:h/2+3,fill:'#6a5a30','font-family':'DM Mono,monospace','font-size':'7','text-anchor':'middle'});
      t.textContent='desk 4′';g.appendChild(t);
    }},
  bathtub:{label:'Bathtub',w:2.5,h:5,
    draw(g,s,sel){
      const w=this.w*s,h=this.h*s;
      g.appendChild(e('rect',{x:0,y:0,width:w,height:h,fill:'#e0eef4',stroke:sel?'#c4853a':'#70a0b4','stroke-width':sel?1.8:1,rx:4}));
      g.appendChild(e('ellipse',{cx:w/2,cy:h*.58,rx:w/2-5,ry:h*.33,fill:'#c8dfe8',stroke:'#70a0b4','stroke-width':.8}));
      g.appendChild(e('circle',{cx:w/2,cy:h*.12,r:3,fill:'#a8c8d4',stroke:'#70a0b4','stroke-width':.8}));
      const t=e('text',{x:w/2,y:h*.85,fill:'#4a8098','font-family':'DM Mono,monospace','font-size':'7','text-anchor':'middle'});
      t.textContent='tub';g.appendChild(t);
    }},
  toilet:{label:'Toilet',w:1.5,h:2.5,
    draw(g,s,sel){
      const w=this.w*s,h=this.h*s;
      g.appendChild(e('rect',{x:0,y:0,width:w,height:h*.38,fill:'#ddeae8',stroke:sel?'#c4853a':'#70a0a0','stroke-width':sel?1.8:1,rx:2}));
      g.appendChild(e('ellipse',{cx:w/2,cy:h*.72,rx:w/2-2,ry:h*.3,fill:'#ddeae8',stroke:'#70a0a0','stroke-width':1}));
    }},
  sink:{label:'Sink',w:1.75,h:1.75,
    draw(g,s,sel){
      const w=this.w*s,h=this.h*s;
      g.appendChild(e('rect',{x:0,y:0,width:w,height:h,fill:'#ddeae8',stroke:sel?'#c4853a':'#70a0a0','stroke-width':sel?1.8:1,rx:2}));
      g.appendChild(e('ellipse',{cx:w/2,cy:h/2,rx:w/2-4,ry:h/2-4,fill:'#c8dde8',stroke:'#70a0a0','stroke-width':.8}));
      g.appendChild(e('circle',{cx:w/2,cy:h/2,r:2,fill:'#90b0b8'}));
    }},
  range:{label:'Range',w:2.5,h:2.5,
    draw(g,s,sel){
      const w=this.w*s,h=this.h*s;
      g.appendChild(e('rect',{x:0,y:0,width:w,height:h,fill:'#d0c8c0',stroke:sel?'#c4853a':'#806858','stroke-width':sel?1.8:1}));
      [[.25,.25],[.75,.25],[.25,.75],[.75,.75]].forEach(([fx,fy])=>{
        g.appendChild(e('circle',{cx:w*fx,cy:h*fy,r:w*.16,fill:'#a09080',stroke:'#706050','stroke-width':.8}));
        g.appendChild(e('circle',{cx:w*fx,cy:h*fy,r:w*.07,fill:'#504038'}));
      });
    }},
  bookcase:{label:'Bookcase',w:3,h:1,
    draw(g,s,sel){
      const w=this.w*s,h=this.h*s;
      g.appendChild(e('rect',{x:0,y:0,width:w,height:h,fill:'#c8b890',stroke:sel?'#c4853a':'#7a6040','stroke-width':sel?1.8:1}));
      ['#b04030','#4060a0','#306040','#a07020','#6030a0','#204060','#a04020','#408040'].forEach((c,i)=>{
        g.appendChild(e('rect',{x:i*w/8+1,y:2,width:w/8-2,height:h-4,fill:c,opacity:.7}));
      });
    }},
  kitchen_counter:{label:'Counter 6′',w:6,h:2,
    draw(g,s,sel){
      const w=this.w*s,h=this.h*s;
      g.appendChild(e('rect',{x:0,y:0,width:w,height:h,fill:'#d8d0c0',stroke:sel?'#c4853a':'#8a7860','stroke-width':sel?1.8:1}));
      g.appendChild(e('rect',{x:2,y:2,width:w-4,height:h-4,fill:'#e4dcd0',stroke:'#8a7860','stroke-width':.5}));
      g.appendChild(e('rect',{x:w*.55,y:3,width:w*.35,height:h-6,fill:'#c8dde8',stroke:'#70a0a0','stroke-width':.8,rx:2}));
      const t=e('text',{x:w*.25,y:h/2+3,fill:'#6a5a40','font-family':'DM Mono,monospace','font-size':'7','text-anchor':'middle'});
      t.textContent='counter';g.appendChild(t);
    }},
  refrigerator:{label:'Refrigerator',w:2.5,h:2.5,
    draw(g,s,sel){
      const w=this.w*s,h=this.h*s;
      g.appendChild(e('rect',{x:0,y:0,width:w,height:h,fill:'#d8d8d8',stroke:sel?'#c4853a':'#888888','stroke-width':sel?1.8:1,rx:2}));
      // door divider
      g.appendChild(e('line',{x1:2,y1:h*.48,x2:w-2,y2:h*.48,stroke:'#888888','stroke-width':.8}));
      // handles
      g.appendChild(e('line',{x1:w*.7,y1:h*.08,x2:w*.7,y2:h*.38,stroke:'#707070','stroke-width':2,rx:1}));
      g.appendChild(e('line',{x1:w*.7,y1:h*.56,x2:w*.7,y2:h*.92,stroke:'#707070','stroke-width':2,rx:1}));
      const t=e('text',{x:w/2,y:h/2+3,fill:'#505050','font-family':'DM Mono,monospace','font-size':'7','text-anchor':'middle'});
      t.textContent='fridge';g.appendChild(t);
    }},
  counter:{label:'Counter 4′',w:4,h:2,wallSnap:true,resizable:true,noRotate:true,sizeModal:true,
    draw(g,s,sel,iw,ih){
      const w=(iw||this.w)*s,h=(ih||this.h)*s;
      const ts=0.5*s; // 6" tile = 0.5ft
      // Base fill
      g.appendChild(e('rect',{x:0,y:0,width:w,height:h,fill:'#ddd8c8',stroke:sel?'#c4853a':'#8a7860','stroke-width':sel?1.8:1,rx:1}));
      // Tile grout lines
      for(let x=ts;x<w;x+=ts)
        g.appendChild(e('line',{x1:x,y1:0,x2:x,y2:h,stroke:'#b8b0a0','stroke-width':.6}));
      for(let y=ts;y<h;y+=ts)
        g.appendChild(e('line',{x1:0,y1:y,x2:w,y2:y,stroke:'#b8b0a0','stroke-width':.6}));
      // Countertop edge highlight
      g.appendChild(e('rect',{x:0,y:0,width:w,height:3,fill:'#ede8dc',stroke:'none'}));
    }},
  shower:{label:'Shower',w:3,h:3,wallSnap:true,resizable:true,noRotate:true,sizeModal:true,
    draw(g,s,sel,iw,ih){
      const w=(iw||this.w)*s, h=(ih||this.h)*s;
      const d=s*0.5; // 6" diamond diagonal
      const r=d/2;
      // Per-instance clipPath so diamonds never overflow the bounds
      const fid=g.getAttribute('data-fid')||'sh0';
      const clipId='sh-clip-'+fid;
      const defs=document.querySelector('#fp-svg defs');
      if(defs){
        const old=document.getElementById(clipId);
        if(old)old.remove();
        const cp=document.createElementNS(NS,'clipPath');
        cp.setAttribute('id',clipId);
        const cr=document.createElementNS(NS,'rect');
        cr.setAttribute('x',0);cr.setAttribute('y',0);
        cr.setAttribute('width',w);cr.setAttribute('height',h);
        cp.appendChild(cr);
        defs.appendChild(cp);
      }
      // Base fill
      g.appendChild(e('rect',{x:0,y:0,width:w,height:h,fill:'#e4eff4',stroke:'none',rx:1}));
      // Diamond grid clipped to bounds
      const pg=e('g',{'clip-path':`url(#${clipId})`});
      for(let j=0;r+j*d<h+r;j++){
        for(let i=0;r+i*d<w+r;i++){
          const cx=r+i*d, cy=r+j*d;
          pg.appendChild(e('path',{d:`M${cx},${cy-r} L${cx+r},${cy} L${cx},${cy+r} L${cx-r},${cy} Z`,fill:'none',stroke:'#7aafbe','stroke-width':.65}));
        }
      }
      g.appendChild(pg);
      // Border
      g.appendChild(e('rect',{x:0,y:0,width:w,height:h,fill:'none',stroke:sel?'#c4853a':'#5a9ab0','stroke-width':sel?1.8:1,rx:1}));
    }},
  tv_55:{label:'TV 55″',w:4,h:1.5,wallSnap:true,
    draw(g,s,sel){
      const w=this.w*s,h=this.h*s,sw=sel?1.8:1;
      // TV body — thin slab at back (wall side)
      g.appendChild(e('rect',{x:0,y:0,width:w,height:h*.42,fill:'#1c1c20',stroke:sel?'#c4853a':'#383840','stroke-width':sw,rx:1}));
      // Screen face
      g.appendChild(e('rect',{x:2,y:2,width:w-4,height:h*.36,fill:'#1a2f4a',stroke:'none',rx:1}));
      const t=e('text',{x:w/2,y:h*.28,fill:'#4a7090','font-family':'DM Mono,monospace','font-size':'6','text-anchor':'middle'});
      t.textContent='55″';g.appendChild(t);
      // Console/stand (room side)
      g.appendChild(e('rect',{x:w*.12,y:h*.46,width:w*.76,height:h*.52,fill:'#2e2820',stroke:sel?'#c4853a':'#4a3e30','stroke-width':sw,rx:1}));
    }},
  plant:{label:'Plant',w:2,h:2,
    draw(g,s,sel){
      const w=this.w*s,h=this.h*s;
      const cx=w/2,cy=h/2,r=Math.min(w,h)/2-1;
      // Six leaf clusters
      for(let i=0;i<6;i++){
        const a=i*Math.PI/3;
        g.appendChild(e('circle',{cx:cx+Math.cos(a)*r*.52,cy:cy+Math.sin(a)*r*.52,r:r*.5,fill:'#5a9448',stroke:'none',opacity:.82}));
      }
      // Stem centre
      g.appendChild(e('circle',{cx,cy,r:r*.28,fill:'#2e6828'}));
      // Pot outline
      g.appendChild(e('circle',{cx,cy,r,fill:'none',stroke:sel?'#c4853a':'#3a5a2a','stroke-width':sel?1.8:1}));
    }},
  plant_lg:{label:'Plant Lg',w:3,h:3,
    draw(g,s,sel){
      const w=this.w*s,h=this.h*s;
      const cx=w/2,cy=h/2,r=Math.min(w,h)/2-1;
      // Eight leaf clusters for larger silhouette
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4;
        g.appendChild(e('circle',{cx:cx+Math.cos(a)*r*.54,cy:cy+Math.sin(a)*r*.54,r:r*.46,fill:'#4e8840',stroke:'none',opacity:.82}));
      }
      // Inner ring
      for(let i=0;i<4;i++){
        const a=i*Math.PI/2+Math.PI/4;
        g.appendChild(e('circle',{cx:cx+Math.cos(a)*r*.22,cy:cy+Math.sin(a)*r*.22,r:r*.28,fill:'#3a7030',stroke:'none',opacity:.9}));
      }
      // Stem
      g.appendChild(e('circle',{cx,cy,r:r*.2,fill:'#285828'}));
      // Pot outline
      g.appendChild(e('circle',{cx,cy,r,fill:'none',stroke:sel?'#c4853a':'#3a5a2a','stroke-width':sel?1.8:1}));
    }},
  dishwasher:{label:'Dishwasher',w:2,h:2,
    draw(g,s,sel){
      const w=this.w*s,h=this.h*s;
      g.appendChild(e('rect',{x:0,y:0,width:w,height:h,fill:'#d0d4d8',stroke:sel?'#c4853a':'#808890','stroke-width':sel?1.8:1,rx:1}));
      // control panel strip
      g.appendChild(e('rect',{x:2,y:2,width:w-4,height:h*.18,fill:'#b0b8c0',stroke:'#808890','stroke-width':.5,rx:1}));
      // door panel
      g.appendChild(e('rect',{x:3,y:h*.25,width:w-6,height:h*.68,fill:'#c8cdd2',stroke:'#808890','stroke-width':.5,rx:1}));
      const t=e('text',{x:w/2,y:h*.62,fill:'#505860','font-family':'DM Mono,monospace','font-size':'7','text-anchor':'middle'});
      t.textContent='DW';g.appendChild(t);
    }},
};

// ── FURNITURE PANEL ──
function buildPanel(){
  const grid=document.getElementById('furn-grid');
  Object.entries(FURN).forEach(([key,def])=>{
    const item=document.createElement('div');
    item.className='fitem'; item.draggable=true;
    const ps=Math.min(60/def.w,44/def.h)*.82;
    const pw=Math.round(def.w*ps+4),ph=Math.round(def.h*ps+4);
    const pvg=document.createElementNS(NS,'svg');
    pvg.setAttribute('width',pw); pvg.setAttribute('height',ph);
    pvg.setAttribute('viewBox',`0 0 ${pw} ${ph}`);
    const pg=document.createElementNS(NS,'g');
    pg.setAttribute('transform','translate(2,2)');
    def.draw(pg,ps,false);
    pvg.appendChild(pg);
    item.appendChild(pvg);
    const lbl=document.createElement('span'); lbl.textContent=def.label; item.appendChild(lbl);
    item.addEventListener('dragstart',ev=>ev.dataTransfer.setData('ftype',key));
    grid.appendChild(item);
  });
}
