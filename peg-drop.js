(() => {
  "use strict";

  const BEST_KEY = "pm_pegdrop_best_v1";
  const PEG_H = 18;
  const BASE_W = 150;

  let canvas;
  let ctx;
  let scoreEl;
  let bestEl;
  let statusEl;
  let dropBtn;
  let restartBtn;

  let raf = 0;
  let running = false;
  let gameOver = false;
  let waitingDrop = true;
  let score = 0;
  let best = Number(localStorage.getItem(BEST_KEY) || 0);
  let pegX = 0;
  let pegDir = 1;
  let pegSpeed = 2.4;
  let pegW = BASE_W;
  let stack = [];
  let flash = 0;
  let message = "Tap DROP to place the first peg";

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

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
    if (scoreEl) scoreEl.textContent = String(score);
    if (bestEl) bestEl.textContent = String(best);
    if (statusEl) statusEl.textContent = message;
    if (dropBtn) dropBtn.disabled = false;
    if (restartBtn) restartBtn.classList.toggle("hidden", !gameOver);
  }

  function resetGame() {
    const width = canvas.width;
    const height = canvas.height;
    score = 0;
    gameOver = false;
    waitingDrop = true;
    pegSpeed = 2.6;
    pegW = BASE_W;
    pegX = width * 0.2;
    pegDir = 1;
    flash = 0;
    message = "Tap DROP to place the first peg";
    stack = [{
      x: (width - BASE_W) / 2,
      y: height - 48,
      w: BASE_W,
      perfect: true
    }];
    syncHud();
  }

  function drawMarqueeBay(x, y, w, perfect) {
    ctx.save();
    ctx.fillStyle = perfect ? "#efb75d" : "#c9a05a";
    ctx.strokeStyle = "#17362f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, PEG_H, 5);
    ctx.fill();
    ctx.stroke();

    // peg detail
    ctx.fillStyle = "rgba(23, 54, 47, 0.35)";
    const pegCount = Math.max(2, Math.floor(w / 28));
    for (let i = 0; i < pegCount; i += 1) {
      const px = x + ((i + 0.5) / pegCount) * w;
      ctx.beginPath();
      ctx.arc(px, y + PEG_H / 2, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function draw() {
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // ground / field
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, "#045247");
    sky.addColorStop(1, "#01241e");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    // soft field stripes
    ctx.fillStyle = "rgba(239, 183, 93, 0.05)";
    for (let i = 0; i < 6; i += 1) {
      ctx.fillRect(0, height - 40 - i * 34, width, 10);
    }

    // target guide
    if (!gameOver && waitingDrop && stack.length) {
      const top = stack[stack.length - 1];
      ctx.fillStyle = "rgba(239, 183, 93, 0.14)";
      ctx.fillRect(top.x, 0, top.w, height);
      ctx.strokeStyle = "rgba(239, 183, 93, 0.35)";
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(top.x + 0.5, 8, top.w - 1, height - 16);
      ctx.setLineDash([]);
    }

    stack.forEach((peg) => drawMarqueeBay(peg.x, peg.y, peg.w, peg.perfect));

    if (!gameOver) {
      drawMarqueeBay(pegX, 28, pegW, true);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "600 12px 'IBM Plex Sans', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("▾ drop here", pegX + pegW / 2, 22);
    }

    if (flash > 0) {
      ctx.fillStyle = `rgba(239, 183, 93, ${flash * 0.25})`;
      ctx.fillRect(0, 0, width, height);
      flash -= 0.08;
    }

    if (gameOver) {
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#efb75d";
      ctx.font = "800 28px 'Exo 2', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Bay collapsed", width / 2, height / 2 - 10);
      ctx.fillStyle = "#eef5f2";
      ctx.font = "600 14px 'IBM Plex Sans', sans-serif";
      ctx.fillText(`Score ${score} · Best ${best}`, width / 2, height / 2 + 18);
    }
  }

  function tick() {
    if (!running) return;
    if (!gameOver && waitingDrop) {
      pegX += pegDir * pegSpeed;
      if (pegX <= 8) {
        pegX = 8;
        pegDir = 1;
      } else if (pegX + pegW >= canvas.width - 8) {
        pegX = canvas.width - 8 - pegW;
        pegDir = -1;
      }
    }
    draw();
    raf = requestAnimationFrame(tick);
  }

  function dropPeg() {
    if (!running || gameOver || !waitingDrop || !stack.length) return;

    const top = stack[stack.length - 1];
    const dropLeft = pegX;
    const dropRight = pegX + pegW;
    const topLeft = top.x;
    const topRight = top.x + top.w;

    const overlapLeft = Math.max(dropLeft, topLeft);
    const overlapRight = Math.min(dropRight, topRight);
    const overlap = overlapRight - overlapLeft;

    if (overlap < 18) {
      gameOver = true;
      waitingDrop = false;
      message = "Missed the bay — try again";
      if (score > best) {
        best = score;
        saveBest();
      }
      syncHud();
      return;
    }

    const perfect = Math.abs(dropLeft - topLeft) < 8 && Math.abs(dropRight - topRight) < 8;
    const placed = {
      x: overlapLeft,
      y: top.y - PEG_H - 4,
      w: overlap,
      perfect
    };

    stack.push(placed);
    score += perfect ? 2 : 1;
    flash = 1;
    pegW = clamp(overlap, 42, BASE_W);
    pegSpeed = clamp(pegSpeed + 0.12, 2.4, 6.2);
    pegX = pegDir > 0 ? 10 : canvas.width - pegW - 10;
    waitingDrop = true;
    message = perfect ? "Perfect peg! +2" : "Nice drop +1";

    // keep stack on screen by shifting down if needed
    if (placed.y < 70) {
      const shift = 70 - placed.y;
      stack.forEach((peg) => {
        peg.y += shift;
      });
      // remove pegs that fell below canvas
      stack = stack.filter((peg) => peg.y < canvas.height - 8);
    }

    if (score > best) {
      best = score;
      saveBest();
    }
    syncHud();
  }

  function onPointer(event) {
    event.preventDefault();
    if (gameOver) {
      resetGame();
      return;
    }
    dropPeg();
  }

  function bind() {
    canvas = document.getElementById("pegDropCanvas");
    scoreEl = document.getElementById("pegDropScore");
    bestEl = document.getElementById("pegDropBest");
    statusEl = document.getElementById("pegDropStatus");
    dropBtn = document.getElementById("pegDropButton");
    restartBtn = document.getElementById("pegDropRestart");
    if (!canvas) return;

    ctx = canvas.getContext("2d");
    if (typeof ctx.roundRect !== "function") {
      ctx.roundRect = function roundRect(x, y, w, h, r) {
        const radius = Math.min(r, w / 2, h / 2);
        this.beginPath();
        this.moveTo(x + radius, y);
        this.arcTo(x + w, y, x + w, y + h, radius);
        this.arcTo(x + w, y + h, x, y + h, radius);
        this.arcTo(x, y + h, x, y, radius);
        this.arcTo(x, y, x + w, y, radius);
        this.closePath();
      };
    }

    readBest();
    resetGame();
    syncHud();

    canvas.addEventListener("pointerdown", onPointer);
    dropBtn?.addEventListener("click", (event) => {
      event.preventDefault();
      if (gameOver) resetGame();
      else dropPeg();
    });
    restartBtn?.addEventListener("click", (event) => {
      event.preventDefault();
      resetGame();
    });
  }

  function start() {
    if (!canvas) bind();
    if (!canvas) return;
    if (running) return;
    running = true;
    if (!stack.length) resetGame();
    syncHud();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  window.PegDrop = { start, stop, reset: resetGame, bind };
})();
