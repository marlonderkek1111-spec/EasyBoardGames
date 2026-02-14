# EasyBoardGames

Kostenlose 2-Spieler-Spiele im Stil von [papergames.io](https://papergames.io): Ein Link teilen, mit einem Freund in Echtzeit spielen – **ohne Anmeldung**, als Gast.

## Spiele

- **Tic-Tac-Toe** – 3 in einer Reihe
- **4 Gewinnt** – Vier verbinden
- **Gomoku** – 5 in einer Reihe (15×15)
- **Battleship** – Schiffe versenken (8×8, 3 Schiffe)

## Ablauf

1. Spiel wählen
2. „Neues Spiel erstellen“ → Link kopieren und an Freund schicken
3. Freund öffnet den Link → ihr spielt in Echtzeit

Optional: Namen eingeben (sonst „Gast“).

## Technik

- **Frontend:** HTML, CSS, Vanilla JS
- **Backend:** Node.js, Express, **JSON-Datei** als Speicher (`server/games.json`), **WebSocket** (Echtzeit)
- Kein Firebase, keine Cloud, keine native Datenbank – nur Node + npm

## Lokal starten

1. **Abhängigkeiten im Server installieren:**
   ```bash
   cd server
   npm install
   cd ..
   ```

2. **Server starten** (serviert die Web-App und die API auf Port 3000):
   ```bash
   npm start
   ```
   Oder direkt: `node server/index.js`

3. Im Browser öffnen: **http://localhost:3000**

Die Spielstände werden in `server/games.json` gespeichert (wird automatisch angelegt).

## Umgebungsvariablen (optional)

- `PORT` – Server-Port (Standard: 3000)
- `DATA_PATH` – Pfad zur JSON-Datei (Standard: `server/games.json`)

## Projektstruktur

```
easyboardgames/
├── index.html
├── css/global.css
├── js/
│   ├── player.js      # Nickname (LocalStorage)
│   └── api.js         # Client für Backend (fetch + WebSocket)
├── server/
│   ├── index.js       # Express + WebSocket
│   ├── db.js          # JSON-Speicher (Räume, Spielstand)
│   └── package.json
└── games/
    ├── tictactoe/
    ├── connect4/
    ├── gomoku/
    └── battleship/
```

## Deployment

Statt rein statisch (z. B. Vercel) brauchst du einen Node-Server, der dauerhaft läuft (z. B. VPS, Railway, Render, Fly.io). Dort `server/` mit `npm install` und `node index.js` starten und die Umgebung auf den gewünschten Port setzen.
