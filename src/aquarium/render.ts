// Desenho do recife em pixel art 240×150.
import { R, disk, type Ctx } from '../render/px';
import { hash, rng } from '../sim/world';
import { AW, AH, growth, type Reef, type Fish, type Coral, type FishKind } from './sim';

/* ---------- sprites em mapa de caracteres (desenhados virados pra direita) ---------- */
type Sprite = { rows: string[]; pal: Record<string, string> };
const FISH: Record<FishKind, Sprite> = {
  palhaco: { rows: ['o.WOW.', 'oOWOWk', 'o.WOW.'], pal: { o: '#ff8a1f', O: '#ff8a1f', W: '#ffffff', k: '#2a1205' } },
  cirurgiao: { rows: ['...BB..', 'y.BBBBB', 'yyBKKBk', 'y.BBBBB', '...BB..'], pal: { B: '#2f6fe6', K: '#0d1f52', y: '#ffd23a', k: '#05080f' } },
  amarelo: { rows: ['..YY..', '.YYYY.', 'YYYYYk', '.YYYY.', '..YY..'], pal: { Y: '#ffd800', k: '#2a2000' } },
  gramma: { rows: ['yyPPP', 'yyPPk'], pal: { P: '#9b4dff', y: '#ffc400', k: '#1a0833' } },
  donzela: { rows: ['c.CC', '.CCk'], pal: { c: '#6fe0c8', C: '#6fe0c8', k: '#0a2a2a' } },
};
function sprite(c: Ctx, s: Sprite, x: number, y: number, face: number, wag = 0) {
  const h = s.rows.length, w = s.rows[0].length, ox = (w / 2) | 0, oy = (h / 2) | 0;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const ch = s.rows[j][i];
    if (ch === '.') continue;
    const dy = i === 0 ? wag : 0; // rabo balança
    R(c, Math.round(x + (i - ox) * face), Math.round(y + j - oy + dy), 1, 1, s.pal[ch]);
  }
}

const CRAB: Sprite = { rows: ['.ss...e', 'sbss.rr', 'sssRRRC'], pal: { s: '#ecd6a8', b: '#a87b4f', R: '#d9472a', r: '#d9472a', e: '#1b1b1b', C: '#f26a3c' } };
const SUB: Sprite = {
  rows: [
    '.......PP.........',
    '........P.........',
    '......TTTT........',
    '..YYYYYYYYYYYYY...',
    '.YYGYYYGYYYGYYYY..',
    'YYYGYYYGYYYGYYYY..',
    '.YYYYYYYYYYYYYYY..',
    '..yyyyyyyyyyyyy...',
  ],
  pal: { P: '#9aa3a8', T: '#f2b800', Y: '#ffd21f', y: '#c99700', G: '#7fe3ff' },
};
const SEAHORSE: Sprite = { rows: ['.hhk', 'hhh.', '.hh.', 'hh..', '.hh.', '..h.', '.hh.'], pal: { h: '#ffb347', k: '#3a1d00' } };
const STAR: Sprite = { rows: ['..s..', 'sssss', '.sss.', '.s.s.', 's...s'], pal: { s: '#ff6b4a' } };
const URCHIN: Sprite = { rows: ['s.s.s', '.sss.', 'sssss', '.sss.'], pal: { s: '#3b1f4d' } };

