// ── FLOORPLAN WEBSOCKET SERVER ──
// Node.js + ws — no framework needed
// Usage: node server.js  (or: pm2 start server.js --name floorplan)
const {WebSocketServer} = require('ws');
const http = require('http');

const PORT = process.env.PORT || 3001;

// rooms: Map<roomId, {state: object|null, clients: Set<ws>}>
const rooms = new Map();

const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type':'text/plain'});
  res.end('Floorplan WebSocket server is running.\n');
});

const wss = new WebSocketServer({server, path:'/ws'});

wss.on('connection', (ws, req) => {
  // Room is identified by ?room= query param
  const url   = new URL(req.url, 'http://localhost');
  const roomId = url.searchParams.get('room') || 'default';

  if(!rooms.has(roomId)) rooms.set(roomId, {state:null, clients:new Set()});
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
        room.state = msg.state;                          // store latest
        broadcast(room, {type:'state', state:msg.state}, ws); // relay to others
      }
    } catch(e) {
      console.error('Bad message:', e.message);
    }
  });

  ws.on('close', () => {
    room.clients.delete(ws);
    console.log(`[${roomId}] disconnected (${room.clients.size} users)`);
    broadcastUserCount(room);
    // Optional: clean up empty rooms after a delay
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
