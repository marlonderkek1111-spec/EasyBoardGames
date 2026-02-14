/**
 * Spielräume – gespeichert in einer JSON-Datei (kein natives Modul nötig)
 */
const fs = require('fs');
const path = require('path');

const dataPath = process.env.DATA_PATH || path.join(__dirname, 'games.json');

function readData() {
  try {
    const raw = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    if (e.code === 'ENOENT') return { rooms: {} };
    throw e;
  }
}

function writeData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 0), 'utf8');
}

function generateCode() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const alnum = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += letters[Math.floor(Math.random() * letters.length)];
  code += '-';
  for (let i = 0; i < 4; i++) code += alnum[Math.floor(Math.random() * alnum.length)];
  return code;
}

function getRoom(code) {
  const data = readData();
  const room = data.rooms[code];
  if (!room) return null;
  return {
    roomCode: room.code,
    gameType: room.gameType,
    players: {
      player1: { name: room.player1_name, ready: false },
      player2: room.player2_name ? { name: room.player2_name, ready: false } : null
    },
    gameState: room.gameState || {}
  };
}

function createRoom(gameType, playerName) {
  const data = readData();
  let code;
  do {
    code = generateCode();
  } while (data.rooms[code]);

  data.rooms[code] = {
    code,
    gameType,
    player1_name: playerName,
    player2_name: null,
    gameState: {
      status: 'waiting',
      currentTurn: 'player1',
      board: null,
      winner: null
    }
  };
  writeData(data);
  return code;
}

function joinRoom(code, playerName) {
  const room = getRoom(code);
  if (!room) throw new Error('Spiel existiert nicht');
  if (room.players.player2) throw new Error('Spiel ist voll');

  const data = readData();
  const r = data.rooms[code];
  const g = r.gameState || {};

  if ((room.gameType || '').toLowerCase() === 'battleship') {
    g.status = 'placing';
    g.p1Ships = g.p1Ships || [];
    g.p2Ships = g.p2Ships || [];
    g.p1Ready = false;
    g.p2Ready = false;
    g.p1Shots = g.p1Shots || [];
    g.p2Shots = g.p2Shots || [];
  } else {
    g.status = 'playing';
  }

  r.player2_name = playerName;
  r.gameState = g;
  writeData(data);
  return getRoom(code);
}

function updateGameState(code, partial) {
  const room = getRoom(code);
  if (!room) return null;

  const data = readData();
  const r = data.rooms[code];
  r.gameState = { ...(r.gameState || {}), ...partial };
  writeData(data);
  return getRoom(code);
}

module.exports = {
  getRoom,
  createRoom,
  joinRoom,
  updateGameState
};