/* ---------- corais ---------- */
// pixels de cada coral, pré-calculados por seed; `o` = ordem de crescimento 0–1
type Px = { x: number; y: number; o: number; c: string };
function branching(seed: number): Px[] {
  const r = rng(seed), out: Px[] = [];
  const grow = (x: number, y: number, a: number, len: number, depth: number, o0: number) => {
    for (let k = 1; k <= len; k++) {
      const px = Math.round(x + Math.cos(a) * k), py = Math.round(y + Math.sin(a) * k);
      const tip = depth === 0 && k === len;
      out.push({ x: px, y: py, o: o0 + (k / len) * 0.25, c: tip ? '#b48cff' : k % 3 ? '#d9a066' : '#c48a52' });
    }
    if (depth > 0) for (let b = 0; b < 2 + (r() < 0.3 ? 1 : 0); b++)
      grow(x + Math.cos(a) * len, y + Math.sin(a) * len, a + (r() - 0.5) * 1.3, 3 + ((r() * 4) | 0), depth - 1, o0 + 0.25);
  };
  grow(0, 0, -Math.PI / 2, 4, 3, 0);
  return out;
}
function fan(seed: number): Px[] {
  const r = rng(seed), out: Px[] = [];
  for (let k = 0; k < 9; k++) {
    let x = 0, y = 0;
    const a = -Math.PI / 2 + (k - 4) * 0.2;
    for (let s = 0; s < 16; s++) { x += Math.cos(a) + (r() - 0.5) * 0.6; y += Math.sin(a); out.push({ x: Math.round(x), y: Math.round(y), o: s / 16, c: (s + k) % 4 ? '#a44bd1' : '#d080f5' }); }
  }
  for (let y = -3; y > -15; y -= 3) for (let x = -6; x <= 6; x++) if (Math.abs(x) < 3 - y * 0.45) out.push({ x, y, o: -y / 16, c: '#8e3dbd' }); // treliça
  return out;
}
const CACHE = new Map<number, Px[]>();
const pixelsOf = (c: Coral) => { let p = CACHE.get(c.seed); if (!p) { p = c.kind === 'chifre' ? branching(c.seed) : fan(c.seed); CACHE.set(c.seed, p); } return p; };

function drawCoral(c: Ctx, k: Coral, g: number, t: number) {
  if (k.kind === 'chifre' || k.kind === 'leque') {
    const sway = k.kind === 'leque' ? Math.sin(t * 0.8 + k.seed) * 1.2 : 0;
    for (const p of pixelsOf(k)) if (p.o <= g) R(c, Math.round(k.x + p.x + (sway * -p.y) / 15), k.y + p.y, 1, 1, p.c);
  } else if (k.kind === 'cerebro') {
    const rr = Math.round(3 + g * 6);
    for (let y = -rr; y <= 0; y++) for (let x = -rr; x <= rr; x++) if (x * x + y * y * 2.2 <= rr * rr)
      R(c, k.x + x, k.y + y, 1, 1, Math.sin(x * 1.3) + Math.sin(y * 1.7 + x * 0.5) > 0.6 ? '#5a8a35' : '#86b555');
  } else if (k.kind === 'cogumelo') {
    const h = Math.round(4 + g * 5), w = Math.round(4 + g * 4), s = Math.round(Math.sin(t * 0.6 + k.seed));
    R(c, k.x - 1, k.y - h, 2, h, '#c8c57a');
    for (let y = 0; y < 3; y++) R(c, k.x - w + y + s, k.y - h - y, (w - y) * 2, 1, y === 2 ? '#e8ecb0' : '#d6d98a');
    for (let x = -w + 1; x < w; x += 2) R(c, k.x + x + s, k.y - h - 1, 1, 1, '#f6f8d0');
  } else if (k.kind === 'zoantideo') {
    const n = Math.round(4 + g * 8);
    for (let i = 0; i < n; i++) {
      const x = k.x + Math.round((hash(i, k.seed) - 0.5) * 12), y = k.y - 1 - Math.round(hash(k.seed, i) * 3);
      const open = Math.sin(t * 1.2 + i) > -0.3;
      R(c, x, y, 1, 1, i % 2 ? '#4cff9a' : '#ff9a3c');
      if (open) R(c, x, y - 1, 1, 1, i % 2 ? '#1f8a55' : '#c4551a');
    }
  } else if (k.kind === 'tubo') {
    [[0, 8], [3, 11], [6, 6]].forEach(([dx, h0]) => {
      const h = Math.round(h0 * (0.55 + g * 0.45));
      R(c, k.x + dx, k.y - h, 3, h, '#8a3fc4'); R(c, k.x + dx + 2, k.y - h, 1, h, '#6a2a9c');
      R(c, k.x + dx, k.y - h, 3, 1, '#3a1050');
    });
  } else if (k.kind === 'vaso') {
    const h = Math.round(6 + g * 5);
    for (let y = 0; y < h; y++) { const w = 2 + Math.round((y / h) * 3); R(c, k.x - w, k.y - y, w * 2, 1, y % 3 ? '#ff8a3d' : '#ff9f5c'); }
    R(c, k.x - 3, k.y - h, 6, 1, '#a1461b');
  }
}

