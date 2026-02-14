/**
 * Client-API für EasyBoardGames (SQLite-Backend)
 * Ersetzt Firebase: gleiche gameRoomManager-Schnittstelle.
 */

(function () {
  const API_BASE = window.API_BASE != null ? window.API_BASE : '';
  const WS_BASE = (() => {
    if (window.API_BASE) {
      const u = new URL(window.API_BASE);
      return (u.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + u.host;
    }
    const p = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return p + '//' + location.host;
  })();

  let ws = null;
  let wsSubscriptions = new Map();

  function apiFetch(path, options = {}) {
    const url = API_BASE + path;
    return fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers }
    }).then((res) => {
      if (!res.ok) {
        return res.json().then((j) => { throw new Error(j.error || res.statusText); }).catch(() => { throw new Error(res.statusText); });
      }
      return res.json();
    });
  }

  function ensureWs() {
    if (ws && ws.readyState === WebSocket.OPEN) return;
    ws = new WebSocket(WS_BASE);
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'room' && msg.data && msg.data.roomCode) {
          const set = wsSubscriptions.get(msg.data.roomCode);
          if (set) set.forEach((cb) => cb(msg.data));
        }
      } catch (_) {}
    };
    ws.onclose = () => { ws = null; };
  }

  const gameRoomManager = {
    async createRoom(gameType, playerName) {
      const r = await apiFetch('/api/rooms', {
        method: 'POST',
        body: JSON.stringify({ gameType, playerName: playerName || 'Gast' })
      });
      return r.roomCode;
    },

    async joinRoom(roomCode, playerName) {
      const code = (roomCode || '').trim().toUpperCase();
      return apiFetch('/api/rooms/' + encodeURIComponent(code) + '/join', {
        method: 'POST',
        body: JSON.stringify({ playerName: playerName || 'Gast' })
      });
    },

    async getRoom(roomCode) {
      const code = (roomCode || '').trim().toUpperCase();
      return apiFetch('/api/rooms/' + encodeURIComponent(code));
    },

    onRoomUpdate(roomCode, callback) {
      const code = (roomCode || '').trim().toUpperCase();
      ensureWs();
      if (!wsSubscriptions.has(code)) wsSubscriptions.set(code, new Set());
      wsSubscriptions.get(code).add(callback);
      ws.send(JSON.stringify({ type: 'subscribe', roomCode: code }));
      return { roomCode: code, _cb: callback };
    },

    async updateGameState(roomCode, state) {
      const code = (roomCode || '').trim().toUpperCase();
      return apiFetch('/api/rooms/' + encodeURIComponent(code), {
        method: 'PATCH',
        body: JSON.stringify({ gameState: state })
      });
    },

    async updateBoard(roomCode, board) {
      return this.updateGameState(roomCode, { board });
    },

    async switchTurn(roomCode, currentPlayer) {
      const next = currentPlayer === 'player1' ? 'player2' : 'player1';
      return this.updateGameState(roomCode, { currentTurn: next });
    },

    async setWinner(roomCode, winner) {
      return this.updateGameState(roomCode, { status: 'finished', winner });
    },

    stopListening(ref) {
      if (ref && ref.roomCode && ref._cb) {
        const set = wsSubscriptions.get(ref.roomCode);
        if (set) set.delete(ref._cb);
      }
    }
  };

  window.gameRoomManager = gameRoomManager;
})();
