(() => {
  "use strict";

  const BEST_KEY = "pm_pong_best_v1";
  const WIN_SCORE = 7;

  let canvas;
  let ctx;
  let youEl;
  let aiEl;
  let bestEl;
  let statusEl;
  let playBtn;

  let raf = 0;
  let running = false;
  let playing = false;
  let gameOver = false;
  let youScore = 0;
  let aiScore = 0;
  let best = 0;
  let message = "Tap Play, then drag to move your paddle";

  const state = {
    paddleH: 70,
    paddleW: 12,
    ballSize: 10,
    youY: 0,
    aiY: 0,
    ballX: 0,
    ballY: 0,
    ballVX: 0,
    ballVY: 0,
    aiSpeed: 3.2
  };

  function readBest() {
    try {
      best = Number(localStorage.getItem(BEST_KEY) || 0);
    } catch {
      best = 0;
    }
  }

  function saveBest() {
    try {
      localStorage.setItem(BEST_KEY, String(best));
    } catch {
      /* ignore */
    }
  }

  function syncHud() {
    if (youEl) youEl.textContent = String(youScore);
    if (aiEl) aiEl.textContent = String(aiScore);
    if (bestEl) bestEl.textContent = String(best);
    if (statusEl) statusEl.textContent = message;
    if (playBtn) {
      playBtn.textContent = gameOver ? "Play Again" : playing ? "Playing…" : "Play";
      playBtn.disabled = playing && !gameOver;
    }
  }

  function resetBall(direction = Math.random() > 0.5 ? 1 : -1) {
    state.ballX = canvas.width / 2;
    state.ballY = canvas.height / 2;
    const angle = (Math.random() * 0.7 - 0.35);
    const speed = 4.2 + Math.min(youScore + aiScore, 8) * 0.25;
    state.ballVX = direction * speed * Math.cos(angle);
    state.ballVY = speed * Math.sin(angle);
    if (Math.abs(state.ballVY) < 1.2) state.ballVY = state.ballVY < 0 ? -1.5 : 1.5;
  }

  function resetMatch() {
    youScore = 0;
    aiScore = 0;
    gameOver = false;
    playing = false;
    state.youY = (canvas.height - state.paddleH) / 2;
    state.aiY = (canvas.height - state.paddleH) / 2;
    state.aiSpeed = 3.2;
    resetBall(1);
    message = "Tap Play, then drag to move your paddle";
    syncHud();
    draw();
  }

  function setPaddleFromClientY(clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleY = canvas.height / rect.height;
    const y = (clientY - rect.top) * scaleY - state.paddleH / 2;
    state.youY = Math.max(8, Math.min(canvas.height - state.paddleH - 8, y));
  }

  function drawCourt() {
    const w = canvas.width;
    const h = canvas.height;

    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#045247");
    bg.addColorStop(1, "#01241e");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(239, 183, 93, 0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, w - 12, h - 12);

    ctx.setLineDash([8, 10]);
    ctx.beginPath();
    ctx.moveTo(w / 2, 12);
    ctx.lineTo(w / 2, h - 12);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "rgba(239, 183, 93, 0.55)";
    ctx.font = "700 12px 'Exo 2', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("YOU", 18, 24);
    ctx.textAlign = "right";
    ctx.fillText("STORE AI", w - 18, 24);
  }

  function draw() {
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    drawCourt();

    // paddles
    ctx.fillStyle = "#efb75d";
    ctx.fillRect(16, state.youY, state.paddleW, state.paddleH);
    ctx.fillStyle = "#8ed7e8";
    ctx.fillRect(w - 16 - state.paddleW, state.aiY, state.paddleW, state.paddleH);

    // ball
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(state.ballX, state.ballY, state.ballSize / 2, 0, Math.PI * 2);
    ctx.fill();

    if (!playing && !gameOver) {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#efb75d";
      ctx.font = "800 26px 'Exo 2', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Pong", w / 2, h / 2 - 8);
      ctx.fillStyle = "#eef5f2";
      ctx.font = "600 13px 'IBM Plex Sans', sans-serif";
      ctx.fillText("First to 7 wins", w / 2, h / 2 + 18);
    }

    if (gameOver) {
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#efb75d";
      ctx.font = "800 28px 'Exo 2', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(youScore > aiScore ? "You win!" : "Store AI wins", w / 2, h / 2 - 6);
      ctx.fillStyle = "#eef5f2";
      ctx.font = "600 14px 'IBM Plex Sans', sans-serif";
      ctx.fillText(`${youScore} – ${aiScore}`, w / 2, h / 2 + 22);
    }
  }

  function endGame() {
    playing = false;
    gameOver = true;
    if (youScore > best) {
      best = youScore;
      saveBest();
    }
    message = youScore > aiScore ? "Nice one — Play Again?" : "Tough loss — Play Again?";
    syncHud();
  }

  function scorePoint(scorer) {
    if (scorer === "you") youScore += 1;
    else aiScore += 1;
    state.aiSpeed = 3.2 + (youScore + aiScore) * 0.15;
    syncHud();

    if (youScore >= WIN_SCORE || aiScore >= WIN_SCORE) {
      endGame();
      resetBall(scorer === "you" ? -1 : 1);
      return;
    }

    message = scorer === "you" ? "Point!" : "AI point";
    resetBall(scorer === "you" ? -1 : 1);
  }

  function tick() {
    if (!running) return;

    if (playing && !gameOver) {
      state.ballX += state.ballVX;
      state.ballY += state.ballVY;

      // walls
      if (state.ballY <= 10 || state.ballY >= canvas.height - 10) {
        state.ballVY *= -1;
        state.ballY = Math.max(10, Math.min(canvas.height - 10, state.ballY));
      }

      // player paddle
      if (
        state.ballVX < 0 &&
        state.ballX - state.ballSize / 2 <= 16 + state.paddleW &&
        state.ballX >= 16 &&
        state.ballY >= state.youY &&
        state.ballY <= state.youY + state.paddleH
      ) {
        const hit = (state.ballY - (state.youY + state.paddleH / 2)) / (state.paddleH / 2);
        state.ballVX = Math.abs(state.ballVX) * 1.04;
        state.ballVY = hit * 4.5;
        state.ballX = 16 + state.paddleW + state.ballSize / 2;
      }

      // AI paddle
      if (
        state.ballVX > 0 &&
        state.ballX + state.ballSize / 2 >= canvas.width - 16 - state.paddleW &&
        state.ballX <= canvas.width - 16 &&
        state.ballY >= state.aiY &&
        state.ballY <= state.aiY + state.paddleH
      ) {
        const hit = (state.ballY - (state.aiY + state.paddleH / 2)) / (state.paddleH / 2);
        state.ballVX = -Math.abs(state.ballVX) * 1.04;
        state.ballVY = hit * 4.5;
        state.ballX = canvas.width - 16 - state.paddleW - state.ballSize / 2;
      }

      // AI follow
      if (state.aiY + state.paddleH / 2 < state.ballY - 6) state.aiY += state.aiSpeed;
      else if (state.aiY + state.paddleH / 2 > state.ballY + 6) state.aiY -= state.aiSpeed;
      state.aiY = Math.max(8, Math.min(canvas.height - state.paddleH - 8, state.aiY));
      // slight lag so player can win
      if (Math.random() < 0.02) state.aiY += (Math.random() - 0.5) * 18;

      // score
      if (state.ballX < -20) scorePoint("ai");
      else if (state.ballX > canvas.width + 20) scorePoint("you");
    }

    draw();
    raf = requestAnimationFrame(tick);
  }

  function startPlay() {
    if (gameOver) resetMatch();
    playing = true;
    gameOver = false;
    message = "Drag / slide to move · First to 7";
    syncHud();
  }

  function onPointerMove(event) {
    if (!playing || gameOver) return;
    const point = event.touches ? event.touches[0] : event;
    if (!point) return;
    setPaddleFromClientY(point.clientY);
  }

  function bind() {
    canvas = document.getElementById("pongCanvas");
    youEl = document.getElementById("pongYouScore");
    aiEl = document.getElementById("pongAiScore");
    bestEl = document.getElementById("pongBest");
    statusEl = document.getElementById("pongStatus");
    playBtn = document.getElementById("pongPlayButton");
    if (!canvas) return;

    ctx = canvas.getContext("2d");
    readBest();
    resetMatch();

    canvas.addEventListener("pointerdown", (event) => {
      canvas.setPointerCapture?.(event.pointerId);
      if (!playing) startPlay();
      setPaddleFromClientY(event.clientY);
    });
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("touchmove", (event) => {
      event.preventDefault();
      onPointerMove(event);
    }, { passive: false });

    playBtn?.addEventListener("click", (event) => {
      event.preventDefault();
      startPlay();
    });
  }

  function start() {
    if (!canvas) bind();
    if (!canvas) return;
    if (running) return;
    running = true;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }

  function stop() {
    running = false;
    playing = false;
    cancelAnimationFrame(raf);
  }

  window.Pong = { start, stop, reset: resetMatch, bind };
})();
