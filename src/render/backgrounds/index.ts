import { R, disk, type Ctx } from '../px';
import { W, SURF, rng, hash } from '../../sim/world';
import type { Bg } from '../../data/backgrounds';
import type { Props } from './types';
import flores from './flores'; import arvores from './arvores'; import cerrado from './cerrado'; import cactos from './cactos';
import mesas from './mesas'; import estrelas from './estrelas'; import aurora from './aurora'; import cerca from './cerca';
import predios from './predios'; import cogumelos from './cogumelos'; import doces from './doces';

const PROPS: Record<string, Props> = { flores, arvores, cerrado, cactos, mesas, estrelas, aurora, cerca, predios, cogumelos, doces };

/**
 * Desenha o céu de um fundo (W × SURF). Usado no vidro e nas miniaturas da biblioteca.
 * part: 'back' = só céu (o sol/lua do relógio entra depois), 'front' = morros e chão por cima.
 */
export function drawBg(c: Ctx, b: Bg, part: 'all' | 'back' | 'front' = 'all') {
  const r = rng(b.id.length * 977 + b.name.length), n = b.sky.length, SH = SURF, P = PROPS[b.props] ?? {};
  // faixas com dithering na transição
  for (let y = 0; y < SH; y++) {
    const t = (y / SH) * n, i = Math.min(n - 1, t | 0), f = t - i;
    for (let x = 0; x < W; x++) R(c, x, y, 1, 1, f > 0.72 && i < n - 1 && (x + y) % 2 ? b.sky[i + 1] : b.sky[i]);
  }
  P.sky?.(c, r);
  if (part === 'front') c.clearRect(0, 0, W, SH); // mesma sequência do rng, só sem o céu
  const [ct, cx, cy, cc] = b.cel, X = Math.round(cx * W);
  if (part === 'back') return;
  if (part === 'front') { /* sol/lua vêm do relógio */ }
  else if (ct === 'sun') { c.globalAlpha = 0.25; disk(c, X, cy, 8, cc); c.globalAlpha = 1; disk(c, X, cy, 5, cc); }
  else { disk(c, X, cy, 4, cc); R(c, X - 1, cy - 1, 1, 1, '#0002'); R(c, X + 1, cy + 2, 2, 1, '#0002'); R(c, X + 2, cy - 2, 1, 1, '#0002'); }
  b.hills.forEach(([col, amp, top], k) => {
    const p = r() * 9;
    for (let x = 0; x < W; x++) {
      let h = Math.round(top + Math.sin((x * 0.035) / amp + p) * amp * 5 + Math.sin(x * 0.11 + p * 2) * 1.5);
      if (b.props === 'mesas' && k === 0) h = Math.floor((x + p * 20) / 38) % 2 ? top - 2 : SH;
      R(c, x, h, 1, SH - h, col);
    }
  });
  const g = SH - 1;
  P.ground?.(c, r, g);
  R(c, 0, SH - 2, W, 2, b.grass);
  for (let x = 0; x < W; x++) if (hash(x, 7) < 0.4) R(c, x, SH - 3, 1, 1, b.grass);
  for (let x = 0; x < W; x += 2) if (hash(x, 9) < 0.3) R(c, x, SH - 1, 1, 1, '#0002');
}