/* ---------- fundo estático: água, rochas, areia ---------- */
function drawStatic(c: Ctx, r: Reef) {
  const W = ['#4fc3e3', '#3aa6d6', '#2a86c4', '#1d68ad', '#164f92'];
  for (let y = 0; y < AH; y++) {
    const tt = (y / AH) * W.length, i = Math.min(W.length - 1, tt | 0), f = tt - i;
    for (let x = 0; x < AW; x++) R(c, x, y, 1, 1, f > 0.7 && i < W.length - 1 && (x + y) % 2 ? W[i + 1] : W[i]);
  }
  // rochas distantes, azuladas
  for (let x = 0; x < AW; x++) { const h = 18 + Math.sin(x * 0.03 + 2) * 8 + Math.sin(x * 0.11) * 3; R(c, x, r.sand[x] - h, 1, h, '#1a4f86'); }
  // areia com ondulações e conchinhas
  for (let x = 0; x < AW; x++) for (let y = r.sand[x]; y < AH; y++) {
    const j = hash(x, y);
    R(c, x, y, 1, 1, y === r.sand[x] ? '#f3e2b3' : (y + Math.round(Math.sin(x * 0.3) * 1.5)) % 5 === 0 ? '#d8c08a' : j > 0.97 ? '#fff6dc' : j < 0.04 ? '#b89c68' : '#e6d29f');
  }
  // rocha viva com manchas de alga coralina
  for (let x = 0; x < AW; x++) for (let y = r.rock[x]; y < r.sand[x] + 2; y++) {
    if (y >= AH) break;
    const j = hash(x * 3, y * 5), n = Math.sin(x * 0.35 + y * 0.2) + Math.sin(y * 0.5 - x * 0.15);
    R(c, x, y, 1, 1, y === r.rock[x] ? '#b38a9a' : n > 1.2 ? '#d57ea2' : j < 0.12 ? '#5e4252' : j > 0.9 ? '#9a7484' : '#7d5a6b');
  }
  // toca do polvo
  for (let y = -3; y <= 3; y++) for (let x = -5; x <= 5; x++) if ((x * x) / 25 + (y * y) / 9 <= 1) R(c, r.den.x + x, r.den.y + y, 1, 1, y < -1 ? '#2a1820' : '#1b0f15');
}

/* ---------- bichos ---------- */
function octopus(c: Ctx, r: Reef, t: number) {
  const o = r.octo;
  const mix = (a: number[], b: number[]) => `rgb(${a.map((v, i) => Math.round(v * (1 - o.camo) + b[i] * o.camo)).join()})`;
  const M = mix([217, 80, 46], [216, 194, 142]), D = mix([160, 50, 30], [190, 168, 120]);
  if (o.state === 'den') { // só os olhinhos espiando
    const x = r.den.x, y = r.den.y;
    R(c, x - 2, y - 1, 5, 2, '#7a2a18'); if (Math.sin(t * 0.7) > -0.9) { R(c, x - 1, y - 1, 1, 1, '#fff3c0'); R(c, x + 1, y - 1, 1, 1, '#fff3c0'); }
    return;
  }
  const x = Math.round(o.x), y = Math.round(o.y), f = Math.floor(o.step) % 2;
  R(c, x - 1, y - 7, 3, 1, M); R(c, x - 2, y - 6, 5, 3, M); R(c, x - 2, y - 3, 5, 1, D);
  R(c, x - 1, y - 5, 1, 1, '#fff3c0'); R(c, x + 1, y - 5, 1, 1, '#fff3c0');
  for (let k = -3; k <= 3; k++) { // tentáculos ondulando
    const curl = (k + f) % 2 ? 1 : 0;
    R(c, x + k, y - 2, 1, 1, M); R(c, x + k + (k < 0 ? -curl : curl), y - 1, 1, 1, D);
  }
}

function fishWag(f: Fish, t: number) { return Math.sin(t * 8 + f.x) > 0 ? 1 : 0; }

