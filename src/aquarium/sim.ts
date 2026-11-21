// Aquário marinho: um recife vivo. Sem níveis nem tarefas: os bichos só vivem.
// Os corais crescem com o tempo de app aberto. Nada aqui toca DOM.
import { rng, hash } from '../sim/world';

export const AW = 240, AH = 150;

export type FishKind = 'palhaco' | 'cirurgiao' | 'amarelo' | 'gramma' | 'donzela';
export interface Fish { kind: FishKind; x: number; y: number; vx: number; vy: number; tx: number; ty: number; tt: number; face: 1 | -1; spd: number }
export interface Crab { x: number; dir: 1 | -1; wait: number; step: number; tx: number }
export interface Octo { state: 'den' | 'out' | 'back'; x: number; y: number; tx: number; ty: number; wait: number; camo: number; step: number }
export type CoralKind = 'chifre' | 'cerebro' | 'leque' | 'cogumelo' | 'zoantideo' | 'tubo' | 'vaso';
export interface Coral { kind: CoralKind; x: number; y: number; seed: number }

export interface ReefSave { v: 1; seed: number; age: number; on: boolean }

export interface Reef {
  S: ReefSave;
  sand: number[]; // topo da areia por coluna
  rock: number[]; // topo da rocha por coluna (= areia onde não tem rocha)
  den: { x: number; y: number }; // toca do polvo
  anemone: { x: number; y: number };
  grass: number[]; // x das folhas de capim-marinho
  seahorse: { x: number; y: number };
  star: { x: number; y: number }; urchin: { x: number; y: number };
  sub: { x: number; y: number };
  corals: Coral[];
  fish: Fish[]; crabs: Crab[]; octo: Octo;
  food: { x: number; y: number; vy: number; age: number }[];
  bubbles: { x: number; y: number; v: number; ph: number }[];
  t: number; tb: number; tsub: number;
  night: boolean;
}

export const freshReef = (seed = (Math.random() * 2 ** 31) | 0): ReefSave => ({ v: 1, seed, age: 0, on: false });

/** crescimento dos corais 0.25 → 1 em ~40 h de app aberto (uma semana de trabalho) */
export const growth = (r: Reef) => Math.min(1, 0.25 + r.S.age / (40 * 3600));
export const schoolSize = (r: Reef) => 5 + Math.floor(growth(r) * 5);

export function createReef(S: ReefSave): Reef {
  const r = rng(S.seed);
  const p = r() * 9;
  const sand = Array.from({ length: AW }, (_, x) => Math.round(128 + Math.sin(x * 0.05 + p) * 2 + Math.sin(x * 0.13 + p * 2)));
  const rock = sand.slice();
  // duas pilhas de rocha viva
  const piles = [{ cx: 48 + ((r() * 16) | 0), hw: 30, h: 26 + r() * 8 }, { cx: 188 + ((r() * 14) | 0), hw: 34, h: 30 + r() * 10 }];
  for (const pl of piles) for (let x = pl.cx - pl.hw; x <= pl.cx + pl.hw; x++) {
    if (x < 0 || x >= AW) continue;
    const u = (x - pl.cx) / pl.hw, h = pl.h * (1 - u * u) + (hash(x, 31) - 0.5) * 4 + Math.sin(x * 0.4) * 1.5;
    rock[x] = Math.min(rock[x], Math.round(sand[x] - Math.max(0, h)));
  }
  const [L, Rp] = piles;
  const top = (x: number) => rock[Math.max(0, Math.min(AW - 1, Math.round(x)))];
  const den = { x: Rp.cx - 12, y: sand[Rp.cx - 12] - 6 };
  const anemone = { x: L.cx + 14, y: top(L.cx + 14) };
  const corals: Coral[] = [
    { kind: 'leque', x: L.cx - 10, y: top(L.cx - 10), seed: S.seed + 1 },
    { kind: 'cerebro', x: L.cx + 2, y: top(L.cx + 2), seed: S.seed + 2 },
    { kind: 'zoantideo', x: L.cx - 22, y: top(L.cx - 22), seed: S.seed + 3 },
    { kind: 'chifre', x: Rp.cx + 4, y: top(Rp.cx + 4), seed: S.seed + 4 },
    { kind: 'cogumelo', x: Rp.cx + 20, y: top(Rp.cx + 20), seed: S.seed + 5 },
    { kind: 'vaso', x: Rp.cx - 22, y: top(Rp.cx - 22), seed: S.seed + 6 },
    { kind: 'zoantideo', x: Rp.cx + 12, y: top(Rp.cx + 12), seed: S.seed + 7 },
    { kind: 'tubo', x: 142 + ((r() * 6) | 0), y: 0, seed: S.seed + 8 },
  ];
  for (const c of corals) if (c.kind === 'tubo') c.y = sand[c.x];
  const subX = 104 + ((r() * 8) | 0);
  const reef: Reef = {
    S, sand, rock, den, anemone, corals,
    grass: [4, 8, 11, 15, 19, 22],
    seahorse: { x: 13, y: sand[13] - 14 },
    star: { x: Rp.cx - 2, y: top(Rp.cx - 2) + 3 },
    urchin: { x: 86 + ((r() * 8) | 0), y: 0 },
    sub: { x: subX, y: Math.min(sand[subX - 8], sand[subX + 8]) - 1 },
    fish: [], crabs: [], food: [], bubbles: [],
    octo: { state: 'den', x: den.x, y: den.y, tx: den.x, ty: den.y, wait: 5, camo: 0, step: 0 },
    t: 0, tb: 0, tsub: 0, night: false,
  };
  reef.urchin.y = sand[reef.urchin.x];
  const add = (kind: FishKind, n: number, spd: number) => {
    for (let k = 0; k < n; k++) {
      const x = 20 + r() * (AW - 40), y = 20 + r() * 70;
      reef.fish.push({ kind, x, y, vx: 0, vy: 0, tx: x, ty: y, tt: 0, face: r() < 0.5 ? 1 : -1, spd: spd * (0.85 + r() * 0.3) });
    }
  };
  add('palhaco', 2, 9); add('cirurgiao', 1, 13); add('amarelo', 1, 10); add('gramma', 2, 7); add('donzela', schoolSize(reef), 12);
  reef.crabs.push({ x: 70, dir: 1, wait: 2, step: 0, tx: 70 }, { x: 160, dir: -1, wait: 6, step: 0, tx: 160 });
  return reef;
}

