# Repository zu GitHub pushen

## 0. Einmalig: Git-Benutzer setzen (wenn Fehler "Author identity unknown")

```powershell
git config --global user.email "deine-email@beispiel.de"
git config --global user.name "Dein Name"
```

(E-Mail und Name z. B. wie auf GitHub – muss nicht die echte E-Mail sein.)

---

## 1. Einmalig: Git vertraut dem Ordner (falls Fehler "dubious ownership")

```powershell
git config --global --add safe.directory D:/easyboardgames
```

(Das wurde bei dir schon erledigt.)

---

## 2. Im Projektordner: Commit, Remote, Branch, Push

**PowerShell** (z. B. in Cursor/VS Code geöffnet, Ordner `d:\easyboardgames`):

```powershell
cd d:\easyboardgames

git add .
git commit -m "Ready for deploy"
git remote add origin https://github.com/marlonderkek1111-spec/EasyBoardGames.git
git branch -M main
git push -u origin main
```

**Wichtig:** `git branch -M main` benennt deinen Branch in `main` um, weil GitHub standardmäßig `main` erwartet.

---

## 3. Wenn "remote origin already exists" erscheint

Dann den Remote nur setzen und danach pushen:

```powershell
git remote set-url origin https://github.com/marlonderkek1111-spec/EasyBoardGames.git
git branch -M main
git push -u origin main
```

---

## 4. Wenn der Push mit "Access denied" oder "Authentication failed" fehlschlägt

GitHub erlaubt kein Passwort mehr für HTTPS. Du brauchst einen **Personal Access Token (PAT)**:

1. GitHub → **Settings** (dein Profil) → **Developer settings** → **Personal access tokens** → **Tokens (classic)**.
2. **Generate new token** → Namen vergeben, Haken bei **repo** setzen → erzeugen.
3. Token kopieren (wird nur einmal angezeigt).

Beim nächsten `git push`:
- **Username:** dein GitHub-Benutzername (`marlonderkek1111-spec`)
- **Password:** den Token einfügen (nicht dein GitHub-Passwort)

Oder Token in der URL speichern (Achtung: nur auf deinem Rechner):

```powershell
git remote set-url origin https://marlonderkek1111-spec:DEIN_TOKEN@github.com/marlonderkek1111-spec/EasyBoardGames.git
git push -u origin main
```

(DEN_TOKEN durch den echten Token ersetzen.)

---

## Kurzfassung – Reihenfolge

**Zuerst einmalig (wenn noch nicht gemacht):**
```powershell
git config --global user.email "deine-email@beispiel.de"
git config --global user.name "Dein Name"
```

**Dann im Projekt:**
```powershell
cd d:\easyboardgames
git add .
git commit -m "Ready for deploy"
git remote add origin https://github.com/marlonderkek1111-spec/EasyBoardGames.git
git branch -M main
git push -u origin main
```

- Wenn **"remote origin already exists"** → `git remote set-url origin https://github.com/marlonderkek1111-spec/EasyBoardGames.git` und danach nur noch `git branch -M main` und `git push -u origin main`.
- Wenn **"Access denied" / "Authentication failed"** beim Push → Abschnitt 4 (Personal Access Token) oben.
