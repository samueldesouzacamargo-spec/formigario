// Céu vivo: nuvens com parallax, sol e lua andando pelo relógio real, entardecer, noite, chuva e relâmpago.
// back = atrás dos morros (sol, lua, nuvens, tom do entardecer); front = por cima de tudo (noite, chuva, raio).
import { R, disk, type Ctx } from './px';
import { W, H, SURF, hash } from '../sim/world';
import type { Bg } from '../data/backgrounds';

import { darkness, skyArc } from '../sim/clock';
export { darkness };

export type Rain = 0 | 1 | 2; // seco, chuva fraca, tempestade

// duas camadas: longe (lenta, pequena) e perto (rápida, maior)
const CLOUDS = Array.from({ length: 9 }, (_, k) => ({ near: k >= 5, x0: hash(k, 3) * (W + 60), y: 3 + ((hash(k, 5) * 14) | 0), w: 10 + ((hash(k, 8) * 14) | 0) }));
const arcXY = (u: number) => ({ x: Math.round(8 + u * (W - 16)), y: Math.round(31 - Math.sin(u * Math.PI) * 25) });

function cloud(c: Ctx, x: number, y: number, w: number, col: string) {
  R(c, x, y, w, 2, col); R(c, x + 2, y - 1, w - 5, 1, col); R(c, x + 4, y - 2, Math.max(2, w - 10), 1, col); R(c, x + 1, y + 2, w - 2, 1, col);
}
function moon(c: Ctx, x: number, y: number) {
  c.globalAlpha = 0.18; disk(c, x, y, 7, '#f4eed6'); c.globalAlpha = 1;
  disk(c, x, y, 4, '#f1eccf'); R(c, x - 1, y - 1, 1, 1, '#0002'); R(c, x + 1, y + 2, 2, 1, '#0002'); R(c, x + 2, y - 2, 1, 1, '#0002');
}

/** clock = sol/lua seguem o relógio (fundo diurno com dia/noite ligado) */
export function drawSkyBack(c: Ctx, clock: boolean, rain: Rain, now: number, date = new Date()) {
  const t = now / 1000;
  if (clock) {
    const { sun, moon: mo } = skyArc(date);
    if (sun !== null) {
      const p = arcXY(sun), low = 1 - Math.min(1, Math.sin(sun * Math.PI) / 0.45); // 1 perto do horizonte
      // entardecer / amanhecer: céu alaranjado e sol mais vermelho
      if (low > 0) { c.globalAlpha = low * 0.42; R(c, 0, 0, W, SURF, '#ff8f5a'); c.globalAlpha = low * 0.3; R(c, 0, 18, W, SURF - 18, '#ffcf7a'); c.globalAlpha = 1; }
      const col = low > 0.5 ? '#ffb36b' : '#fff3c4';
      if (!rain) { c.globalAlpha = 0.25; disk(c, p.x, p.y, 8, col); c.globalAlpha = 1; disk(c, p.x, p.y, 5, col); }
    }
    if (mo !== null) { const p = arcXY(mo); moon(c, p.x, p.y); }
  }
  c.globalAlpha = rain === 2 ? 0.95 : rain ? 0.8 : 0.55;
  for (const k of CLOUDS) {
    if (!rain && k.near && k.w > 18) continue; // tempo bom = menos nuvem
    const x = ((k.x0 + t * (k.near ? 0.9 : 0.35) * (rain === 2 ? 2.5 : 1)) % (W + 60)) - 30;
    const col = rain === 2 ? (k.near ? '#5d6470' : '#7a818c') : rain ? (k.near ? '#8d96a3' : '#a9b1bb') : k.near ? '#ffffff' : '#f3f1ee';
    cloud(c, Math.round(x), k.y + (k.near ? 3 : 0), k.near ? k.w : k.w - 4, col);
  }
  c.globalAlpha = 1;
}

/** por cima de tudo: escuridão da noite (forte no céu, leve na terra), estrelas, lua, chuva e raios */
export function drawSkyFront(c: Ctx, bg: Bg, dayNight: boolean, rain: Rain, now: number, date = new Date()) {
  const t = now / 1000, nightBg = bg.cel[0] === 'moon', clock = dayNight && !nightBg;
  const dark = clock ? darkness(date) : 0;

  const shade = Math.max(dark, rain === 2 ? 0.4 : rain ? 0.22 : 0);
  if (shade > 0) {
    c.globalAlpha = shade; R(c, 0, 0, W, SURF, rain && dark < 0.2 ? '#3b4250' : '#0a1030');
    c.globalAlpha = shade * 0.45; R(c, 0, SURF, W, H - SURF, '#050814'); c.globalAlpha = 1;
  }
  if (dark > 0.3 && !rain) {
    c.globalAlpha = Math.min(1, (dark - 0.3) * 3);
    for (let k = 0; k < 40; k++) R(c, (hash(k, 11) * W) | 0, (hash(k, 13) * (SURF - 18)) | 0, 1, 1, k % 5 ? '#c9d2ff' : '#fff');
    c.globalAlpha = 1;
    const mo = skyArc(date).moon;
    if (mo !== null) { const p = arcXY(mo); if (p.y < 24) moon(c, p.x, p.y); } // a lua brilha por cima do escuro
  }

  if (rain) {
    const n = rain === 2 ? 140 : 50, v = rain === 2 ? 95 : 55, slant = rain === 2 ? 0.6 : 0.3;
    c.globalAlpha = rain === 2 ? 0.7 : 0.5;
    for (let k = 0; k < n; k++) {
      const y = (hash(k, 1) * SURF + t * (v + hash(k, 2) * 25)) % SURF;
      const x = (((hash(k, 4) * W - y * slant) % W) + W) % W;
      R(c, x | 0, y | 0, 1, rain === 2 ? 3 : 2, '#9ec3ff');
    }
    // respingos no chão
    for (let k = 0; k < (rain === 2 ? 14 : 6); k++) if (hash(k, (t * 8) | 0) < 0.5) R(c, (hash(k, ((t * 8) | 0) + 3) * W) | 0, SURF - 2, 1, 1, '#cfe2ff');
    c.globalAlpha = 1;
  }
  if (rain === 2) {
    // relâmpago: alguns ciclos de 6 s têm um clarão duplo com um raio no céu
    const k = Math.floor(t / 6), u = t - k * 6;
    if (hash(k, 77) < 0.4 && (u < 0.12 || (u > 0.22 && u < 0.3))) {
      let x = (hash(k, 78) * (W - 40) + 20) | 0;
      for (let y = 0; y < 30; y += 3) { const nx = x + (hash(k, y) < 0.5 ? -2 : 2); R(c, Math.min(x, nx), y, Math.abs(nx - x) + 1, 3, '#fffbe0'); x = nx; }
      c.globalAlpha = 0.35; R(c, 0, 0, W, H, '#ffffff'); c.globalAlpha = 1;
    }
  }
}