const waterBottom = (r: Reef, x: number) => r.rock[Math.max(0, Math.min(AW - 1, Math.round(x)))] - 4;

function pickTarget(r: Reef, f: Fish, leader?: Fish) {
  const rnd = Math.random;
  if (r.night) { // dormem perto do fundo, devagar
    f.tx = 10 + rnd() * (AW - 20); f.ty = waterBottom(r, f.tx) - 2 - rnd() * 10;
  } else if (f.kind === 'palhaco') { // nunca se afastam da anêmona
    f.tx = r.anemone.x + (rnd() - 0.5) * 22; f.ty = r.anemone.y - 4 - rnd() * 12;
  } else if (f.kind === 'gramma') { // rente às rochas
    f.tx = 10 + rnd() * (AW - 20); f.ty = waterBottom(r, f.tx) - 2 - rnd() * 8;
  } else if (f.kind === 'donzela' && leader && leader !== f) { // cardume: segue a líder
    f.tx = leader.tx + (rnd() - 0.5) * 14; f.ty = leader.ty + (rnd() - 0.5) * 8;
  } else {
    f.tx = 10 + rnd() * (AW - 20); f.ty = 8 + rnd() * (waterBottom(r, f.tx) - 20);
  }
  f.tt = 3 + rnd() * 6;
}

export function feed(r: Reef) {
  const cx = 30 + Math.random() * (AW - 60);
  for (let k = 0; k < 14; k++) r.food.push({ x: cx + (Math.random() - 0.5) * 30, y: 2 + Math.random() * 3, vy: 3 + Math.random() * 2, age: 0 });
}

