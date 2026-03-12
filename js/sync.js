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

  // Voice controls (shown only when in a room)
  const voiceWrap = document.createElement('div');
  voiceWrap.style.cssText = 'display:flex;gap:6px;align-items:center;';
  const voiceJoinBtn = document.createElement('button');
  voiceJoinBtn.id = 'voice-join-btn';
  voiceJoinBtn.className = 'hbtn';
  voiceJoinBtn.textContent = '◎ Voice';
  voiceJoinBtn.onclick = joinVoice;
  const voiceMuteBtn = document.createElement('button');
  voiceMuteBtn.id = 'voice-mute-btn';
  voiceMuteBtn.className = 'hbtn';
  voiceMuteBtn.textContent = '⊘ Mute';
  voiceMuteBtn.style.display = 'none';
  voiceMuteBtn.onclick = toggleMute;
  const voiceLeaveBtn = document.createElement('button');
  voiceLeaveBtn.id = 'voice-leave-btn';
  voiceLeaveBtn.className = 'hbtn';
  voiceLeaveBtn.textContent = '⊗ Leave';
  voiceLeaveBtn.style.display = 'none';
  voiceLeaveBtn.onclick = leaveVoice;
  voiceWrap.appendChild(voiceJoinBtn);
  voiceWrap.appendChild(voiceMuteBtn);
  voiceWrap.appendChild(voiceLeaveBtn);
  document.querySelector('.hactions').before(voiceWrap);

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
        if(msg.type === 'users')        updateUserBadge(room, msg.count, msg.voiceIds);
        if(msg.type === 'cursor')       handleRemoteCursor(msg);
        if(msg.type === 'cursor-leave') removeCursor(msg.id);
        if(msg.type === 'voice-join')   handleVoiceJoin(msg);
        if(msg.type === 'voice-leave')  handleVoiceLeave(msg);
        if(msg.type === 'voice-users')  handleVoiceUsers(msg);
        if(msg.type==='rtc-offer'||msg.type==='rtc-answer'||msg.type==='rtc-ice') _handleRtcMsg(msg);
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
  document.addEventListener('mousemove', ev => {
    if(!_wsReady) return;
    const now = Date.now();
    if(now - _cursorThrottle < 33) return;
    _cursorThrottle = now;
    const pt = svgPt(ev);
    _ws.send(JSON.stringify({type:'cursor', id:_myId, name:_myName, x:Math.round(pt.x), y:Math.round(pt.y)}));
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
    const color = _colorForId(msg.id);
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;pointer-events:none;';
    el.innerHTML = `<div style="position:relative;"><div style="width:10px;height:10px;border-radius:50%;background:${color};border:2px solid #1c1a17;position:absolute;top:-5px;left:-5px;"></div><div data-lbl style="position:absolute;left:8px;top:-10px;background:#252220;color:#afa9a1;font-family:DM Mono,monospace;font-size:12px;letter-spacing:.12em;text-transform:uppercase;padding:3px 7px;border-radius:6px;white-space:nowrap;display:flex;align-items:center;justify-content:center;border:1px solid #3a3630;">${msg.name || 'User'}</div></div>`;
    _cursorOverlay.appendChild(el);
    cursor = {name: msg.name, x: msg.x, y: msg.y, color, el};
    _remoteCursors.set(msg.id, cursor);
  } else {
    cursor.name = msg.name;
    cursor.x    = msg.x;
    cursor.y    = msg.y;
    const label = cursor.el.querySelector('[data-lbl]');
    if(label && label.textContent !== msg.name) label.textContent = msg.name || 'User';
  }
  positionCursor(cursor);
}