export function createReefRenderer(cv: HTMLCanvasElement) {
  const ctx = cv.getContext('2d')!;
  const bg = document.createElement('canvas'); bg.width = AW; bg.height = AH;
  let seed = NaN;
  return {
    frame(r: Reef, dark: number, now: number) {
      if (r.S.seed !== seed) { seed = r.S.seed; drawStatic(bg.getContext('2d')!, r); }
      const c = ctx, t = now / 1000, g = growth(r);
      c.drawImage(bg, 0, 0);

      // superfície brilhando e raios de luz
      for (let x = 0; x < AW; x++) R(c, x, 0, 1, 1, Math.sin(x * 0.3 + t * 2) > 0.3 ? '#bdf1ff' : '#8edcf2');
      if (dark < 0.35) {
        c.fillStyle = '#ffffff';
        for (let k = 0; k < 4; k++) {
          const x0 = ((k * 67 + t * 3) % 300) - 40;
          c.globalAlpha = 0.05 + Math.sin(t * 0.7 + k) * 0.025;
          for (let y = 1; y < 128; y += 1) c.fillRect(Math.round(x0 + y * 0.35), y, 4, 1);
        }
        c.globalAlpha = 1;
        for (let k = 0; k < 30; k++) { // cáusticas na areia
          const x = (hash(k, 77) * AW) | 0;
          if (Math.sin(t * 2 + k * 1.7) > 0.6) R(c, x, r.sand[x] + 1 + (k % 3), 2, 1, '#fffbe8');
        }
      }

      // capim-marinho + cavalo-marinho agarrado
      r.grass.forEach((gx, k) => {
        const h = 10 + ((hash(k, 5) * 7) | 0);
        for (let j = 0; j < h; j++) R(c, Math.round(gx + Math.sin(t * 1.1 + k) * (j / h) * 2), r.sand[gx] - j, 1, 1, j % 4 ? '#3d9e4a' : '#57b85c');
      });
      sprite(c, SEAHORSE, r.seahorse.x + 2, r.seahorse.y + Math.round(Math.sin(t * 0.8) * 1.2), 1);

      // anêmona com tentáculos dançando
      const a = r.anemone;
      disk(c, a.x, a.y, 2, '#b0607c');
      for (let k = 0; k < 11; k++) {
        const h = 5 + ((hash(k, 9) * 3) | 0);
        for (let j = 1; j <= h; j++) R(c, Math.round(a.x - 5 + k + Math.sin(t * 1.5 + k * 0.7 + j * 0.4) * j * 0.25), a.y - j, 1, 1, j === h ? '#ff5fa8' : '#e8a0c8');
      }

      for (const k of r.corals) drawCoral(c, k, g, t);
      sprite(c, STAR, r.star.x, r.star.y, 1);
      sprite(c, URCHIN, r.urchin.x, r.urchin.y - 2, 1);
      octopus(c, r, t);

      // submarino amarelo, de boa, hélice girando devagar
      const sb = Math.round(Math.sin(t * 0.5) * 0.6);
      sprite(c, SUB, r.sub.x, r.sub.y - 4 + sb, 1);
      const px = r.sub.x + 7, py = r.sub.y - 4 + sb, f = Math.floor(t * 3) % 2;
      R(c, px, py - 1 + f, 1, 2, '#6b7378'); R(c, px + 1, py + (f ? -1 : 1), 1, 1, '#9aa3a8');

      for (const p of r.food) R(c, Math.round(p.x), Math.round(p.y), 1, 1, p.age > 0 ? '#b5763a' : '#e8a050');
      for (const fi of r.fish) sprite(c, FISH[fi.kind], fi.x, fi.y, fi.face, fishWag(fi, t) * (fi.kind === 'donzela' ? 0 : 1));
      for (const cr of r.crabs) {
        const x = Math.round(cr.x), y = r.sand[Math.max(0, Math.min(AW - 1, x))];
        sprite(c, CRAB, x, y - 2, cr.dir);
        const s = Math.floor(cr.step) % 2;
        for (let l = 0; l < 3; l++) R(c, x + (l * 2 - 2 + s) * cr.dir, y, 1, 1, '#a8321a');
      }
      c.fillStyle = '#d8f6ff';
      for (const b of r.bubbles) c.fillRect(Math.round(b.x), Math.round(b.y), 1, 1);

      // noite: luz de lua azul; vigias do submarino acesas
      if (dark > 0) {
        c.globalAlpha = Math.min(0.72, dark * 1.15); R(c, 0, 0, AW, AH, '#04102a'); c.globalAlpha = 1;
        if (dark > 0.25) for (const dx of [-6, -2, 2]) { // vigias acesas
          const X = r.sub.x + dx, Y = r.sub.y - 4 + sb;
          c.globalAlpha = 0.35; R(c, X - 1, Y - 1, 3, 4, '#fff2a8'); c.globalAlpha = 1;
          R(c, X, Y, 1, 2, '#fff7c8');
        }
      }
    },
  };
}
