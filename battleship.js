(function () {
    const SIZE = 8;
    const SHIP_LENGTHS = [2, 3, 3];
    const CODE_REG = /^[A-Z]{5}-[A-Z0-9]{4}$/;

    function getCodeFromPath() {
        const parts = window.location.pathname.split('/').filter(Boolean);
        const last = parts[parts.length - 1];
        return last && CODE_REG.test(last) ? last : null;
    }
    function getCodeFromInput() {
        const raw = document.getElementById('codeInput').value.trim().toUpperCase().replace(/\s/g, '');
        return CODE_REG.test(raw) ? raw : null;
    }

    function randomShips() {
        const cells = [];
        const used = new Set();
        for (const len of SHIP_LENGTHS) {
            for (let try_ = 0; try_ < 100; try_++) {
                const hor = Math.random() < 0.5;
                const r = Math.floor(Math.random() * SIZE);
                const c = Math.floor(Math.random() * SIZE);
                const positions = [];
                let ok = true;
                for (let k = 0; k < len; k++) {
                    const rr = hor ? r : r + k;
                    const cc = hor ? c + k : c;
                    if (rr < 0 || rr >= SIZE || cc < 0 || cc >= SIZE) { ok = false; break; }
                    const key = rr + ',' + cc;
                    if (used.has(key)) { ok = false; break; }
                    positions.push([rr, cc]);
                }
                if (ok) {
                    positions.forEach(([rr, cc]) => used.add(rr + ',' + cc));
                    cells.push(...positions);
                    break;
                }
            }
        }
        return cells;
    }

    let roomCode = null;
    let playerRole = null;
    let roomRef = null;
    let myShips = [];
    let myShots = [];
    let enemyShots = [];

    function getNickname() {
        const el = document.getElementById('nicknameInput');
        const v = el && el.value ? el.value.trim() : '';
        if (v) player.setNickname(v);
        return player.getNickname();
    }

    const setup = document.getElementById('setup');
    const invite = document.getElementById('invite');
    const placePhase = document.getElementById('placePhase');
    const gameArea = document.getElementById('gameArea');
    const placeBoard = document.getElementById('placeBoard');
    const myBoardEl = document.getElementById('myBoard');
    const enemyBoardEl = document.getElementById('enemyBoard');
    const winnerModal = document.getElementById('winnerModal');
    const winnerText = document.getElementById('winnerText');
    const waitModal = document.getElementById('waitModal');

    document.getElementById('nicknameInput').value = player.getNickname() === 'Gast' ? '' : player.getNickname();

    function renderPlaceBoard(container, ships, shots, showShips, shootable) {
        container.innerHTML = '';
        const shipSet = new Set(ships.map(([r, c]) => r + ',' + c));
        const shotMap = new Map();
        (shots || []).forEach(({ r, c, hit }) => shotMap.set(r + ',' + c, hit));
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.r = r;
                cell.dataset.c = c;
                const key = r + ',' + c;
                if (showShips && shipSet.has(key)) cell.classList.add('ship');
                if (shotMap.has(key)) {
                    cell.classList.add(shotMap.get(key) ? 'hit' : 'miss');
                } else if (shootable) {
                    cell.classList.add('shootable');
                }
                container.appendChild(cell);
            }
        }
    }

    document.getElementById('createBtn').addEventListener('click', async () => {
        const name = getNickname();
        try {
            roomCode = await gameRoomManager.createRoom('battleship', name);
            playerRole = 'player1';
            document.getElementById('inviteLink').value = window.location.origin + '/games/battleship/' + roomCode;
            setup.classList.add('hidden');
            invite.classList.remove('hidden');
            listen();
        } catch (e) {
            alert('Fehler: ' + (e.message || 'Bitte später erneut versuchen.'));
        }
    });

    document.getElementById('joinBtn').addEventListener('click', joinWithCode);
    function joinWithCode() {
        const code = getCodeFromInput();
        if (!code) { alert('Bitte einen gültigen Code eingeben.'); return; }
        doJoin(code);
    }
    async function doJoin(code) {
        const name = getNickname();
        try {
            await gameRoomManager.joinRoom(code, name);
            roomCode = code;
            playerRole = 'player2';
            setup.classList.add('hidden');
            invite.classList.add('hidden');
            showPlacement();
            listen();
        } catch (e) {
            alert(e.message || 'Beitreten fehlgeschlagen.');
        }
    }

    function showPlacement() {
        placePhase.classList.remove('hidden');
        myShips = randomShips();
        renderPlaceBoard(placeBoard, myShips, [], true, false);
    }

    document.getElementById('randomBtn').addEventListener('click', () => {
        myShips = randomShips();
        renderPlaceBoard(placeBoard, myShips, [], true, false);
    });

    document.getElementById('readyBtn').addEventListener('click', async () => {
        const room = await gameRoomManager.getRoom(roomCode);
        const g = (room && room.gameState) || {};
        const updates = {};
        if (playerRole === 'player1') {
            updates.p1Ships = myShips;
            updates.p1Ready = true;
        } else {
            updates.p2Ships = myShips;
            updates.p2Ready = true;
        }
        if (playerRole === 'player2' && g.p1Ready) updates.status = 'playing';
        if (playerRole === 'player1' && g.p2Ready) updates.status = 'playing';
        await gameRoomManager.updateGameState(roomCode, updates);
    });

    function listen() {
        roomRef = gameRoomManager.onRoomUpdate(roomCode, (data) => {
            const g = data.gameState || {};
            const players = data.players || {};

            document.getElementById('name1').textContent = (players.player1 && players.player1.name) || 'Spieler 1';
            document.getElementById('name2').textContent = (players.player2 && players.player2.name) || 'Spieler 2';

            if (g.status === 'placing') {
                invite.classList.add('hidden');
                waitModal.classList.add('hidden');
                if (!g.p1Ready && playerRole === 'player1') {
                    placePhase.classList.remove('hidden');
                    if (!placeBoard.querySelector('.cell')) {
                        myShips = randomShips();
                        renderPlaceBoard(placeBoard, myShips, [], true, false);
                    }
                } else if (!g.p2Ready && playerRole === 'player2') {
                    placePhase.classList.remove('hidden');
                    if (!placeBoard.querySelector('.cell')) {
                        myShips = randomShips();
                        renderPlaceBoard(placeBoard, myShips, [], true, false);
                    }
                } else if ((playerRole === 'player1' && !g.p2Ready) || (playerRole === 'player2' && !g.p1Ready)) {
                    placePhase.classList.add('hidden');
                    waitModal.classList.remove('hidden');
                }
            }

            if (g.status === 'playing') {
                placePhase.classList.add('hidden');
                waitModal.classList.add('hidden');
                gameArea.classList.remove('hidden');

                const p1Ships = g.p1Ships || [];
                const p2Ships = g.p2Ships || [];
                const p1Shots = g.p1Shots || [];
                const p2Shots = g.p2Shots || [];

                if (playerRole === 'player1') {
                    myShips = p1Ships;
                    myShots = p2Shots;
                    enemyShots = p1Shots;
                } else {
                    myShips = p2Ships;
                    myShots = p1Shots;
                    enemyShots = p2Shots;
                }

                const currentTurn = g.currentTurn || 'player1';
                const isMyTurn = currentTurn === playerRole;
                document.getElementById('turnIndicator').className = 'turn-indicator ' + (isMyTurn ? 'your-turn' : 'opponent-turn');
                document.getElementById('turnText').textContent = isMyTurn ? 'Dein Zug – Klicke auf ein Feld des Gegners' : 'Gegner ist dran';

                renderPlaceBoard(myBoardEl, myShips, enemyShots, true, false);
                const enemyShotSet = new Set((playerRole === 'player1' ? p2Shots : p1Shots).map(({ r, c }) => r + ',' + c));
                renderPlaceBoard(enemyBoardEl, [], myShots, false, isMyTurn && g.winner == null);

                if (g.winner) {
                    winnerText.textContent = g.winner === playerRole ? 'Du hast gewonnen!' : 'Du hast verloren.';
                    winnerModal.classList.remove('hidden');
                }
            }
        });
    }

    enemyBoardEl.addEventListener('click', async (e) => {
        const cell = e.target.closest('.cell.shootable');
        if (!cell) return;
        const r = parseInt(cell.dataset.r, 10);
        const c = parseInt(cell.dataset.c, 10);
        const room = await gameRoomManager.getRoom(roomCode);
        const g = (room && room.gameState) || {};
        if (g.status !== 'playing' || g.winner) return;
        if (g.currentTurn !== playerRole) return;
        const enemyShips = playerRole === 'player1' ? (g.p2Ships || []) : (g.p1Ships || []);
        const myShotsSoFar = playerRole === 'player1' ? (g.p1Shots || []) : (g.p2Shots || []);
        if (myShotsSoFar.some(s => s.r === r && s.c === c)) return;

        const hit = enemyShips.some(([sr, sc]) => sr === r && sc === c);
        const newShots = [...myShotsSoFar, { r, c, hit }];
        const nextTurn = playerRole === 'player1' ? 'player2' : 'player1';
        const allHit = enemyShips.length > 0 && enemyShips.every(([sr, sc]) => newShots.some(s => s.r === sr && s.c === sc && s.hit));
        const winner = allHit ? playerRole : null;

        await gameRoomManager.updateGameState(roomCode, {
            p1Shots: playerRole === 'player1' ? newShots : g.p1Shots,
            p2Shots: playerRole === 'player2' ? newShots : g.p2Shots,
            currentTurn: nextTurn,
            ...(winner ? { status: 'finished', winner } : {})
        });
    });

    document.getElementById('copyBtn').addEventListener('click', () => {
        document.getElementById('inviteLink').select();
        document.execCommand('copy');
        const btn = document.getElementById('copyBtn');
        btn.textContent = 'Kopiert!';
        setTimeout(() => { btn.textContent = 'Kopieren'; }, 2000);
    });

    document.getElementById('leaveBtn').addEventListener('click', () => {
        if (confirm('Spiel wirklich verlassen?')) {
            gameRoomManager.stopListening(roomRef);
            window.location.href = '../../index.html';
        }
    });
    document.getElementById('menuBtn').addEventListener('click', () => {
        gameRoomManager.stopListening(roomRef);
        window.location.href = '../../index.html';
    });

    const urlCode = getCodeFromPath();
    if (urlCode) {
        document.getElementById('codeInput').value = urlCode;
        doJoin(urlCode);
    }
})();
