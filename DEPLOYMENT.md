# EasyBoardGames deployen

Die App braucht einen **Node-Server** (Express + WebSocket). Statisches Hosting (nur Vercel/Netlify ohne Server) reicht nicht.

## Option 1: Railway (empfohlen, einfach)

1. Gehe zu [railway.app](https://railway.app) und melde dich an (z. B. mit GitHub).
2. **New Project** → **Deploy from GitHub repo** → dein Repository auswählen.
3. Railway erkennt Node.js. Wichtig:
   - **Root Directory:** leer lassen (Projektroot).
   - **Build Command:** `npm install` (oder leer, Railway macht das oft automatisch).
   - **Start Command:** `npm start` (oder leer, dann wird `npm start` aus package.json genutzt).
4. Unter **Settings** → **Variables** kannst du optional `PORT` setzen (Railway setzt sie oft automatisch).
5. **Deploy** – Railway gibt dir eine URL wie `https://dein-projekt.up.railway.app`.

**Hinweis:** Abhängigkeiten stehen in der Root-`package.json` (express, ws). Einmal `npm install` im Projektroot reicht.

---

## Option 2: Render

1. Gehe zu [render.com](https://render.com) und melde dich an.
2. **New** → **Web Service** → Repository verbinden.
3. Einstellungen:
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. **Create Web Service**. Render setzt `PORT` automatisch.

Die `render.yaml` im Projektroot kann für Blueprint-Deployments genutzt werden.

---

## Option 3: Eigener Server (VPS)

Auf einem Linux-Server (z. B. Ubuntu):

```bash
git clone <dein-repo>
cd easyboardgames
npm install
PORT=3000 node server/index.js
```

Dauerhaft mit **pm2**:

```bash
npm install -g pm2
PORT=3000 pm2 start server/index.js --name easyboardgames
pm2 save
pm2 startup
```

---

## Umgebungsvariablen

| Variable    | Bedeutung                          | Standard        |
|------------|-------------------------------------|-----------------|
| `PORT`     | Port des Servers                    | 3000            |
| `DATA_PATH`| Pfad zur JSON-Datei für Spielstände | `server/games.json` |

Auf Railway/Render ist das Dateisystem bei Free-Tier oft **ephemeral** – beim Neustart können Spielstände weg sein. Für dauerhafte Speicherung: z. B. Railway **Volume** mounten und `DATA_PATH` auf einen Pfad in diesem Volume setzen.

---

## Nach dem Deploy

- Startseite: `https://deine-url.de`
- Spiele: `https://deine-url.de/games/tictactoe/` usw.
- Einladungslinks funktionieren wie lokal: Freund bekommt z. B. `https://deine-url.de/games/tictactoe/ABCDE-1234`.
