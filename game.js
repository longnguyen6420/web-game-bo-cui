// --- Bổ Củi Siêu Tốc (20-Second Chopping Frenzy Engine) ---

// Polyfill roundRect
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    if (typeof r === 'undefined') r = 0;
    if (typeof r === 'number') r = { tl: r, tr: r, br: r, bl: r };
    this.beginPath();
    this.moveTo(x + r.tl, y);
    this.lineTo(x + w - r.tr, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r.tr);
    this.lineTo(x + w, y + h - r.br);
    this.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
    this.lineTo(x + r.bl, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r.bl);
    this.lineTo(x, y + r.tl);
    this.quadraticCurveTo(x, y, x + r.tl, y);
    this.closePath();
    return this;
  };
}

// DOM Elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const hud = document.getElementById('hud');
const timerValEl = document.getElementById('timer-val');
const piecesValEl = document.getElementById('pieces-val');
const cpsValEl = document.getElementById('cps-val');
const feverBar = document.getElementById('fever-bar');
const feverLabel = document.getElementById('fever-label');

const startScreen = document.getElementById('start-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const btnStart = document.getElementById('btn-start');
const btnRestart = document.getElementById('btn-restart');
const btnMenu = document.getElementById('btn-menu');
const btnSound = document.getElementById('btn-sound');
const soundIcon = document.getElementById('sound-icon');

const mobileTapArea = document.getElementById('mobile-tap-area');
const btnChopMobile = document.getElementById('btn-chop-mobile');

const menuHighScoreEl = document.getElementById('menu-high-score');
const finalPiecesEl = document.getElementById('final-pieces');
const finalMaxCpsEl = document.getElementById('final-max-cps');
const finalLogsBrokenEl = document.getElementById('final-logs-broken');
const finalHighScoreEl = document.getElementById('final-high-score');
const newRecordBadge = document.getElementById('new-record-badge');
const rankTitleEl = document.getElementById('rank-title');

// Game States
const STATE = {
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  GAMEOVER: 'GAMEOVER'
};

const GAME_DURATION = 20.0; // 20 seconds

let gameState = STATE.MENU;
let piecesSliced = 0;
let logsBroken = 0;
let highScore = parseInt(localStorage.getItem('bocui_pieces_highscore') || '0', 10);
let activeSkin = localStorage.getItem('bocui_skin') || 'lumberjack';

// Timing & CPS
let timeRemaining = GAME_DURATION;
let gameStartTime = 0;
let lastTickSecond = 20;
let chopTimestamps = [];
let currentCPS = 0;
let maxCPS = 0;

// Fever Mode
let feverEnergy = 0; // 0 to 100
let isFeverActive = false;
let feverDuration = 0;

// Display & Scaling
let viewWidth = 480;
let viewHeight = 800;
let dpr = window.devicePixelRatio || 1;
let shakeIntensity = 0;

// Rotating Log on Table Data
const logEntity = {
  x: 240,
  y: 490,
  width: 140,
  height: 160,
  rotation: 0, // radians
  rotationSpeed: 1.8, // radians per sec
  hitsTaken: 0,
  hitsToBreak: 12,
  tier: 0 // 0: Oak, 1: Birch, 2: Ironwood, 3: Golden Log
};

// Axe Weapon Data
const weapon = {
  baseY: 230,
  y: 230,
  targetY: 230,
  swingProgress: 0, // 0 = idle, 1 = strike
  angle: 0
};

// Particles
let woodPieces = [];
let woodChips = [];
let slashEffects = [];
let floatingTexts = [];

// Sound state update
function updateSoundIcon() {
  soundIcon.textContent = sounds.isMuted() ? '🔇' : '🔊';
}
updateSoundIcon();

btnSound.addEventListener('click', (e) => {
  e.stopPropagation();
  const isMuted = sounds.toggleMute();
  updateSoundIcon();
});

// Resize Canvas
function resizeCanvas() {
  const container = document.getElementById('game-container');
  const rect = container.getBoundingClientRect();
  viewWidth = rect.width || 480;
  viewHeight = rect.height || 800;
  dpr = window.devicePixelRatio || 1;

  canvas.width = Math.floor(viewWidth * dpr);
  canvas.height = Math.floor(viewHeight * dpr);
  canvas.style.width = `${viewWidth}px`;
  canvas.style.height = `${viewHeight}px`;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  logEntity.x = viewWidth / 2;
  logEntity.y = viewHeight * 0.62;
  weapon.baseY = logEntity.y - 200;
  weapon.y = weapon.baseY;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Rank & Medal Evaluation
function calculateRank(pieces) {
  if (pieces >= 180) return '👑 Thần Bổ Củi Thượng Thừa';
  if (pieces >= 130) return '⚡ Vua Chặt Gỗ Siêu Tốc';
  if (pieces >= 90) return '🌲 Thợ Rừng Chuyên Nghiệp';
  if (pieces >= 50) return '🪓 Tay Bổ Củi Nhanh Nhẹn';
  return '🪵 Thợ Đốn Củi Mới Vào Nghề';
}

// Particle Classes
class FlyingWoodPiece {
  constructor(x, y, tier = 0) {
    this.x = x + (Math.random() - 0.5) * 30;
    this.y = y + (Math.random() - 0.5) * 20;
    const angle = (Math.random() > 0.5 ? 1 : -1) * (0.2 + Math.random() * 0.9);
    const speed = 7 + Math.random() * 9;
    this.vx = Math.sin(angle) * speed;
    this.vy = -Math.cos(angle) * speed - 3;
    this.gravity = 0.65;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.4;
    this.w = 20 + Math.random() * 26;
    this.h = 10 + Math.random() * 16;
    this.tier = tier;
    this.opacity = 1;
    this.life = 0;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.rotation += this.rotationSpeed;
    this.life++;
    if (this.life > 28) {
      this.opacity -= 0.04;
    }
  }
  draw() {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.opacity);
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Color by Tier
    if (this.tier === 3) {
      ctx.fillStyle = '#fbbf24'; // Gold
    } else if (this.tier === 2) {
      ctx.fillStyle = '#64748b'; // Ironwood
    } else if (this.tier === 1) {
      ctx.fillStyle = '#fef08a'; // Birch
    } else {
      ctx.fillStyle = '#a16207'; // Oak
    }

    ctx.beginPath();
    ctx.roundRect(-this.w / 2, -this.h / 2, this.w, this.h, 3);
    ctx.fill();

    // Bark rim
    ctx.fillStyle = '#451a03';
    ctx.fillRect(-this.w / 2, -this.h / 2, this.w * 0.25, this.h);

    ctx.restore();
  }
}

class WoodChip {
  constructor(x, y, isFever) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 9;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 2;
    this.size = 3 + Math.random() * 5;
    this.color = isFever ? ['#fbbf24', '#f43f5e', '#ec4899'][Math.floor(Math.random() * 3)] : ['#ca8a04', '#eab308', '#78350f', '#fde047'][Math.floor(Math.random() * 4)];
    this.gravity = 0.45;
    this.life = 0;
    this.maxLife = 20 + Math.random() * 12;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.life++;
  }
  draw() {
    const alpha = 1 - this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.size, this.size);
    ctx.restore();
  }
}

