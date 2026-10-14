'use strict';
/* Lumina Rush — a YouTube Playable.
   Levels are plain data (LEVELS below). Each level introduces exactly one new thing:
   teach it alone, then mix it with what the player already knows. */

const IN_YT = typeof ytgame !== 'undefined' && !!(ytgame && ytgame.IN_PLAYABLES_ENV);
const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const wrap = (v, m) => ((v % m) + m) % m;
const TAU = Math.PI * 2;
const FONT = '"Segoe UI Variable Display", "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", Arial, sans-serif';

// One consistent 24px icon set (stroke icons; star/bolt/play are filled)
const ICONS = {
  pause:    '<path d="M8 5v14M16 5v14" stroke-width="3"/>',
  play:     '<path d="M7 4l13 8-13 8z" fill="currentColor" stroke="none"/>',
  back:     '<path d="M15 4l-8 8 8 8"/>',
  close:    '<path d="M6 6l12 12M18 6L6 18"/>',
  retry:    '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 3.5v5h-5"/>',
  home:     '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>',
  map:      '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
  endless:  '<path d="M7 8c-2.5 0-4 1.8-4 4s1.5 4 4 4c4 0 6-8 10-8 2.5 0 4 1.8 4 4s-1.5 4-4 4c-4 0-6-8-10-8z"/>',
  themes:   '<rect x="3.5" y="3.5" width="7" height="7"/><rect x="13.5" y="3.5" width="7" height="7"/><rect x="3.5" y="13.5" width="7" height="7"/><rect x="13.5" y="13.5" width="7" height="7" fill="currentColor"/>',
  settings: '<path d="M4 7h16M4 17h16"/><rect x="13" y="4" width="4" height="6" fill="currentColor"/><rect x="7" y="14" width="4" height="6" fill="currentColor"/>',
  lock:     '<rect x="5" y="11" width="14" height="10"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  star:     '<path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" fill="currentColor" stroke="none"/>',
  shield:   '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/>',
  bolt:     '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  pulse:    '<circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/><path d="M8 8a5.7 5.7 0 0 0 0 8M16 8a5.7 5.7 0 0 1 0 8M5 5a9.9 9.9 0 0 0 0 14M19 5a9.9 9.9 0 0 1 0 14"/>',
  crown:    '<path d="M3 19h18M4 16L3 7l5 4 4-6 4 6 5-4-1 9z"/>',
  ad:       '<rect x="2.5" y="5" width="19" height="14"/><path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none"/>',
  target:   '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>',
};
const icon = (name, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;

// Phone vibration (silently ignored where unsupported)
function buzz(ms) {
  if (!save.haptics || !navigator.vibrate) return;
  try { navigator.vibrate(ms); } catch (e) { /* not allowed here */ }
}

// ======================= CONTENT =======================

const THEMES = [
  { name: 'Aurora',  stars: 0,  bg1: '#050818', bg2: '#0c1430', player: '#38bdf8', accent2: '#818cf8', orb: '#22d3ee', enemy: '#fb3f6c', gold: '#fbbf24' },
  { name: 'Solar',   stars: 8,  bg1: '#12060d', bg2: '#260b1b', player: '#fb923c', accent2: '#f472b6', orb: '#fde047', enemy: '#e879f9', gold: '#38bdf8' },
  { name: 'Emerald', stars: 16, bg1: '#03100c', bg2: '#08231b', player: '#34d399', accent2: '#2dd4bf', orb: '#a7f3d0', enemy: '#fb7185', gold: '#facc15' },
  { name: 'Royal',   stars: 24, bg1: '#0b0618', bg2: '#1c0f35', player: '#c084fc', accent2: '#f0abfc', orb: '#e9d5ff', enemy: '#f97316', gold: '#fde047' },
];

const FEATURES = ['combo', 'pulse', 'gold', 'shield', 'near'];
const WORLDS = ['Awakening', 'Overdrive'];

// goal: collect | survive | near | boss.   star2: { t: 'time' | 'score', n }
const LEVELS = [
  { name: 'First Light',    intro: 'move',   goal: { type: 'collect', n: 12 }, star2: { t: 'time', n: 20 },    foes: {} },
  { name: 'Hunted',         intro: 'seeker', goal: { type: 'collect', n: 16 }, star2: { t: 'time', n: 30 },    foes: { seeker: 1 }, max: 3, every: 2.4, speed: .75 },
  { name: 'Chain Reaction', intro: 'combo',  goal: { type: 'collect', n: 24 }, star2: { t: 'score', n: 700 },  foes: { seeker: 1 }, max: 4, every: 2, speed: .85, unlock: 'combo' },
  { name: 'Shockwave',      intro: 'pulse',  goal: { type: 'survive', n: 40 }, star2: { t: 'score', n: 3000 }, foes: { seeker: 1 }, max: 7, every: 1.1, speed: .95, unlock: 'pulse' },
  { name: 'The Warden',     intro: 'warden', goal: { type: 'boss', boss: 'warden' }, star2: { t: 'time', n: 45 }, foes: { seeker: 1 }, max: 3, every: 2.6, speed: .9 },
  { name: 'Overdrive',      intro: 'gold',   goal: { type: 'collect', n: 30 }, star2: { t: 'score', n: 4000 }, foes: { seeker: 1 }, max: 6, every: 1.3, speed: 1, unlock: 'gold' },
  { name: 'Dashers',        intro: 'dasher', goal: { type: 'survive', n: 45 }, star2: { t: 'score', n: 5000 }, foes: { seeker: 2, dasher: 1 }, max: 6, every: 1.3, speed: 1 },
  { name: 'Shields Up',     intro: 'shield', goal: { type: 'collect', n: 35 }, star2: { t: 'time', n: 55 },    foes: { seeker: 2, dasher: 1 }, max: 8, every: 1.15, speed: 1.05, unlock: 'shield' },
  { name: 'Close Call',     intro: 'near',   goal: { type: 'near', n: 8 },     star2: { t: 'time', n: 40 },    foes: { seeker: 2, dasher: 2 }, max: 7, every: 1.2, speed: 1.05, unlock: 'near' },
  { name: 'Void Titan',     intro: 'titan',  goal: { type: 'boss', boss: 'titan' }, star2: { t: 'time', n: 75 }, foes: { dasher: 1 }, max: 3, every: 3, speed: 1.05 },
];
const ENDLESS = { name: 'Endless', intro: 'endless', goal: { type: 'endless' }, foes: { seeker: 3, dasher: 2 }, max: 5, every: 1.3, speed: 1 };

const INTROS = {
  move:    { tag: 'Tutorial',     title: 'Move',       text: 'Drag anywhere on the screen to steer your core. Collect the orbs.' },
  seeker:  { tag: 'New enemy',    title: 'Seeker',     text: 'Follows you everywhere. Each touch costs a life.' },
  combo:   { tag: 'New mechanic', title: 'Combo',      text: 'Collect orbs in quick succession to raise your score multiplier.' },
  pulse:   { tag: 'New ability',  title: 'Pulse',      text: 'Double-tap anywhere or press the Pulse button to release a shockwave. Recharges over time and with orbs.' },
  warden:  { tag: 'Boss',         title: 'The Warden', text: 'Charges in straight lines. Step aside, then hit it with Pulse four times.' },
  gold:    { tag: 'New power',    title: 'Overdrive',  text: 'Gold orbs give five seconds of invincibility. Anything you touch is destroyed.' },
  dasher:  { tag: 'New enemy',    title: 'Dasher',     text: 'Marks a line, then lunges along it. Get off the line.' },
  shield:  { tag: 'New power-up', title: 'Shield',     text: 'Blocks one hit. Appears on the field and drops from enemies.' },
  near:    { tag: 'New skill',    title: 'Near miss',  text: 'Pass close to an enemy without touching it for bonus points and Pulse charge.' },
  titan:   { tag: 'Boss',         title: 'Void Titan', text: 'Fires rings of bullets with a gap. Pulse clears bullets and deals damage. Six hits.' },
  endless: { tag: 'Unlocked',     title: 'Endless',    text: 'Every enemy, every power, no finish line. Bosses return stronger each time.' },
};

// ======================= SAVE (YouTube cloud save, localStorage fallback) =======================

const save = { v: 1, unlocked: 0, stars: [], best: 0, theme: 0, sound: true, shake: true, haptics: true };

async function loadSave() {
  try {
    const raw = IN_YT ? await ytgame.game.loadData() : localStorage.getItem('lumina_rush');
    if (raw) Object.assign(save, JSON.parse(raw));
  } catch (e) { console.warn('load failed', e); }
}

function persist() {
  const data = JSON.stringify(save);
  try {
    if (IN_YT) {
      const p = ytgame.game.saveData(data);
      if (p && p.catch) p.catch(e => console.warn('save failed', e));
    } else {
      localStorage.setItem('lumina_rush', data);
    }
  } catch (e) { console.warn('save failed', e); }
}

const totalStars = () => save.stars.reduce((a, b) => a + (b || 0), 0);

// ======================= ADS =======================

// Rewarded: resolves true only if the player earned the reward. Locally always grants.
async function rewardedAd(id) {
  if (!IN_YT) return true;
  try { return await ytgame.ads.requestRewardedAd(id); }
  catch (e) { console.warn(e); return false; }
}
// Interstitial: only at natural breaks (between runs). Never tie rewards to it.
async function interstitialAd() {
  if (!IN_YT) return;
  try { await ytgame.ads.requestInterstitialAd(); } catch (e) { console.warn(e); }
}
let finishes = 0; // runs finished since the last interstitial

// ======================= AUDIO (synthesised, no files) =======================

const Sfx = {
  ac: null, master: null, noiseBuf: null, ytAudio: true,
  get on() { return save.sound && this.ytAudio && !!this.ac; },
  init() {
    if (!this.ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ac = new AC();
      this.master = this.ac.createGain();
      this.master.gain.value = .6;
      this.master.connect(this.ac.destination);
      const len = this.ac.sampleRate * .6;
      this.noiseBuf = this.ac.createBuffer(1, len, this.ac.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ac.state === 'suspended') this.ac.resume();
  },
  tone(f, dur, type = 'sine', vol = .15, f2 = 0, delay = 0) {
    if (!this.on) return;
    const t = this.ac.currentTime + delay, o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + .02);
  },
  noise(dur, vol = .3, freq = 800) {
    if (!this.on) return;
    const t = this.ac.currentTime, s = this.ac.createBufferSource(), f = this.ac.createBiquadFilter(), g = this.ac.createGain();
    s.buffer = this.noiseBuf;
    f.type = 'lowpass';
    f.frequency.setValueAtTime(freq, t);
    f.frequency.exponentialRampToValueAtTime(60, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t); s.stop(t + dur);
  },
  collect(i) { const sc = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5, 1568, 1760]; const f = sc[Math.min(i, sc.length - 1)]; this.tone(f, .16, 'sine', .12, f * 1.5); },
  gold()   { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, .3, 'triangle', .1, 0, i * .05)); },
  pulse()  { this.tone(110, .45, 'sine', .32, 440); this.noise(.3, .15, 2400); },
  kill()   { this.tone(320, .12, 'square', .05, 80); this.noise(.14, .14, 1600); },
  hurt()   { this.tone(180, .35, 'sawtooth', .18, 40); this.noise(.35, .35, 900); },
  near()   { this.tone(1200, .08, 'triangle', .09, 1900); },
  shield() { this.tone(440, .25, 'triangle', .12, 880); },
  block()  { this.tone(900, .2, 'square', .06, 300); },
  boom()   { this.noise(.9, .5, 700); this.tone(90, .8, 'sine', .35, 30); },
  warn()   { for (let i = 0; i < 3; i++) this.tone(220, .18, 'square', .07, 200, i * .28); },
  dash()   { this.noise(.25, .12, 3000); },
  shoot()  { this.tone(620, .1, 'triangle', .04, 300); },
  win()    { [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => this.tone(f, .35, 'triangle', .11, 0, i * .09)); },
  star(i)  { this.tone(880 + i * 220, .25, 'triangle', .1, 0); },
  ready()  { this.tone(988, .12, 'sine', .05, 1318); },
  deny()   { this.tone(150, .12, 'square', .05); },
  click()  { this.tone(700, .05, 'sine', .05); },
};

