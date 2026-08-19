// --- Bá»• Cá»§i SiÃªu Tá»‘c - Core Game Engine ---

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
const TRUNK_WIDTG = 96;
const TRUNK_HEIGHT = 74;
let trunkBaseX = 240;
let trunkBaseY = 640;

// Tree Branches Data
const BRANCH {
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
  soundIcon.textContent = sounds.isMuted() ? 'ðŸ”©' : 'ðŸ”©';
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
  
  viewWidth = rect.width;
  viewHeight = rect.height;
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
// --- Rendering Functions ---

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

  // 5. Floating Autumn/Forest Leaves
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
  ctw.fillStyle = '#92400e';
  ctx.beginPath();
  ctx.ellipse(trunkBaseX, trunkBaseY + 34, TRUNK_WIDTH< * 0.58, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctw.fillStyle = '#b45309';
  ctx.beginPath();
  ctx.ellipse(trunkBaseX, trunkBaseY + 33, TRUNK_WIDTH< * 0.45, 12, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Draw a Single Trunk Segment with Branch
function drawTrunšÔÙYÛY[
ÞÞKœ˜[˜Ú\JHÂˆÛÛœÝ[•ÈH•S’×ÕÒQÈŽÂˆÛÛœÝH•S’×ÒRQÒÂ‚ˆËÈKˆ˜]Èœ˜[˜Úš\œÝ
Yˆ[žJBˆYˆ
œ˜[˜Ú\HOOH”SÒ“Q•
HÂˆ˜]Ðœ˜[˜Ú
ÞH[•ËÞH
È
ˆK	ÓQ•	ÊNÂˆH[ÙHYˆ
œ˜[˜Ú\HOOH”SÒ”’QÒ
HÂˆ˜]Ðœ˜[˜Ú
Þ
È[•ËÞH
È
ˆK	Ô’QÒ	ÊNÂˆB‚ˆËÈ‹ˆ[šÈ›ÙH
Þ[[™šXØ[ÙÈYXÙJBˆÝœØ]™J
NÂˆÝ˜[œÛ]JÞÞJNÂ‚ˆËÈÝ]\ˆ˜\šÂˆÛÛœÝÙÑÜ˜YHÝ˜Ü™X]S[™X\‘Ü˜YY[
Z[•Ë[•Ë
NÂˆÙÑÜ˜Y˜YÛÛÜ”ÝÜ
	ÈÍXŒŒIÊNÂˆÙÑÜ˜Y˜YÛÛÜ”ÝÜ
ŒN	ÈÎMIÊNÂˆÙÑÜ˜Y˜YÛÛÜ”ÝÜ
K	ÈØLMŒŒÉÊNÂˆÙÑÜ˜Y˜YÛÛÜ”ÝÜ
Ž‹	ÈÎMIÊNÂˆÙÑÜ˜Y˜YÛÛÜ”ÝÜ
K	ÈÍXŒŒIÊNÂ‚ˆÝ™š[Ý[HHÙÑÜ˜YÂˆÝ˜™YÚ[”]

NÂˆÝœ›Ý[™™XÝ
Z[•Ë•S’×ÕÒQ
NÂˆÝ™š[

NÂ‚ˆËÈ˜\šÈ™\XØ[[™\ÈÈÜ˜Z[‚ˆÝœÝ›ÚÙTÝ[HH	Ü™Ø˜JŽK‹ËJIÎÂˆÝ›[™UÚYHÎÂˆÝ˜™YÚ[”]

NÂˆÝ›[Ý™UÊZ[•È
ˆK
NÂˆÝ›[™UÊZ[•È
ˆMKH
NÂˆÝ›[Ý™UÊ[•È
ˆŒÍK
NÂˆÝ›[™UÊ[•È
ˆŒËH
NÂˆÝœÝ›ÚÙJ
NÂ‚ˆËÈÙYÛY[Ý]YÙHš[™ÂˆÝ™š[Ý[HH	Ü™Ø˜JMLÎŒÍJIÎÂˆÝ˜™YÚ[”]

NÂˆÝ™[\ÙJ‹[•ÈH‹X]”H
ˆŠNÂˆÝ™š[

NÂ‚ˆÝœ™\ÝÜ™J
NÂŸB‚‹ËÈ˜]ÈHœ˜[˜ÚÚ]\Ú›ÛXYÙB™[˜Ý[Ûˆ˜]Ðœ˜[˜Ú
Ý\Ý\KÚYJHÂˆÝœØ]™J
NÂˆÛÛœÝ\ˆHÚYHOOH	ÓQ•	ÈÈLHˆNÂˆÛÛœÝœ˜[˜Ú[ˆHLŽÂ‚ˆËÈÛÛÙ[ˆ[X‚ˆÝ™š[Ý[HH	ÈÍÎÍL‰ÎÂˆÝ˜™YÚ[”]

NÂˆÝ›[Ý™UÊÝ\Ý\HHLŠNÂˆÝœ]XY˜]XÐÝ\™UÊÝ\
È\ˆ
ˆ
œ˜[˜Ú[ˆ
ˆJKÝ\HHNÝ\
È\ˆ
ˆœ˜[˜Ú[‹Ý\HHL
NÂˆÝ›[™UÊÝ\
È\ˆ
ˆœ˜[˜Ú[‹Ý\H
È
NÂˆÝœ]XY˜]XÐÝ\™UÊÝ\
È\ˆ
ˆ
œ˜[˜Ú[ˆ
ˆJKÝ\H
ÈL‹Ý\Ý\H
ÈLŠNÂˆÝ˜ÛÜÙT]

NÂˆÝ™š[

NÂ‚ˆËÈ›ÛXYÙHÈ[™H™YYHY™œÂˆÛÛœÝ\HÝ\
È\ˆ
ˆ
œ˜[˜Ú[ˆ
ˆŽMJNÂˆÛÛœÝ\HHÝ\HHŽÂ‚ˆÛÛœÝXYÛÛÜœÈHÉÈÌMLÌ™	Ë	ÈÌMLÍ	Ë	ÈÌMNÙ	Ë	ÈÌŒ˜ÍMYI×NÂˆˆËÈÛ\Ý\ˆÙˆÈXYˆY™œÂˆÂˆÈÞˆÞNˆNŽˆÎˆXYÛÛÜœÖÌWHKˆÈÞˆ\ˆ
ˆNÞNˆ‹ŽˆŒÎˆXYÛÛÜœÖÌ—HKˆÈÞˆY\ˆ
ˆM‹ÞNˆLMŽˆNÎˆXYÛÛÜœÖÌ×HBˆK™›Ü‘XXÚ
OˆÂˆÝË™š[Ý[HH˜ÎÂˆÝ˜™YÚ[”]

NÂˆÝ˜\˜Ê\
È›Þ\H
È›ÞKœ‹X]”H
ˆŠNÂˆÝ™š[

NÂˆJNÂ‚ˆÝœ™\ÝÜ™J
NÂŸB‚‹ËÈ˜]È^Y\ˆÚ\˜XÝ\ˆXØÛÜ™[™ÈÈÙ[XÝYÚÚ[‚™[˜Ý[Ûˆ˜]Ô^Y\ŠKÚYKÝ]KÝÚ[™Ô›ÙÜ™\ÜÊHÂˆÝœØ]™J
NÂˆÝ˜[œÛ]JJNÂˆˆËÈ›\Ú\˜XÝ\ˆÜš^›Û[HYˆÛˆ’QÒÚYBˆYˆ
ÚYHOOH	Ô’QÒ	ÊHÂˆÝœØØ[JLKJNÂˆB‚ˆËÈYHœ™X]›Ø˜š[™Âˆ]›Ø–HHÂˆYˆ
Ý]HOOH	ÒQIÊHÂˆ›Ø–HHX]œÚ[Š^Y\‹šYU[YH
ˆŒ
H
ˆ‹NÂˆB‚ˆYˆ
XÝ]™TÚÚ[ˆOOH	Ûš[š˜IÊHÂˆ˜]Óš[š˜J›Ø–KÝ]KÝÚ[™Ô›ÙÜ™\ÜÊNÂˆH[ÙHYˆ
XÝ]™TÚÚ[ˆOOH	ÚÛšYÚ	ÊHÂˆ˜]ÒÛšYÚ
›Ø–KÝ]KÝÚ[™Ô›ÙÜ™\ÜÊNÂˆH[ÙHYˆ
XÝ]™TÚÚ[ˆOOH	Ü›Ø›Ý	ÊHÂˆ˜]Ô›Ø›Ý
›Ø–KÝ]KÝÚ[™Ô›ÙÜ™\ÜÊNÂˆH[ÙHÂˆ˜]Ó[X™\š˜XÚÊ›Ø–KÝ]KÝÚ[™Ô›ÙÜ™\ÜÊNÂˆB‚ˆÝœ™\ÝÜ™J
NÂŸB‚‹ËÈÚÚ[ˆNˆÛ\ÜÚXÈ[X™\š˜XÚÂ™[˜Ý[Ûˆ˜]Ó[X™\š˜XÚÊ›Ø–KÝ]KÝÚ[™ÊHÂˆÛÛœÝ\ÐÚÜ[™ÈHÝ]HOOH	ÐÒÔS‘ÉÎÂˆÛÛœÝ\›P[™ÛHH\ÐÚÜ[™ÈÈSX]”H
ˆŒÍH
ˆ
HHÝÚ[™ÊH
ÈX]”H
ˆ
ˆÝÚ[™ÈˆÂ‚ˆËÈÚYÝÂˆÝ™š[Ý[HH	Ü™Ø˜JŒÊIÎÂˆÝ˜™YÚ[”]

NÂˆÝ™[\ÙJX]”H
ˆŠNÂˆÝ™š[

NÂ‚ˆËÈYÜÈ	ˆ›ÛÝÂˆÝË™š[Ý[HH	ÈÌYLØNIÎÈËÈ›YH™X[œÂˆÝ™š[™XÝ
LMN
È›Ø–KL
NÂˆÝ™š[™XÝ
N
È›Ø–KL
NÂˆÝ™š[Ý[HH	ÈÍLXLÉÎÈËÈ›ÛÝÂˆÝ™š[™XÝ
LM‹Î
È›Ø–KML
NÂˆÝ™š[™XÝ
Î
È›Ø–KML
NÂ‚ˆËÈÜœÛÈ
™YZY›[›™[Ú\
BˆÝ™š[Ý[HH	ÈÙÌŒ‰ÎÂˆÝ˜™YÚ[”]

NÂˆÝœ›Ý[™™XÝ
LM‹LM
È›Ø–KÌ‹ÍŠNÂˆÝ™š[

NÂ‚ˆËÈZY]\›ˆ[™\ÂˆÝœÝ›ÚÙTÝ[HH	ÈÌNN‰ÉÎÂˆÝ›[™UÚYHŽÂˆÝ˜™YÚ[”]

NÂˆÝ›[Ý™UÊLM
È›Ø–JNÂˆÝ›[™UÊŒ
È›Ø–JNÂˆÝ›[Ý™UÊLM‹ˆ
È›Ø–JNÂˆÝ›[™UÊM‹ˆ
È›Ø–JNÂˆÝœÝ›ÚÙJ
NÂ‚ˆËÈXYˆÝ™š[Ý[HH	ÈÙ™YØXIÎÈËÈÚÚ[ˆÛ™BˆÝ˜™YÚ[”]

NÂˆÝ˜\˜ÊLˆ
È›Ø–KMX]”H
ˆŠNÂˆÝ™š[

NÂ‚ˆËÈ^Y\ÂˆÝ™š[Ý[HH	ÈÌNN‰ÉÎÂˆÝ˜™YÚ[”]

NÂˆÝ˜\˜Ê‹LŽ
È›Ø–K‹KX]”H
ˆŠNÂˆÝ™š[

NÂ‚ˆËÈ\ÚHœ›ÝÛˆ™X\™ˆÝË™š[Ý[HH	ÈÍÎÍL‰ÎÂˆÝ˜™YÚ[”]

NÂˆÝ˜\˜ÊLŒ
È›Ø–KLKX]”JNÂˆÝ™š[

NÂ‚ˆËÈ™Y™X[šYH]ˆÝ™š[Ý[HH	ÈÎNLXŒX‰ÎÂˆÝ˜™YÚ[”]

NÂˆÝ˜\˜ÊLÌˆ
È›Ø–KMX]”KX]”H
ˆŠNÂˆÝ™š[

NÂˆÝ™š[Ý[HH	ÈØŽLXÌXÉÎÂˆÝ™š[™XÝ
LMLÍ
È›Ø–KŽJNÂ‚ˆËÈ\›H	ˆ^BˆÝœØ]™J
NÂˆÝ˜[œÛ]J‹Mˆ
È›Ø–JNÂˆÝœ›Ý]J\›P[™ÛJNÂ‚ˆËÈ\›BˆÝ™š[Ý[HH	ÈÙÌŒ‰ÎÂˆÝ˜™YÚ[”]

NÂˆÝœ›Ý[™™XÝ
M‹Œ‹L
NÂˆÝ™š[

NÂˆÝ™š[Ý[HH	ÈÙ™YØXIÎÈËÈ[™ˆÝ˜™YÚ[”]

NÂˆÝ˜\˜ÊŒ‹LKKX]”H
ˆŠNÂˆÝ™š[

NÂ‚ˆËÈ^H[™BˆÝ™š[Ý[HH	ÈÎLIÎÂˆÝ™š[™XÝ
ŒLÍ‹‹
NÂ‚ˆËÈÝY[^HXYˆÝ™š[Ý[HH	ÈÎMLØŽIÎÂˆÝ˜™YÚ[”]

NÂˆÝ›[Ý™UÊ‹LÍ
NÂˆÝ›[™UÊM
NÂˆÝ›[™UÊLŒŠNÂˆÝ›[™UÊ‹LŠNÂˆÝ˜ÛÜÙT]

NÂˆÝ™š[

NÂ‚ˆËÈÚ\œ›YHYÚYÚˆÝœÝ›ÚÙTÝ[HH	ÈÙŽ˜Y˜ÉÎÂˆÝ›[™UÚYH‹NÂˆÝ˜™YÚ[”]

NÂˆÝ›[Ý™UÊM
NÂˆÝ›[™UÊLŒŠNÂˆÝœÝ›ÚÙJ
NÂ‚ˆÝœ™\ÝÜ™J
NÂŸB‚‹ËÈÚÚ[ˆŽˆÝÚYš[š˜B™[˜Ý[Ûˆ˜]Óš[š˜J›Ø–KÝ]KÝÚ[™ÊHÂˆÛÛœÝ\ÐÚÜ[™ÈHÝ]HOOH	ÐÒÔS‘ÉÎÂˆÛÛœÝ\›P[™ÛHH\ÐÚÜ[™ÈÈSX]”H
ˆH
ˆ
HHÝÚ[™ÊH
ÈX]”H
ˆH
ˆÝÚ[™ÈˆÂ‚ˆËÈÚYÝÂˆÝË™š[Ý[HH	Ü™Ø˜JŒÊIÎÂˆÝ˜™YÚ[”]

NÂˆÝ™[\ÙJX]”H
ˆŠNÂˆÝ™š[

NÂ‚ˆËÈYÜÈ	ˆXšH›ÛÝÂˆÝ™š[Ý[HH	ÈÌŒMÌ˜IÎÂˆÝ™š[™XÝ
LL‹N
È›Ø–KK
NÂˆÝ™š[™XÝ
ËN
È›Ø–KK
NÂ‚ˆËÈÜœÛÈ
\šÈÚ[›ØšHØ\˜ŠBˆÝË™š[Ý[HH	ÈÌYLŽLØ‰ÎÂˆÝ˜™YÚ[”]

NÂˆÝœ›Ý[™™XÝ
LMLM
È›Ø–KŽÍŠNÂˆÝ™š[

NÂ‚ˆËÈ™YØ\Ú™[ˆÝ™š[Ý[HH	ÈÙY	ÎÂˆÝ™š[™XÝ
LM
È›Ø–KŽŠNÂ‚ˆËÈXYX\ÚÂˆÝË™š[Ý[HH	ÈÌŒMÌ˜IÎÂˆÝ˜™YÚ[”]

NÂˆÝ˜\˜ÊLˆ
È›Ø–KMX]”H
ˆŠNÂˆÝ™š[

NÂ‚ˆËÈ˜XÙHÛ]	ˆ^Y\ÂˆÝ™š[Ý[HH	ÈÙ™YØXIÎÂˆÝ™š[™XÝ
LŽH
È›Ø–KL‹ŠNÂˆÝË™š[Ý[HH	ÈÌNNX‰ÎÂˆÝ˜™YÚ[”]

NÂˆÝ˜\˜Ê‹Lˆ
È›Ø–K‹X]”H
ˆŠNÂˆÝ™š[

NÂ‚ˆËÈ™YXY˜[™Ú]›Ø][™ÈZ[ÂˆÝ™š[Ý[HH	ÈÙY	ÎÂˆÝ™š[™XÝ
LMLÌÈ
È›Ø–KŽJNÂˆÝ˜™YÚ[”]

NÂˆÝ›[Ý™UÊLMLÌH
È›Ø–JNÂˆÝœ]XY˜]XÐÝ\™UÊL‹LÍˆ
ÈX]œÚ[Š^Y\‹šYU[YH
ˆŒJH
ˆ‹LÍLŽ
NÂˆÝ›[™UÊLÌLŒÊNÂˆÝœ]XY˜]XÐÝ\™UÊLŒ‹LŽLMLŽ
È›Ø–JNÂˆÝ™š[

NÂ‚ˆËÈ\›H	ˆØ][˜HÝÛÜ™ˆÝœØ]™J
NÂˆÝ˜[œÛ]J‹Mˆ
È›Ø–JNÂˆÝœ›Ý]J\›P[™ÛJNÂ‚ˆËÈ\›BˆÝË™š[Ý[HH	ÈÌYLŽLØ‰ÎÂˆÝ˜™YÚ[”]

NÂˆÝœ›Ý[™™XÝ
MKŒK
NÂˆÝ™š[

NÂ‚ˆËÈØ][˜H[ˆÝË™š[Ý[HH	ÈÙY	ÎÂˆÝ™š[™XÝ
ŒLNKŒŠNÂ‚ˆËÈØ][˜H›YH
ÝY[Ú]ÞX[ˆ[™\™ÞHÛÝÊBˆÝ™š[Ý[HH	ÈÙŽ˜Y˜ÉÎÂˆÝœÚYÝÐÛÛÜˆH	ÈÌÎ™Ž	ÎÂˆÝœÚYÝÐ›\ˆHLÂˆÝ˜™YÚ[”]

NÂˆÝ›[Ý™UÊŒ‹LN
NÂˆÝ›[™UÊ‹MN
NÂˆÝ›[™UÊŒ‹MŒŠNÂˆÝ›[™UÊNKMN
NÂˆÝ˜ÛÜÙT]

NÂˆÝ™š[

NÂˆÝœÚYÝÐ›\ˆHÂ‚ˆÝœ™\ÝÜ™J
NÂŸB‚‹ËÈÚÚ[ˆÎˆ›ÞX[ÛšYÚ™[˜Ý[Ûˆ˜]ÒÛšYÚ
›Ø–KÝ]KÝÚ[™ÊHÂˆÛÛœÝ\ÐÚÜ[™ÈHÝ]HOOH	ÐÒÔS‘ÉÎÂˆÛÛœÝ\›P[™ÛHH\ÐÚÜ[™ÈÈSX]”H
ˆŒÍH
ˆ
HHÝÚ[™ÊH
ÈX]”H
ˆH
ˆÝÚ[™ÈˆÂ‚ˆËÈÚYÝÂˆÝË™š[Ý[HH	Ü™Ø˜JŒÊIÎÂˆÝ˜™YÚ[”]

NÂˆÝ™[\ÙJX]”H
ˆŠNÂˆÝ™š[

NÂ‚ˆËÈÝY[Ü™X]™\ÈÈYÜÂˆÝ™š[Ý[HH	ÈÍÍ‰ÎÂˆÝ™š[™XÝ
LLËN
È›Ø–KL
NÂˆÝ™š[™XÝ
ËN
È›Ø–KL
NÂ‚ˆËÈÚ[™\ˆ]Hœ™X\Ý]H\›[Ü‚ˆÝ™š[Ý[HH	ÈÎMLØŽ	ÎÂˆÝ˜™YÚ[”]

NÂˆÝœ›Ý[™™XÝ
LM‹LM
È›Ø–KÌ‹ÍŠNÂˆÝ™š[

NÂ‚ˆËÈÛÛš[H[X›[BˆÝ™š[Ý[HH	ÈÙ˜˜™Œ	ÎÂˆÝ˜™YÚ[”]

NÂˆÝ˜\˜Êˆ
È›Ø–K‹X]”H
ˆŠNÂˆÝ™š[

NÂ‚ˆËÈÝY[[Y]ˆÝË™š[Ý[HH	ÈÍÍ‰ÎÂˆÝ˜™YÚ[”]

NÂˆÝœ›Ý[™™XÝ
LMM
È›Ø–KŽ‹ŠNÂˆÝ™š[

NÂ‚ˆËÈš\ÛÜˆÛ]ˆÝ™š[Ý[HH	ÈÌŒMÌ˜IÎÂˆÝ™š[™XÝ
LÌˆ
È›Ø–KLË
NÂ‚ˆËÈ›YH™X]\ˆ[YBˆÝË™š[Ý[HH	ÈÌØŽ™‰ÎÂˆÝ˜™YÚ[”]

NÂˆÝ›[Ý™UÊM
È›Ø–JNÂˆÝœ]XY˜]XÐÝ\™UÊLMMNMMŒŠNÂˆÝœ]XY˜]XÐÝ\™UÊMMM
È›Ø–JNÂˆÝ™š[

NÂ‚ˆËÈ\›H	ˆ˜]H^BˆÝœØ]™J
NÂˆÝ˜[œÛ]J‹Mˆ
È›Ø–JNÂˆÝœ›Ý]J\›P[™ÛJNÂ‚ˆËÈÝY[Ø][]\›BˆÝ™š[Ý[HH	ÈÎMLØŽ	ÎÂˆÝ˜™YÚ[”]

NÂˆÝœ›Ý[™™XÝ
M‹Œ‹L
NÂˆÝ™š[

NÂ‚ˆËÈÛ™ÈÚYˆÝ™š[Ý[HH	ÈÍÎÍL‰ÎÂˆÝ™š[™XÝ
ŒM‹‹LŠNÂ‚ˆËÈÝX›KRXYYX]žH˜]H^BˆÝË™š[Ý[HH	ÈØØ™YLIÎÂˆÝ˜™YÚ[”]

NÂˆËÈœ›Û›YBˆÝ›[Ý™UÊ‹LÎ
NÂˆÝ›[™UÊ‹MŠNÂˆÝ›[™UÊ‹LŒ
NÂˆÝ›[™UÊ‹LŽ
NÂˆËÈ˜XÚÈ›YBˆÝ›[Ý™UÊŒLÍŠNÂˆÝ›[™UÊ‹MŠNÂˆÝ›[™UÊ‹LŒŠNÂˆÝ›[™UÊŒLŽ
NÂˆÝ™š[

NÂ‚ˆÝœ™\ÝÜ™J
NÂŸB‚‹ËÈÚÚ[ˆˆÞX™\ˆ›Ø›Ý™[˜Ý[Ûˆ˜]Ô›Ø›Ý
›Ø–KÝ]KÝÚ[™ÊHÂˆÛÛœÝ\ÐÚÜ[™ÈHÝ]HOOH	ÐÒÔS‘ÉÎÂˆÛÛœÝ\›P[™ÛHH\ÐÚÜ[™ÈÈSX]”H
ˆ
ˆ
HHÝÚ[™ÊH
ÈX]”H
ˆH
ˆÝÚ[™ÈˆÂ‚ˆËÈÚYÝÂˆÝ™š[Ý[HH	Ü™Ø˜JŒÊIÎÂˆÝ˜™YÚ[”]

NÂˆÝ™[\ÙJX]”H
ˆŠNÂˆÝ™š[

NÂ‚ˆËÈÞX™\ˆ[XœÂˆÝË™š[Ý[HH	ÈÌÌÍMMIÎÂˆÝ™š[™XÝ
LL‹N
È›Ø–KK
NÂˆÝ™š[™XÝ
ËN
È›Ø–KK
NÂ‚ˆËÈÜœÛÂˆÝË™š[Ý[HH	ÈÍÍMMŽIÎÂˆÝ˜™YÚ[”]

NÂˆÝœ›Ý[™™XÝ
LMKLM
È›Ø–KÌÍŠNÂˆÝ™š[

NÂ‚ˆËÈ[™\™ÞHÛÜ™H
[Ú[™ÈÞX[ŠBˆÝ™š[Ý[HH	ÈÌ˜™	ÎÂˆÝœÚYÝÐÛÛÜˆH	ÈÌŒ™ÙYIÎÂˆÝœÚYÝÐ›\ˆHÂˆÝ˜™YÚ[”]

NÂˆÝ˜\˜Êˆ
È›Ø–KKX]”H
ˆŠNÂˆÝ™š[

NÂˆÝœÚYÝÐ›\ˆHÂ‚ˆËÈXYˆÝ™š[Ý[HH	ÈÌÌÍMMIÎÂˆÝ˜™YÚ[”]

NÂˆÝœ›Ý[™™XÝ
LLËLÎ
È›Ø–K‹
NÂˆÝ™š[

NÂ‚ˆËÈÛÝÚ[™È™[Ûˆš\ÛÜ‚ˆÝ™š[Ý[HH	ÈÌ˜™	ÎÂˆÝœÚYÝÐÛÛÜˆH	ÈÌÎ™Ž	ÎÂˆÝœÚYÝÐ›\ˆHLÂˆÝ™š[™XÝ
LÌˆ
È›Ø–KLËŠNÂˆÝœÚYÝÐ›\ˆHÂ‚ˆËÈ[[›˜BˆÝ™š[Ý[HH	ÈÍÍ‰ÎÂˆÝ™š[™XÝ
L‹M
È›Ø–KŠNÂˆÝË™š[Ý[HH	ÈÙÙYIÎÂˆÝ˜™YÚ[”]

NÂˆÝ˜\˜ÊMˆ
È›Ø–KËX]”H
ˆŠNÂˆÝ™š[

NÂ‚ˆËÈ\›H	ˆ\Ù\ˆ^BˆÝœØ]™J
NÂˆÝ˜[œÛ]J‹Mˆ
È›Ø–JNÂˆÝœ›Ý]J\›P[™ÛJNÂ‚ˆÝ™š[Ý[HH	ÈÍÍMMŽIÎÂˆÝ˜™YÚ[”]

NÂˆÝœ›Ý[™™XÝ
MKŒK
NÂˆÝ™š[

NÂ‚ˆËÈ\Ù\ˆ^H[™BˆÝË™š[Ý[HH	ÈÌŒMÌ˜IÎÂˆÝ™š[™XÝ
ŒLÍKŠNÂ‚ˆËÈ\Ù\ˆ[™\™ÞH›YH
œšYÚÛÝÚ[™È™[ÛŠBˆÝË™š[Ý[HH	ÈÌŒ™ÙYIÎÂˆÝœÚYÝÐÛÛÜˆH	ÈÌ˜™	ÎÂˆÝœÚYÝÐ›\ˆHMÂˆÝ˜™YÚ[”]

NÂˆÝ›[Ý™UÊKLÍ
NÂˆÝ›[™UÊKMŠNÂˆÝ›[™UÊ‹LN
NÂˆÝ›[™UÊKL
NÂˆÝ˜ÛÜÙT]

NÂˆÝ™š[

NÂˆÝœÚYÝÐ›\ˆHÂ‚ˆÝœ™\ÝÜ™J
NÂŸB// --- Core Game Systems & Loop ---

// Rank & Medal Calculation
function calculateRank(s) {
  if (s >= 200) return 'ðŸ‘‘ ThÃ¡nh Bá»• Cá»§i VÃ´ Äá»‹ch';
  if (s >= 100) return 'âš¡ Cao Thá»§ ChÃ©m Cá»§i';
  if (s >= 50) return 'ðŸ² Thá»£ Rá»«ng ChuyÃªn Nghiá»‡p';
  if (s >= 20) return 'ðª¥ TiÃªu Phu Nhanh Nháº·n';
  return 'ðŸ©¹ Táº­p Sá»± Bá»” Cá»¦i';
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
    ctx.globalOpa1city = Math.max(0, this.opacity);
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
    ctw.globalAlpha = Math.max(0, alpha);
    ctw.fillStyle = this.color;
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
    ctw.beginPath();
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
    ctw.globalAlpha = 1 - progress;
    ctw.font = `800 ${this.fontSize}px var(--font-main)`;
    ctx.fillStyle = this.color;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 6;
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
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
    gameOver('Báº¡n Ä‘Ã£ bá»‹ cÃ nh cÃ¢y va trÃºng Ä‘áº§u!');
    return;
  }

  // Safe to chop: Detach log & shift down
  sounds.playChop(side, combo);

  // Spawn Flying Log & Wood Particles
  const logX = trunkBaseX;
  const logY = trunkBaseY;
  flyingLogs.push(new FlyingLog(logX, logY, side));

  const chopImpactX = side === 'LEFT' ? trunkBaseX - TRUNK_WIDTH< * 0.4 : trunkBaseX + TRUNK_WIDTH * 0.4;
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
    gameOver('CÃ nh cÃ¢y rÆ¡i trÃºng Ä‘áº§u báº¡n!');
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
  // Update Player Idle / Chop animation
  player.idleTime += dt * 60;
  if (player.state === 'CHOPPING') {
    player.chopProgress += dt * 10;
    if (player.chopProgress >= 1) {
      player.state = 'IDLE';
      player.chopProgress = 0;
    }
  }

  // Update Environment Leaves & Clouds
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

  // Screen Shake Decay
  if (shakeIntensity > 0) {
    shakeIntensity = Math.max(0, shakeIntensity - dt * 25);
  }

  // Particles
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

  // Time drain in PLAYING state
  if (gameState === STATE.PLAYING) {
    const drainSpeed = 0.55 + Math.min(score * 0.0035, 1.2);
    timeLeft -= drainSpeed * dt * 60;
    if (timeLeft <= 0) {
      timeLeft = 0;
      updateHUD();
      gameOver('ÄÃ£ háº¿t thá»i gian bá»• cá»§i!');
    } else {
      updateHUD();
    }
  }
}

function render() {
  ctx.save();

  // Apply Screen Shake
  if (shakeIntensity > 0) {
    const offsetX = (Math.random() - 0.5) * shakeIntensity;
    const offsetY = (Math.random() - 0.5) * shakeIntensity;
    ctx.translate(offsetX, offsetY);
  }

  // 1. Background
  drawBackground();

  // 2. Tree Trunk Stack
  for (let i = 0; i < treeSegments.length; i++) {
    const segY = trunkBaseY - i * TRUNK_HEIGHT;
    drawTrunkSegment(trunkBaseX, segY, treeSegments[i]);
  }

  // 3. Flying Logs
  flyingLogs.forEach(log => log.draw());

  // 4. Player Character
  const playerOffset = TRUNK_WIDTH< * 0.5 + 46;
  const playerX = player.side === 'LEFT' ? trunkBaseX - playerOffset : trunkBaseX + playerOffset;
  const playerY = trunkBaseY + TRUNK_HEIGHT - 38;

  drawPlayer(playerX, playerY, player.side, player.state, player.chopProgress);

  // 5. Slash Arcs & Wood Chips & Floating Texts
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
