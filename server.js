// ── FLOORPLAN WEBSOCKET SERVER ──
// Node.js + ws — no framework needed
// Usage: node server.js  (or: pm2 start server.js --name floorplan)
const {WebSocketServer} = require('ws');
const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT      = process.env.PORT || 3001;
const ROOMS_DIR = path.join(__dirname, 'rooms');
const IDX_FILE  = path.join(ROOMS_DIR, '_index.json');

// Ensure rooms directory and index file exist
if(!fs.existsSync(ROOMS_DIR)) fs.mkdirSync(ROOMS_DIR);
if(!fs.existsSync(IDX_FILE))  fs.writeFileSync(IDX_FILE, '[]');

// ── Persistence helpers ──
function loadIndex(){
  try { return JSON.parse(fs.readFileSync(IDX_FILE, 'utf8')); }
  catch { return []; }
}
function saveIndex(index){
  fs.writeFileSync(IDX_FILE, JSON.stringify(index, null, 2));
}
function loadRoomState(id){
  try { return JSON.parse(fs.readFileSync(path.join(ROOMS_DIR, `${id}.json`), 'utf8')); }
  catch { return null; }
}
function saveRoomState(id, state){
  fs.writeFileSync(path.join(ROOMS_DIR, `${id}.json`), JSON.stringify(state));
  // Update lastModified in index
  const index = loadIndex();
  const entry = index.find(r => r.id === id);
  if(entry){ entry.lastModified = new Date().toISOString(); saveIndex(index); }
}
function genId(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

// ── HTTP server (API + WS upgrade) ──
// rooms: Map<roomId, {state: object|null, clients: Set<ws>}>
const rooms = new Map();

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  // GET /api/rooms — list all rooms (metadata only)
  if(req.method === 'GET' && url.pathname === '/api/rooms'){
    res.writeHead(200, {'Content-Type':'application/json'});
    res.end(JSON.stringify(loadIndex()));
    return;
  }

  // POST /api/rooms — create a new room
  if(req.method === 'POST' && url.pathname === '/api/rooms'){
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const {name} = JSON.parse(body);
        const id  = genId();
        const now = new Date().toISOString();
        const entry = {id, name: (name || 'Untitled').slice(0, 48), createdAt: now, lastModified: now};
        const index = loadIndex();
        index.unshift(entry); // newest first
        saveIndex(index);
        res.writeHead(201, {'Content-Type':'application/json'});
        res.end(JSON.stringify(entry));
      } catch(e) {
        res.writeHead(400); res.end('Bad request');
      }
    });
    return;
  }

  res.writeHead(200, {'Content-Type':'text/plain'});
  res.end('Floorplan WebSocket server is running.\n');
});

const wss = new WebSocketServer({server, path:'/ws'});

wss.on('connection', (ws, req) => {
  // Room is identified by ?room= query param
  const url    = new URL(req.url, 'http://localhost');
  const roomId = url.searchParams.get('room') || 'default';

  // Load persisted state on first access
  if(!rooms.has(roomId)) rooms.set(roomId, {state: loadRoomState(roomId), clients: new Set()});
  const room = rooms.get(roomId);
  room.clients.add(ws);

  console.log(`[${roomId}] connected  (${room.clients.size} users)`);

  // Send current state to the new joiner
  if(room.state){
    send(ws, {type:'init', state:room.state});
  }

  // Broadcast updated user count to everyone in room
  broadcastUserCount(room);

  ws.on('message', data => {
    try {
      const msg = JSON.parse(data);
      if(msg.type === 'state' && msg.state){
        room.state = msg.state;
        saveRoomState(roomId, msg.state);            // persist to disk
        broadcast(room, {type:'state', state:msg.state}, ws); // relay to others
      }
      if(msg.type === 'join'){
        ws._clientId = msg.id;
      }
      if(msg.type === 'cursor'){
        broadcast(room, msg, ws);
      }
      if(msg.type === 'cursor-leave'){
        broadcast(room, msg, ws);
      }
    } catch(e) {
      console.error('Bad message:', e.message);
    }
  });

  ws.on('close', () => {
    room.clients.delete(ws);
    console.log(`[${roomId}] disconnected (${room.clients.size} users)`);
    broadcastUserCount(room);
    if(ws._clientId){
      broadcast(room, {type:'cursor-leave', id:ws._clientId}, null);
    }
    // Clean up empty rooms from memory after a delay (state is on disk)
    if(room.clients.size === 0){
      setTimeout(() => {
        if(rooms.get(roomId)?.clients.size === 0) rooms.delete(roomId);
      }, 60_000);
    }
  });

  ws.on('error', err => console.error(`[${roomId}] ws error:`, err.message));
});

function send(ws, obj){
  if(ws.readyState === 1) ws.send(JSON.stringify(obj));
}
function broadcast(room, obj, exclude){
  const data = JSON.stringify(obj);
  room.clients.forEach(c => {
    if(c !== exclude && c.readyState === 1) c.send(data);
  });
}
function broadcastUserCount(room){
  broadcast(room, {type:'users', count: room.clients.size}, null);
}

server.listen(PORT, () => {
  console.log(`Floorplan WS server listening on port ${PORT}`);
});
