// --- Bổ Củi Siêu Tốc - Core Game Engine ---

// Polyfill roundRect for maximum browser compatibility
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
const timeBar = document.getElementById('time-bar');
const currentScoreEl = document.getElementById('current-score');
const comboBadge = document.getElementById('combo-badge');
const comboNumEl = document.getElementById('combo-num');

const startScreen = document.getElementById('start-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const btnStart = document.getElementById('btn-start');
const btnRestart = document.getElementById('btn-restart');
const btnMenu = document.getElementById('btn-menu');
const btnSound = document.getElementById('btn-sound');
const soundIcon = document.getElementById('sound-icon');

const touchControls = document.getElementById('touch-controls');
const touchLeft = document.getElementById('touch-left');
const touchRight = document.getElementById('touch-right');

const menuHighScoreEl = document.getElementById('menu-high-score');
const finalScoreEl = document.getElementById('final-score');
const finalMaxComboEl = document.getElementById('final-max-combo');
const finalHighScoreEl = document.getElementById('final-high-score');
const newRecordBadge = document.getElementById('new-record-badge');
const rankTitleEl = document.getElementById('rank-title');
const gameoverReasonEl = document.getElementById('gameover-reason');

// Game States
const STATE = {
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  GAMEOVER: 'GAMEOVER'
};

let gameState = STATE.MENU;
let score = 0;
let highScore = parseInt(localStorage.getItem('bocui_highscore') || '0', 10);
let combo = 0;
let maxCombo = 0;
let lastChopTime = 0;
let timeLeft = 100; // 0 to 100%
let activeSkin = localStorage.getItem('bocui_skin') || 'lumberjack';

// Display and Scaling
let viewWidth = 480;
let viewHeight = 800;
let dpr = window.devicePixelRatio || 1;

// Screen Shake
let shakeIntensity = 0;

// Dimensions & Positions
const TRUNK_WIDTH = 96;
const TRUNK_HEIGHT = 74;
let trunkBaseX = 240;
let trunkBaseY = 640;

// Tree Branches Data
const BRANCH = {
  NONE: 'NONE',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT'
};

let treeSegments = [];
const TOTAL_SEGMENTS = 9;

// Player Data
const player = {
  side: 'LEFT', // 'LEFT' or 'RIGHT'
  state: 'IDLE', // 'IDLE', 'CHOPPING', 'DEAD'
  chopProgress: 0,
  idleTime: 0
};

// Particles and Effects
let flyingLogs = [];
let woodChips = [];
let slashArcs = [];
let floatingTexts = [];
let floatingLeaves = [];
let clouds = [];

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

// Setup High-DPI Canvas
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

  trunkBaseX = viewWidth / 2;
  trunkBaseY = viewHeight - 140;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Initialize Environment (Clouds & Leaves)
function initEnvironment() {
  clouds = [
    { x: 30, y: 80, speed: 0.15, scale: 0.8 },
    { x: 220, y: 140, speed: 0.22, scale: 1.1 },
    { x: 380, y: 60, speed: 0.12, scale: 0.7 }
  ];

  floatingLeaves = [];
  for (let i = 0; i < 14; i++) {
    floatingLeaves.push({
      x: Math.random() * viewWidth,
      y: Math.random() * viewHeight,
      size: 5 + Math.random() * 5,
      speedY: 0.4 + Math.random() * 0.7,
      swaySpeed: 0.02 + Math.random() * 0.02,
      swayOffset: Math.random() * Math.PI * 2,
      color: Math.random() > 0.4 ? '#22c55e' : '#84cc16'
    });
  }
}
initEnvironment();

// Rank & Medal Calculation
function calculateRank(s) {
  if (s >= 200) return '👑 Thánh Bổ Củi Vô Địch';
  if (s >= 100) return '⚡ Cao Thủ Chém Củi';
  if (s >= 50) return '🌲 Thợ Rừng Chuyên Nghiệp';
  if (s >= 20) return '🪓 Tiều Phu Nhanh Nhẹn';
  return '🪵 Tập Sự Bổ Củi';
}

// Generate the Next Random Trunk Segment
let lastBranch = BRANCH.NONE;
function generateNextBranch() {
  const rand = Math.random();
  if (lastBranch === BRANCH.NONE) {
    if (rand < 0.42) {
      lastBranch = BRANCH.LEFT;
    } else if (rand < 0.84) {
      lastBranch = BRANCH.RIGHT;
    } else {
      lastBranch = BRANCH.NONE;
    }
  } else {
    // If previous was a branch, 50% chance of empty for fair reaction time
    if (rand < 0.5) {
      lastBranch = BRANCH.NONE;
    } else {
      lastBranch = Math.random() < 0.5 ? BRANCH.LEFT : BRANCH.RIGHT;
    }
  }
  return lastBranch;
}

function initTree() {
  treeSegments = [];
  lastBranch = BRANCH.NONE;
  // First 4 segments are empty for safe starting
  for (let i = 0; i < 4; i++) {
    treeSegments.push(BRANCH.NONE);
  }
  // Remaining segments have branches
  for (let i = 4; i < TOTAL_SEGMENTS; i++) {
    treeSegments.push(generateNextBranch());
  }
}

// Particle System Classes
class FlyingLog {
  constructor(x, y, side) {
    this.x = x;
    this.y = y;
    this.vx = side === 'LEFT' ? -12 - Math.random() * 5 : 12 + Math.random() * 5;
    this.vy = -10 - Math.random() * 4;
    this.rotation = 0;
    this.rotationSpeed = (side === 'LEFT' ? -1 : 1) * (0.2 + Math.random() * 0.15);
    this.gravity = 0.7;
    this.opacity = 1;
    this.life = 0;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.rotation += this.rotationSpeed;
    this.life++;
    if (this.life > 40) {
      this.opacity -= 0.05;
    }
  }
  draw() {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.opacity);
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    drawTrunkSegment(0, -TRUNK_HEIGHT / 2, BRANCH.NONE);
    ctx.restore();
  }
}

