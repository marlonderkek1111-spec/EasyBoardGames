/**
 * EasyBoardGames – Backend mit SQLite + WebSocket
 * Start: node server/index.js  →  http://localhost:3000
 */
const express = require('express');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const { getRoom, createRoom, joinRoom, updateGameState } = require('./db');

const PORT = parseInt(process.env.PORT || '3000', 10);
const app = express();
const server = createServer(app);

app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

const wss = new WebSocketServer({ server });
const subscribers = new Map();

function broadcast(roomCode, data) {
  const set = subscribers.get(roomCode);
  if (!set) return;
  const msg = JSON.stringify({ type: 'room', data: getRoom(roomCode) });
  set.forEach((ws) => {
    if (ws.readyState === 1) ws.send(msg);
  });
}

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'subscribe' && msg.roomCode) {
        const code = msg.roomCode;
        if (!subscribers.has(code)) subscribers.set(code, new Set());
        subscribers.get(code).add(ws);
        ws._roomCode = code;
        const room = getRoom(code);
        if (room) ws.send(JSON.stringify({ type: 'room', data: room }));
      }
    } catch (_) {}
  });
  ws.on('close', () => {
    if (ws._roomCode) {
      const set = subscribers.get(ws._roomCode);
      if (set) {
        set.delete(ws);
        if (set.size === 0) subscribers.delete(ws._roomCode);
      }
    }
  });
});

app.post('/api/rooms', (req, res) => {
  try {
    const { gameType, playerName } = req.body || {};
    const name = (playerName || 'Gast').trim() || 'Gast';
    const type = (gameType || 'tictactoe').toLowerCase();
    const code = createRoom(type, name);
    res.json({ roomCode: code });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/rooms/:code/join', (req, res) => {
  try {
    const code = (req.params.code || '').trim().toUpperCase();
    const playerName = (req.body && req.body.playerName) ? req.body.playerName.trim() : 'Gast';
    const name = playerName || 'Gast';
    const room = joinRoom(code, name);
    res.json(room);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/rooms/:code', (req, res) => {
  const code = (req.params.code || '').trim().toUpperCase();
  const room = getRoom(code);
  if (!room) return res.status(404).json({ error: 'Spiel existiert nicht' });
  res.json(room);
});

app.patch('/api/rooms/:code', (req, res) => {
  try {
    const code = (req.params.code || '').trim().toUpperCase();
    const partial = req.body && req.body.gameState ? req.body.gameState : req.body;
    if (!partial || typeof partial !== 'object') {
      return res.status(400).json({ error: 'gameState erforderlich' });
    }
    const room = updateGameState(code, partial);
    if (!room) return res.status(404).json({ error: 'Spiel existiert nicht' });
    broadcast(code, room);
    res.json(room);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

server.listen(PORT, () => {
  console.log('EasyBoardGames Server: http://localhost:' + PORT);
});
