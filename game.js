(() => {
  'use strict';

  // ---------- DOM ----------
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlaySub = document.getElementById('overlay-sub');
  const startBtn = document.getElementById('start-btn');
  const scoreP1El = document.getElementById('score-p1');
  const scoreP2El = document.getElementById('score-p2');
  const timerEl = document.getElementById('timer');

  const LANES = 3;
  const LANE_CHANGE_COOLDOWN = 130; // ms
  const CAR_HEIGHT_RATIO = 0.09;    // relative to stage height
  const CAR_WIDTH_RATIO = 0.55;     // relative to lane width

  let dpr = Math.max(1, window.devicePixelRatio || 1);
  let W = 0, H = 0;          // CSS pixel size of canvas
  let halfW = 0, laneW = 0;

  // ---------- Game state ----------
  const state = {
    mode: 'ready', // ready | playing | over
    elapsed: 0,
    lastTime: 0,
    difficulty: 1,
  };

  function freshPlayer(side) {
    return {
      side,               // 1 or 2
      lane: 1,            // 0..LANES-1, start middle
      alive: true,
      score: 0,
      lastLaneChange: -9999,
      flashTimer: 0,
    };
  }

  let players = { 1: freshPlayer(1), 2: freshPlayer(2) };
  let obstacles = []; // {side, lane, y, speed, id}
  let spawnCooldown = { 1: 0, 2: 0 };
  let obstacleId = 0;
  let particles = []; // crash particles

  // ---------- Resize ----------
  function resize() {
    const stage = document.getElementById('stage');
    const rect = stage.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    halfW = W / 2;
    laneW = (halfW * 0.86) / LANES; // leave side margins per road
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));

  // ---------- Helpers ----------
  function roadOffsetX(side) {
    // left road starts at 0, right road starts at halfW
    const base = side === 1 ? 0 : halfW;
    const roadWidth = laneW * LANES;
    const margin = (halfW - roadWidth) / 2;
    return base + margin;
  }

  function laneCenterX(side, lane) {
    return roadOffsetX(side) + laneW * lane + laneW / 2;
  }

  function carDims() {
    const h = H * CAR_HEIGHT_RATIO;
    const w = laneW * CAR_WIDTH_RATIO;
    return { w, h };
  }

  function carY() {
    return H - H * 0.16;
  }

  // ---------- Input ----------
  const keyState = {};

  function tryMove(playerNum, dir) {
    if (state.mode !== 'playing') return;
    const p = players[playerNum];
    if (!p.alive) return;
    const now = performance.now();
    if (now - p.lastLaneChange < LANE_CHANGE_COOLDOWN) return;
    const newLane = Math.min(LANES - 1, Math.max(0, p.lane + dir));
    if (newLane !== p.lane) {
      p.lane = newLane;
      p.lastLaneChange = now;
    }
  }

  window.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'a': case 'A':
        tryMove(1, -1); break;
      case 'd': case 'D':
        tryMove(1, 1); break;
      case 'ArrowLeft':
        e.preventDefault(); tryMove(2, -1); break;
      case 'ArrowRight':
        e.preventDefault(); tryMove(2, 1); break;
      case 'Enter':
      case ' ':
        if (state.mode !== 'playing') { e.preventDefault(); startGame(); }
        break;
    }
  }, { passive: false });

  document.querySelectorAll('.pad-btn').forEach((btn) => {
    const player = Number(btn.dataset.player);
    const dir = Number(btn.dataset.dir);
    const fire = (ev) => { ev.preventDefault(); tryMove(player, dir); };
    btn.addEventListener('touchstart', fire, { passive: false });
    btn.addEventListener('mousedown', fire);
  });

  startBtn.addEventListener('click', startGame);

  // ---------- Game flow ----------
  function startGame() {
    players = { 1: freshPlayer(1), 2: freshPlayer(2) };
    obstacles = [];
    particles = [];
    spawnCooldown = { 1: 900, 2: 900 };
    state.elapsed = 0;
    state.difficulty = 1;
    state.mode = 'playing';
    overlay.classList.remove('show');
    scoreP1El.textContent = '0';
    scoreP2El.textContent = '0';
    state.lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function endGame() {
    state.mode = 'over';
    const p1 = players[1], p2 = players[2];
    let title, sub;
    if (!p1.alive && !p2.alive) {
      title = "IT'S A DRAW!";
      sub = 'Both racers crashed at the same moment. Run it back?';
    } else if (!p1.alive) {
      title = 'PLAYER 2 WINS!';
      sub = `Player 1 crashed after ${(state.elapsed / 1000).toFixed(1)}s. Player 2 kept the wheel straight.`;
    } else {
      title = 'PLAYER 1 WINS!';
      sub = `Player 2 crashed after ${(state.elapsed / 1000).toFixed(1)}s. Player 1 kept the wheel straight.`;
    }
    overlayTitle.textContent = title;
    overlaySub.textContent = sub;
    startBtn.textContent = 'RACE AGAIN';
    overlay.classList.add('show');
  }

  // ---------- Update ----------
  function spawnObstacle(side, dt) {
    spawnCooldown[side] -= dt;
    if (spawnCooldown[side] <= 0) {
      const lane = Math.floor(Math.random() * LANES);
      obstacles.push({
        id: obstacleId++,
        side,
        lane,
        y: -carDims().h,
        speed: (0.35 + Math.random() * 0.15) * state.difficulty,
        counted: false,
      });
      const base = Math.max(420, 1000 - state.elapsed / 25);
      spawnCooldown[side] = base * (0.6 + Math.random() * 0.6);
    }
  }

  function update(dt) {
    state.elapsed += dt;
    state.difficulty = 1 + state.elapsed / 18000; // ramps up over time

    if (players[1].alive) spawnObstacle(1, dt);
    if (players[2].alive) spawnObstacle(2, dt);

    const { h: carH, w: carW } = carDims();
    const cy = carY();

    for (const ob of obstacles) {
      ob.y += ob.speed * dt;
    }

    // Collision + scoring
    for (const side of [1, 2]) {
      const p = players[side];
      if (!p.alive) continue;
      for (const ob of obstacles) {
        if (ob.side !== side) continue;
        // scoring: obstacle passed the car fully
        if (!ob.counted && ob.y > cy + carH) {
          ob.counted = true;
          p.score += 1;
        }
        // collision check
        if (ob.lane === p.lane) {
          const obTop = ob.y, obBottom = ob.y + carH * 0.9;
          const carTop = cy, carBottom = cy + carH;
          if (obBottom > carTop && obTop < carBottom) {
            crash(p);
          }
        }
      }
    }

    obstacles = obstacles.filter((o) => o.y < H + carH);

    // particles
    for (const pt of particles) {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += 0.0025 * dt;
      pt.life -= dt;
    }
    particles = particles.filter((pt) => pt.life > 0);

    scoreP1El.textContent = players[1].score;
    scoreP2El.textContent = players[2].score;
    timerEl.textContent = (state.elapsed / 1000).toFixed(1) + 's';

    if (!players[1].alive || !players[2].alive) {
      endGame();
    }
  }

  function crash(p) {
    if (!p.alive) return;
    p.alive = false;
    const x = laneCenterX(p.side, p.lane);
    const y = carY();
    const color = p.side === 1 ? '#4da6ff' : '#8a6bff';
    for (let i = 0; i < 22; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.08 + Math.random() * 0.18;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.05,
        life: 500 + Math.random() * 300,
        maxLife: 800,
        color,
      });
    }
  }

  // ---------- Draw ----------
  function drawRoad(side) {
    const x0 = roadOffsetX(side);
    const roadW = laneW * LANES;

    ctx.fillStyle = '#171a2e';
    ctx.fillRect(x0, 0, roadW, H);

    // edge glow lines
    ctx.strokeStyle = side === 1 ? 'rgba(77,166,255,0.4)' : 'rgba(138,107,255,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0, 0); ctx.lineTo(x0, H);
    ctx.moveTo(x0 + roadW, 0); ctx.lineTo(x0 + roadW, H);
    ctx.stroke();

    // lane dashes, scrolling
    const dashLen = 26, gap = 22;
    const scrollOffset = (state.elapsed * 0.25) % (dashLen + gap);
    ctx.strokeStyle = 'rgba(63, 208, 255, 0.55)';
    ctx.lineWidth = 3;
    for (let l = 1; l < LANES; l++) {
      const x = x0 + laneW * l;
      ctx.beginPath();
      for (let y = -dashLen + scrollOffset; y < H; y += dashLen + gap) {
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + dashLen);
      }
      ctx.stroke();
    }

    // ambient blue "shine" sweep travelling down the road
    const period = 4200;
    const t = ((state.elapsed + (side === 2 ? period / 2 : 0)) % period) / period;
    const shineY = t * (H + 260) - 180;
    const bandH = 170;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const grad = ctx.createLinearGradient(x0, shineY, x0, shineY + bandH);
    grad.addColorStop(0, 'rgba(160, 220, 255, 0)');
    grad.addColorStop(0.5, 'rgba(160, 220, 255, 0.16)');
    grad.addColorStop(1, 'rgba(160, 220, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x0, shineY, roadW, bandH);
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawCar(side) {
    const p = players[side];
    if (!p.alive) return;
    const { w, h } = carDims();
    const cx = laneCenterX(side, p.lane);
    const cy = carY();
    const color = side === 1 ? '#4da6ff' : '#8a6bff';
    const glow = side === 1 ? 'rgba(77,166,255,0.75)' : 'rgba(138,107,255,0.75)';

    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = 22 + Math.sin(state.elapsed / 220) * 6;
    ctx.fillStyle = color;
    roundRect(cx - w / 2, cy, w, h, w * 0.28);
    ctx.fill();

    // windshield
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(10,12,22,0.55)';
    roundRect(cx - w * 0.32, cy + h * 0.14, w * 0.64, h * 0.32, w * 0.14);
    ctx.fill();
    ctx.restore();
  }

  function drawObstacle(ob) {
    const { w, h } = carDims();
    const cx = laneCenterX(ob.side, ob.lane);
    ctx.save();
    ctx.shadowColor = 'rgba(255,154,60,0.6)';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#ff9a3c';
    roundRect(cx - w / 2, ob.y, w, h * 0.9, w * 0.22);
    ctx.fill();
    ctx.restore();
  }

  function drawParticles() {
    for (const pt of particles) {
      const a = Math.max(0, pt.life / pt.maxLife);
      ctx.globalAlpha = a;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawCenterDivider() {
    ctx.strokeStyle = '#2a2f4d';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 10]);
    ctx.beginPath();
    ctx.moveTo(halfW, 0);
    ctx.lineTo(halfW, H);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawRoad(1);
    drawRoad(2);
    drawCenterDivider();
    for (const ob of obstacles) drawObstacle(ob);
    drawCar(1);
    drawCar(2);
    drawParticles();
  }

  // ---------- Loop ----------
  function loop(now) {
    const dt = Math.min(48, now - state.lastTime);
    state.lastTime = now;
    if (state.mode === 'playing') {
      update(dt);
    } else if (state.mode === 'over') {
      // let particles/crash animation settle briefly
      for (const pt of particles) {
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vy += 0.0025 * dt;
        pt.life -= dt;
      }
      particles = particles.filter((pt) => pt.life > 0);
    }
    draw();
    if (state.mode !== 'ready') requestAnimationFrame(loop);
  }

  // ---------- Init ----------
  resize();
  draw();
})();