// ======================= CANVAS & RENDER HELPERS =======================

const canvas = $('game');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, DPR = 1, U = 1;
let theme = THEMES[0];
let bgGrad, vignDark, vignRed, vignGold;
let stars = [];

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  U = clamp(Math.min(W, H) / 620, .72, 1.25);
  P.r = 13 * U;
  makeBackground();
}

function makeBackground() {
  bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, theme.bg1);
  bgGrad.addColorStop(1, theme.bg2);
  const inner = Math.min(W, H) * .3, outer = Math.hypot(W, H) * .6;
  const vg = (col) => {
    const g = ctx.createRadialGradient(W / 2, H / 2, inner, W / 2, H / 2, outer);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, col);
    return g;
  };
  vignDark = vg('rgba(0,0,0,.55)');
  vignRed = vg(rgba(theme.enemy, .55));
  vignGold = vg(rgba(theme.gold, .4));
  stars = [];
  const n = Math.floor(W * H / 9000);
  for (let i = 0; i < n; i++) stars.push({ x: rand(0, W), y: rand(0, H), z: rand(.2, 1), tw: rand(0, TAU) });
}

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

const glowCache = new Map();
function glowSprite(color) {
  let s = glowCache.get(color);
  if (s) return s;
  s = document.createElement('canvas');
  s.width = s.height = 128;
  const g = s.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, rgba(color, .9));
  gr.addColorStop(.25, rgba(color, .35));
  gr.addColorStop(1, rgba(color, 0));
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  glowCache.set(color, s);
  return s;
}
// Additive soft glow — far cheaper than shadowBlur
function glow(c, x, y, r, color, a = 1) {
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha = a;
  c.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
}
function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(.1, r), 0, TAU); c.fill(); }
function spikes(c, x, y, r1, r2, n, rot) {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? r2 : r1, a = rot + i * Math.PI / n;
    c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  c.closePath();
}
function poly(c, x, y, r, n) {
  c.beginPath();
  for (let i = 0; i < n; i++) { const a = i / n * TAU; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  c.closePath();
}

// ---- Entity art (takes a context so the intro preview can reuse it) ----
function drawOrb(c, x, y, r, color) {
  glow(c, x, y, r * 3.8, color, 1);
  c.fillStyle = color; circle(c, x, y, r);
  c.fillStyle = '#ffffff'; circle(c, x, y, r * .45);
}
function drawPlayer(c, x, y, r, color, t) {
  glow(c, x, y, r * 4.2, color, .85);
  c.fillStyle = color; circle(c, x, y, r);
  c.fillStyle = '#ffffff'; circle(c, x, y, r * .55);
  c.strokeStyle = color; c.lineWidth = 1.5; c.globalAlpha = .55;
  c.beginPath(); c.arc(x, y, r + 6 + Math.sin(t * 8) * 2, 0, TAU); c.stroke();
  c.globalAlpha = 1;
}
function drawSeeker(c, x, y, r, rot, color, flash) {
  glow(c, x, y, r * 2.6, color, .7);
  c.fillStyle = flash ? '#ffffff' : color;
  spikes(c, x, y, r, r * .55, 6, rot); c.fill();
  c.fillStyle = '#1a0510'; circle(c, x, y, r * .33);
}
function drawDasher(c, x, y, r, ang, color, charge) {
  glow(c, x, y, r * 2.6, color, .6 + charge * .4);
  c.save(); c.translate(x, y); c.rotate(ang);
  c.fillStyle = color;
  c.beginPath(); c.moveTo(r * 1.35, 0); c.lineTo(-r * .9, r * .85); c.lineTo(-r * .4, 0); c.lineTo(-r * .9, -r * .85); c.closePath(); c.fill();
  c.fillStyle = '#ffffff'; c.globalAlpha = .35 + charge * .65; circle(c, r * .25, 0, r * .24);
  c.restore(); c.globalAlpha = 1;
}
function drawWarden(c, x, y, r, rot, color, flash) {
  glow(c, x, y, r * 2.6, color, .85);
  c.fillStyle = flash ? '#ffffff' : color;
  spikes(c, x, y, r, r * .72, 10, rot); c.fill();
  c.fillStyle = '#1a0510'; circle(c, x, y, r * .52);
  c.fillStyle = color; circle(c, x, y, r * .2);
  c.strokeStyle = color; c.lineWidth = 2; c.globalAlpha = .5;
  c.beginPath(); c.arc(x, y, r * .38, -rot * 2, -rot * 2 + 4.5); c.stroke();
  c.globalAlpha = 1;
}
function drawTitan(c, x, y, r, rot, color, flash, look) {
  glow(c, x, y, r * 3, color, .85);
  c.save(); c.translate(x, y); c.rotate(rot);
  c.fillStyle = flash ? '#ffffff' : '#1d0814';
  c.strokeStyle = color; c.lineWidth = Math.max(2, r * .07);
  poly(c, 0, 0, r, 8); c.fill(); c.stroke();
  c.rotate(-rot * 2.4); c.globalAlpha = .6;
  poly(c, 0, 0, r * .7, 8); c.stroke();
  c.restore(); c.globalAlpha = 1;
  c.fillStyle = color; circle(c, x, y, r * .3);
  c.fillStyle = '#ffffff'; circle(c, x + Math.cos(look) * r * .12, y + Math.sin(look) * r * .12, r * .12);
}
// ---- Hex energy shield: a geodesic sphere (hexagons + 12 pentagons) rotated in 3D ----
const v3 = {
  norm: v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; },
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
};

// Subdivide an icosahedron (frequency f) and take its dual: every vertex becomes a tile
// whose corners are the centroids of the triangles around it. Tiles = 10f² + 2.
const geoCache = {};
function geodesic(f) {
  if (geoCache[f]) return geoCache[f];
  const { norm, dot, cross } = v3;
  const g = (1 + Math.sqrt(5)) / 2;
  const V = [[-1, g, 0], [1, g, 0], [-1, -g, 0], [1, -g, 0], [0, -1, g], [0, 1, g], [0, -1, -g], [0, 1, -g], [g, 0, -1], [g, 0, 1], [-g, 0, -1], [-g, 0, 1]].map(norm);
  const F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  const verts = [], ids = new Map(), tris = [];
  const vid = p => {
    const n = norm(p), k = n.map(v => Math.round(v * 1e4)).join(',');
    if (!ids.has(k)) { ids.set(k, verts.length); verts.push(n); }
    return ids.get(k);
  };
  for (const [a, b, c] of F) {
    const A = V[a], B = V[b], C = V[c];
    const at = (i, j) => vid([0, 1, 2].map(k => A[k] + (B[k] - A[k]) * i / f + (C[k] - A[k]) * j / f));
    for (let i = 0; i < f; i++) {
      for (let j = 0; j < f - i; j++) {
        tris.push([at(i, j), at(i + 1, j), at(i, j + 1)]);
        if (j < f - i - 1) tris.push([at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)]);
      }
    }
  }
  const cents = tris.map(t => norm([0, 1, 2].map(k => verts[t[0]][k] + verts[t[1]][k] + verts[t[2]][k])));
  const around = verts.map(() => []);
  tris.forEach((t, ti) => t.forEach(v => around[v].push(ti)));
  return (geoCache[f] = verts.map((n, vi) => {
    const t1 = norm(cross(Math.abs(n[1]) > .9 ? [1, 0, 0] : [0, 1, 0], n)), t2 = cross(n, t1);
    const ang = p => Math.atan2(dot(p, t2), dot(p, t1));
    const ring = around[vi].map(ti => cents[ti]).sort((p, q) => ang(p) - ang(q));
    return { n, poly: ring.map(p => norm(p.map((v, k) => n[k] + (v - n[k]) * .82))) }; // shrink → gaps
  }));
}

// blue at the centre → violet → pink at the rim (fresnel), like a sci-fi energy dome
const SH_A = [95, 160, 255], SH_B = [170, 120, 255], SH_C = [255, 135, 205];
function shieldRGBA(k, a) {
  const [p, q, s] = k < .5 ? [SH_A, SH_B, k * 2] : [SH_B, SH_C, (k - .5) * 2];
  return `rgba(${(p[0] + (q[0] - p[0]) * s) | 0},${(p[1] + (q[1] - p[1]) * s) | 0},${(p[2] + (q[2] - p[2]) * s) | 0},${a})`;
}
// tile edges: the tile colour pushed most of the way to white
function shieldEdge(k, a) {
  const [p, q, s] = k < .5 ? [SH_A, SH_B, k * 2] : [SH_B, SH_C, (k - .5) * 2];
  const w = .65, ch = i => ((p[i] + (q[i] - p[i]) * s) * (1 - w) + 255 * w) | 0;
  return `rgba(${ch(0)},${ch(1)},${ch(2)},${a})`;
}
function shieldRotator(t) {
  const ca = Math.cos(t * .5), sa = Math.sin(t * .5), cb = Math.cos(.42), sb = Math.sin(.42);
  return v => {
    const x = v[0] * ca + v[2] * sa, z = -v[0] * sa + v[2] * ca;
    return [x, v[1] * cb - z * sb, v[1] * sb + z * cb];
  };
}

