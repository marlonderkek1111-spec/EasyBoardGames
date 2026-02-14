(function () {
    const SIZE = 15;
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

    let board = Array(SIZE * SIZE).fill(null);
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
    const name1 = document.getElementById('name1');
    const name2 = document.getElementById('name2');
    const turnIndicator = document.getElementById('turnIndicator');
    const turnText = document.getElementById('turnText');
    const winnerModal = document.getElementById('winnerModal');
    const winnerText = document.getElementById('winnerText');

    document.getElementById('nicknameInput').value = player.getNickname() === 'Gast' ? '' : player.getNickname();

    boardEl.innerHTML = '';
    for (let i = 0; i < SIZE * SIZE; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.i = i;
        boardEl.appendChild(cell);
    }
    const cells = boardEl.querySelectorAll('.cell');

    function render() {
        cells.forEach((c, i) => {
            const v = board[i];
            c.textContent = '';
            c.classList.remove('black', 'white', 'taken', 'winning');
            if (v === 'B') { c.classList.add('black', 'taken'); c.textContent = '●'; }
            else if (v === 'W') { c.classList.add('white', 'taken'); c.textContent = '○'; }
        });
    }

    function idxToRC(i) { return { r: Math.floor(i / SIZE), c: i % SIZE }; }
    function rcToIdx(r, c) { return r * SIZE + c; }

    function checkWinner() {
        const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
        for (let i = 0; i < board.length; i++) {
            const v = board[i];
            if (!v) continue;
            const { r, c } = idxToRC(i);
            for (const [dr, dc] of dirs) {
                let count = 1;
                const win = [i];
                for (let k = 1; k < 5; k++) {
                    const nr = r + dr * k, nc = c + dc * k;
                    if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) break;
                    const ni = rcToIdx(nr, nc);
                    if (board[ni] !== v) break;
                    count++;
                    win.push(ni);
                }
                if (count === 5) {
                    win.forEach(idx => cells[idx].classList.add('winning'));
                    return v === 'B' ? 'player1' : 'player2';
                }
            }
        }
        return null;
    }

    document.getElementById('createBtn').addEventListener('click', async () => {
        const name = getNickname();
        try {
            roomCode = await gameRoomManager.createRoom('gomoku', name);
            playerRole = 'player1';
            document.getElementById('inviteLink').value = window.location.origin + '/games/gomoku/' + roomCode;
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
            if (data.gameState.status === 'finished' && data.gameState.winner) showWinner(data.gameState.winner);
        });
    }

    function startGame() {
        invite.classList.add('hidden');
        gameArea.classList.remove('hidden');
        gameActive = true;
        board = Array(SIZE * SIZE).fill(null);
        if (playerRole === 'player1') gameRoomManager.updateBoard(roomCode, board);
        render();
    }

    boardEl.addEventListener('click', async (e) => {
        const cell = e.target.closest('.cell');
        if (!cell || !gameActive) return;
        const i = parseInt(cell.dataset.i, 10);
        if (board[i] !== null) return;
        const turn = document.querySelector('.player1-info.active') ? 'player1' : 'player2';
        if (turn !== playerRole) return;

        board[i] = playerRole === 'player1' ? 'B' : 'W';
        await gameRoomManager.updateBoard(roomCode, board);

        const winner = checkWinner();
        if (winner) {
            await gameRoomManager.setWinner(roomCode, winner);
            gameActive = false;
            showWinner(winner);
            return;
        }
        await gameRoomManager.switchTurn(roomCode, playerRole);
    });

    function showWinner(winner) {
        if (winner === playerRole) winnerText.textContent = 'Du hast gewonnen!';
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
        board = Array(SIZE * SIZE).fill(null);
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
