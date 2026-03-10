// ── REAL-TIME SYNC ──
// Loaded after render.js. Wraps render() to auto-broadcast on every local mutation.
// Activate by adding ?room=your-room-name to the URL.
// No ?room param → offline mode, no WebSocket connection attempted.

let _ws = null, _wsReady = false, _applyingRemote = false;
let _myId = null, _myName = 'User 1';
const _remoteCursors = new Map(); // id → {name, x, y, color, el}
let _cursorThrottle = 0;
let _cursorOverlay = null;

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

  // Cursor overlay — a div that sits on top of the canvas, never wiped by SVG redraws
  _cursorOverlay = document.createElement('div');
  _cursorOverlay.id = 'cursor-overlay';
  _cursorOverlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;z-index:10';
  ca.appendChild(_cursorOverlay);

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
      } catch(e) { console.error('[sync] onmessage error:', e); }
    };

    _ws.onclose = () => {
      _wsReady = false;
      badge.textContent = `Room: ${room} (reconnecting…)`;
      badge.style.color = '#9e7a7a';
      _remoteCursors.forEach(c => c.el && c.el.remove());
      _remoteCursors.clear();
      setTimeout(connect, 2000);
    };

    _ws.onerror = () => _ws.close();
  }

  connect();

  // Broadcast cursor position (throttled ~30fps)
  ca.addEventListener('mousemove', ev => {
    if(!_wsReady) return;
    const now = Date.now();
    if(now - _cursorThrottle < 33) return;
    _cursorThrottle = now;
    const rect = ca.getBoundingClientRect();
    const svgX = Math.round((ev.clientX - rect.left - panX) / zoom);
    const svgY = Math.round((ev.clientY - rect.top  - panY) / zoom);
    _ws.send(JSON.stringify({type:'cursor', id:_myId, name:_myName, x:svgX, y:svgY}));
  });

  ca.addEventListener('mouseleave', () => {
    if(_wsReady) _ws.send(JSON.stringify({type:'cursor-leave', id:_myId}));
  });

  // Wrap applyTransform so cursors reposition on zoom/pan
  const _origApplyTransform = applyTransform;
  window.applyTransform = function(){
    _origApplyTransform();
    repositionAllCursors();
  };

  // Wrap render to broadcast state changes
  const _origRender = render;
  window.render = function(){
    _origRender();
    if(!_applyingRemote && _wsReady){
      _ws.send(JSON.stringify({type:'state', state:captureState()}));
    }
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
  let cursor = _remoteCursors.get(msg.id);
  if(!cursor){
    // First time seeing this user — create their cursor DOM element
    const color = _colorForId(msg.id);
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;pointer-events:none;';
    el.innerHTML = `
      <div style="position:relative;">
        <div style="width:10px;height:10px;border-radius:50%;background:${color};border:2px solid #1c1a17;position:absolute;top:-5px;left:-5px;"></div>
        <div style="position:absolute;left:8px;top:-10px;background:${color};color:#1a1614;font-family:DM Mono,monospace;font-size:10px;font-weight:500;padding:2px 8px;border-radius:8px;white-space:nowrap;opacity:0.95;">${msg.name || 'User'}</div>
      </div>`;
    _cursorOverlay.appendChild(el);
    cursor = {name: msg.name, x: msg.x, y: msg.y, color, el};
    _remoteCursors.set(msg.id, cursor);
  } else {
    cursor.name = msg.name;
    cursor.x    = msg.x;
    cursor.y    = msg.y;
    // Update name label if it changed
    const label = cursor.el.querySelector('div > div:last-child');
    if(label && label.textContent !== msg.name) label.textContent = msg.name || 'User';
  }
  positionCursor(cursor);
}

function positionCursor(cursor){
  // Convert SVG coords → canvas-relative screen coords
  const sx = cursor.x * zoom + panX;
  const sy = cursor.y * zoom + panY;
  cursor.el.style.left = sx + 'px';
  cursor.el.style.top  = sy + 'px';
}

function repositionAllCursors(){
  _remoteCursors.forEach(cursor => positionCursor(cursor));
}

function removeCursor(id){
  const cursor = _remoteCursors.get(id);
  if(cursor && cursor.el) cursor.el.remove();
  _remoteCursors.delete(id);
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