function positionCursor(cursor){
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

function updateUserBadge(room, count, voiceIds){
  const el = document.getElementById('room-badge');
  if(!el) return;
  el.style.color = '#7a9e7e';
  el.textContent = count > 1
    ? `Room: ${room} · ${count} users`
    : `Room: ${room}`;
  // Refresh voice indicators for all known voice users
  if(voiceIds){
    // Clear indicators for users no longer in voice
    _remoteCursors.forEach((c,id)=>{ if(!voiceIds.includes(id)) setCursorVoice(id,false); });
    voiceIds.forEach(id=>setCursorVoice(id,true));
  }
}

// ── VOICE CHAT (WebRTC peer-to-peer mesh) ──
let _inVoice    = false;
let _localStream= null;
let _peerConns  = new Map(); // peerId → RTCPeerConnection
let _muted      = false;
const _ICE      = [{urls:'stun:stun.l.google.com:19302'}];

function joinVoice(){
  if(_inVoice || !_wsReady) return;
  navigator.mediaDevices.getUserMedia({audio:true, video:false})
    .then(stream=>{
      _localStream = stream;
      _inVoice     = true;
      _updateVoiceUI();
      _ws.send(JSON.stringify({type:'voice-join', id:_myId, name:_myName}));
      // Server responds with voice-users list; we initiate offers in handleVoiceUsers
    })
    .catch(()=>{ setStatus('Microphone access denied.'); });
}

function leaveVoice(){
  if(!_inVoice) return;
  _inVoice = false;
  if(_localStream){ _localStream.getTracks().forEach(t=>t.stop()); _localStream=null; }
  _peerConns.forEach((pc,id)=>{ pc.close(); _removePeerAudio(id); });
  _peerConns.clear();
  if(_wsReady) _ws.send(JSON.stringify({type:'voice-leave', id:_myId}));
  _updateVoiceUI();
}

function toggleMute(){
  _muted = !_muted;
  if(_localStream) _localStream.getAudioTracks().forEach(t=>t.enabled=!_muted);
  _updateVoiceUI();
}

function _updateVoiceUI(){
  const joinBtn  = document.getElementById('voice-join-btn');
  const muteBtn  = document.getElementById('voice-mute-btn');
  const leaveBtn = document.getElementById('voice-leave-btn');
  if(!joinBtn) return;
  if(_inVoice){
    joinBtn.style.display  = 'none';
    muteBtn.style.display  = '';
    leaveBtn.style.display = '';
    muteBtn.textContent    = _muted ? '⊕ Unmute' : '⊘ Mute';
  } else {
    joinBtn.style.display  = '';
    muteBtn.style.display  = 'none';
    leaveBtn.style.display = 'none';
  }
}

async function _getOrCreatePc(peerId){
  if(_peerConns.has(peerId)) return _peerConns.get(peerId);
  const pc = new RTCPeerConnection({iceServers:_ICE});
  _peerConns.set(peerId, pc);
  if(_localStream) _localStream.getTracks().forEach(t=>pc.addTrack(t, _localStream));
  pc.onicecandidate = ev=>{
    if(ev.candidate && _wsReady)
      _ws.send(JSON.stringify({type:'rtc-ice', from:_myId, to:peerId, candidate:ev.candidate}));
  };
  pc.ontrack = ev=>{
    let audio = document.getElementById('_vpa-'+peerId);
    if(!audio){
      audio = document.createElement('audio');
      audio.id = '_vpa-'+peerId;
      audio.autoplay = true;
      document.body.appendChild(audio);
    }
    audio.srcObject = ev.streams[0];
  };
  pc.onconnectionstatechange = ()=>{
    if(pc.connectionState==='failed'||pc.connectionState==='closed'){
      _peerConns.delete(peerId); _removePeerAudio(peerId);
    }
  };
  return pc;
}

function _removePeerAudio(id){
  const el = document.getElementById('_vpa-'+id);
  if(el) el.remove();
}

async function _handleRtcMsg(msg){
  if(!_inVoice) return;
  if(msg.type==='rtc-offer'){
    const pc = await _getOrCreatePc(msg.from);
    await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    _ws.send(JSON.stringify({type:'rtc-answer', from:_myId, to:msg.from, sdp:answer}));
  } else if(msg.type==='rtc-answer'){
    const pc = _peerConns.get(msg.from);
    if(pc) await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
  } else if(msg.type==='rtc-ice'){
    const pc = _peerConns.get(msg.from);
    if(pc && msg.candidate) await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
  }
}

function handleVoiceJoin(msg){
  // A peer joined voice — show indicator on their cursor; they will send us an offer
  setCursorVoice(msg.id, true);
}

function handleVoiceLeave(msg){
  setCursorVoice(msg.id, false);
  const pc = _peerConns.get(msg.id);
  if(pc){ pc.close(); _peerConns.delete(msg.id); _removePeerAudio(msg.id); }
}

async function handleVoiceUsers(msg){
  // Server sent us who's already in voice — we initiate offers to all of them
  for(const peerId of (msg.ids||[])){
    setCursorVoice(peerId, true);
    if(!_inVoice) continue;
    const pc = await _getOrCreatePc(peerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    _ws.send(JSON.stringify({type:'rtc-offer', from:_myId, to:peerId, sdp:offer}));
  }
}

// Show/hide a green voice dot on a remote user's cursor label
function setCursorVoice(id, active){
  const cursor = _remoteCursors.get(id);
  if(!cursor) return;
  const lbl = cursor.el.querySelector('[data-lbl]');
  if(!lbl) return;
  const existing = lbl.querySelector('[data-vdot]');
  if(active && !existing){
    const dot = document.createElement('span');
    dot.setAttribute('data-vdot','');
    dot.style.cssText='display:inline-block;width:6px;height:6px;border-radius:50%;background:#7ab87e;margin-right:5px;flex-shrink:0;';
    lbl.prepend(dot);
  } else if(!active && existing){
    existing.remove();
  }
}