class WoodChip {
  constructor(x, y, side) {
    this.x = x;
    this.y = y;
    const angle = side === 'LEFT' ? Math.PI * 0.75 + (Math.random() - 0.5) : Math.PI * 0.25 + (Math.random() - 0.5);
    const speed = 4 + Math.random() * 10;
    this.vx = Math.cos(angle) * speed;
    this.vy = -Math.sin(angle) * speed - 2;
    this.size = 3 + Math.random() * 5;
    this.color = ['#854d0e', '#a16207', '#ca8a04', '#fed7aa'][Math.floor(Math.random() * 4)];
    this.gravity = 0.5;
    this.life = 0;
    this.maxLife = 25 + Math.random() * 15;
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

class SlashArc {
  constructor(x, y, side) {
    this.x = x;
    this.y = y;
    this.side = side;
    this.life = 0;
    this.maxLife = 10;
  }
  update() {
    this.life++;
  }
  draw() {
    const progress = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = 1 - progress;
    ctx.strokeStyle = activeSkin === 'ninja' ? '#38bdf8' : (activeSkin === 'robot' ? '#06b6d4' : '#ffffff');
    ctx.lineWidth = 4 * (1 - progress);
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    const dir = this.side === 'LEFT' ? 1 : -1;
    ctx.arc(this.x, this.y, 45, -Math.PI * 0.3 * dir, Math.PI * 0.4 * dir);
    ctx.stroke();
    ctx.restore();
  }
}

class FloatingText {
  constructor(text, x, y, color = '#fbbf24', fontSize = 24) {
    this.text = text;
    this.x = x;
    this.y = y;
    this.color = color;
    this.fontSize = fontSize;
    this.life = 0;
    this.maxLife = 30;
  }
  update() {
    this.y -= 1.4;
    this.life++;
  }
  draw() {
    const progress = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = 1 - progress;
    ctx.font = `800 ${this.fontSize}px var(--font-main)`;
    ctx.fillStyle = this.color;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 6;
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

// Draw Environment & Background
function drawBackground() {
  // 1. Sky Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, viewHeight);
  skyGrad.addColorStop(0, '#0284c7');
  skyGrad.addColorStop(0.55, '#38bdf8');
  skyGrad.addColorStop(1, '#bae6fd');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, viewWidth, viewHeight);

  // 2. Mountains Silhouette in background
  ctx.fillStyle = '#0369a1';
  ctx.beginPath();
  ctx.moveTo(0, viewHeight - 240);
  ctx.lineTo(viewWidth * 0.25, viewHeight - 340);
  ctx.lineTo(viewWidth * 0.6, viewHeight - 210);
  ctx.lineTo(viewWidth * 0.85, viewHeight - 310);
  ctx.lineTo(viewWidth, viewHeight - 230);
  ctx.lineTo(viewWidth, viewHeight);
  ctx.lineTo(0, viewHeight);
  ctx.closePath();
  ctx.fill();

  // Mountain highlights
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.beginPath();
  ctx.moveTo(viewWidth * 0.25, viewHeight - 340);
  ctx.lineTo(viewWidth * 0.25 - 30, viewHeight - 300);
  ctx.lineTo(viewWidth * 0.25 + 30, viewHeight - 300);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(viewWidth * 0.85, viewHeight - 310);
  ctx.lineTo(viewWidth * 0.85 - 25, viewHeight - 275);
  ctx.lineTo(viewWidth * 0.85 + 25, viewHeight - 275);
  ctx.closePath();
  ctx.fill();

  // 3. Clouds
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  clouds.forEach(c => {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(c.scale, c.scale);
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.arc(22, -8, 20, 0, Math.PI * 2);
    ctx.arc(42, 2, 18, 0, Math.PI * 2);
    ctx.arc(20, 10, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // 4. Background Pine Trees
  ctx.fillStyle = '#047857';
  const pineX = [30, 85, 140, 340, 395, 450];
  pineX.forEach((px, idx) => {
    const py = viewHeight - 160 - (idx % 2) * 20;
    ctx.beginPath();
    ctx.moveTo(px, py - 70);
    ctx.lineTo(px - 22, py);
    ctx.lineTo(px + 22, py);
    ctx.closePath();
    ctx.fill();
  });

  // 5. Floating Leaves
  floatingLeaves.forEach(leaf => {
    ctx.save();
    ctx.translate(leaf.x, leaf.y);
    ctx.rotate(leaf.swayOffset);
    ctx.fillStyle = leaf.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, leaf.size, leaf.size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // 6. Ground Grass Turf
  const groundGrad = ctx.createLinearGradient(0, viewHeight - 140, 0, viewHeight);
  groundGrad.addColorStop(0, '#15803d');
  groundGrad.addColorStop(0.2, '#166534');
  groundGrad.addColorStop(1, '#14532d');
  ctx.fillStyle = groundGrad;
  ctx.beginPath();
  ctx.moveTo(0, viewHeight - 120);
  ctx.quadraticCurveTo(viewWidth * 0.5, viewHeight - 145, viewWidth, viewHeight - 120);
  ctx.lineTo(viewWidth, viewHeight);
  ctx.lineTo(0, viewHeight);
  ctx.closePath();
  ctx.fill();

  // Tree Stump at Base
  ctx.fillStyle = '#78350f';
  ctx.beginPath();
  ctx.ellipse(trunkBaseX, trunkBaseY + 36, TRUNK_WIDTH * 0.65, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#92400e';
  ctx.beginPath();
  ctx.ellipse(trunkBaseX, trunkBaseY + 34, TRUNK_WIDTH * 0.58, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#b45309';
  ctx.beginPath();
  ctx.ellipse(trunkBaseX, trunkBaseY + 33, TRUNK_WIDTH * 0.45, 12, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Draw a Single Trunk Segment with Branch
function drawTrunkSegment(cx, cy, branchType) {
  const halfW = TRUNK_WIDTH / 2;
  const h = TRUNK_HEIGHT;

  if (branchType === BRANCH.LEFT) {
    drawBranch(cx - halfW, cy + h * 0.5, 'LEFT');
  } else if (branchType === BRANCH.RIGHT) {
    drawBranch(cx + halfW, cy + h * 0.5, 'RIGHT');
  }

  ctx.save();
  ctx.translate(cx, cy);

  const logGrad = ctx.createLinearGradient(-halfW, 0, halfW, 0);
  logGrad.addColorStop(0, '#5b2609');
  logGrad.addColorStop(0.18, '#854d0e');
  logGrad.addColorStop(0.5, '#a16207');
  logGrad.addColorStop(0.82, '#854d0e');
  logGrad.addColorStop(1, '#5b2609');

  ctx.fillStyle = logGrad;
  ctx.beginPath();
  ctx.roundRect(-halfW, 0, TRUNK_WIDTH, h, 4);
  ctx.fill();

  ctx.strokeStyle = 'rgba(69, 26, 3, 0.45)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-halfW * 0.5, 4);
  ctx.lineTo(-halfW * 0.55, h - 4);
  ctx.moveTo(halfW * 0.35, 4);
  ctx.lineTo(halfW * 0.3, h - 4);
  ctx.stroke();

  ctx.fillStyle = 'rgba(254, 240, 138, 0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 2, halfW - 2, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// Draw a Branch with Lush Foliage
function drawBranch(startX, startY, side) {
  ctx.save();
  const dir = side === 'LEFT' ? -1 : 1;
  const branchLen = 92;

  ctx.fillStyle = '#78350f';
  ctx.beginPath();
  ctx.moveTo(startX, startY - 12);
  ctx.quadraticCurveTo(startX + dir * (branchLen * 0.5), startY - 18, startX + dir * branchLen, startY - 10);
  ctx.lineTo(startX + dir * branchLen, startY + 8);
  ctx.quadraticCurveTo(startX + dir * (branchLen * 0.5), startY + 12, startX, startY + 12);
  ctx.closePath();
  ctx.fill();

  const tipX = startX + dir * (branchLen * 0.95);
  const tipY = startY - 2;
  const leafColors = ['#14532d', '#166534', '#15803d', '#22c55e'];
  
  [
    { ox: 0, oy: -8, r: 24, c: leafColors[1] },
    { ox: dir * 18, oy: 2, r: 20, c: leafColors[2] },
    { ox: -dir * 16, oy: -14, r: 18, c: leafColors[3] }
  ].forEach(p => {
    ctx.fillStyle = p.c;
    ctx.beginPath();
    ctx.arc(tipX + p.ox, tipY + p.oy, p.r, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

// Draw Player Character according to Selected Skin
function drawPlayer(x, y, side, state, swingProgress) {
  ctx.save();
  ctx.translate(x, y);
  
  if (side === 'RIGHT') {
    ctx.scale(-1, 1);
  }

  let bobY = 0;
  if (state === 'IDLE') {
    bobY = Math.sin(player.idleTime * 0.08) * 2.5;
  }

  if (activeSkin === 'ninja') {
    drawNinja(bobY, state, swingProgress);
  } else if (activeSkin === 'knight') {
    drawKnight(bobY, state, swingProgress);
  } else if (activeSkin === 'robot') {
    drawRobot(bobY, state, swingProgress);
  } else {
    drawLumberjack(bobY, state, swingProgress);
  }

  ctx.restore();
}

function drawLumberjack(bobY, state, swing) {
  const isChopping = state === 'CHOPPING';
  const armAngle = isChopping ? -Math.PI * 0.35 * (1 - swing) + Math.PI * 0.4 * swing : 0;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 48, 24, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(-14, 18 + bobY, 10, 24);
  ctx.fillRect(4, 18 + bobY, 10, 24);
  ctx.fillStyle = '#451a03';
  ctx.fillRect(-16, 38 + bobY, 14, 10);
  ctx.fillRect(4, 38 + bobY, 14, 10);

  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.roundRect(-16, -14 + bobY, 32, 34, 6);
  ctx.fill();

  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -14 + bobY);
  ctx.lineTo(0, 20 + bobY);
  ctx.moveTo(-16, 2 + bobY);
  ctx.lineTo(16, 2 + bobY);
  ctx.stroke();

  ctx.fillStyle = '#fed7aa';
  ctx.beginPath();
  ctx.arc(0, -26 + bobY, 14, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#18181b';
  ctx.beginPath();
  ctx.arc(6, -28 + bobY, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#78350f';
  ctx.beginPath();
  ctx.arc(4, -20 + bobY, 11, 0, Math.PI);
  ctx.fill();

  ctx.fillStyle = '#991b1b';
  ctx.beginPath();
  ctx.arc(0, -32 + bobY, 14, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(-14, -34 + bobY, 28, 5);

  ctx.save();
  ctx.translate(6, -6 + bobY);
  ctx.rotate(armAngle);

  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.roundRect(0, -6, 22, 10, 4);
  ctx.fill();
  ctx.fillStyle = '#fed7aa';
  ctx.beginPath();
  ctx.arc(22, -1, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#92400e';
  ctx.fillRect(20, -36, 6, 44);

  ctx.fillStyle = '#94a3b8';
  ctx.beginPath();
  ctx.moveTo(26, -34);
  ctx.lineTo(44, -40);
  ctx.lineTo(44, -22);
  ctx.lineTo(26, -26);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(44, -40);
  ctx.lineTo(44, -22);
  ctx.stroke();

  ctx.restore();
}

function drawNinja(bobY, state, swing) {
  const isChopping = state === 'CHOPPING';
  const armAngle = isChopping ? -Math.PI * 0.45 * (1 - swing) + Math.PI * 0.5 * swing : 0;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 48, 24, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-12, 18 + bobY, 9, 24);
  ctx.fillRect(3, 18 + bobY, 9, 24);

  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(-14, -14 + bobY, 28, 34, 6);
  ctx.fill();

  ctx.fillStyle = '#ef4444';
  ctx.fillRect(-14, 8 + bobY, 28, 6);

  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(0, -26 + bobY, 14, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fed7aa';
  ctx.fillRect(0, -29 + bobY, 12, 6);
  ctx.fillStyle = '#18181b';
  ctx.beginPath();
  ctx.arc(6, -26 + bobY, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ef4444';
  ctx.fillRect(-14, -33 + bobY, 28, 5);
  ctx.beginPath();
  ctx.moveTo(-14, -31 + bobY);
  ctx.quadraticCurveTo(-26, -36 + Math.sin(player.idleTime * 0.1) * 6, -34, -28);
  ctx.lineTo(-30, -23);
  ctx.quadraticCurveTo(-22, -28, -14, -28 + bobY);
  ctx.fill();

  ctx.save();
  ctx.translate(6, -6 + bobY);
  ctx.rotate(armAngle);

  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(0, -5, 20, 9, 4);
  ctx.fill();

  ctx.fillStyle = '#ef4444';
  ctx.fillRect(20, -18, 5, 22);

  ctx.fillStyle = '#f8fafc';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(22, -18);
  ctx.lineTo(26, -58);
  ctx.lineTo(22, -62);
  ctx.lineTo(19, -58);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.restore();
}

function drawKnight(bobY, state, swing) {
  const isChopping = state === 'CHOPPING';
  const armAngle = isChopping ? -Math.PI * 0.35 * (1 - swing) + Math.PI * 0.45 * swing : 0;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 48, 24, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#64748b';
  ctx.fillRect(-13, 18 + bobY, 10, 24);
  ctx.fillRect(3, 18 + bobY, 10, 24);

  ctx.fillStyle = '#94a3b8';
  ctx.beginPath();
  ctx.roundRect(-16, -14 + bobY, 32, 34, 6);
  ctx.fill();

  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(0, 2 + bobY, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#64748b';
  ctx.beginPath();
  ctx.roundRect(-14, -40 + bobY, 28, 26, 6);
  ctx.fill();

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, -32 + bobY, 13, 4);

  ctx.fillStyle = '#3b82f6';
  ctx.beginPath();
  ctx.moveTo(0, -40 + bobY);
  ctx.quadraticCurveTo(-14, -58, -4, -62);
  ctx.quadraticCurveTo(8, -54, 4, -40 + bobY);
  ctx.fill();

  ctx.save();
  ctx.translate(6, -6 + bobY);
  ctx.rotate(armAngle);

  ctx.fillStyle = '#94a3b8';
  ctx.beginPath();
  ctx.roundRect(0, -6, 22, 10, 4);
  ctx.fill();

  ctx.fillStyle = '#78350f';
  ctx.fillRect(20, -42, 6, 52);

  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.moveTo(26, -38);
  ctx.lineTo(46, -46);
  ctx.lineTo(46, -20);
  ctx.lineTo(26, -28);
  ctx.moveTo(20, -36);
  ctx.lineTo(6, -42);
  ctx.lineTo(6, -22);
  ctx.lineTo(20, -28);
  ctx.fill();

  ctx.restore();
}

function drawRobot(bobY, state, swing) {
  const isChopping = state === 'CHOPPING';
  const armAngle = isChopping ? -Math.PI * 0.4 * (1 - swing) + Math.PI * 0.45 * swing : 0;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 48, 24, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#334155';
  ctx.fillRect(-12, 18 + bobY, 9, 24);
  ctx.fillRect(3, 18 + bobY, 9, 24);

  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.roundRect(-15, -14 + bobY, 30, 34, 6);
  ctx.fill();

  ctx.fillStyle = '#06b6d4';
  ctx.shadowColor = '#22d3ee';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(0, 2 + bobY, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.roundRect(-13, -38 + bobY, 26, 24, 4);
  ctx.fill();

  ctx.fillStyle = '#06b6d4';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 10;
  ctx.fillRect(0, -32 + bobY, 13, 6);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#64748b';
  ctx.fillRect(-2, -44 + bobY, 4, 6);
  ctx.fillStyle = '#f43f5e';
  ctx.beginPath();
  ctx.arc(0, -46 + bobY, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(6, -6 + bobY);
  ctx.rotate(armAngle);

  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.roundRect(0, -5, 20, 9, 4);
  ctx.fill();

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(20, -34, 5, 42);

  ctx.fillStyle = '#22d3ee';
  ctx.shadowColor = '#06b6d4';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(25, -34);
  ctx.lineTo(45, -42);
  ctx.lineTo(42, -18);
  ctx.lineTo(25, -24);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.restore();
}

// Start Game from Menu
function startGame() {
  sounds.playClick();
  score = 0;
  combo = 0;
  maxCombo = 0;
  timeLeft = 100;
  player.side = 'LEFT';
  player.state = 'IDLE';
  player.chopProgress = 0;
  
  flyingLogs = [];
  woodChips = [];
  slashArcs = [];
  floatingTexts = [];
  
  initTree();
  updateHUD();

  gameState = STATE.PLAYING;
  startScreen.classList.add('hidden');
  gameoverScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  touchControls.classList.remove('hidden');
}

// Update HUD & Time Bar
function updateHUD() {
  currentScoreEl.textContent = score;
  timeBar.style.width = `${Math.max(0, Math.min(100, timeLeft))}%`;

  timeBar.classList.remove('warning', 'danger');
  if (timeLeft < 25) {
    timeBar.classList.add('danger');
  } else if (timeLeft < 50) {
    timeBar.classList.add('warning');
  }

  if (combo > 1) {
    comboBadge.classList.remove('hidden');
    comboNumEl.textContent = combo;
  } else {
    comboBadge.classList.add('hidden');
  }
}

// Core Chop Logic
function chop(side) {
  if (gameState === STATE.MENU) {
    startGame();
  }
  if (gameState !== STATE.PLAYING) return;

  const now = performance.now();
  if (now - lastChopTime < 600) {
    combo++;
    if (combo > maxCombo) maxCombo = combo;
  } else {
    combo = 1;
  }
  lastChopTime = now;

  player.side = side;
  player.state = 'CHOPPING';
  player.chopProgress = 0;

  // Collision Check 1: Check if current bottom segment hits player
  if (treeSegments[0] === side) {
    gameOver('Bạn đã bị cành cây va trúng đầu!');
    return;
  }

  // Safe to chop: Detach log & shift down
  sounds.playChop(side, combo);

  // Spawn Flying Log & Wood Particles
  const logX = trunkBaseX;
  const logY = trunkBaseY;
  flyingLogs.push(new FlyingLog(logX, logY, side));

  const chopImpactX = side === 'LEFT' ? trunkBaseX - TRUNK_WIDTH * 0.4 : trunkBaseX + TRUNK_WIDTH * 0.4;
  const chopImpactY = trunkBaseY + TRUNK_HEIGHT * 0.5;

  for (let i = 0; i < 14; i++) {
    woodChips.push(new WoodChip(chopImpactX, chopImpactY, side));
  }
  slashArcs.push(new SlashArc(chopImpactX, chopImpactY, side));

  // Shake screen
  shakeIntensity = 6;

  // Shift Tree segments down
  treeSegments.shift();
  treeSegments.push(generateNextBranch());

  // Score & Time Bonus
  score++;
  timeLeft = Math.min(100, timeLeft + 9.5);

  // Floating text / combo sounds
  if (combo > 0 && combo % 5 === 0) {
    floatingTexts.push(new FloatingText(`COMBO ${combo}x!`, trunkBaseX, trunkBaseY - 40, '#fbbf24', 28));
    sounds.playCombo(Math.floor(combo / 5));
  } else {
    floatingTexts.push(new FloatingText('+1', chopImpactX, chopImpactY - 20, '#ffffff', 20));
  }

  // Collision Check 2: Check if newly fallen segment lands on player head
  if (treeSegments[0] === side) {
    gameOver('Cành cây rơi trúng đầu bạn!');
    return;
  }

  updateHUD();
}

// Game Over Handling
function gameOver(reason) {
  gameState = STATE.GAMEOVER;
  player.state = 'DEAD';
  shakeIntensity = 12;

  sounds.playBranchHit();
  setTimeout(() => {
    sounds.playTimeout();
  }, 180);

  const isNewRecord = score > highScore;
  if (isNewRecord) {
    highScore = score;
    localStorage.setItem('bocui_highscore', highScore);
    setTimeout(() => {
      sounds.playNewRecord();
    }, 450);
  }

  finalScoreEl.textContent = score;
  finalMaxComboEl.textContent = `${maxCombo}x`;
  finalHighScoreEl.textContent = highScore;
  gameoverReasonEl.textContent = reason;
  rankTitleEl.textContent = calculateRank(score);

  if (isNewRecord && score > 0) {
    newRecordBadge.classList.remove('hidden');
  } else {
    newRecordBadge.classList.add('hidden');
  }

  hud.classList.add('hidden');
  touchControls.classList.add('hidden');
  gameoverScreen.classList.remove('hidden');
}

// Return to Main Menu
function showMainMenu() {
  sounds.playClick();
  gameState = STATE.MENU;
  menuHighScoreEl.textContent = highScore;
  gameoverScreen.classList.add('hidden');
  hud.classList.add('hidden');
  touchControls.classList.add('hidden');
  startScreen.classList.remove('hidden');
}

// Character Skin Selector Handlers
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

// Event Listeners for Game Buttons
btnStart.addEventListener('click', startGame);
btnRestart.addEventListener('click', startGame);
btnMenu.addEventListener('click', showMainMenu);

// Touch Controls
touchLeft.addEventListener('touchstart', (e) => {
  e.preventDefault();
  touchLeft.classList.add('active');
  chop('LEFT');
});
touchLeft.addEventListener('touchend', () => touchLeft.classList.remove('active'));

touchRight.addEventListener('touchstart', (e) => {
  e.preventDefault();
  touchRight.classList.add('active');
  chop('RIGHT');
});
touchRight.addEventListener('touchend', () => touchRight.classList.remove('active'));

touchLeft.addEventListener('mousedown', (e) => {
  e.preventDefault();
  chop('LEFT');
});
touchRight.addEventListener('mousedown', (e) => {
  e.preventDefault();
  chop('RIGHT');
});

// Canvas Click / Tap (Direct Screen Half Tap)
canvas.addEventListener('pointerdown', (e) => {
  if (gameState === STATE.PLAYING) {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if (clickX < viewWidth / 2) {
      chop('LEFT');
    } else {
      chop('RIGHT');
    }
  }
});

// Keyboard Controls
window.addEventListener('keydown', (e) => {
  if (gameState === STATE.PLAYING) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'KeyJ' || e.code === 'Numpad4') {
      chop('LEFT');
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'KeyL' || e.code === 'Numpad6') {
      chop('RIGHT');
    }
  } else if (gameState === STATE.MENU) {
    if (e.code === 'Space' || e.code === 'Enter') {
      startGame();
    }
  } else if (gameState === STATE.GAMEOVER) {
    if (e.code === 'Space' || e.code === 'Enter') {
      startGame();
    }
  }
});

// --- Main Game Update & Render Loop ---
let lastFrameTime = performance.now();

function update(dt) {
  player.idleTime += dt * 60;
  if (player.state === 'CHOPPING') {
    player.chopProgress += dt * 10;
    if (player.chopProgress >= 1) {
      player.state = 'IDLE';
      player.chopProgress = 0;
    }
  }

  clouds.forEach(c => {
    c.x += c.speed * dt * 60;
    if (c.x > viewWidth + 60) c.x = -60;
  });

  floatingLeaves.forEach(l => {
    l.y += l.speedY * dt * 60;
    l.swayOffset += l.swaySpeed * dt * 60;
    l.x += Math.sin(l.swayOffset) * 0.6;
    if (l.y > viewHeight + 20) {
      l.y = -20;
      l.x = Math.random() * viewWidth;
    }
  });

  if (shakeIntensity > 0) {
    shakeIntensity = Math.max(0, shakeIntensity - dt * 25);
  }

  for (let i = flyingLogs.length - 1; i >= 0; i--) {
    flyingLogs[i].update();
    if (flyingLogs[i].opacity <= 0 || flyingLogs[i].y > viewHeight + 100) {
      flyingLogs.splice(i, 1);
    }
  }

  for (let i = woodChips.length - 1; i >= 0; i--) {
    woodChips[i].update();
    if (woodChips[i].life >= woodChips[i].maxLife) {
      woodChips.splice(i, 1);
    }
  }

  for (let i = slashArcs.length - 1; i >= 0; i--) {
    slashArcs[i].update();
    if (slashArcs[i].life >= slashArcs[i].maxLife) {
      slashArcs.splice(i, 1);
    }
  }

  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    floatingTexts[i].update();
    if (floatingTexts[i].life >= floatingTexts[i].maxLife) {
      floatingTexts.splice(i, 1);
    }
  }

  if (gameState === STATE.PLAYING) {
    const drainSpeed = 0.55 + Math.min(score * 0.0035, 1.2);
    timeLeft -= drainSpeed * dt * 60;
    if (timeLeft <= 0) {
      timeLeft = 0;
      updateHUD();
      gameOver('Đã hết thời gian bổ củi!');
    } else {
      updateHUD();
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

  drawBackground();

  for (let i = 0; i < treeSegments.length; i++) {
    const segY = trunkBaseY - i * TRUNK_HEIGHT;
    drawTrunkSegment(trunkBaseX, segY, treeSegments[i]);
  }

  flyingLogs.forEach(log => log.draw());

  const playerOffset = TRUNK_WIDTH * 0.5 + 46;
  const playerX = player.side === 'LEFT' ? trunkBaseX - playerOffset : trunkBaseX + playerOffset;
  const playerY = trunkBaseY + TRUNK_HEIGHT - 38;

  drawPlayer(playerX, playerY, player.side, player.state, player.chopProgress);

  slashArcs.forEach(arc => arc.draw());
  woodChips.forEach(chip => chip.draw());
  floatingTexts.forEach(txt => txt.draw());

  ctx.restore();
}

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastFrameTime) / 1000, 0.1);
  lastFrameTime = timestamp;

  update(dt);
  render();

  requestAnimationFrame(gameLoop);
}

// Initialize on Load
initTree();
menuHighScoreEl.textContent = highScore;
requestAnimationFrame(gameLoop);