// o: { f: detail, alpha, appear: 0..1 build-in sweep, hit: { dir, age, power }, flash: 0..1 }
function drawHexShield(c, x, y, R, t, o = {}) {
  const tiles = geodesic(o.f || 3), rot = shieldRotator(t);
  const alpha = o.alpha == null ? 1 : o.alpha, appear = o.appear == null ? 1 : o.appear, flash = o.flash || 0;
  glow(c, x, y, R * 2, '#8b7bff', .3 * alpha * appear);
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.lineJoin = 'round';
  c.lineWidth = Math.max(.6, R * .035);
  for (const front of [false, true]) {
    if (front) {
      // fresnel rim between the back and front shells
      const g = c.createRadialGradient(x, y, R * .5, x, y, R * 1.07);
      g.addColorStop(0, 'rgba(90,120,255,0)');
      g.addColorStop(.78, `rgba(150,110,255,${.14 * alpha * appear})`);
      g.addColorStop(.94, `rgba(255,150,215,${(.5 + flash * .4) * alpha * appear})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.beginPath(); c.arc(x, y, R * 1.07, 0, TAU); c.fill();
    }
    for (const tile of tiles) {
      const cn = rot(tile.n);
      if ((cn[2] > 0) !== front) continue;
      const k = appear >= 1 ? 1 : clamp(appear * 2.4 - (cn[1] + 1) * .7, 0, 1); // sweeps in bottom → top
      if (k <= 0) continue;
      const fres = 1 - Math.abs(cn[2]);
      let lit = 0;
      if (o.hit) {
        const d = Math.acos(clamp(v3.dot(cn, o.hit.dir), -1, 1));
        lit = Math.exp(-((d - o.hit.age * 6) ** 2) / .07) * Math.max(0, 1 - o.hit.age / .55) * (o.hit.power || 1);
      }
      const a = alpha * k * (front ? 1 : .28);
      c.beginPath();
      for (let i = 0; i < tile.poly.length; i++) {
        const q = rot(tile.poly[i]);
        if (i) c.lineTo(x + q[0] * R, y + q[1] * R); else c.moveTo(x + q[0] * R, y + q[1] * R);
      }
      c.closePath();
      c.fillStyle = shieldRGBA(fres, Math.min(1, (.32 + .25 * fres + lit * .7 + flash * .45) * a));
      c.fill();
      c.strokeStyle = shieldEdge(fres, Math.min(1, (.35 + .6 * fres + lit + flash) * a));
      c.stroke();
    }
  }
  c.restore();
}

function drawShieldPick(c, x, y, r, t) {
  glow(c, x, y, r * 2.6, '#7dd3fc', .55);
  drawHexShield(c, x, y, r, t * 1.6, { f: 2 });
}

// ======================= GAME STATE =======================

let mode = 'menu'; // menu | levels | intro | play | pause | dying | clear | win | fail
let R = null;      // current run
const P = { x: 0, y: 0, tx: 0, ty: 0, r: 13 };
let orbs = [], foes = [], bullets = [], picks = [], parts = [], rings = [], texts = [], trail = [];
let trauma = 0, hitStop = 0, punch = 0, flashA = 0, flashC = '#ffffff';
// shield visuals (logic lives in R.shield): build-in timer, impact ripple, break countdown, shards
let shieldFx = { born: 1, hit: null, breakT: 0, shimmerT: 2 };
let shards = [];
let introLv = 0;
const ambient = [];

const featureOn = (lv, f) => lv < 0 || LEVELS.slice(0, lv + 1).some(l => l.unlock === f);
const has = f => R && R.features.has(f);
const mult = () => (has('combo') ? Math.min(10, 1 + Math.floor(R.combo / 3)) : 1);
const gain = base => Math.round(base * mult());
const speedMul = () => R.cfg.speed * (R.lv < 0 ? 1 + Math.min(R.t / 200, .6) : 1);

function addTrauma(v) { trauma = Math.min(1, trauma + v); }
function hitstop(s) { hitStop = Math.max(hitStop, s); }
function flash(color, a) { flashC = color; flashA = Math.max(flashA, a); }
function burst(x, y, color, n, spd) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), s = rand(.25, 1) * spd * U;
    parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(.35, .8), max: .8, r: rand(1.5, 3.5) * U, color });
  }
  if (parts.length > 700) parts.splice(0, parts.length - 700);
}
function text(x, y, str, color, size = 16) {
  texts.push({ x, y, str, color, size: size * U, life: .9, max: .9, vy: -70 * U });
}
function fxRing(x, y, color, max, spd = 700) {
  rings.push({ x, y, r: 4 * U, max: max * U, spd: spd * U, color, dmg: false, w: 3 });
}

// ======================= RUN LIFECYCLE =======================

async function startRun(lv, boost = false) {
  if (finishes >= 3) { finishes = 0; await interstitialAd(); }
  Sfx.init();
  const cfg = lv < 0 ? ENDLESS : LEVELS[lv];
  R = {
    lv, cfg, t: 0, score: 0, shown: 0, combo: 0, comboT: 0, maxCombo: 0, lives: 3, hits: 0,
    pulse: 100, over: 0, inv: 1, shield: boost, collected: 0, nears: 0, kills: 0,
    spawnT: lv === 1 ? .6 : 1.4, orbT: 0, pickT: cfg.intro === 'shield' ? 2 : rand(12, 18),
    boss: null, bossDone: false, revived: false, wave: 1, bossN: 0, prevBoss: 0, nextBoss: 4000,
    features: new Set(FEATURES.filter(f => featureOn(lv, f))),
  };
  orbs = []; foes = []; bullets = []; picks = []; parts = []; rings = []; texts = []; trail = []; shards = [];
  shieldFx = { born: 0, hit: null, breakT: 0, shimmerT: 2 };
  P.x = P.tx = W / 2; P.y = P.ty = H * .62;
  for (let i = 0; i < 6; i++) spawnOrb(false);
  if (cfg.intro === 'gold') spawnOrb(true);

  $('btnPulse').classList.toggle('hidden', !has('pulse'));
  $('combo').classList.toggle('hidden', !has('combo'));
  mode = 'play';
  show(null);
  lastTap = null;
  banner(lv < 0 ? 'Endless' : `Level ${lv + 1}`, lv < 0 ? 'Survive' : cfg.name);
}

function goalProgress() {
  const g = R.cfg.goal;
  if (g.type === 'collect') return [R.collected, g.n];
  if (g.type === 'survive') return [Math.min(R.t, g.n), g.n];
  if (g.type === 'near') return [R.nears, g.n];
  if (g.type === 'boss') return R.bossDone ? [1, 1] : R.boss ? [(R.boss.max - R.boss.hp) / R.boss.max, 1] : [0, 1];
  return [0, 1];
}

function levelClear() {
  mode = 'clear';
  R.clearT = 1.5;
  for (const f of foes) { f.dead = true; burst(f.x, f.y, theme.enemy, 14, 260); }
  bullets = [];
  fxRing(P.x, P.y, theme.player, Math.hypot(W, H), 1400);
  Sfx.win();
  addTrauma(.3);
  buzz(40);
  banner(`Level ${R.lv + 1}`, 'Complete', 'gold');
}

function die() {
  mode = 'dying';
  R.deathT = 1.2;
  burst(P.x, P.y, theme.player, 60, 520);
  burst(P.x, P.y, '#ffffff', 20, 300);
  fxRing(P.x, P.y, theme.enemy, 320, 900);
  addTrauma(1); hitstop(.2); punch = .1; flash(theme.enemy, .5);
  Sfx.boom();
  buzz([60, 40, 120]);
}

function showWin() {
  mode = 'win';
  finishes++;
  const lv = R.lv, cfg = R.cfg;
  const s2 = cfg.star2.t === 'time' ? R.t <= cfg.star2.n : R.score >= cfg.star2.n;
  const s3 = R.hits === 0;
  const got = [true, s2, s3];
  const count = got.filter(Boolean).length;
  save.stars[lv] = Math.max(save.stars[lv] || 0, count);
  save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length, lv + 1));
  persist();

  $('winKicker').textContent = `Level ${lv + 1}`;
  $('winName').textContent = cfg.name;
  [...$('winStars').children].forEach((s, i) => {
    s.classList.remove('on');
    if (got[i]) {
      void s.offsetWidth;
      s.classList.add('on');
      setTimeout(() => Sfx.star(i), 250 + i * 250);
    }
  });
  $('winChecks').innerHTML = [
    ['Clear the level', true],
    [star2Text(cfg.star2), s2],
    ['Take no damage', s3],
  ].map(([t, ok]) => objective(ok ? 'on' : '', 'star', t)).join('');
  $('winScore').textContent = R.score.toLocaleString();
  $('winTime').textContent = R.t.toFixed(1) + 's';
  $('winCombo').textContent = has('combo') ? R.maxCombo : '–';
  $('btnNext').textContent = lv + 1 < LEVELS.length ? 'Next' : 'Endless';
  show('win');
}

function showFail() {
  mode = 'fail';
  finishes++;
  const endless = R.lv < 0;
  let isBest = false;
  if (endless) {
    if (R.score > save.best) { save.best = R.score; isBest = true; }
    persist();
    try { if (IN_YT) ytgame.engagement.sendScore({ value: save.best }); } catch (e) { console.warn(e); }
  }
  $('failKicker').textContent = endless ? 'Endless' : `Level ${R.lv + 1}`;
  $('failName').textContent = endless ? (isBest ? 'New personal best' : `Best ${save.best.toLocaleString()}`) : R.cfg.name;
  $('failTitle').textContent = endless ? 'Game over' : 'Out of lives';
  let pct;
  if (endless) {
    pct = 1;
    $('failPct').textContent = R.wave;
    $('failPctLabel').textContent = 'Wave';
  } else {
    const [a, b] = goalProgress();
    pct = clamp(a / b, 0, 1);
    $('failPct').textContent = Math.floor(pct * 100) + '%';
    $('failPctLabel').textContent = pct >= .75 ? 'So close' : 'Complete';
  }
  // animate the meter from empty to the reached percentage
  const arc = $('failArc');
  arc.style.transition = 'none';
  arc.style.strokeDashoffset = 326.73;
  setTimeout(() => {
    arc.style.transition = '';
    arc.style.strokeDashoffset = (326.73 * (1 - pct)).toFixed(1);
  }, 30);
  $('failScore').textContent = R.score.toLocaleString();
  $('failBestLabel').textContent = endless ? 'Best' : 'Destroyed';
  $('failBest').textContent = endless ? save.best.toLocaleString() : R.kills;
  $('btnRevive').classList.toggle('hidden', R.revived);
  $('btnRevive').disabled = false;
  show('fail');
}

async function revive() {
  $('btnRevive').disabled = true;
  const ok = await rewardedAd('revive');
  if (!ok) { $('btnRevive').disabled = false; return; }
  R.revived = true;
  R.lives = 2;
  R.inv = 2.5;
  bullets = [];
  P.tx = P.x; P.ty = P.y;
  mode = 'play';
  show(null);
  rings.push({ x: P.x, y: P.y, r: 10 * U, max: 340 * U, spd: 1200 * U, color: theme.player, dmg: true, hit: new Set(), w: 6 });
  addTrauma(.6); flash('#ffffff', .4);
  Sfx.pulse();
  buzz(40);
  banner('+2 lives', 'Revived', 'gold');
}

function pauseGame() {
  if (mode !== 'play') return;
  mode = 'pause';
  show('pause');
}
function resumeGame() {
  if (mode !== 'pause') return;
  mode = 'play';
  show(null);
}

// ======================= SPAWNING =======================

function spawnOrb(gold) {
  const m = 40 * U, top = 110 * U;
  let x, y, tries = 0;
  do {
    x = rand(m, W - m); y = rand(top, H - m); tries++;
  } while (tries < 12 && (Math.hypot(x - P.x, y - P.y) < 110 * U || (x > W - 140 * U && y > H - 140 * U)));
  orbs.push({ x, y, vx: rand(-18, 18) * U, vy: rand(-18, 18) * U, r: (gold ? 13 : 9.5) * U, gold, ph: rand(0, TAU), s: 0 });
}

function edgePoint() {
  const pad = 40 * U, s = Math.random() * 4 | 0;
  if (s === 0) return { x: rand(0, W), y: -pad };
  if (s === 1) return { x: W + pad, y: rand(0, H) };
  if (s === 2) return { x: rand(0, W), y: H + pad };
  return { x: -pad, y: rand(0, H) };
}

function spawnFoe(type) {
  const p = edgePoint(), sp = speedMul();
  const f = { type, x: p.x, y: p.y, vx: 0, vy: 0, ang: rand(0, TAU), spin: rand(-2.5, 2.5), flash: 0, near: false, nearCd: 0, age: 0, dead: false };
  if (type === 'seeker') { f.r = 14 * U; f.spd = rand(85, 110) * U * sp; }
  else if (type === 'dasher') { f.r = 13 * U; f.spd = 70 * U * sp; f.state = 'move'; f.st = rand(1, 1.8); f.dir = 0; }
  foes.push(f);
}

function spawnBoss(kind) {
  const scale = R.lv < 0 ? 1 + R.bossN * .4 : 1;
  const b = { boss: true, type: kind, x: W / 2, y: -60 * U, vx: 0, vy: 0, ang: 0, flash: 0, inv: 0, age: 0, look: 0, st: 0, shot: 0, dead: false };
  if (kind === 'warden') { b.r = 40 * U; b.hp = b.max = Math.round(4 * scale); b.spd = 75 * U; b.state = 'move'; b.st = 3; }
  else { b.r = 46 * U; b.hp = b.max = Math.round(6 * scale); b.st = 2; }
  R.boss = b;
  banner('Warning · Boss', kind === 'warden' ? 'The Warden' : 'Void Titan', 'bad');
  buzz([40, 60, 40]);
  Sfx.warn();
  addTrauma(.5);
}

function spawnPick() {
  const m = 60 * U;
  picks.push({ x: rand(m, W - m), y: rand(120 * U, H - m), life: 9, ph: 0 });
}

function pickWeighted(weights) {
  const entries = Object.entries(weights);
  let r = Math.random() * entries.reduce((a, [, w]) => a + w, 0);
  for (const [k, w] of entries) { if ((r -= w) <= 0) return k; }
  return entries[0][0];
}

function director(g) {
  const c = R.cfg;
  if (c.goal.type === 'boss' && !R.boss && !R.bossDone && R.t >= 1.6) spawnBoss(c.goal.boss);
  if (R.lv < 0) {
    const w = 1 + Math.floor(R.t / 30);
    if (w > R.wave) { R.wave = w; banner('Endless', `Wave ${w}`); }
    if (!R.boss && R.score >= R.nextBoss) spawnBoss(R.bossN % 2 ? 'titan' : 'warden');
  }
  if (!Object.keys(c.foes).length) return;
  R.spawnT -= g;
  if (R.spawnT > 0) return;
  R.spawnT = (R.lv < 0 ? Math.max(.45, c.every - R.t * .006) : c.every) * rand(.75, 1.25);
  let max = R.lv < 0 ? Math.min(14, c.max + Math.floor(R.t / 20)) : c.max;
  if (R.boss) max = Math.min(max, 4);
  if (foes.length < max) spawnFoe(pickWeighted(c.foes));
}

// ======================= COMBAT =======================

function collect(o) {
  o.dead = true;
  R.collected++;
  if (has('combo')) {
    R.combo++;
    R.comboT = 3.2;
    R.maxCombo = Math.max(R.maxCombo, R.combo);
    if (R.combo % 3 === 0) bumpCombo();
  }
  const pts = gain(o.gold ? 50 : 10);
  R.score += pts;
  if (has('pulse')) R.pulse = Math.min(100, R.pulse + (o.gold ? 40 : 7));
  if (o.gold) {
    R.over = 5;
    Sfx.gold();
    addTrauma(.35); punch = .05; flash(theme.gold, .25);
    fxRing(o.x, o.y, theme.gold, 220, 900);
    banner('Power', 'Overdrive', 'gold');
    buzz(25);
  } else {
    Sfx.collect(Math.max(0, R.combo - 1));
  }
  burst(o.x, o.y, o.gold ? theme.gold : theme.orb, 12, 220);
  text(o.x, o.y - 10 * U, '+' + pts, o.gold ? theme.gold : theme.orb, o.gold ? 20 : 15);
}

function killFoe(f) {
  if (f.dead) return;
  f.dead = true;
  R.kills++;
  const pts = gain(25);
  R.score += pts;
  text(f.x, f.y, '+' + pts, theme.orb, 15);
  burst(f.x, f.y, theme.enemy, 18, 280);
  burst(f.x, f.y, '#ffffff', 5, 160);
  addTrauma(.18); hitstop(.03);
  Sfx.kill();
  if (has('shield') && !R.shield && !picks.length && Math.random() < .16) picks.push({ x: f.x, y: f.y, life: 9, ph: 0 });
}

function damageBoss() {
  const b = R.boss;
  if (!b || b.inv > 0) return;
  b.hp--;
  b.inv = .35;
  b.flash = .15;
  addTrauma(.55); hitstop(.07); punch = .04;
  Sfx.kill();
  burst(b.x, b.y, theme.enemy, 26, 340);
  buzz(30);
  if (b.hp <= 0) killBoss();
}

function killBoss() {
  const b = R.boss;
  R.boss = null;
  const pts = gain(1000);
  R.score += pts;
  text(b.x, b.y + 20 * U, '+' + pts, theme.gold, 28);
  burst(b.x, b.y, theme.enemy, 80, 600);
  burst(b.x, b.y, theme.gold, 40, 420);
  fxRing(b.x, b.y, theme.enemy, 400, 1000);
  fxRing(b.x, b.y, '#ffffff', 260, 700);
  addTrauma(1); hitstop(.25); punch = .12; flash('#ffffff', .6);
  Sfx.boom();
  buzz([80, 50, 160]);
  for (const f of foes) { if (!f.dead) { f.dead = true; burst(f.x, f.y, theme.enemy, 12, 240); } }
  bullets = [];
  if (R.lv < 0) {
    R.bossN++;
    R.prevBoss = R.score;
    R.nextBoss = R.score + 5000 + R.bossN * 1500;
    R.lives = Math.min(3, R.lives + 1);
    banner('+1 life', 'Boss down', 'gold');
  } else {
    R.bossDone = true;
  }
}

function hurt(src) {
  if (mode !== 'play' || R.inv > 0 || R.over > 0) return false;
  // knock the player away from what hit them
  if (src) {
    const d = Math.hypot(P.x - src.x, P.y - src.y) || 1;
    P.tx = clamp(P.x + (P.x - src.x) / d * 90 * U, 0, W);
    P.ty = clamp(P.y + (P.y - src.y) / d * 90 * U, 0, H);
  }
  if (R.shield) {
    R.shield = false;
    R.inv = 1;
    // ripple runs out from the impact point, then the shield shatters (see updateShieldFx)
    const dx = src ? src.x - P.x : 0, dy = src ? src.y - P.y : -1, dl = Math.hypot(dx, dy) || 1;
    shieldFx.hit = { dir: v3.norm([dx / dl * .8, dy / dl * .8, .6]), age: 0, power: 1.4 };
    shieldFx.breakT = .22;
    Sfx.block();
    buzz(25);
    addTrauma(.45); hitstop(.06);
    text(P.x, P.y - 40 * U, 'BLOCKED', '#c7d2fe', 16);
    if (src && !src.boss && !src.bullet) killFoe(src);
    return true;
  }
  R.lives--;
  R.hits++;
  R.combo = 0;
  R.inv = 1.7;
  Sfx.hurt();
  buzz(70);
  addTrauma(.9); hitstop(.14); punch = .07; flash(theme.enemy, .35);
  burst(P.x, P.y, theme.enemy, 30, 380);
  for (const b of bullets) if (Math.hypot(b.x - P.x, b.y - P.y) < 150 * U) b.dead = true;
  if (src && !src.boss && !src.bullet) { src.dead = true; burst(src.x, src.y, theme.enemy, 14, 240); }
  if (R.lives <= 0) die();
  return true;
}

const SHIELD_R = () => P.r * 2.5;

// Runs on real time (keeps animating through hit-stop).
function updateShieldFx(dt) {
  if (!R) return;
  shieldFx.born += dt;
  if (shieldFx.hit) {
    shieldFx.hit.age += dt;
    if (shieldFx.hit.age > .6) shieldFx.hit = null;
  }
  // idle shimmer: a soft wave every couple of seconds so the shield feels alive
  if (R.shield && !shieldFx.hit) {
    shieldFx.shimmerT -= dt;
    if (shieldFx.shimmerT <= 0) {
      shieldFx.shimmerT = rand(1.6, 2.8);
      const a = rand(0, TAU);
      shieldFx.hit = { dir: v3.norm([Math.cos(a), Math.sin(a), .8]), age: 0, power: .45 };
    }
  }
  if (shieldFx.breakT > 0) {
    shieldFx.breakT -= dt;
    if (shieldFx.breakT <= 0) shatterShield();
  }
}

// Turn each visible tile into a flying glass shard
function shatterShield() {
  const rot = shieldRotator(clock), R0 = SHIELD_R();
  for (const tile of geodesic(3)) {
    const cn = rot(tile.n);
    if (cn[2] < -.1) continue;
    const cx = P.x + cn[0] * R0, cy = P.y + cn[1] * R0;
    const out = Math.hypot(cn[0], cn[1]) || 1, sp = rand(140, 330) * U;
    shards.push({
      x: cx, y: cy,
      vx: cn[0] / out * sp + rand(-30, 30) * U, vy: cn[1] / out * sp + rand(-30, 30) * U,
      a: 0, va: rand(-7, 7), life: rand(.45, .8), max: .8, fres: 1 - Math.abs(cn[2]),
      pts: tile.poly.map(p => { const q = rot(p); return [(q[0] - cn[0]) * R0, (q[1] - cn[1]) * R0]; }),
    });
  }
  Sfx.noise(.4, .25, 5000);
  fxRing(P.x, P.y, '#c4b5fd', 150, 700);
  addTrauma(.25);
}

function nearMiss(f) {
  R.nears++;
  const pts = gain(30);
  R.score += pts;
  if (has('pulse')) R.pulse = Math.min(100, R.pulse + 12);
  if (has('combo')) { R.combo++; R.comboT = 3.2; R.maxCombo = Math.max(R.maxCombo, R.combo); }
  text((P.x + f.x) / 2, (P.y + f.y) / 2 - 16 * U, 'NEAR MISS +' + pts, '#ffffff', 15);
  Sfx.near();
  addTrauma(.12);
}

function doPulse() {
  if (mode !== 'play' || !has('pulse')) return;
  if (R.pulse < 100) {
    Sfx.deny();
    const b = $('btnPulse');
    b.classList.remove('deny'); void b.offsetWidth; b.classList.add('deny');
    return;
  }
  R.pulse = 0;
  rings.push({ x: P.x, y: P.y, r: P.r, max: 240 * U, spd: 1100 * U, color: theme.player, dmg: true, hit: new Set(), w: 6 });
  Sfx.pulse();
  buzz(18);
  addTrauma(.35); punch = .035; hitstop(.03);
  burst(P.x, P.y, theme.player, 22, 320);
}

function bumpCombo() {
  const c = $('combo');
  c.classList.add('bump');
  setTimeout(() => c.classList.remove('bump'), 120);
}

// ======================= UPDATE =======================

function steer(f, tx, ty, k, g) {
  const a = 1 - Math.exp(-k * g);
  f.vx += (tx - f.vx) * a;
  f.vy += (ty - f.vy) * a;
}

function updateFoe(f, g) {
  f.age += g;
  f.ang += f.spin * g;
  f.nearCd -= g;
  const dx = P.x - f.x, dy = P.y - f.y, d = Math.hypot(dx, dy) || 1;
  if (f.type === 'seeker') {
    steer(f, dx / d * f.spd, dy / d * f.spd, 2.4, g);
  } else if (f.type === 'dasher') {
    f.st -= g;
    if (f.state === 'move') {
      const want = d > 230 * U ? 1 : -.3;
      steer(f, dx / d * f.spd * want, dy / d * f.spd * want, 2, g);
      f.dir = Math.atan2(dy, dx);
      const inside = f.x > 0 && f.x < W && f.y > 0 && f.y < H;
      if (f.st <= 0 && inside) { f.state = 'aim'; f.st = .9; }
    } else if (f.state === 'aim') {
      const damp = Math.pow(.02, g);
      f.vx *= damp; f.vy *= damp;
      if (f.st > .35) f.dir = Math.atan2(dy, dx);
      if (f.st <= 0) {
        f.state = 'dash'; f.st = .55;
        const s = 640 * U * speedMul();
        f.vx = Math.cos(f.dir) * s; f.vy = Math.sin(f.dir) * s;
        Sfx.dash();
      }
    } else if (f.state === 'dash') {
      if (Math.random() < .6) parts.push({ x: f.x, y: f.y, vx: 0, vy: 0, life: .3, max: .3, r: f.r * .5, color: theme.enemy });
      if (f.st <= 0) { f.state = 'rest'; f.st = .5; }
    } else {
      const damp = Math.pow(.05, g);
      f.vx *= damp; f.vy *= damp;
      if (f.st <= 0) { f.state = 'move'; f.st = rand(1.2, 2); }
    }
  }
  f.x += f.vx * g;
  f.y += f.vy * g;
}

function updateBoss(b, g) {
  b.age += g;
  b.flash = Math.max(0, b.flash - g);
  b.inv -= g;
  const dx = P.x - b.x, dy = P.y - b.y, d = Math.hypot(dx, dy) || 1;
  const rage = b.hp <= b.max / 2;
  b.look = Math.atan2(dy, dx);
  if (b.type === 'warden') {
    b.ang += g * (b.state === 'dash' ? 8 : 1.2);
    b.st -= g;
    if (b.state === 'move') {
      const s = b.spd * (rage ? 1.35 : 1);
      steer(b, dx / d * s, dy / d * s, 1.4, g);
      if (b.st <= 0) { b.state = 'aim'; b.st = rage ? .75 : 1; }
    } else if (b.state === 'aim') {
      const damp = Math.pow(.02, g);
      b.vx *= damp; b.vy *= damp;
      if (b.st > .3) b.dir = Math.atan2(dy, dx);
      if (b.st <= 0) {
        b.state = 'dash'; b.st = .7;
        const s = (rage ? 680 : 560) * U;
        b.vx = Math.cos(b.dir) * s; b.vy = Math.sin(b.dir) * s;
        Sfx.dash(); addTrauma(.2);
      }
    } else if (b.state === 'dash') {
      if (b.st <= 0) { b.state = 'rest'; b.st = .5; }
    } else {
      const damp = Math.pow(.05, g);
      b.vx *= damp; b.vy *= damp;
      if (b.st <= 0) { b.state = 'move'; b.st = rage ? rand(1.6, 2.4) : rand(2.5, 3.4); }
    }
    b.x += b.vx * g;
    b.y += b.vy * g;
    if (b.age > 2) {
      if (b.x < b.r || b.x > W - b.r) { b.vx *= -.6; b.x = clamp(b.x, b.r, W - b.r); if (b.state === 'dash') addTrauma(.3); }
      if (b.y < b.r || b.y > H - b.r) { b.vy *= -.6; b.y = clamp(b.y, b.r, H - b.r); if (b.state === 'dash') addTrauma(.3); }
    }
  } else {
    const tx = W / 2 + Math.sin(b.age * .45) * W * .3, ty = H * .26;
    const a = 1 - Math.exp(-2 * g);
    b.x += (tx - b.x) * a;
    b.y += (ty - b.y) * a;
    b.ang += g * (rage ? 1.2 : .6);
    if (b.age > 1.8) {
      b.st -= g;
      if (b.st <= 0) { titanFire(b, rage); b.st = rage ? 1.25 : 1.8; }
    }
  }
}

function titanFire(b, rage) {
  b.shot++;
  if (b.shot % 2) {
    // ring with a 2-bullet gap to slip through
    const n = rage ? 18 : 14, sp = (rage ? 170 : 140) * U, off = b.age * .7, gap = Math.random() * n | 0;
    for (let i = 0; i < n; i++) {
      if (i === gap || i === (gap + 1) % n) continue;
      const a = off + i / n * TAU;
      bullets.push({ bullet: true, x: b.x + Math.cos(a) * b.r * .8, y: b.y + Math.sin(a) * b.r * .8, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 6 * U, dead: false });
    }
  } else {
    // aimed spread
    const base = Math.atan2(P.y - b.y, P.x - b.x), sp = 230 * U;
    for (const s of (rage ? [-.3, -.15, 0, .15, .3] : [-.2, 0, .2])) {
      const a = base + s;
      bullets.push({ bullet: true, x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 6 * U, dead: false });
    }
  }
  Sfx.shoot();
  addTrauma(.08);
}

function collideFoe(f) {
  const d = Math.hypot(P.x - f.x, P.y - f.y);
  if (d < P.r + f.r * .85) {
    if (R.over > 0) {
      if (f.boss) { if (f.inv <= 0) { damageBoss(); f.inv = .8; } }
      else killFoe(f);
    } else {
      hurt(f);
    }
    return;
  }
  if (f.boss || !has('near')) return;
  // near miss: get close, then get away without touching
  const gap = d - (P.r + f.r);
  if (gap < 32 * U) f.near = true;
  else if (f.near && gap > 56 * U) {
    f.near = false;
    if (f.nearCd <= 0 && R.inv <= 0) { f.nearCd = .8; nearMiss(f); }
  }
}

function update(dt) {
  if (hitStop > 0) { hitStop -= dt; return; }
  const ts = mode === 'dying' ? .25 : mode === 'clear' ? .4 : 1;
  const g = dt * ts;
  const live = mode === 'play';

  if (live) {
    R.t += g;
    // player follows target smoothly (frame-rate independent), with a top speed
    const k = 1 - Math.exp(-22 * dt);
    let mx = (P.tx - P.x) * k, my = (P.ty - P.y) * k;
    const md = Math.hypot(mx, my), cap = 1000 * U * dt;
    if (md > cap) { mx *= cap / md; my *= cap / md; }
    P.x = clamp(P.x + mx, P.r, W - P.r);
    P.y = clamp(P.y + my, P.r, H - P.r);
    trail.unshift({ x: P.x, y: P.y });
    if (trail.length > 18) trail.pop();

    if (R.over > 0) {
      R.over -= g;
      if (Math.random() < .6) parts.push({ x: P.x + rand(-8, 8) * U, y: P.y + rand(-8, 8) * U, vx: rand(-40, 40) * U, vy: rand(-40, 40) * U, life: .4, max: .4, r: rand(1.5, 3) * U, color: theme.gold });
    }
    R.inv -= g;
    if (R.combo > 0 && has('combo')) {
      R.comboT -= g;
      if (R.comboT <= 0) {
        if (R.combo >= 6) text(P.x, P.y - 34 * U, 'COMBO LOST', '#7f8aa3', 13);
        R.combo = 0;
      }
    }
    if (has('pulse') && R.pulse < 100) {
      R.pulse = Math.min(100, R.pulse + 11 * g);
      if (R.pulse >= 100) Sfx.ready();
    }
    director(g);
    if (orbs.length < 6) {
      R.orbT -= g;
      if (R.orbT <= 0) {
        R.orbT = .35;
        spawnOrb(has('gold') && R.over <= 0 && !orbs.some(o => o.gold) && Math.random() < .1);
      }
    }
    if (has('shield')) {
      R.pickT -= g;
      if (R.pickT <= 0) { R.pickT = rand(14, 20); if (!R.shield && !picks.length) spawnPick(); }
    }
  }

  // orbs
  const m = 30 * U;
  for (const o of orbs) {
    if (o.dead) continue;
    o.s = Math.min(1, o.s + g * 4);
    o.ph += g * 4;
    o.x += o.vx * g; o.y += o.vy * g;
    if (o.x < m) { o.x = m; o.vx = Math.abs(o.vx); }
    if (o.x > W - m) { o.x = W - m; o.vx = -Math.abs(o.vx); }
    if (o.y < 90 * U) { o.y = 90 * U; o.vy = Math.abs(o.vy); }
    if (o.y > H - m) { o.y = H - m; o.vy = -Math.abs(o.vy); }
    if (!live) continue;
    const d = Math.hypot(P.x - o.x, P.y - o.y);
    const pull = R.over > 0 ? 300 * U : 85 * U;
    if (d < pull) {
      const a = 1 - Math.exp(-(R.over > 0 ? 7 : 4) * g);
      o.x += (P.x - o.x) * a; o.y += (P.y - o.y) * a;
    }
    if (d < P.r + o.r + 4 * U) collect(o);
  }

  // enemies
  for (const f of foes) {
    if (f.dead) continue;
    updateFoe(f, g);
    if (live) collideFoe(f);
  }
  if (R.boss) {
    updateBoss(R.boss, g);
    if (live && R.boss) collideFoe(R.boss);
  }
  // keep enemies from stacking
  for (let i = 0; i < foes.length; i++) {
    const a = foes[i];
    if (a.dead) continue;
    for (let j = i + 1; j < foes.length; j++) {
      const b = foes[j];
      if (b.dead) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = a.r + b.r;
      if (d > 0 && d < min) {
        const push = (min - d) / 2;
        a.x -= dx / d * push; a.y -= dy / d * push;
        b.x += dx / d * push; b.y += dy / d * push;
      }
    }
  }

  // bullets
  for (const b of bullets) {
    if (b.dead) continue;
    b.x += b.vx * g; b.y += b.vy * g;
    if (b.x < -40 || b.x > W + 40 || b.y < -40 || b.y > H + 40) { b.dead = true; continue; }
    if (live && Math.hypot(b.x - P.x, b.y - P.y) < P.r * .8 + b.r) {
      if (R.over > 0) { b.dead = true; burst(b.x, b.y, theme.gold, 4, 120); }
      else if (hurt(b)) b.dead = true;
    }
  }

  // pickups
  for (const p of picks) {
    p.life -= g; p.ph += g;
    if (live && !p.dead && Math.hypot(p.x - P.x, p.y - P.y) < P.r + 18 * U) {
      p.dead = true;
      R.shield = true;
      shieldFx = { born: 0, hit: null, breakT: 0, shimmerT: 2 };
      Sfx.shield();
      fxRing(p.x, p.y, '#7dd3fc', 120);
      text(p.x, p.y - 20 * U, 'SHIELD', '#7dd3fc', 18);
    }
  }

  // shockwaves
  for (const r of rings) {
    r.r += r.spd * g;
    if (!r.dmg || !R) continue;
    for (const f of foes) {
      if (!f.dead && !r.hit.has(f) && Math.hypot(f.x - r.x, f.y - r.y) <= r.r + f.r) { r.hit.add(f); killFoe(f); }
    }
    const b = R.boss;
    if (b && !r.hitBoss && Math.hypot(b.x - r.x, b.y - r.y) <= r.r + b.r) { r.hitBoss = true; damageBoss(); }
    for (const bl of bullets) {
      if (!bl.dead && Math.hypot(bl.x - r.x, bl.y - r.y) <= r.r) { bl.dead = true; burst(bl.x, bl.y, theme.player, 3, 100); }
    }
    for (const o of orbs) {
      if (Math.hypot(o.x - r.x, o.y - r.y) <= r.r) { const a = 1 - Math.exp(-3 * g); o.x += (P.x - o.x) * a; o.y += (P.y - o.y) * a; }
    }
  }

  // particles & floating text
  const drag = Math.pow(.02, g);
  for (const p of parts) { p.life -= g; p.x += p.vx * g; p.y += p.vy * g; p.vx *= drag; p.vy *= drag; }
  for (const t of texts) { t.life -= g; t.y += t.vy * g; t.vy *= Math.pow(.15, g); }
  const sdrag = Math.pow(.12, g);
  for (const s of shards) { s.life -= g; s.x += s.vx * g; s.y += s.vy * g; s.vx *= sdrag; s.vy *= sdrag; s.a += s.va * g; }
  shards = shards.filter(s => s.life > 0);

  orbs = orbs.filter(o => !o.dead);
  foes = foes.filter(f => !f.dead);
  bullets = bullets.filter(b => !b.dead);
  picks = picks.filter(p => !p.dead && p.life > 0);
  rings = rings.filter(r => r.r < r.max);
  parts = parts.filter(p => p.life > 0);
  texts = texts.filter(t => t.life > 0);

  if (live && R.lv >= 0) {
    const [a, b] = goalProgress();
    if (a >= b) levelClear();
  }
}

// ======================= RENDER =======================

function drawBackground(t) {
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);
  const ox = (P.x - W / 2) * .05, oy = (P.y - H / 2) * .05;
  // parallax dot grid
  const gs = 46 * U;
  ctx.fillStyle = rgba(theme.player, .08);
  const sx = -wrap(ox, gs), sy = -wrap(oy + t * 8, gs);
  for (let x = sx; x < W + gs; x += gs) for (let y = sy; y < H + gs; y += gs) ctx.fillRect(x - 1, y - 1, 2, 2);
  // twinkling stars
  ctx.fillStyle = '#ffffff';
  for (const s of stars) {
    ctx.globalAlpha = (.2 + .5 * s.z) * (.6 + .4 * Math.sin(t * 2 + s.tw));
    const x = wrap(s.x - ox * s.z * 4, W), y = wrap(s.y - t * 10 * s.z - oy * s.z * 4, H);
    ctx.fillRect(x, y, s.z * 2, s.z * 2);
  }
  ctx.globalAlpha = 1;
  glow(ctx, P.x, P.y, 420 * U, theme.player, .12);
}

function drawWorld(t) {
  // orbs
  for (const o of orbs) {
    const r = (o.r + Math.sin(o.ph) * 1.6 * U) * o.s;
    drawOrb(ctx, o.x, o.y, r, o.gold ? theme.gold : theme.orb);
    if (o.gold) {
      ctx.strokeStyle = theme.gold; ctx.globalAlpha = .5; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(o.x, o.y, r + 8 * U, t * 3, t * 3 + 4); ctx.stroke(); ctx.globalAlpha = 1;
    }
  }
  // shield pickups (blink when expiring)
  for (const p of picks) {
    if (p.life < 2.5 && Math.floor(p.life * 8) % 2) continue;
    drawShieldPick(ctx, p.x, p.y + Math.sin(p.ph * 3) * 4 * U, 15 * U, p.ph);
  }
  // telegraph lines
  const aimers = foes.filter(f => f.state === 'aim');
  if (R.boss && R.boss.state === 'aim') aimers.push(R.boss);
  for (const f of aimers) {
    const k = 1 - f.st / (f.boss ? 1 : .9);
    ctx.strokeStyle = theme.enemy;
    ctx.globalAlpha = (.15 + .6 * k) * (Math.sin(t * 40) > 0 ? 1 : .55);
    ctx.lineWidth = (f.boss ? f.r * 1.4 : (2 + k * 4) * U);
    if (!f.boss) ctx.setLineDash([10 * U, 8 * U]);
    ctx.beginPath(); ctx.moveTo(f.x, f.y);
    ctx.lineTo(f.x + Math.cos(f.dir) * 1600 * U, f.y + Math.sin(f.dir) * 1600 * U); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
  // shockwave rings
  for (const r of rings) {
    const a = Math.max(0, 1 - r.r / r.max);
    ctx.strokeStyle = r.color; ctx.globalAlpha = a; ctx.lineWidth = (r.w || 3) * U * (.4 + a);
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke();
    if (r.dmg) { ctx.globalAlpha = a * .12; ctx.fillStyle = r.color; ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  // enemies
  for (const f of foes) {
    if (f.type === 'seeker') drawSeeker(ctx, f.x, f.y, f.r, f.ang, theme.enemy, false);
    else drawDasher(ctx, f.x, f.y, f.r, f.dir, theme.enemy, f.state === 'aim' ? 1 - f.st / .9 : f.state === 'dash' ? 1 : 0);
  }
  const b = R.boss;
  if (b) {
    if (b.type === 'warden') drawWarden(ctx, b.x, b.y, b.r, b.ang, theme.enemy, b.flash > 0);
    else drawTitan(ctx, b.x, b.y, b.r, b.ang, theme.enemy, b.flash > 0, b.look);
  }
  // bullets
  for (const bl of bullets) {
    glow(ctx, bl.x, bl.y, bl.r * 3, theme.enemy, .9);
    ctx.fillStyle = '#ffe4ea'; circle(ctx, bl.x, bl.y, bl.r * .6);
  }
  // player
  if (mode !== 'dying' && mode !== 'fail') {
    const col = R.over > 0 ? theme.gold : theme.player;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 1; i < trail.length; i++) {
      const p = trail[i], k = 1 - i / trail.length;
      ctx.globalAlpha = k * .35; ctx.fillStyle = col;
      circle(ctx, p.x, p.y, P.r * k * (R.over > 0 ? 1.2 : .9));
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    const blink = R.inv > 0 && R.over <= 0 && Math.floor(t * 14) % 2 === 0;
    if (!blink) drawPlayer(ctx, P.x, P.y, P.r * (R.over > 0 ? 1.25 : 1), col, t);
    if (R.shield || shieldFx.breakT > 0) {
      const ap = clamp(shieldFx.born / .55, 0, 1);
      const pop = ap < 1 ? 1 + Math.sin(ap * Math.PI) * .12 : 1; // slight overshoot while forming
      drawHexShield(ctx, P.x, P.y, SHIELD_R() * pop, t, {
        f: 3, appear: ap, hit: shieldFx.hit,
        flash: shieldFx.breakT > 0 ? shieldFx.breakT / .22 : 0,
      });
    }
  }
  // shield shards
  if (shards.length) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = Math.max(.6, SHIELD_R() * .035);
    for (const s of shards) {
      const k = s.life / s.max, sc = .5 + k * .5;
      const ca = Math.cos(s.a) * sc, sa = Math.sin(s.a) * sc;
      ctx.beginPath();
      s.pts.forEach((p, i) => {
        const px = s.x + p[0] * ca - p[1] * sa, py = s.y + p[0] * sa + p[1] * ca;
        if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      });
      ctx.closePath();
      ctx.fillStyle = shieldRGBA(s.fres, .45 * k);
      ctx.fill();
      ctx.strokeStyle = `rgba(235,240,255,${.9 * k})`;
      ctx.stroke();
    }
    ctx.restore();
  }
  // particles
  ctx.globalCompositeOperation = 'lighter';
  for (const p of parts) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    circle(ctx, p.x, p.y, p.r);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  // floating text
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const tx of texts) {
    const k = tx.life / tx.max;
    const s = tx.size * (k > .8 ? 1 + (k - .8) * 2.5 : 1);
    ctx.globalAlpha = Math.min(1, k * 1.6);
    ctx.font = `800 ${Math.round(s)}px ${FONT}`;
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.strokeText(tx.str, tx.x, tx.y);
    ctx.fillStyle = tx.color; ctx.fillText(tx.str, tx.x, tx.y);
  }
  ctx.globalAlpha = 1;
}

function drawAmbient(t) {
  for (const a of ambient) {
    const x = a.x + Math.sin(t * a.f + a.ph) * 20 * U, r = a.r * U * .7, col = a.gold ? theme.gold : theme.orb;
    glow(ctx, x, a.y, r * 3.5, col, .35);
    ctx.globalAlpha = .55; ctx.fillStyle = col; circle(ctx, x, a.y, r); ctx.globalAlpha = 1;
  }
}

function render(t) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawBackground(t);
  // camera: shake (trauma²) + zoom punch
  const sh = save.shake ? trauma * trauma : 0;
  const z = 1 + punch;
  ctx.translate(W / 2 + rand(-1, 1) * sh * 22 * U, H / 2 + rand(-1, 1) * sh * 22 * U);
  ctx.rotate(rand(-1, 1) * sh * .03);
  ctx.scale(z, z);
  ctx.translate(-W / 2, -H / 2);
  if (R) drawWorld(t); else drawAmbient(t);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = vignDark; ctx.fillRect(0, 0, W, H);
  if (R && R.lives === 1 && mode === 'play') {
    ctx.globalAlpha = .45 + .3 * Math.sin(t * 6);
    ctx.fillStyle = vignRed; ctx.fillRect(0, 0, W, H);
  }
  if (R && R.over > 0) {
    ctx.globalAlpha = Math.min(1, R.over) * (.7 + .3 * Math.sin(t * 10));
    ctx.fillStyle = vignGold; ctx.fillRect(0, 0, W, H);
  }
  if (flashA > 0) {
    ctx.globalAlpha = flashA; ctx.fillStyle = flashC; ctx.fillRect(0, 0, W, H);
  }
  ctx.globalAlpha = 1;
}

// ======================= HUD =======================

function setText(id, v) { const el = $(id); if (el._v !== v) { el._v = v; el.textContent = v; } }
function setHTML(id, v) { const el = $(id); if (el._h !== v) { el._h = v; el.innerHTML = v; } }
function setStyle(id, prop, v) { const el = $(id); const k = '_' + prop; if (el[k] !== v) { el[k] = v; el.style.setProperty(prop, v); } }
function setClass(id, c, on) { $(id).classList.toggle(c, !!on); }

const PULSE_C = 2 * Math.PI * 38;

function updateHud(dt) {
  R.shown += (R.score - R.shown) * Math.min(1, dt * 12);
  if (Math.abs(R.score - R.shown) < 1) R.shown = R.score;
  setText('score', Math.round(R.shown).toLocaleString());

  if (has('combo')) {
    setText('mult', '×' + mult());
    setStyle('comboFill', 'width', (R.combo ? R.comboT / 3.2 * 100 : 0).toFixed(1) + '%');
    setClass('combo', 'dim', mult() === 1);
  }

  // goal line / boss bar
  const b = R.boss;
  let label, val = '', fill;
  if (b) {
    label = b.type === 'warden' ? 'The Warden' : 'Void Titan';
    fill = b.hp / b.max;
    setHTML('bossSegs', Array.from({ length: b.max }, (_, i) => `<i class="${i < b.hp ? '' : 'lost'}"></i>`).join(''));
  } else if (R.lv < 0) {
    fill = clamp((R.score - R.prevBoss) / (R.nextBoss - R.prevBoss), 0, 1);
    label = `Wave ${R.wave}`;
    val = `Boss ${Math.floor(fill * 100)}%`;
  } else {
    const g = R.cfg.goal, [a, n] = goalProgress();
    fill = a / n;
    if (g.type === 'collect') { label = 'Lumens'; val = `${a}/${n}`; }
    else if (g.type === 'survive') { label = 'Survive'; val = Math.ceil(n - a) + 's'; }
    else if (g.type === 'near') { label = 'Near misses'; val = `${a}/${n}`; }
    else { label = 'Incoming'; fill = 0; }
  }
  setText('goalLabel', label);
  setText('goalVal', val);
  setStyle('goalFill', 'width', (fill * 100).toFixed(1) + '%');
  setClass('hud', 'boss', !!b);
  setClass('bossSegs', 'hidden', !b);

  setHTML('lives', Array.from({ length: 3 }, (_, i) => `<span class="${i < R.lives ? '' : 'lost'}"></span>`).join(''));

  if (has('pulse')) {
    setStyle('pulseArc', 'stroke-dashoffset', (PULSE_C * (1 - R.pulse / 100)).toFixed(1));
    setClass('btnPulse', 'ready', R.pulse >= 100);
  }
  setClass('pwOver', 'hidden', R.over <= 0);
  if (R.over > 0) setStyle('pwOverFill', 'width', (R.over / 5 * 100).toFixed(1) + '%');
  setClass('pwShield', 'hidden', !R.shield);
}

let bannerTimer = 0;
function banner(kicker, title, kind = '') {
  const b = $('banner');
  $('bannerK').textContent = kicker || '';
  $('bannerT').textContent = title;
  b.className = 'banner';
  void b.offsetWidth;
  b.className = 'banner show ' + kind;
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => { b.className = 'banner'; }, 1850);
}

// ======================= MENUS =======================

const SCREENS = ['menu', 'levels', 'intro', 'pause', 'win', 'fail'];
const SHEETS = ['settings', 'themesSheet'];
function show(name) {
  for (const o of SCREENS) $(o).classList.toggle('hidden', o !== name);
  for (const s of SHEETS) $(s).classList.add('hidden');
  const inGame = R && ['play', 'pause', 'dying', 'clear'].includes(mode);
  $('hud').classList.toggle('hidden', !inGame);
}
function openSheet(id) { $(id).classList.remove('hidden'); }
function closeSheet(id) { $(id).classList.add('hidden'); }

function applyTheme(i) {
  theme = THEMES[i];
  const s = document.documentElement.style;
  const n = parseInt(theme.bg1.slice(1), 16);
  s.setProperty('--accent', theme.player);
  s.setProperty('--danger', theme.enemy);
  s.setProperty('--gold', theme.gold);
  s.setProperty('--bg', theme.bg1);
  s.setProperty('--bg-rgb', `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`);
  makeBackground();
}

const nextLevel = () => Math.min(save.unlocked, LEVELS.length);
function starsLabel() { return `${totalStars()}/${LEVELS.length * 3}`; }

function openMenu() {
  R = null;
  mode = 'menu';
  P.x = P.tx = W / 2; P.y = P.ty = H / 2;
  const allClear = nextLevel() >= LEVELS.length;
  $('playSub').textContent = allClear ? 'Endless' : `Level ${nextLevel() + 1}`;
  $('btnEndless').innerHTML = icon(allClear ? 'endless' : 'lock') + 'Endless';
  $('btnEndless').disabled = !allClear;
  $('menuNote').textContent = allClear
    ? `Endless best ${save.best.toLocaleString()}`
    : `Clear level ${LEVELS.length} to unlock Endless`;
  setText('starCount', starsLabel());
  show('menu');
}

function openSettings() {
  setClass('tSound', 'on', save.sound);
  setClass('tShake', 'on', save.shake);
  setClass('tHaptics', 'on', save.haptics);
  openSheet('settings');
}

function openThemes() {
  const ts = totalStars();
  $('themeGrid').innerHTML = THEMES.map((t, i) => {
    const locked = ts < t.stars, sel = i === save.theme;
    const sw = `radial-gradient(circle at 74% 36%, ${t.player} 0 9px, ${rgba(t.player, .25)} 10px, transparent 26px),
      radial-gradient(circle at 46% 56%, ${t.enemy} 0 5px, transparent 6px),
      radial-gradient(circle at 28% 30%, ${t.orb} 0 4px, transparent 5px),
      radial-gradient(circle at 60% 20%, ${t.gold} 0 3px, transparent 4px),
      linear-gradient(160deg, ${t.bg2}, ${t.bg1})`;
    const sub = locked ? `${icon('lock')}${t.stars} stars` : sel ? 'Selected' : 'Select';
    return `<button class="theme ${sel ? 'sel' : ''} ${locked ? 'locked' : ''}" data-i="${i}"><span class="sw" style="background:${sw}"></span><b>${t.name}</b><small>${sub}</small></button>`;
  }).join('');
  openSheet('themesSheet');
}

function openLevels() {
  R = null;
  mode = 'levels';
  const ROW = 100, HEAD = 92, XS = [50, 74, 50, 26, 50];
  const cur = nextLevel();
  let y = 36, nodes = '', lines = '', labels = '';
  WORLDS.forEach((w, wi) => {
    labels += `<div class="world-label" style="top:${y - 18}px"><span class="kicker">World ${String(wi + 1).padStart(2, '0')}</span><h3>${w}</h3></div>`;
    y += HEAD;
    const pts = [];
    for (let i = wi * 5; i < wi * 5 + 5 && i < LEVELS.length; i++) {
      const x = XS[i % 5], locked = i > cur, boss = LEVELS[i].goal.type === 'boss', st = save.stars[i] || 0;
      pts.push([x, y, i]);
      const cls = ['node', locked && 'locked', boss && 'boss', i === cur && 'current', !locked && i < cur && 'done'].filter(Boolean).join(' ');
      const inner = boss ? icon('crown') : locked ? icon('lock') : i + 1;
      const stars = locked ? '' : `<span class="st">${[0, 1, 2].map(k => icon('star', k < st ? 'on' : '')).join('')}</span>`;
      nodes += `<button class="${cls}" data-lv="${i}" style="left:${x}%;top:${y}px" aria-label="Level ${i + 1}"><span class="hex"><span class="hex-in"></span><span class="hex-c">${inner}</span></span>${stars}</button>`;
      y += ROW;
    }
    const all = pts.map(p => `${p[0]},${p[1]}`).join(' ');
    const done = pts.filter(p => p[2] <= cur).map(p => `${p[0]},${p[1]}`).join(' ');
    lines += `<polyline class="all" points="${all}"/>` + (done.includes(' ') ? `<polyline class="done" points="${done}"/>` : '');
    y += 20;
  });
  $('map').innerHTML = `<div class="map-inner" style="height:${y}px"><svg class="map-path" viewBox="0 0 100 ${y}" preserveAspectRatio="none">${lines}</svg>${labels}${nodes}</div>`;
  setText('starCount2', starsLabel());
  show('levels');
  const c = $('map').querySelector('.node.current');
  if (c) c.scrollIntoView({ block: 'center' });
}

function goalText(cfg) {
  const g = cfg.goal;
  if (g.type === 'collect') return `Collect ${g.n} lumens`;
  if (g.type === 'survive') return `Survive ${g.n} seconds`;
  if (g.type === 'near') return `Make ${g.n} near misses`;
  if (g.type === 'boss') return g.boss === 'warden' ? 'Destroy the Warden' : 'Destroy the Void Titan';
  return 'Survive as long as you can';
}
const star2Text = s => (s.t === 'time' ? `Finish in under ${s.n}s` : `Score ${s.n.toLocaleString()} or more`);
const objective = (cls, ic, txt) => `<li class="${cls}">${icon(ic, ic === 'star' ? 'star' : '')}${txt}</li>`;

let introFrom = 'menu';
function openIntro(lv, from = introFrom) {
  R = null;
  introLv = lv;
  introFrom = from;
  mode = 'intro';
  const cfg = lv < 0 ? ENDLESS : LEVELS[lv];
  const info = INTROS[cfg.intro];
  $('introLevel').textContent = lv < 0 ? 'Endless mode' : `Level ${lv + 1} · ${cfg.name}`;
  $('introTag').textContent = info.tag;
  $('introTag').className = 'tag' + (info.tag === 'Boss' ? ' boss' : '');
  $('introTitle').textContent = info.title;
  $('introText').textContent = info.text;
  const lines = [objective('main', 'target', goalText(cfg))];
  if (lv >= 0) {
    const st = save.stars[lv] || 0;
    lines.push(objective(st >= 2 ? 'on' : '', 'star', star2Text(cfg.star2)));
    lines.push(objective(st >= 3 ? 'on' : '', 'star', 'Take no damage'));
  } else {
    lines.push(objective('on', 'star', `Best ${save.best.toLocaleString()}`));
  }
  $('introGoals').innerHTML = lines.join('');
  $('btnBoost').classList.toggle('hidden', !featureOn(lv, 'shield'));
  $('btnBoost').disabled = false;
  show('intro');
}

// ---- intro preview animation ----
const pc = $('introCanvas').getContext('2d');
function drawPreview(t) {
  const cfg = introLv < 0 ? ENDLESS : LEVELS[introLv];
  const key = cfg.intro;
  pc.setTransform(2, 0, 0, 2, 0, 0);
  pc.clearRect(0, 0, 140, 140);
  const cx = 70, cy = 70;
  pc.fillStyle = 'rgba(255,255,255,.035)'; circle(pc, cx, cy, 66);
  switch (key) {
    case 'move': {
      drawOrb(pc, cx + 32, cy - 20, 7, theme.orb);
      drawOrb(pc, cx - 30, cy + 26, 7, theme.orb);
      drawPlayer(pc, cx + Math.cos(t * 1.6) * 34, cy + Math.sin(t * 1.6) * 34, 10, theme.player, t);
      break;
    }
    case 'seeker':
      drawPlayer(pc, cx + Math.cos(t) * 42, cy + Math.sin(t) * 42, 9, theme.player, t);
      drawSeeker(pc, cx + Math.cos(t - .7) * 16, cy + Math.sin(t - .7) * 16, 17, t * 2, theme.enemy);
      break;
    case 'combo': {
      for (let i = 0; i < 5; i++) { const a = -Math.PI * .92 + i * .46; drawOrb(pc, cx + Math.cos(a) * 46, cy + 14 + Math.sin(a) * 46, 6, theme.orb); }
      pc.textAlign = 'center'; pc.textBaseline = 'middle'; pc.font = `800 34px ${FONT}`;
      pc.fillStyle = theme.gold; pc.fillText('x' + (1 + Math.floor(t * 1.5) % 5), cx, cy + 24);
      break;
    }
    case 'pulse': {
      const p = (t * .7) % 1, rr = 10 + p * 56;
      pc.strokeStyle = theme.player; pc.globalAlpha = 1 - p; pc.lineWidth = 3;
      pc.beginPath(); pc.arc(cx, cy, rr, 0, TAU); pc.stroke(); pc.globalAlpha = 1;
      for (let i = 0; i < 3; i++) { const a = i * 2.1 + .4; if (rr < 46) drawSeeker(pc, cx + Math.cos(a) * 46, cy + Math.sin(a) * 46, 9, t * 2, theme.enemy); }
      drawPlayer(pc, cx, cy, 10, theme.player, t);
      break;
    }
    case 'warden': drawWarden(pc, cx, cy, 34, t, theme.enemy, false); break;
    case 'gold':
      drawOrb(pc, cx, cy, 14 + Math.sin(t * 5) * 2, theme.gold);
      pc.strokeStyle = theme.gold; pc.globalAlpha = .6; pc.lineWidth = 2;
      pc.beginPath(); pc.arc(cx, cy, 26, t * 3, t * 3 + 4); pc.stroke(); pc.globalAlpha = 1;
      break;
    case 'dasher': {
      const ph = t % 2.2, aim = Math.min(1, ph / 1.2), dashing = ph > 1.2;
      const x = dashing ? cx - 40 + (ph - 1.2) * 140 : cx - 40, y = dashing ? cy + 30 - (ph - 1.2) * 60 : cy + 30;
      if (!dashing) {
        pc.strokeStyle = theme.enemy; pc.globalAlpha = .2 + .6 * aim; pc.lineWidth = 2 + aim * 3; pc.setLineDash([6, 5]);
        pc.beginPath(); pc.moveTo(x, y); pc.lineTo(x + 140, y - 60); pc.stroke(); pc.setLineDash([]); pc.globalAlpha = 1;
      }
      drawDasher(pc, x, y, 13, Math.atan2(-60, 140), theme.enemy, dashing ? 1 : aim);
      break;
    }
    case 'shield': {
      const a = Math.floor(t / 1.6) * 2.4;
      drawPlayer(pc, cx, cy, 10, theme.player, t);
      drawHexShield(pc, cx, cy, 44, t, { f: 4, hit: { dir: v3.norm([Math.cos(a), Math.sin(a), .7]), age: t % 1.6, power: 1 } });
      break;
    }
    case 'near': {
      drawPlayer(pc, cx, cy + 10, 10, theme.player, t);
      const x = wrap(t * 80, 190) - 25;
      drawSeeker(pc, x, cy - 14, 11, t * 3, theme.enemy);
      if (x > cx && x < cx + 50) {
        pc.textAlign = 'center'; pc.font = `800 13px ${FONT}`; pc.fillStyle = '#ffffff'; pc.fillText('NEAR MISS', cx, cy - 40);
      }
      break;
    }
    case 'titan': {
      const p = (t * .5) % 1;
      pc.fillStyle = '#ffe4ea'; pc.globalAlpha = 1 - p;
      for (let i = 0; i < 12; i++) { if (i === 3 || i === 4) continue; const a = i / 12 * TAU; circle(pc, cx + Math.cos(a) * (32 + p * 36), cy + Math.sin(a) * (32 + p * 36), 3); }
      pc.globalAlpha = 1;
      drawTitan(pc, cx, cy, 28, t * .5, theme.enemy, false, t);
      break;
    }
    default:
      drawSeeker(pc, cx - 34, cy - 20, 11, t * 2, theme.enemy);
      drawDasher(pc, cx + 34, cy - 24, 11, 2.4, theme.enemy, .5);
      drawOrb(pc, cx + 30, cy + 30, 9, theme.gold);
      drawPlayer(pc, cx, cy + 6, 11, theme.player, t);
  }
}

function updateAmbient(dt) {
  for (const a of ambient) {
    a.y -= a.v * U * dt;
    if (a.y < -20) { a.y = H + 20; a.x = rand(0, W); }
  }
}

// ======================= INPUT =======================

// Touch: relative drag (the finger never hides the core) + double-tap anywhere to Pulse.
// A "tap" is a short press that barely moves, so re-gripping while steering won't fire Pulse.
const TAP_MS = 220, TAP_MOVE = 14, DOUBLE_MS = 320, DOUBLE_DIST = 70;
let drag = null, lastTap = null;

canvas.addEventListener('pointerdown', e => {
  Sfx.init();
  if (mode !== 'play') return;
  if (e.pointerType === 'mouse') {
    P.tx = e.clientX; P.ty = e.clientY;
    if (e.button === 0) doPulse();
    return;
  }
  const now = performance.now();
  if (lastTap && now - lastTap.t < DOUBLE_MS && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < DOUBLE_DIST) {
    lastTap = null;
    doPulse();
  }
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: now };
});
canvas.addEventListener('pointermove', e => {
  if (mode !== 'play') return;
  if (e.pointerType === 'mouse') {
    P.tx = e.clientX; P.ty = e.clientY;
  } else if (drag && drag.id === e.pointerId) {
    const s = 1.4;
    P.tx = clamp(P.tx + (e.clientX - drag.x) * s, 0, W);
    P.ty = clamp(P.ty + (e.clientY - drag.y) * s, 0, H);
    drag.x = e.clientX; drag.y = e.clientY;
  }
});
window.addEventListener('pointerup', e => {
  if (!drag || drag.id !== e.pointerId) return;
  const now = performance.now();
  if (now - drag.t < TAP_MS && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < TAP_MOVE) {
    lastTap = { t: now, x: e.clientX, y: e.clientY };
  }
  drag = null;
});
window.addEventListener('pointercancel', () => { drag = null; });
window.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); doPulse(); }
  else if (e.code === 'KeyP' || e.code === 'Escape') { if (mode === 'play') pauseGame(); else if (mode === 'pause') resumeGame(); }
});

$('btnPulse').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); Sfx.init(); doPulse(); });

const onClick = (id, fn) => $(id).addEventListener('click', () => { Sfx.init(); Sfx.click(); fn(); });
onClick('btnPlay', () => openIntro(nextLevel() >= LEVELS.length ? -1 : nextLevel(), 'menu'));
onClick('btnLevels', openLevels);
onClick('btnEndless', () => openIntro(-1, 'menu'));
onClick('btnThemes', openThemes);
onClick('btnSettings', openSettings);
onClick('btnSettingsClose', () => closeSheet('settings'));
onClick('btnThemesClose', () => closeSheet('themesSheet'));
onClick('btnLvBack', openMenu);
onClick('btnGo', () => startRun(introLv));
onClick('btnBoost', async () => {
  $('btnBoost').disabled = true;
  const ok = await rewardedAd('start_shield');
  $('btnBoost').disabled = false;
  if (ok) startRun(introLv, true);
});
onClick('btnIntroBack', () => (introFrom === 'levels' ? openLevels() : openMenu()));
onClick('btnPause', pauseGame);
onClick('btnResume', resumeGame);
onClick('btnRestart', () => startRun(R.lv));
onClick('btnQuit', () => (R.lv < 0 ? openMenu() : openLevels()));
onClick('btnNext', () => openIntro(R.lv + 1 < LEVELS.length ? R.lv + 1 : -1, 'levels'));
onClick('btnReplay', () => startRun(R.lv));
onClick('btnWinLevels', openLevels);
onClick('btnRevive', revive);
onClick('btnRetry', () => startRun(R.lv));
onClick('btnFailMenu', () => (R.lv < 0 ? openMenu() : openLevels()));
onClick('tSound', () => { save.sound = !save.sound; setClass('tSound', 'on', save.sound); persist(); });
onClick('tShake', () => { save.shake = !save.shake; setClass('tShake', 'on', save.shake); if (save.shake) addTrauma(.5); persist(); });
onClick('tHaptics', () => { save.haptics = !save.haptics; setClass('tHaptics', 'on', save.haptics); buzz(30); persist(); });

// tap the dimmed area around a sheet to close it
for (const id of SHEETS) $(id).addEventListener('click', e => { if (e.target.id === id) closeSheet(id); });

$('map').addEventListener('click', e => {
  const b = e.target.closest('.node');
  if (!b) return;
  Sfx.init(); Sfx.click();
  openIntro(+b.dataset.lv, 'levels');
});
$('themeGrid').addEventListener('click', e => {
  const b = e.target.closest('.theme');
  if (!b) return;
  const i = +b.dataset.i;
  Sfx.init();
  if (totalStars() < THEMES[i].stars) { Sfx.deny(); return; }
  Sfx.click();
  save.theme = i;
  applyTheme(i);
  persist();
  openThemes();
});

window.addEventListener('resize', resize);
document.addEventListener('visibilitychange', () => { if (document.hidden) { pauseGame(); persist(); } });

// ======================= MAIN LOOP & BOOT =======================

let last = performance.now(), clock = 0, readySent = false;
function frame(now) {
  const dt = Math.min(.05, Math.max(0, (now - last) / 1000));
  last = now;
  clock += dt;
  if (R && (mode === 'play' || mode === 'dying' || mode === 'clear')) update(dt);
  if (mode === 'dying') { R.deathT -= dt; if (R.deathT <= 0) showFail(); }
  if (mode === 'clear') { R.clearT -= dt; if (R.clearT <= 0) showWin(); }
  trauma = Math.max(0, trauma - dt * 1.5);
  punch = Math.max(0, punch - dt * .5);
  flashA = Math.max(0, flashA - dt * 2.5);
  updateShieldFx(dt);
  if (!R) updateAmbient(dt);
  render(clock);
  if (R && ['play', 'pause', 'dying', 'clear'].includes(mode)) updateHud(dt);
  if (mode === 'intro') drawPreview(clock);
  if (!readySent) {
    readySent = true;
    if (IN_YT) {
      try { ytgame.game.firstFrameReady(); ytgame.game.gameReady(); } catch (e) { console.warn(e); }
    }
  }
  requestAnimationFrame(frame);
}

(async function boot() {
  document.querySelectorAll('[data-icon]').forEach(el => el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon)));
  $('winStars').querySelectorAll('span').forEach(s => { s.innerHTML = icon('star'); });
  resize();
  for (let i = 0; i < 16; i++) ambient.push({ x: rand(0, innerWidth), y: rand(0, innerHeight), r: rand(4, 9), v: rand(10, 30), f: rand(.3, .9), ph: rand(0, TAU), gold: Math.random() < .15 });
  if (IN_YT) {
    try {
      Sfx.ytAudio = ytgame.system.isAudioEnabled();
      ytgame.system.onAudioEnabledChange(on => { Sfx.ytAudio = on; });
      ytgame.system.onPause(() => { pauseGame(); persist(); });
    } catch (e) { console.warn(e); }
  }
  await loadSave();
  if (!THEMES[save.theme] || totalStars() < THEMES[save.theme].stars) save.theme = 0;
  applyTheme(save.theme);
  openMenu();
  last = performance.now();
  requestAnimationFrame(frame);
})();
