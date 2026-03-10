// ── REAL-TIME SYNC ──
// Loaded after render.js. Wraps render() to auto-broadcast on every local mutation.
// Activate by adding ?room=your-room-name to the URL.
// No ?room param → offline mode, no WebSocket connection attempted.

let _ws = null, _wsReady = false, _applyingRemote = false;
let _myId = null, _myName = 'User 1';
const _remoteCursors = new Map(); // id → {name, x, y, color}
let _cursorThrottle = 0;

const CURSOR_COLORS = ['#e8a84a','#7ab87e','#5ba8c8','#b87ab0','#c87a8a','#7ac8b8','#c8b05a'];

function _colorForId(id){
  let h = 0;
  for(let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CURSOR_COLORS[h % CURSOR_COLORS.length];
}

function initSync(){
  const params = new URLSearchParams(location.search);
  const room   = params.get('room');
  if(!room) return; // offline — no sync

  _myId   = 'u-' + crypto.randomUUID();
  _myName = localStorage.getItem('floorplan-username') || 'User 1';

  // Populate the name input with saved name
  const nameInput = document.getElementById('user-name-input');
  if(nameInput) nameInput.value = _myName;

  const proto  = location.protocol === 'https:' ? 'wss' : 'ws';
  const wsUrl  = `${proto}://${location.host}/ws?room=${encodeURIComponent(room)}`;

  // Show room badge in header
  const badge = document.createElement('span');
  badge.id = 'room-badge';
  badge.className = 'hscale';
  badge.style.cssText = 'color:#7a9e7e;font-weight:600';
  badge.textContent  = `Room: ${room}`;
  document.querySelector('.hactions').before(badge);

  function connect(){
    _ws = new WebSocket(wsUrl);

    _ws.onopen = () => {
      _wsReady = true;
      setStatus(`Joined room "${room}" — share this URL to collaborate`);
      badge.textContent = `Room: ${room}`;
      _ws.send(JSON.stringify({type:'join', id:_myId, name:_myName}));
    };

    _ws.onmessage = ev => {
      try {
        const msg = JSON.parse(ev.data);
        if(msg.type === 'init' || msg.type === 'state') applyRemoteState(msg.state);
        if(msg.type === 'users')        updateUserBadge(room, msg.count);
        if(msg.type === 'cursor')       handleRemoteCursor(msg);
        if(msg.type === 'cursor-leave') removeCursor(msg.id);
      } catch(e) {}
    };

    _ws.onclose = () => {
      _wsReady = false;
      badge.textContent = `Room: ${room} (reconnecting…)`;
      badge.style.color = '#9e7a7a';
      _remoteCursors.clear();
      renderCursors();
      setTimeout(connect, 2000);
    };

    _ws.onerror = () => _ws.close();
  }

  connect();

  // Broadcast cursor position on mouse move (throttled to ~30fps)
  svg.addEventListener('mousemove', ev => {
    if(!_wsReady) return;
    const now = Date.now();
    if(now - _cursorThrottle < 33) return;
    _cursorThrottle = now;
    const pt = svgPt(ev);
    _ws.send(JSON.stringify({type:'cursor', id:_myId, name:_myName, x:Math.round(pt.x), y:Math.round(pt.y)}));
  });

  svg.addEventListener('mouseleave', () => {
    if(_wsReady) _ws.send(JSON.stringify({type:'cursor-leave', id:_myId}));
  });

  // Wrap render functions so cursors are always re-drawn on top
  const _origRender = render;
  window.render = function(){
    _origRender();
    renderCursors();
    if(!_applyingRemote && _wsReady){
      _ws.send(JSON.stringify({type:'state', state:captureState()}));
    }
  };

  const _origRenderLinesOnly = renderLinesOnly;
  window.renderLinesOnly = function(){
    _origRenderLinesOnly();
    renderCursors();
  };

  const _origRenderFurnitureOnly = renderFurnitureOnly;
  window.renderFurnitureOnly = function(){
    _origRenderFurnitureOnly();
    renderCursors();
  };
}

// Called from the Update button in the sidebar
function updateMyName(){
  const input = document.getElementById('user-name-input');
  if(!input) return;
  const name = input.value.trim() || 'User 1';
  _myName = name;
  input.value = name;
  localStorage.setItem('floorplan-username', name);
  if(_wsReady) _ws.send(JSON.stringify({type:'join', id:_myId, name:_myName}));
}

function handleRemoteCursor(msg){
  const existing = _remoteCursors.get(msg.id);
  _remoteCursors.set(msg.id, {
    name:  msg.name,
    x:     msg.x,
    y:     msg.y,
    color: existing ? existing.color : _colorForId(msg.id),
  });
  renderCursors();
}

function removeCursor(id){
  _remoteCursors.delete(id);
  renderCursors();
}

function renderCursors(){
  const old = document.getElementById('cursors-g');
  if(old) old.remove();
  if(_remoteCursors.size === 0) return;

  const ns = 'http://www.w3.org/2000/svg';
  const g  = document.createElementNS(ns, 'g');
  g.id = 'cursors-g';

  _remoteCursors.forEach(({name, x, y, color}) => {
    const cg = document.createElementNS(ns, 'g');

    // Cursor dot
    const dot = document.createElementNS(ns, 'circle');
    dot.setAttribute('cx', x);
    dot.setAttribute('cy', y);
    dot.setAttribute('r',  '4');
    dot.setAttribute('fill', color);
    dot.setAttribute('stroke', '#1c1a17');
    dot.setAttribute('stroke-width', '1.5');

    // Name pill
    const lx = x + 8, ly = y - 6;
    const lw = Math.max(40, name.length * 5.8 + 14);
    const lh = 14;

    const pill = document.createElementNS(ns, 'rect');
    pill.setAttribute('x',      lx);
    pill.setAttribute('y',      ly - lh + 2);
    pill.setAttribute('width',  lw);
    pill.setAttribute('height', lh);
    pill.setAttribute('rx',     '7');
    pill.setAttribute('fill',   color);
    pill.setAttribute('opacity','0.92');

    const txt = document.createElementNS(ns, 'text');
    txt.setAttribute('x',           lx + 7);
    txt.setAttribute('y',           ly - 2);
    txt.setAttribute('font-family', 'DM Mono, monospace');
    txt.setAttribute('font-size',   '7.5');
    txt.setAttribute('fill',        '#1a1614');
    txt.textContent = name;

    cg.appendChild(pill);
    cg.appendChild(dot);
    cg.appendChild(txt);
    g.appendChild(cg);
  });

  svg.appendChild(g);
}

function captureState(){
  return {
    secs:      JSON.parse(JSON.stringify(secs)),
    floorLines:JSON.parse(JSON.stringify(floorLines)),
    furniture: JSON.parse(JSON.stringify(furniture)),
    IW, IH, SL, SS,
  };
}

function applyRemoteState(state){
  _applyingRemote = true;
  ['top','bottom','left','right'].forEach(s => secs[s] = state.secs[s]);
  floorLines = state.floorLines;
  furniture  = state.furniture;
  if(state.IW !== IW || state.IH !== IH || state.SL !== SL || state.SS !== SS){
    IW = state.IW; IH = state.IH; SL = state.SL; SS = state.SS;
    recalcDims(); updateSvgDimensions(); updateDimDisplay();
  }
  render(); // calls wrapped render, but _applyingRemote=true prevents re-broadcast
  _applyingRemote = false;
}

function updateUserBadge(room, count){
  const el = document.getElementById('room-badge');
  if(!el) return;
  el.style.color = '#7a9e7e';
  el.textContent = count > 1
    ? `Room: ${room} · ${count} users`
    : `Room: ${room}`;
}
