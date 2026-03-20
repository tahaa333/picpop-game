const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const upload = document.getElementById("upload");
const uploadScreen = document.getElementById("uploadScreen");
const overlay = document.getElementById("overlay");
const scoreText = document.getElementById("score");
const app = document.querySelector(".app");

let dpr = window.devicePixelRatio || 1;

// 🎮 Game State
let ball = { x: 150, y: 200, r: 20, vx: 0, vy: 0 };
let paddle = { w: 100, h: 12, x: 100, y: 0 };

let img = new Image();
let running = false;
let score = 0;

let baseSpeed = 3.2;
let canBounce = true;

// ✨ Effects
let squash = 1;
let stretch = 1;
let popups = [];

// 📱 Canvas Resize (MOBILE FIXED)
function resizeCanvas() {
  const width = canvas.clientWidth;
  const height = window.innerHeight;

  canvas.style.height = height + "px";

  canvas.width = width * dpr;
  canvas.height = height * dpr;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  paddle.y = height - 60;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// 🔊 Sound
let audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playBounce() {
  if (audioCtx.state === "suspended") return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.frequency.setValueAtTime(650, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + 0.08);
}

// 🎨 Colors
const colors = [
  "#ffe4e6", "#e0f2fe", "#dcfce7",
  "#fef9c3", "#ede9fe", "#fce7f3"
];

// 📸 Upload
upload.addEventListener("change", (e) => {
  const reader = new FileReader();
  reader.onload = () => {
    img.src = reader.result;
    uploadScreen.style.display = "none";
    overlay.style.display = "flex";
  };
  reader.readAsDataURL(e.target.files[0]);
});

// ▶️ Start Game
overlay.addEventListener("click", () => {
  audioCtx.resume();
  overlay.style.display = "none";
  startGame();
});

function startGame() {
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;

  ball.x = width / 2;
  ball.y = height / 2;

  ball.vx = baseSpeed * (Math.random() > 0.5 ? 1 : -1);
  ball.vy = -baseSpeed;

  paddle.w = width * 0.25;
  paddle.y = height - 60;

  score = 0;
  running = true;

  gameLoop();
}

// 🎮 Controls
function movePaddle(clientX) {
  const rect = canvas.getBoundingClientRect();
  paddle.x = clientX - rect.left - paddle.w / 2;
  paddle.x = Math.max(0, Math.min(rect.width - paddle.w, paddle.x));
}

canvas.addEventListener("mousemove", (e) => movePaddle(e.clientX));
canvas.addEventListener("touchmove", (e) => movePaddle(e.touches[0].clientX), { passive: true });

// 🎯 Draw Ball
function drawBall() {
  ctx.save();
  ctx.translate(ball.x, ball.y);
  ctx.scale(stretch, squash);

  ctx.beginPath();
  ctx.arc(0, 0, ball.r, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img, -ball.r, -ball.r, ball.r * 2, ball.r * 2);

  ctx.restore();
}

// 🟪 Rounded Paddle
function drawPaddle() {
  ctx.fillStyle = "#ff758c";

  let r = 10;
  let x = paddle.x, y = paddle.y, w = paddle.w, h = paddle.h;

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.fill();
}

// 💥 Popups
function drawPopups() {
  popups.forEach((p, i) => {
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = "#ff758c";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText("+1", p.x, p.y);

    p.y -= 1.2;
    p.alpha -= 0.03;

    if (p.alpha <= 0) popups.splice(i, 1);
  });
  ctx.globalAlpha = 1;
}

// 🧠 Game Loop
function gameLoop() {
  if (!running) return;

  const width = canvas.width / dpr;
  const height = canvas.height / dpr;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ball.x += ball.vx;
  ball.y += ball.vy;

  // smooth animation reset
  squash += (1 - squash) * 0.2;
  stretch += (1 - stretch) * 0.2;

  // walls
  if (ball.x <= ball.r || ball.x >= width - ball.r) {
    ball.vx *= -1;
    playBounce();
  }

  if (ball.y <= ball.r) {
    ball.vy *= -1;
    playBounce();
  }

  // paddle collision (🔥 FIXED SPEED LOGIC)
  if (
    ball.y + ball.r >= paddle.y &&
    ball.y + ball.r <= paddle.y + paddle.h &&
    ball.x >= paddle.x &&
    ball.x <= paddle.x + paddle.w
  ) {
    if (canBounce) {
      // 🔥 REAL SPEED INCREASE
      let speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      speed += 0.4;

      let angle = Math.atan2(ball.vy, ball.vx);

      ball.vx = Math.cos(angle) * speed;
      ball.vy = -Math.abs(Math.sin(angle) * speed);

      // paddle control
      let hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
      ball.vx += hit * 2;

      score++;
      scoreText.innerText = score;

      playBounce();

      // effects
      squash = 0.7;
      stretch = 1.3;

      app.style.background =
        colors[Math.floor(Math.random() * colors.length)];

      popups.push({ x: ball.x, y: ball.y, alpha: 1 });

      canBounce = false;
      setTimeout(() => (canBounce = true), 100);
    }
  }

  // game over
  if (ball.y > height) {
    running = false;
    overlay.innerText = "Game Over\nTap to Replay";
    overlay.style.display = "flex";
    return;
  }

  drawBall();
  drawPaddle();
  drawPopups();

  requestAnimationFrame(gameLoop);
}
