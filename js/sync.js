// ── REAL-TIME SYNC ──
// Loaded after render.js. Wraps render() to auto-broadcast on every local mutation.
// Activate by adding ?room=your-room-name to the URL.
// No ?room param → offline mode, no WebSocket connection attempted.

let _ws = null, _wsReady = false, _applyingRemote = false;

function initSync(){
  const params = new URLSearchParams(location.search);
  const room   = params.get('room');
  if(!room) return; // offline — no sync

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
    };

    _ws.onmessage = ev => {
      try {
        const msg = JSON.parse(ev.data);
        if(msg.type === 'init' || msg.type === 'state') applyRemoteState(msg.state);
        if(msg.type === 'users') updateUserBadge(room, msg.count);
      } catch(e) {}
    };

    _ws.onclose = () => {
      _wsReady = false;
      badge.textContent = `Room: ${room} (reconnecting…)`;
      badge.style.color = '#9e7a7a';
      setTimeout(connect, 2000);
    };

    _ws.onerror = () => _ws.close();
  }

  connect();

  // Wrap the global render() so every local render auto-broadcasts state.
  // Remote-triggered renders are skipped via _applyingRemote guard.
  const _origRender = render;
  window.render = function(){
    _origRender();
    if(!_applyingRemote && _wsReady){
      _ws.send(JSON.stringify({type:'state', state:captureState()}));
    }
  };
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
