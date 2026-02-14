(function () {
    const ROWS = 6, COLS = 7;
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

    function emptyBoard() {
        return Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
    }

    let board = emptyBoard();
    let roomCode = null;
    let playerRole = null;
    let roomRef = null;
    let gameActive = false;

    function getNickname() {
        const el = document.getElementById('nicknameInput');
        const v = el && el.value ? el.value.trim() : '';
        if (v) player.setNickname(v);
        return player.getNickname();
    }

    const setup = document.getElementById('setup');
    const invite = document.getElementById('invite');
    const gameArea = document.getElementById('gameArea');
    const boardEl = document.getElementById('board');
    const columnsEl = document.getElementById('columns');
    const name1 = document.getElementById('name1');
    const name2 = document.getElementById('name2');
    const turnIndicator = document.getElementById('turnIndicator');
    const turnText = document.getElementById('turnText');
    const winnerModal = document.getElementById('winnerModal');
    const winnerText = document.getElementById('winnerText');

    document.getElementById('nicknameInput').value = player.getNickname() === 'Gast' ? '' : player.getNickname();

    for (let c = 0; c < COLS; c++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'col-btn';
        btn.textContent = '↓';
        btn.dataset.col = c;
        columnsEl.appendChild(btn);
    }

    boardEl.innerHTML = '';
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = r;
            cell.dataset.col = c;
            boardEl.appendChild(cell);
        }
    }

    const cells = boardEl.querySelectorAll('.cell');
    const colBtns = columnsEl.querySelectorAll('.col-btn');

    function render() {
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const i = r * COLS + c;
                const v = board[r][c];
                cells[i].className = 'cell' + (v ? ' ' + v : '');
                cells[i].textContent = v === 'red' ? '🔴' : v === 'yellow' ? '🟡' : '';
                cells[i].classList.remove('winning', 'dropping');
            }
        }
    }

    function checkWinner() {
        const dirs = [[0,1],[1,0],[1,1],[1,-1]];
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const color = board[r][c];
                if (!color) continue;
                for (const [dr, dc] of dirs) {
                    let count = 1;
                    const win = [[r, c]];
                    for (let k = 1; k < 4; k++) {
                        const nr = r + dr * k, nc = c + dc * k;
                        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || board[nr][nc] !== color) break;
                        count++;
                        win.push([nr, nc]);
                    }
                    if (count === 4) {
                        win.forEach(([rr, cc]) => cells[rr * COLS + cc].classList.add('winning'));
                        return color === 'red' ? 'player1' : 'player2';
                    }
                }
            }
        }
        return null;
    }
    function isFull() {
        return board.every(row => row.every(Boolean));
    }

    document.getElementById('createBtn').addEventListener('click', async () => {
        const name = getNickname();
        try {
            roomCode = await gameRoomManager.createRoom('connect4', name);
            playerRole = 'player1';
            document.getElementById('inviteLink').value = window.location.origin + '/games/connect4/' + roomCode;
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
        if (!code) { alert('Bitte einen gültigen Code eingeben (z.B. ABCDE-1234).'); return; }
        doJoin(code);
    }
    async function doJoin(code) {
        const name = getNickname();
        try {
            await gameRoomManager.joinRoom(code, name);
            roomCode = code;
            playerRole = 'player2';
            setup.classList.add('hidden');
            startGame();
            listen();
        } catch (e) {
            alert(e.message || 'Beitreten fehlgeschlagen.');
        }
    }

    function listen() {
        roomRef = gameRoomManager.onRoomUpdate(roomCode, (data) => {
            if (data.players && data.players.player1) name1.textContent = data.players.player1.name;
            if (data.players && data.players.player2) name2.textContent = data.players.player2.name;
            if (data.gameState.status === 'playing' && !gameActive) startGame();
            if (data.gameState.board) {
                board = data.gameState.board;
                render();
            }
            const turn = data.gameState.currentTurn;
            const isMyTurn = turn === playerRole;
            turnIndicator.className = 'turn-indicator ' + (isMyTurn ? 'your-turn' : 'opponent-turn');
            turnText.textContent = isMyTurn ? 'Dein Zug' : 'Gegner ist dran';
            document.querySelector('.player1-info').classList.toggle('active', turn === 'player1');
            document.querySelector('.player2-info').classList.toggle('active', turn === 'player2');
            colBtns.forEach((b, i) => b.classList.toggle('disabled', !isMyTurn || board[0][i] !== null));
            if (data.gameState.status === 'finished' && data.gameState.winner) showWinner(data.gameState.winner);
        });
    }

    function startGame() {
        invite.classList.add('hidden');
        gameArea.classList.remove('hidden');
        gameActive = true;
        board = emptyBoard();
        if (playerRole === 'player1') gameRoomManager.updateBoard(roomCode, board);
        render();
        colBtns.forEach((b, i) => b.classList.toggle('disabled', board[0][i] !== null));
    }

    function drop(col) {
        if (!gameActive) return;
        if (document.querySelector('.player2-info.active')) return;
        let row = -1;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (board[r][col] === null) { row = r; break; }
        }
        if (row === -1) return;

        board[row][col] = playerRole === 'player1' ? 'red' : 'yellow';
        gameRoomManager.updateBoard(roomCode, board);

        const i = row * COLS + col;
        cells[i].classList.add('dropping');
        render();
        cells[i].classList.add('dropping');

        const winner = checkWinner();
        if (winner) {
            gameRoomManager.setWinner(roomCode, winner);
            gameActive = false;
            return;
        }
        if (isFull()) {
            gameRoomManager.setWinner(roomCode, 'draw');
            gameActive = false;
            return;
        }
        gameRoomManager.switchTurn(roomCode, playerRole);
    }

    colBtns.forEach(btn => {
        btn.addEventListener('click', () => drop(parseInt(btn.dataset.col, 10)));
    });

    function showWinner(winner) {
        if (winner === 'draw') winnerText.textContent = 'Unentschieden!';
        else if (winner === playerRole) winnerText.textContent = 'Du hast gewonnen!';
        else winnerText.textContent = 'Du hast verloren.';
        winnerModal.classList.remove('hidden');
    }

    document.getElementById('copyBtn').addEventListener('click', () => {
        document.getElementById('inviteLink').select();
        document.execCommand('copy');
        const btn = document.getElementById('copyBtn');
        btn.textContent = 'Kopiert!';
        setTimeout(() => { btn.textContent = 'Kopieren'; }, 2000);
    });

    document.getElementById('rematchBtn').addEventListener('click', async () => {
        board = emptyBoard();
        gameActive = true;
        winnerModal.classList.add('hidden');
        if (playerRole === 'player1') {
            await gameRoomManager.updateGameState(roomCode, {
                status: 'playing',
                currentTurn: 'player1',
                board,
                winner: null
            });
        }
        render();
    });

    document.getElementById('leaveBtn').addEventListener('click', () => {
        if (confirm('Spiel wirklich verlassen?')) {
            gameRoomManager.stopListening(roomRef);
            window.location.href = '../../index.html';
        }
    });
    document.getElementById('playAgainBtn').addEventListener('click', () => {
        winnerModal.classList.add('hidden');
        document.getElementById('rematchBtn').click();
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
