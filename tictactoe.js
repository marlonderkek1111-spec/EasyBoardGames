(function () {
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

    let board = Array(9).fill(null);
    let roomCode = null;
    let playerRole = null;
    let roomRef = null;
    let gameActive = false;
    const winLines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

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
    const cells = boardEl.querySelectorAll('.cell');
    const name1 = document.getElementById('name1');
    const name2 = document.getElementById('name2');
    const turnIndicator = document.getElementById('turnIndicator');
    const turnText = document.getElementById('turnText');
    const winnerModal = document.getElementById('winnerModal');
    const winnerText = document.getElementById('winnerText');

    document.getElementById('nicknameInput').value = player.getNickname() === 'Gast' ? '' : player.getNickname();

    document.getElementById('createBtn').addEventListener('click', async () => {
        const name = getNickname();
        try {
            roomCode = await gameRoomManager.createRoom('tictactoe', name);
            playerRole = 'player1';
            document.getElementById('inviteLink').value = window.location.origin + '/games/tictactoe/' + roomCode;
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
        if (!code) {
            alert('Bitte einen gültigen Code eingeben (z.B. ABCDE-1234).');
            return;
        }
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
            if (data.gameState.status === 'finished' && data.gameState.winner) {
                showWinner(data.gameState.winner);
            }
        });
    }

    function startGame() {
        invite.classList.add('hidden');
        gameArea.classList.remove('hidden');
        gameActive = true;
        board = Array(9).fill(null);
        if (playerRole === 'player1') gameRoomManager.updateBoard(roomCode, board);
        cells.forEach(c => { c.classList.remove('winning'); });
        render();
    }

    function render() {
        cells.forEach((c, i) => {
            const v = board[i];
            c.textContent = v === 'X' ? '❌' : v === 'O' ? '⭕' : '';
            c.classList.toggle('taken', !!v);
        });
    }

    function checkWinner() {
        for (const [a, b, c] of winLines) {
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                [a, b, c].forEach(i => cells[i].classList.add('winning'));
                return board[a] === 'X' ? 'player1' : 'player2';
            }
        }
        return null;
    }

    boardEl.addEventListener('click', async (e) => {
        const cell = e.target.closest('.cell');
        if (!cell || !gameActive) return;
        const i = parseInt(cell.dataset.i, 10);
        if (board[i] !== null) return;
        const turn = document.querySelector('.player1-info.active') ? 'player1' : 'player2';
        if (turn !== playerRole) return;

        board[i] = playerRole === 'player1' ? 'X' : 'O';
        await gameRoomManager.updateBoard(roomCode, board);

        const winner = checkWinner();
        if (winner) {
            await gameRoomManager.setWinner(roomCode, winner);
            gameActive = false;
            return;
        }
        if (board.every(Boolean)) {
            await gameRoomManager.setWinner(roomCode, 'draw');
            gameActive = false;
            return;
        }
        await gameRoomManager.switchTurn(roomCode, playerRole);
    });

    function showWinner(winner) {
        if (winner === 'draw') winnerText.textContent = 'Unentschieden!';
        else if (winner === playerRole) winnerText.textContent = 'Du hast gewonnen!';
        else winnerText.textContent = 'Du hast verloren.';
        winnerModal.classList.remove('hidden');
    }

    document.getElementById('copyBtn').addEventListener('click', () => {
        const input = document.getElementById('inviteLink');
        input.select();
        document.execCommand('copy');
        const btn = document.getElementById('copyBtn');
        btn.textContent = 'Kopiert!';
        setTimeout(() => { btn.textContent = 'Kopieren'; }, 2000);
    });

    document.getElementById('rematchBtn').addEventListener('click', async () => {
        board = Array(9).fill(null);
        gameActive = true;
        winnerModal.classList.add('hidden');
        cells.forEach(c => c.classList.remove('winning'));
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