export function tickReef(r: Reef, d: number, night: boolean) {
  r.t += d; r.night = night;
  const leader = r.fish.find((f) => f.kind === 'donzela');

  // flocos de ração: afundam devagar e ficam um tempo na areia
  for (const f of r.food) {
    const floor = r.rock[Math.max(0, Math.min(AW - 1, Math.round(f.x)))] - 1;
    if (f.y < floor) { f.y = Math.min(floor, f.y + f.vy * d); f.x += Math.sin(r.t * 2 + f.vy * 7) * d * 2; } else f.age += d;
  }
  r.food = r.food.filter((f) => f.age < 25);

  for (const f of r.fish) {
    // fome: o floco mais perto que ainda está na água
    let food: Reef['food'][number] | null = null, fd = 1e9;
    if (!night) for (const p of r.food) { if (p.age > 0) continue; const dd = Math.hypot(p.x - f.x, p.y - f.y); if (dd < fd) { fd = dd; food = p; } }
    if (food) { f.tx = food.x; f.ty = food.y; if (fd < 2) r.food.splice(r.food.indexOf(food), 1); }
    else if ((f.tt -= d) <= 0 || Math.hypot(f.tx - f.x, f.ty - f.y) < 2) pickTarget(r, f, leader);

    const speed = f.spd * (night ? 0.25 : food ? 1.6 : 1);
    let dx = f.tx - f.x, dy = f.ty - f.y;
    const len = Math.hypot(dx, dy) || 1;
    dx = (dx / len) * speed; dy = (dy / len) * speed * 0.6;
    // cardume não se amontoa
    if (f.kind === 'donzela') for (const o of r.fish) if (o !== f && o.kind === 'donzela') {
      const ox = f.x - o.x, oy = f.y - o.y, dd = ox * ox + oy * oy;
      if (dd < 9 && dd > 0) { dx += (ox / dd) * 6; dy += (oy / dd) * 6; }
    }
    const k = Math.min(1, d * 1.5);
    f.vx += (dx - f.vx) * k; f.vy += (dy - f.vy) * k;
    f.x = Math.max(4, Math.min(AW - 5, f.x + f.vx * d));
    f.y = Math.max(5, Math.min(waterBottom(r, f.x), f.y + f.vy * d));
    if (Math.abs(f.vx) > 0.4) f.face = f.vx > 0 ? 1 : -1;
  }

  // ermitões: andam devagar, param, e catam ração que cai na areia
  for (const c of r.crabs) {
    const crumb = r.food.find((p) => p.age > 0 && Math.abs(p.x - c.x) < 40);
    if (crumb) c.tx = crumb.x;
    if (c.wait > 0 && !crumb) { c.wait -= d; continue; }
    const dx = c.tx - c.x;
    if (Math.abs(dx) < 1) {
      if (crumb) r.food.splice(r.food.indexOf(crumb), 1);
      c.wait = 2 + Math.random() * 7; c.tx = Math.max(6, Math.min(AW - 6, c.x + (Math.random() - 0.5) * 80));
      continue;
    }
    c.dir = dx > 0 ? 1 : -1;
    c.x += c.dir * d * (crumb ? 4 : 2.2);
    c.step += d * 6;
  }

  // polvo: mora na toca, sai mais à noite, se camufla quando para
  const o = r.octo;
  if (o.state === 'den') {
    if (Math.random() < d * (night ? 0.03 : 0.006)) { o.state = 'out'; o.wait = 0; o.tx = 20 + Math.random() * (AW - 40); }
  } else {
    if (o.wait > 0) { o.wait -= d; o.camo = Math.min(1, o.camo + d * 0.25); }
    else {
      const ty = o.state === 'back' ? r.den.y : waterBottom(r, o.tx) + 1;
      const tx = o.state === 'back' ? r.den.x : o.tx;
      const dx = tx - o.x, dy = ty - o.y, len = Math.hypot(dx, dy);
      o.camo = Math.max(0, o.camo - d * 0.8);
      if (len < 1) {
        if (o.state === 'back') { o.state = 'den'; o.camo = 0; }
        else { o.wait = 5 + Math.random() * 10; o.state = Math.random() < 0.4 ? 'back' : 'out'; o.tx = 20 + Math.random() * (AW - 40); }
      } else {
        o.x += (dx / len) * d * 5; o.y += (dy / len) * d * 5;
        o.y = Math.min(o.y, waterBottom(r, o.x) + 1);
        o.step += d * 4;
      }
    }
  }

  // bolhas: pedra porosa no canto e uns arrotos do submarino
  if ((r.tb += d) > 0.18) { r.tb = 0; r.bubbles.push({ x: 26, y: r.sand[26] - 2, v: 14 + Math.random() * 8, ph: Math.random() * 6 }); }
  if ((r.tsub += d) > 7) { r.tsub = 0; for (let k = 0; k < 3; k++) r.bubbles.push({ x: r.sub.x - 2, y: r.sub.y - 10 - k * 2, v: 10 + Math.random() * 4, ph: Math.random() * 6 }); }
  for (const b of r.bubbles) { b.y -= b.v * d; b.x += Math.sin(r.t * 3 + b.ph) * d * 3; }
  r.bubbles = r.bubbles.filter((b) => b.y > 2);

  // cardume cresce junto com o recife
  const want = schoolSize(r), have = r.fish.filter((f) => f.kind === 'donzela').length;
  if (have < want && leader) r.fish.push({ ...leader, x: leader.x - 4, spd: leader.spd * (0.9 + Math.random() * 0.2) });
}
