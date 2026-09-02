(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const scoreEl = document.getElementById("score");
  const levelEl = document.getElementById("level");
  const livesEl = document.getElementById("lives");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayText = document.getElementById("overlay-text");
  const startBtn = document.getElementById("start-btn");

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;

  const BRICK_ROWS = 5;
  const BRICK_COLS = 8;
  const BRICK_PADDING = 6;
  const BRICK_TOP = 60;
  const BRICK_SIDE = 20;
  const BRICK_HEIGHT = 20;
  const BRICK_WIDTH =
    (WIDTH - BRICK_SIDE * 2 - BRICK_PADDING * (BRICK_COLS - 1)) / BRICK_COLS;

  const ROW_COLORS = ["#f87171", "#fb923c", "#facc15", "#4ade80", "#60a5fa"];

  const PADDLE_WIDTH = 90;
  const PADDLE_HEIGHT = 12;
  const PADDLE_Y = HEIGHT - 30;
  const BASE_BALL_SPEED = 4.5;

  let paddle, ball, bricks, score, lives, level, running, paused, gameOver;
  let leftPressed = false;
  let rightPressed = false;
  let animationId = null;

  function createBricks() {
    const list = [];
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        list.push({
          x: BRICK_SIDE + c * (BRICK_WIDTH + BRICK_PADDING),
          y: BRICK_TOP + r * (BRICK_HEIGHT + BRICK_PADDING),
          w: BRICK_WIDTH,
          h: BRICK_HEIGHT,
          color: ROW_COLORS[r % ROW_COLORS.length],
          alive: true,
        });
      }
    }
    return list;
  }

  function resetBall(speedMultiplier) {
    const angle = (Math.random() * 0.5 + 0.25) * Math.PI; // between 45 and 135 deg
    const speed = BASE_BALL_SPEED * speedMultiplier;
    return {
      x: WIDTH / 2,
      y: PADDLE_Y - 20,
      r: 7,
      dx: speed * Math.cos(angle) * (Math.random() < 0.5 ? 1 : -1),
      dy: -Math.abs(speed * Math.sin(angle)),
    };
  }

  function initGame(nextLevel = 1, keepScore = 0, keepLives = 3) {
    level = nextLevel;
    score = keepScore;
    lives = keepLives;
    paddle = { x: WIDTH / 2 - PADDLE_WIDTH / 2, w: PADDLE_WIDTH, h: PADDLE_HEIGHT };
    bricks = createBricks();
    ball = resetBall(1 + (level - 1) * 0.15);
    updateHud();
  }

  function updateHud() {
    scoreEl.textContent = score;
    levelEl.textContent = level;
    livesEl.textContent = lives;
  }

  function showOverlay(title, text, btnLabel) {
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    startBtn.textContent = btnLabel;
    overlay.hidden = false;
  }

  function hideOverlay() {
    overlay.hidden = true;
  }

  function drawPaddle() {
    const grad = ctx.createLinearGradient(paddle.x, 0, paddle.x + paddle.w, 0);
    grad.addColorStop(0, "#7dd3fc");
    grad.addColorStop(1, "#6366f1");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(paddle.x, PADDLE_Y, paddle.w, paddle.h, 6);
    ctx.fill();
  }

  function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fillStyle = "#f8fafc";
    ctx.shadowColor = "#f8fafc";
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function drawBricks() {
    for (const b of bricks) {
      if (!b.alive) continue;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.w, b.h, 4);
      ctx.fill();
    }
  }

  function clear() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
  }

  function movePaddle() {
    const speed = 7;
    if (leftPressed) paddle.x -= speed;
    if (rightPressed) paddle.x += speed;
    paddle.x = Math.max(0, Math.min(WIDTH - paddle.w, paddle.x));
  }

  function moveBall() {
    ball.x += ball.dx;
    ball.y += ball.dy;

    if (ball.x - ball.r < 0) {
      ball.x = ball.r;
      ball.dx *= -1;
    } else if (ball.x + ball.r > WIDTH) {
      ball.x = WIDTH - ball.r;
      ball.dx *= -1;
    }

    if (ball.y - ball.r < 0) {
      ball.y = ball.r;
      ball.dy *= -1;
    }

    // paddle collision
    if (
      ball.y + ball.r >= PADDLE_Y &&
      ball.y + ball.r <= PADDLE_Y + paddle.h + 6 &&
      ball.x >= paddle.x &&
      ball.x <= paddle.x + paddle.w &&
      ball.dy > 0
    ) {
      const hitPos = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
      const speed = Math.hypot(ball.dx, ball.dy);
      const angle = hitPos * (Math.PI / 3); // max 60deg
      ball.dx = speed * Math.sin(angle);
      ball.dy = -Math.abs(speed * Math.cos(angle));
      ball.y = PADDLE_Y - ball.r;
    }

    // brick collision
    for (const b of bricks) {
      if (!b.alive) continue;
      if (
        ball.x + ball.r > b.x &&
        ball.x - ball.r < b.x + b.w &&
        ball.y + ball.r > b.y &&
        ball.y - ball.r < b.y + b.h
      ) {
        b.alive = false;
        score += 10;
        updateHud();

        const overlapLeft = ball.x + ball.r - b.x;
        const overlapRight = b.x + b.w - (ball.x - ball.r);
        const overlapTop = ball.y + ball.r - b.y;
        const overlapBottom = b.y + b.h - (ball.y - ball.r);
        const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

        if (minOverlap === overlapTop || minOverlap === overlapBottom) {
          ball.dy *= -1;
        } else {
          ball.dx *= -1;
        }
        break;
      }
    }

    // ball fell below paddle
    if (ball.y - ball.r > HEIGHT) {
      lives -= 1;
      updateHud();
      if (lives <= 0) {
        endGame(false);
        return;
      }
      ball = resetBall(1 + (level - 1) * 0.15);
      paddle.x = WIDTH / 2 - paddle.w / 2;
    }

    // level cleared
    if (bricks.every((b) => !b.alive)) {
      nextLevel();
    }
  }

  function nextLevel() {
    running = false;
    cancelAnimationFrame(animationId);
    const clearedLevel = level;
    initGame(level + 1, score, lives);
    showOverlay(
      `レベル ${clearedLevel} クリア!`,
      `スコア: ${score} — 次のレベルに挑戦しよう`,
      "次のレベルへ"
    );
  }

  function endGame(won) {
    running = false;
    gameOver = true;
    cancelAnimationFrame(animationId);
    showOverlay(
      won ? "クリア!" : "ゲームオーバー",
      `スコア: ${score}`,
      "もう一度プレイ"
    );
  }

  function loop() {
    if (!running || paused) return;
    clear();
    movePaddle();
    moveBall();
    drawBricks();
    drawPaddle();
    drawBall();
    if (running) {
      animationId = requestAnimationFrame(loop);
    }
  }

  function togglePause() {
    if (!running) return;
    paused = !paused;
    if (paused) {
      ctx.fillStyle = "rgba(5,6,20,0.6)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = "#eef1ff";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("一時停止中 (Space で再開)", WIDTH / 2, HEIGHT / 2);
    } else {
      animationId = requestAnimationFrame(loop);
    }
  }

  function startGame() {
    if (gameOver || !bricksAlive()) {
      initGame(gameOver ? 1 : level, gameOver ? 0 : score, gameOver ? 3 : lives);
    }
    gameOver = false;
    running = true;
    paused = false;
    hideOverlay();
    cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(loop);
  }

  function bricksAlive() {
    return bricks && bricks.some((b) => b.alive);
  }

  // input handling
  document.addEventListener("keydown", (e) => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") leftPressed = true;
    if (e.code === "ArrowRight" || e.code === "KeyD") rightPressed = true;
    if (e.code === "Space") {
      e.preventDefault();
      if (overlay.hidden) togglePause();
    }
  });

  document.addEventListener("keyup", (e) => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") leftPressed = false;
    if (e.code === "ArrowRight" || e.code === "KeyD") rightPressed = false;
  });

  function pointerToPaddleX(clientX) {
    const rect = canvas.getBoundingClientRect();
    const scale = WIDTH / rect.width;
    return (clientX - rect.left) * scale;
  }

  canvas.addEventListener("mousemove", (e) => {
    if (!running || paused) return;
    const x = pointerToPaddleX(e.clientX);
    paddle.x = Math.max(0, Math.min(WIDTH - paddle.w, x - paddle.w / 2));
  });

  function handleTouch(e) {
    if (!running || paused) return;
    e.preventDefault();
    const x = pointerToPaddleX(e.touches[0].clientX);
    paddle.x = Math.max(0, Math.min(WIDTH - paddle.w, x - paddle.w / 2));
  }

  canvas.addEventListener("touchstart", handleTouch, { passive: false });
  canvas.addEventListener("touchmove", handleTouch, { passive: false });

  startBtn.addEventListener("click", startGame);

  // initial state
  initGame();
  showOverlay(
    "ブロック崩し",
    "矢印キー / A・D / マウス / タッチでパドルを操作しよう",
    "スタート"
  );
})();
