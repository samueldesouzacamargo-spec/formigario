// Visitantes da superfície, só visuais e calculados pelo tempo (sem estado):
// besouros andando, borboletas de dia, vaga-lumes à noite.
import { R, type Ctx } from './px';
import { W, SURF } from '../sim/world';
import { darkness } from './sky';
import type { Bg } from '../data/backgrounds';

const BEETLE_PERIOD = 80, BEETLE_WALK = 55; // a cada 80 s, um besouro atravessa em 55 s

function beetle(c: Ctx, x: number, y: number, f: number, step: number, kind: number) {
  const s = step % 2;
  if (kind === 0) {
    // joaninha: casco vermelho com pintas
    R(c, x - 2, y - 1, 4, 2, '#d8312f'); R(c, x - 1, y - 2, 2, 1, '#e8504a');
    R(c, x - 1, y - 1, 1, 1, '#1a1010'); R(c, x + 1, y, 1, 1, '#1a1010');
    R(c, f > 0 ? x + 2 : x - 3, y, 1, 1, '#1a1010');
  } else {
    // rola-bosta empurrando a bolinha
    R(c, x - 2, y - 1, 4, 2, '#2b2320'); R(c, x - 1, y - 2, 2, 1, '#4a3d36');
    R(c, f > 0 ? x + 2 : x - 3, y, 1, 1, '#2b2320');
    const bx = f > 0 ? x + 3 : x - 6;
    R(c, bx, y - 2, 3, 3, '#7a5534'); R(c, bx + 1, y - 2, 1, 1, '#9a7048');
  }
  R(c, x - 2 + s, y + 1, 1, 1, '#140c08'); R(c, x + 1 - s, y + 1, 1, 1, '#140c08');
}

function butterfly(c: Ctx, x: number, y: number, open: boolean, col: string) {
  R(c, x, y, 1, 2, '#2a1d13');
  if (open) { R(c, x - 2, y - 1, 2, 2, col); R(c, x + 1, y - 1, 2, 2, col); R(c, x - 1, y + 1, 1, 1, col); R(c, x + 1, y + 1, 1, 1, col); }
  else { R(c, x - 1, y - 1, 1, 2, col); R(c, x + 1, y - 1, 1, 2, col); }
}
const WINGS = ['#ffd166', '#7fd3ff', '#ff8fb1', '#ffffff', '#c9a6ff'];

export function drawCritters(c: Ctx, bg: Bg, mound: number[], dayNight: boolean, rain: boolean, now: number) {
  const t = now / 1000;
  const night = bg.cel[0] === 'moon' || (dayNight && darkness() > 0.3);

  // besouro: um por ciclo, alternando espécie e direção
  const cyc = Math.floor(t / BEETLE_PERIOD), tc = t - cyc * BEETLE_PERIOD;
  if (tc < BEETLE_WALK) {
    const f = cyc % 2 ? -1 : 1, u = tc / BEETLE_WALK;
    const x = Math.round(f > 0 ? -8 + u * (W + 16) : W + 8 - u * (W + 16));
    if (x >= 0 && x < W) beetle(c, x, SURF - 1 - mound[x], f, Math.floor(tc * 6), Math.floor(cyc / 2) % 2);
  }

  if (rain) return; // na chuva ninguém voa

  if (!night) {
    for (let k = 0; k < 2; k++) {
      const P = 50 + k * 23, cy = Math.floor((t + k * 31) / P), u = ((t + k * 31) - cy * P) / 32;
      if (u > 1) continue; // fora de cena nesta volta
      const dir = (cy + k) % 2 ? -1 : 1;
      const x = Math.round(dir > 0 ? -4 + u * (W + 8) : W + 4 - u * (W + 8));
      const y = Math.round(14 + k * 7 + Math.sin(t * 0.9 + k * 2) * 5 + Math.sin(t * 3.1 + k) * 2);
      butterfly(c, x, y, Math.floor(now / 140 + k) % 2 === 0, WINGS[(cy + k * 2) % WINGS.length]);
    }
  } else {
    for (let k = 0; k < 7; k++) {
      const x = Math.round((k * 37 + t * (1.5 + (k % 3)) + Math.sin(t * 0.5 + k) * 8) % W);
      const y = Math.round(SURF - 6 - (k % 4) * 3 + Math.sin(t * 0.8 + k * 1.7) * 2);
      const glow = Math.max(0, Math.sin(t * 1.6 + k * 2.3));
      if (glow < 0.15) continue;
      c.globalAlpha = glow * 0.35; R(c, x - 1, y - 1, 3, 3, '#e8ff7a');
      c.globalAlpha = glow; R(c, x, y, 1, 1, '#f4ffb0');
    }
    c.globalAlpha = 1;
  }
}
