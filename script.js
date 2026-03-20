const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const upload = document.getElementById("upload");
const uploadScreen = document.getElementById("uploadScreen");
const overlay = document.getElementById("overlay");
const scoreText = document.getElementById("score");
const app = document.querySelector(".app");

let dpr = window.devicePixelRatio || 1;

// 📱 Responsive Canvas
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// 🔊 Sound FIXED
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

// 🎨 Soft aesthetic colors
const colors = [
  "#ffe4e6", "#e0f2fe", "#dcfce7",
  "#fef9c3", "#ede9fe", "#fce7f3"
];

// 🎮 Game state
let ball = { x: 150, y: 200, r: 20, vx: 0, vy: 0 };
let paddle = { w: 100, h: 12, x: 100, y: 0 };

let img = new Image();
let running = false;
let score = 0;

let baseSpeed = 2.5;
let speedMultiplier = 1;
let canBounce = true;

// ✨ Animation states
let squash = 1;
let stretch = 1;
let popups = [];

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

// ▶️ Start
overlay.addEventListener("click", () => {
  audioCtx.resume();
  overlay.style.display = "none";
  startGame();
});

function startGame() {
  ball.x = canvas.width / (2 * dpr);
  ball.y = canvas.height / (2 * dpr);

  ball.vx = baseSpeed * (Math.random() > 0.5 ? 1 : -1);
  ball.vy = -baseSpeed;

  paddle.w = canvas.width / (4 * dpr);
  paddle.y = canvas.height / dpr - 30;

  score = 0;
  speedMultiplier = 1;
  running = true;

  gameLoop();
}

// 🎮 Controls
function movePaddle(x) {
  const rect = canvas.getBoundingClientRect();
  paddle.x = x - rect.left - paddle.w / 2;
  paddle.x = Math.max(0, Math.min(rect.width - paddle.w, paddle.x));
}

canvas.addEventListener("mousemove", (e) => movePaddle(e.clientX));
canvas.addEventListener("touchmove", (e) => movePaddle(e.touches[0].clientX), { passive: true });

// 🎯 Draw Ball with squash/stretch
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

  let radius = 10;
  let x = paddle.x;
  let y = paddle.y;
  let w = paddle.w;
  let h = paddle.h;

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.fill();
}

// 💥 Score popups
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

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ball.x += ball.vx;
  ball.y += ball.vy;

  const maxX = canvas.width / dpr;
  const maxY = canvas.height / dpr;

  // Smooth animation reset
  squash += (1 - squash) * 0.2;
  stretch += (1 - stretch) * 0.2;

  // Walls
  if (ball.x <= ball.r || ball.x >= maxX - ball.r) {
    ball.vx *= -1;
    playBounce();
  }

  if (ball.y <= ball.r) {
    ball.vy *= -1;
    playBounce();
  }

  // Paddle hit
  if (
    ball.y + ball.r >= paddle.y &&
    ball.y + ball.r <= paddle.y + paddle.h &&
    ball.x >= paddle.x &&
    ball.x <= paddle.x + paddle.w
  ) {
    if (canBounce) {
      ball.vy = -Math.abs(ball.vy);

      let hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
      ball.vx = hit * (baseSpeed + speedMultiplier);

      score++;
      scoreText.innerText = score;

      playBounce();

      // 💥 squash effect
      squash = 0.7;
      stretch = 1.3;

      // 🎨 background change
      app.style.background = colors[Math.floor(Math.random() * colors.length)];

      // 💥 popup
      popups.push({ x: ball.x, y: ball.y, alpha: 1 });

      // 📈 difficulty
      speedMultiplier += 0.12;

      canBounce = false;
      setTimeout(() => (canBounce = true), 100);
    }
  }

  // Game Over
  if (ball.y > maxY) {
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