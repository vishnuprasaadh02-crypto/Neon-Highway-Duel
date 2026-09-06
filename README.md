# 🏎️ Neon Highway Duel

A 2-player local multiplayer racing game you can play in one browser tab — one player on each side of the road. No sign-up, no install, no study material in sight. Just dodge traffic and don't crash first.

Play it on a **laptop with the keyboard**, or on a **phone/tablet with on-screen arrows** — it's fully responsive.

## 🎮 How to play

Two roads, side by side. Each player steers their car between 3 lanes to dodge oncoming traffic. **The first player to crash loses the duel.**

| Player | Move Left | Move Right |
|--------|-----------|------------|
| 🔴 Player 1 (left road)  | `A` | `D` |
| 🔵 Player 2 (right road) | `←` | `→` |

On mobile, use the on-screen ◀ ▶ buttons below the road (each player gets their own pair). Press `Enter` / `Space` or tap **START RACE** to begin.

The road gets faster the longer you both survive — see who cracks first!

## 🚀 Run it locally

No build tools, no dependencies. Just open the file:

```bash
git clone https://github.com/<your-username>/neon-highway-duel.git
cd neon-highway-duel
open index.html      # macOS
# or just double-click index.html in your file explorer
```

For the smoothest experience (and to avoid any browser security warnings with local files), serve it with any static server:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## 📂 Project structure

```
neon-highway-duel/
├── index.html    # page structure, controls overlay, touch pad
├── style.css     # neon arcade theme, fully responsive layout
├── game.js       # game loop, input, collisions, rendering (vanilla JS + Canvas)
├── README.md
└── LICENSE
```

No frameworks, no npm install — pure HTML/CSS/JS so it's easy to read, tweak, and deploy anywhere.

## 📤 Push this to your own GitHub repo

If you downloaded this project as a zip, here's how to get it onto GitHub:

1. Create a new empty repository on GitHub (don't add a README there — you already have one).
2. In the project folder, run:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Neon Highway Duel"
   git branch -M main
   git remote add origin https://github.com/<your-username>/neon-highway-duel.git
   git push -u origin main
   ```
3. Done — refresh your GitHub repo page and all the files will be there.

## 🌐 Free hosting with GitHub Pages

Since it's just static files, you can host it for free:

1. Push the code to GitHub (steps above).
2. In your repo, go to **Settings → Pages**.
3. Under **Source**, pick the `main` branch and `/ (root)` folder → **Save**.
4. After a minute, your game will be live at:
   `https://<your-username>.github.io/neon-highway-duel/`
5. Share that link — friends can play on laptop or phone, no downloads needed.

## 🛠️ Ideas to extend it

- Add a "best of 3" match mode with a running series score.
- Add power-ups (shield, slow-mo) that spawn alongside traffic.
- Add sound effects and a background synthwave track.
- Save high scores to `localStorage` so returning players see their best streak.

## 📄 License

MIT — do whatever you want with it. See [LICENSE](LICENSE).