class SlashEffect {
  constructor(x, y, isFever) {
    this.x = x;
    this.y = y;
    this.isFever = isFever;
    this.life = 0;
    this.maxLife = 8;
  }
  update() {
    this.life++;
  }
  draw() {
    const p = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = 1 - p;
    ctx.strokeStyle = this.isFever ? '#fbbf24' : (activeSkin === 'robot' ? '#06b6d4' : (activeSkin === 'ninja' ? '#38bdf8' : '#ffffff'));
    ctx.lineWidth = 6 * (1 - p);
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 12;

    // Sharp slash line down
    ctx.beginPath();
    ctx.moveTo(this.x - 30, this.y - 70);
    ctx.lineTo(this.x + 30, this.y + 70);
    ctx.stroke();

    // Impact ring
    ctx.beginPath();
    ctx.arc(this.x, this.y, 10 + p * 35, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}

class FloatingText {
  constructor(text, x, y, color = '#fbbf24', fontSize = 24) {
    this.text = text;
    this.x = x + (Math.random() - 0.5) * 40;
    this.y = y;
    this.color = color;
    this.fontSize = fontSize;
    this.life = 0;
    this.maxLife = 24;
  }
  update() {
    this.y -= 1.6;
    this.life++;
  }
  draw() {
    const p = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = 1 - p;
    ctx.font = `800 ${this.fontSize}px var(--font-main)`;
    ctx.fillStyle = this.color;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 6;
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

// Start Game
function startGame() {
  sounds.playClick();
  piecesSliced = 0;
  logsBroken = 0;
  timeRemaining = GAME_DURATION;
  gameStartTime = performance.now();
  lastTickSecond = 20;
  chopTimestamps = [];
  currentCPS = 0;
  maxCPS = 0;
  feverEnergy = 0;
  isFeverActive = false;
  feverDuration = 0;

  logEntity.hitsTaken = 0;
  logEntity.tier = 0;
  logEntity.rotation = 0;

  woodPieces = [];
  woodChips = [];
  slashEffects = [];
  floatingTexts = [];

  gameState = STATE.PLAYING;
  startScreen.classList.add('hidden');
  gameoverScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  mobileTapArea.classList.remove('hidden');

  updateHUD();
}

// Update HUD Display
function updateHUD() {
  timerValEl.textContent = `${Math.max(0, timeRemaining).toFixed(2)}s`;

  timerValEl.classList.remove('warning', 'danger');
  if (timeRemaining <= 5) {
    timerValEl.classList.add('danger');
  } else if (timeRemaining <= 10) {
    timerValEl.classList.add('warning');
  }

  piecesValEl.textContent = piecesSliced;
  cpsValEl.textContent = currentCPS.toFixed(1);

  // Fever Bar
  const fillPct = isFeverActive ? (feverDuration / 3.5) * 100 : feverEnergy;
  feverBar.style.width = `${Math.min(100, Math.max(0, fillPct))}%`;

  if (isFeverActive) {
    feverBar.classList.add('active');
    feverLabel.classList.add('active');
    feverLabel.textContent = '🔥 CUỒNG NỘ x2 MẢNH! 🔥';
  } else {
    feverBar.classList.remove('active');
    feverLabel.classList.remove('active');
    feverLabel.textContent = '⚡ CUỒNG NỘ (FEVER)';
  }
}

// Core Chop Action (Bổ Củi)
function chop() {
  if (gameState === STATE.MENU) {
    startGame();
    return;
  }
  if (gameState !== STATE.PLAYING) return;

  const now = performance.now();
  chopTimestamps.push(now);

  // Filter last 1 second for CPS
  chopTimestamps = chopTimestamps.filter(t => now - t <= 1000);
  currentCPS = chopTimestamps.length;
  if (currentCPS > maxCPS) maxCPS = currentCPS;

  // Fever Energy Accumulation
  if (!isFeverActive) {
    feverEnergy += 7.5;
    if (feverEnergy >= 100) {
      isFeverActive = true;
      feverDuration = 3.5; // 3.5 seconds fever
      sounds.playFeverStart();
      floatingTexts.push(new FloatingText('🔥 FEVER x2! 🔥', logEntity.x, logEntity.y - 100, '#f43f5e', 30));
    }
  }

  // Slices gained
  const slicesGained = isFeverActive ? 2 : 1;
  piecesSliced += slicesGained;
  logEntity.hitsTaken += slicesGained;

  // Sound & Weapon Strike Animation
  sounds.playChop(isFeverActive, currentCPS);
  weapon.swingProgress = 1.0;
  shakeIntensity = isFeverActive ? 8 : 4.5;

  // Particles
  for (let i = 0; i < (isFeverActive ? 4 : 2); i++) {
    woodPieces.push(new FlyingWoodPiece(logEntity.x, logEntity.y, logEntity.tier));
  }
  for (let i = 0; i < 10; i++) {
    woodChips.push(new WoodChip(logEntity.x, logEntity.y, isFeverActive));
  }
  slashEffects.push(new SlashEffect(logEntity.x, logEntity.y, isFeverActive));

  // Floating text
  if (isFeverActive) {
    floatingTexts.push(new FloatingText(`+${slicesGained} 🔥`, logEntity.x, logEntity.y - 50, '#f43f5e', 24));
  } else if (currentCPS >= 8) {
    floatingTexts.push(new FloatingText(`+${slicesGained} ⚡`, logEntity.x, logEntity.y - 40, '#38bdf8', 20));
  }

  // Check if Log is completely shattered -> Advance Log Tier!
  if (logEntity.hitsTaken >= logEntity.hitsToBreak) {
    logsBroken++;
    sounds.playLogShatter();
    floatingTexts.push(new FloatingText('💥 NỨT TOÁC! +5', logEntity.x, logEntity.y - 80, '#fbbf24', 28));
    piecesSliced += 5;

    // Burst particles
    for (let i = 0; i < 10; i++) {
      woodPieces.push(new FlyingWoodPiece(logEntity.x, logEntity.y, logEntity.tier));
    }
    shakeIntensity = 12;

    // Reset log and cycle tier
    logEntity.hitsTaken = 0;
    logEntity.tier = (logEntity.tier + 1) % 4;
  }

  updateHUD();
}

// Game Over (Hết 20s)
function gameOver() {
  gameState = STATE.GAMEOVER;
  shakeIntensity = 10;
  sounds.playTimeUp();

  const isNewRecord = piecesSliced > highScore;
  if (isNewRecord) {
    highScore = piecesSliced;
    localStorage.setItem('bocui_pieces_highscore', highScore);
    setTimeout(() => {
      sounds.playNewRecord();
    }, 450);
  }

  finalPiecesEl.textContent = piecesSliced;
  finalMaxCpsEl.textContent = `${maxCPS.toFixed(1)} CPS`;
  finalLogsBrokenEl.textContent = logsBroken;
  finalHighScoreEl.textContent = highScore;
  rankTitleEl.textContent = calculateRank(piecesSliced);

  if (isNewRecord && piecesSliced > 0) {
    newRecordBadge.classList.remove('hidden');
  } else {
    newRecordBadge.classList.add('hidden');
  }

  hud.classList.add('hidden');
  mobileTapArea.classList.add('hidden');
  gameoverScreen.classList.remove('hidden');
}

// Show Menu
function showMainMenu() {
  sounds.playClick();
  gameState = STATE.MENU;
  menuHighScoreEl.textContent = highScore;
  gameoverScreen.classList.add('hidden');
  hud.classList.add('hidden');
  mobileTapArea.classList.add('hidden');
  startScreen.classList.remove('hidden');
}

// Skin Selection
const skinButtons = document.querySelectorAll('.skin-btn');
skinButtons.forEach(btn => {
  if (btn.dataset.skin === activeSkin) {
    btn.classList.add('active');
  } else {
    btn.classList.remove('active');
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    sounds.playClick();
    activeSkin = btn.dataset.skin;
    localStorage.setItem('bocui_skin', activeSkin);
    skinButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// Event Listeners
btnStart.addEventListener('click', startGame);
btnRestart.addEventListener('click', startGame);
btnMenu.addEventListener('click', showMainMenu);

// Mobile Button
btnChopMobile.addEventListener('touchstart', (e) => {
  e.preventDefault();
  btnChopMobile.classList.add('active');
  chop();
});
btnChopMobile.addEventListener('touchend', () => btnChopMobile.classList.remove('active'));
btnChopMobile.addEventListener('mousedown', (e) => {
  e.preventDefault();
  chop();
});

// Canvas Click / Tap Anywhere
canvas.addEventListener('pointerdown', (e) => {
  chop();
});

// Keyboard Controls
window.addEventListener('keydown', (e) => {
  if (gameState === STATE.PLAYING) {
    if (['Space', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'KeyJ', 'KeyK', 'KeyL'].includes(e.code)) {
      e.preventDefault();
      chop();
    }
  } else if (gameState === STATE.MENU || gameState === STATE.GAMEOVER) {
    if (e.code === 'Space' || e.code === 'Enter') {
      startGame();
    }
  }
});

// --- Rendering Functions ---

// Draw Workshop Background & Chopping Stump
function drawScene() {
  // Background Woodshop Gradient
  const bgGrad = ctx.createRadialGradient(viewWidth / 2, viewHeight * 0.4, 40, viewWidth / 2, viewHeight * 0.5, viewWidth);
  bgGrad.addColorStop(0, '#331800');
  bgGrad.addColorStop(0.6, '#1a0c02');
  bgGrad.addColorStop(1, '#090401');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, viewWidth, viewHeight);

  // Background Wood Planks
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 2;
  for (let y = 40; y < viewHeight; y += 70) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(viewWidth, y);
    ctx.stroke();
  }

  // Floor
  const floorGrad = ctx.createLinearGradient(0, viewHeight * 0.65, 0, viewHeight);
  floorGrad.addColorStop(0, '#261204');
  floorGrad.addColorStop(1, '#0f0500');
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, viewHeight * 0.65, viewWidth, viewHeight * 0.35);

  // Chopping Block (Thớt Gỗ Lớn)
  const blockX = logEntity.x;
  const blockY = logEntity.y + logEntity.height / 2 + 30;
  const blockRadiusX = 140;
  const blockRadiusY = 45;
  const blockHeight = 90;

  // Block Body (Cylinder)
  const blockBodyGrad = ctx.createLinearGradient(blockX - blockRadiusX, 0, blockX + blockRadiusX, 0);
  blockBodyGrad.addColorStop(0, '#451a03');
  blockBodyGrad.addColorStop(0.3, '#78350f');
  blockBodyGrad.addColorStop(0.7, '#78350f');
  blockBodyGrad.addColorStop(1, '#451a03');

  ctx.fillStyle = blockBodyGrad;
  ctx.beginPath();
  ctx.rect(blockX - blockRadiusX, blockY, blockRadiusX * 2, blockHeight);
  ctx.fill();

  // Iron Metal Band on Stump
  ctx.fillStyle = '#475569';
  ctx.fillRect(blockX - blockRadiusX, blockY + 30, blockRadiusX * 2, 14);
  ctx.fillStyle = '#94a3b8';
  for (let rx = blockX - blockRadiusX + 20; rx < blockX + blockRadiusX; rx += 40) {
    ctx.beginPath();
    ctx.arc(rx, blockY + 37, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Block Top Ellipse (Tree Rings on Top)
  ctx.fillStyle = '#854d0e';
  ctx.beginPath();
  ctx.ellipse(blockX, blockY, blockRadiusX, blockRadiusY, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#a16207';
  ctx.beginPath();
  ctx.ellipse(blockX, blockY, blockRadiusX * 0.8, blockRadiusY * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ca8a04';
  ctx.beginPath();
  ctx.ellipse(blockX, blockY, blockRadiusX * 0.55, blockRadiusY * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Draw the Rotating Wood Log on Table
function drawRotatingLog() {
  ctx.save();
  const { x, y, width, height, rotation, hitsTaken, hitsToBreak, tier } = logEntity;
  const halfW = width / 2;
  const halfH = height / 2;

  // Log Base Shadow on table
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(x, y + halfH + 10, halfW * 0.9, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  // Color Palette by Tier
  let barkColors = ['#5b2609', '#854d0e', '#a16207'];
  let topColor = '#fef08a';
  if (tier === 3) {
    barkColors = ['#b45309', '#f59e0b', '#fbbf24']; // Gold
    topColor = '#fffbeb';
  } else if (tier === 2) {
    barkColors = ['#334155', '#475569', '#64748b']; // Ironwood
    topColor = '#cbd5e1';
  } else if (tier === 1) {
    barkColors = ['#713f12', '#ca8a04', '#fef08a']; // Birch
    topColor = '#ffffff';
  }

  // Cylindrical Log Body with 3D perspective shading based on rotation
  const rotPhase = Math.sin(rotation);
  const logGrad = ctx.createLinearGradient(x - halfW, 0, x + halfW, 0);
  logGrad.addColorStop(0, barkColors[0]);
  logGrad.addColorStop(0.3 + rotPhase * 0.15, barkColors[1]);
  logGrad.addColorStop(0.6 + rotPhase * 0.15, barkColors[2]);
  logGrad.addColorStop(1, barkColors[0]);

  ctx.fillStyle = logGrad;
  ctx.beginPath();
  ctx.roundRect(x - halfW, y - halfH, width, height, 12);
  ctx.fill();

  // Vertical Bark Grain moving with rotation
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = 3;
  for (let i = -2; i <= 2; i++) {
    const grainX = x + Math.sin(rotation + i * 0.8) * (halfW * 0.8);
    ctx.beginPath();
    ctx.moveTo(grainX, y - halfH + 10);
    ctx.lineTo(grainX + Math.cos(rotation) * 4, y + halfH - 10);
    ctx.stroke();
  }

  // Top Cut Surface (Ellipse)
  ctx.fillStyle = topColor;
  ctx.beginPath();
  ctx.ellipse(x, y - halfH, halfW - 4, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Top Growth Rings
  ctx.strokeStyle = 'rgba(120, 53, 15, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y - halfH, halfW * 0.6, 11, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x, y - halfH, halfW * 0.3, 5, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Cracks & Damage Notches according to hitsTaken
  if (hitsTaken > 0) {
    const damageRatio = hitsTaken / hitsToBreak;
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(x, y - halfH);
    ctx.lineTo(x - 15 * damageRatio, y - halfH + 30 * damageRatio);
    ctx.lineTo(x + 10 * damageRatio, y - halfH + 65 * damageRatio);
    ctx.lineTo(x - 5 * damageRatio, y + halfH * damageRatio);
    ctx.stroke();
  }

  ctx.restore();
}

// Draw the Striking Weapon (Axe / Katana / Laser)
function drawWeapon() {
  ctx.save();
  const swing = weapon.swingProgress;
  const targetX = logEntity.x;
  const targetY = logEntity.y - logEntity.height / 2 - 10 + swing * 40;

  ctx.translate(targetX, targetY);

  if (activeSkin === 'ninja') {
    // Katana Blade
    ctx.rotate(Math.PI * 0.25 - swing * 0.5);
    ctx.fillStyle = '#18181b';
    ctx.fillRect(-6, -80, 12, 35); // Hilt
    ctx.fillStyle = '#f8fafc';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = swing > 0 ? 16 : 4;
    ctx.beginPath();
    ctx.moveTo(-4, -45);
    ctx.lineTo(4, -45);
    ctx.lineTo(2, 60);
    ctx.lineTo(-2, 60);
    ctx.closePath();
    ctx.fill();
  } else if (activeSkin === 'knight') {
    // Heavy Battle Axe
    ctx.rotate(-Math.PI * 0.15 + swing * 0.3);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-6, -110, 12, 140); // Handle
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    // Left Blade
    ctx.moveTo(-6, -95);
    ctx.lineTo(-45, -115);
    ctx.lineTo(-45, -65);
    ctx.lineTo(-6, -75);
    // Right Blade
    ctx.moveTo(6, -95);
    ctx.lineTo(45, -115);
    ctx.lineTo(45, -65);
    ctx.lineTo(6, -75);
    ctx.fill();
  } else if (activeSkin === 'robot') {
    // Laser Plasma Axe
    ctx.rotate(-Math.PI * 0.15 + swing * 0.3);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-5, -100, 10, 130);
    ctx.fillStyle = '#06b6d4';
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(5, -90);
    ctx.lineTo(45, -105);
    ctx.lineTo(40, -60);
    ctx.lineTo(5, -70);
    ctx.closePath();
    ctx.fill();
  } else {
    // Classic Lumberjack Axe
    ctx.rotate(-Math.PI * 0.15 + swing * 0.35);
    ctx.fillStyle = '#92400e';
    ctx.fillRect(-6, -110, 12, 140); // Hickory Handle
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(6, -100);
    ctx.lineTo(46, -115);
    ctx.lineTo(46, -65);
    ctx.lineTo(6, -75);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(46, -115);
    ctx.lineTo(46, -65);
    ctx.stroke();
  }

  ctx.restore();
}

// Main Game Update & Render Loop
let lastFrameTime = performance.now();

function update(dt) {
  // Update Rotating Log
  logEntity.rotation += logEntity.rotationSpeed * dt;

  // Weapon swing recovery
  if (weapon.swingProgress > 0) {
    weapon.swingProgress = Math.max(0, weapon.swingProgress - dt * 8);
  }

  // Screen Shake decay
  if (shakeIntensity > 0) {
    shakeIntensity = Math.max(0, shakeIntensity - dt * 25);
  }

  // Update Particles
  for (let i = woodPieces.length - 1; i >= 0; i--) {
    woodPieces[i].update();
    if (woodPieces[i].opacity <= 0 || woodPieces[i].y > viewHeight + 80) {
      woodPieces.splice(i, 1);
    }
  }

  for (let i = woodChips.length - 1; i >= 0; i--) {
    woodChips[i].update();
    if (woodChips[i].life >= woodChips[i].maxLife) {
      woodChips.splice(i, 1);
    }
  }

  for (let i = slashEffects.length - 1; i >= 0; i--) {
    slashEffects[i].update();
    if (slashEffects[i].life >= slashEffects[i].maxLife) {
      slashEffects.splice(i, 1);
    }
  }

  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    floatingTexts[i].update();
    if (floatingTexts[i].life >= floatingTexts[i].maxLife) {
      floatingTexts.splice(i, 1);
    }
  }

  // Game Logic during PLAYING
  if (gameState === STATE.PLAYING) {
    const now = performance.now();
    const elapsed = (now - gameStartTime) / 1000;
    timeRemaining = Math.max(0, GAME_DURATION - elapsed);

    // Countdown tick sounds in last 5 seconds
    const currentSecFloor = Math.ceil(timeRemaining);
    if (currentSecFloor <= 5 && currentSecFloor > 0 && currentSecFloor < lastTickSecond) {
      lastTickSecond = currentSecFloor;
      sounds.playTick(currentSecFloor === 1 ? 1200 : 880);
    }

    // Fever Duration Drain
    if (isFeverActive) {
      feverDuration -= dt;
      if (feverDuration <= 0) {
        isFeverActive = false;
        feverEnergy = 0;
      }
    } else {
      // Natural slow decay of fever energy if not chopping
      feverEnergy = Math.max(0, feverEnergy - dt * 10);
    }

    // Update CPS
    chopTimestamps = chopTimestamps.filter(t => now - t <= 1000);
    currentCPS = chopTimestamps.length;

    updateHUD();

    // Check Time Up!
    if (timeRemaining <= 0) {
      timeRemaining = 0;
      gameOver();
    }
  }
}

function render() {
  ctx.save();

  if (shakeIntensity > 0) {
    const offsetX = (Math.random() - 0.5) * shakeIntensity;
    const offsetY = (Math.random() - 0.5) * shakeIntensity;
    ctx.translate(offsetX, offsetY);
  }

  // 1. Scene & Chopping Block
  drawScene();

  // 2. Rotating Log
  drawRotatingLog();

  // 3. Slicing Particles & Chips
  woodPieces.forEach(p => p.draw());
  woodChips.forEach(c => c.draw());

  // 4. Weapon
  drawWeapon();

  // 5. Slash Arc & Floating Texts
  slashEffects.forEach(s => s.draw());
  floatingTexts.forEach(t => t.draw());

  ctx.restore();
}

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastFrameTime) / 1000, 0.1);
  lastFrameTime = timestamp;

  update(dt);
  render();

  requestAnimationFrame(gameLoop);
}

// Initial setup
menuHighScoreEl.textContent = highScore;
requestAnimationFrame(gameLoop);
