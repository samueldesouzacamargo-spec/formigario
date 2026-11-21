import { R, type Ctx } from './px';
import { W, N, SURF, hash, active, type World, type Carry, type Fall } from '../sim/world';
import { TREATS, type TreatId } from '../data/treats';
import { SKW, SKQ, type Skin } from '../data/skins';

/** operária: 3–4 px de corpo, cabeça, antena, 2 quadros de pata, item acima da cabeça */
export function ant(c: Ctx, x: number, y: number, f: number, col: string, head: string, step: number, big?: boolean, carry?: Carry | null) {
  R(c, x - f, y, 1, 1, col); if (big) R(c, x - 2 * f, y, 1, 1, col);
  R(c, x, y, 1, 1, col); R(c, x + f, y, 1, 1, head); R(c, x + 2 * f, y - 1, 1, 1, head);
  const s = step % 2; R(c, x - 1 + s, y + 1, 1, 1, head); R(c, x + 1 - s, y + 1, 1, 1, head);
  if (!carry) return;
  const cc = carry === 'terra' ? '#8a5a36' : carry === 'lixo' ? '#8f8577' : TREATS[carry].c;
  R(c, x + f, y - 1, 1, 1, cc);
  if (carry === 'folha' || carry === 'grilo') { R(c, x + f * 2, y - 2, 1, 1, cc); R(c, x, y - 2, 2, 1, TREATS[carry].d); }
}

export function queen(c: Ctx, x: number, y: number, f: number, qc: string, qh: string, step: number, crown?: boolean) {
  R(c, x - 3 * f, y - 1, 2, 2, qc); R(c, x - f, y, 1, 1, qc); R(c, x, y, 1, 1, qc); R(c, x + f, y, 1, 1, qh); R(c, x + 2 * f, y - 1, 1, 1, qh); R(c, x - 2 * f, y, 1, 1, qc);
  const s = step % 2; R(c, x - 1 + s, y + 1, 1, 1, qh); R(c, x + 1 - s, y + 1, 1, 1, qh); R(c, x - s, y + 1, 1, 1, qh); R(c, x - 3 * f, y - 1, 1, 1, qh);
  if (crown) { R(c, x + f, y - 2, 1, 1, '#ffd84a'); R(c, x, y - 2, 1, 1, '#ffd84a'); R(c, x, y - 3, 1, 1, '#ffe98a'); }
}

/** ícone 8×8 dos botões de petisco */
export function treatIcon(c: Ctx, type: TreatId) {
  const d = TREATS[type];
  c.clearRect(0, 0, 8, 8);
  if (type === 'folha') { R(c, 1, 3, 6, 2, d.c); R(c, 2, 2, 4, 1, d.c); R(c, 2, 5, 3, 1, d.c); R(c, 1, 4, 6, 1, d.d); R(c, 0, 5, 1, 1, d.d); }
  else if (type === 'acucar') { R(c, 1, 2, 5, 5, d.c); R(c, 1, 6, 5, 1, d.d); R(c, 6, 1, 1, 1, '#ffe27a'); }
  else { R(c, 1, 3, 5, 2, d.c); R(c, 6, 2, 1, 2, d.d); R(c, 0, 5, 1, 2, d.d); R(c, 3, 5, 1, 2, d.d); R(c, 5, 5, 2, 1, d.d); R(c, 7, 1, 1, 1, d.d); }
}

export const skinColors = (list: Skin[], id: string, c: string, h: string) => { const s = list.find((x) => x.id === id) ?? list[0]; return { c: s.c ?? c, h: s.h ?? h, crown: s.crown }; };

const EGG = ['#f6f0dc', '#efe3b8'];

/** galho com folhas deitado no chão (encolhe conforme levam os pedaços) ou caindo */
function twig(c: Ctx, x: number, y: number, n: number, tilt: number) {
  const L = Math.min(15, 4 + Math.ceil(n / 2)), d = TREATS.folha;
  for (let k = 0; k < L; k++) R(c, x - (L >> 1) + k, y - Math.round(k * tilt), 1, 1, k % 4 ? '#6b4a2b' : '#4e3520');
  R(c, x - (L >> 1) + 3, y - Math.round(3 * tilt) - 1, 1, 1, '#6b4a2b'); // um raminho
  for (let k = 1; k < L; k += 2) {
    const lx = x - (L >> 1) + k, ly = y - Math.round(k * tilt) - 2 - (k % 4 === 1 ? 1 : 0);
    R(c, lx - 1, ly, 3, 2, d.c); R(c, lx, ly, 1, 1, d.d); if (k % 3 === 0) R(c, lx, ly + 3, 2, 1, d.c); // folhas pros dois lados
  }
}
function falling(c: Ctx, f: Fall, now: number) {
  const t = now / 1000, x = Math.round(f.x + (f.type === 'folha' && !f.twig ? Math.sin(t * 2.6 + f.x) * 3 : 0)), y = Math.round(f.y), d = TREATS[f.type];
  if (f.twig) twig(c, x, y, f.n, Math.sin(t * 4 + f.x) * 0.4);
  else if (f.type === 'folha') { const flip = (now / 260 | 0) % 2; R(c, x - 1, y, 3, 1, d.c); R(c, x - 1 + flip * 2, y - 1, 1, 1, d.d); R(c, x + 1 - flip * 2, y + 1, 1, 1, d.c); }
  else if (f.type === 'acucar') { R(c, x - 1, y - 1, 3, 3, d.c); R(c, x - 1, y + 1, 3, 1, d.d); }
  else { R(c, x - 2, y - 1, 4, 2, d.c); R(c, x + 2, y - 2, 1, 1, d.d); R(c, x - 2, y + 1, 1, 1, d.d); }
}

/** tempestade e bichos da terra: rastro da minhoca, minhoca, tampa da entrada, água nas galerias */
function drawSoilEvents(c: Ctx, w: World, now: number) {
  const dug = w.S.dug;
  for (const [i, t] of w.holes) { c.globalAlpha = Math.min(1, t / 10) * 0.85; R(c, i % W, (i / W) | 0, 1, 1, '#1e130c'); }
  c.globalAlpha = 1;
  const m = w.worm;
  if (m) m.body.forEach((i, k) => {
    const wig = (Math.floor(now / 200) + k) % 3 === 0 ? 1 : 0;
    R(c, i % W, ((i / W) | 0) - wig * (k % 2), 1, 1, k === 0 ? '#f0a8a0' : k === 3 ? '#b9615f' : '#d98a85');
    if (k < m.body.length - 1) R(c, i % W, ((i / W) | 0) + 1 - wig * (k % 2), 1, 1, '#c27471');
  });
  const { plug, flood } = w.wx;
  if (flood > 0.02) {
    // água empoça no fundo de cada galeria: célula aberta a até `depth` px de um chão
    const depth = Math.ceil(flood * 5), wave = Math.floor(now / 400);
    const wet = (i: number) => { if (i < SURF * W || !dug[i]) return false; for (let k = 1; k <= depth; k++) if (i + k * W >= N || !dug[i + k * W]) return true; return false; };
    for (let i = SURF * W; i < N; i++) {
      if (!wet(i)) continue;
      c.globalAlpha = 0.6; R(c, i % W, (i / W) | 0, 1, 1, !wet(i - W) && (i + wave) % 5 === 0 ? '#9fd0ff' : '#3d7fd0');
    }
    c.globalAlpha = 1;
  }
  if (plug > 0) {
    const rows = Math.ceil(plug * 3);
    for (let y = SURF; y < SURF + rows; y++) for (let x = w.ex - 2; x <= w.ex + 2; x++) if (dug[y * W + x]) R(c, x, y, 1, 1, hash(x, y) < 0.5 ? '#7a4e2e' : '#8a5a36');
    if (plug >= 0.7) R(c, w.ex - 1, SURF - 1, 3, 1, '#6b4429');
  }
}
const surfY = (w: World, i: number) => { const x = i % W, y = (i / W) | 0; return y === SURF - 1 ? SURF - 1 - w.S.mound[x] : y; };

/** conteúdo das câmaras (do chão pra cima), petiscos, formigas e rainha */
export function drawLife(c: Ctx, w: World, now: number) {
  const S = w.S;
  // trilhas de feromônio: brilho fraco onde passou comida
  c.fillStyle = '#ffe6a0';
  for (let i = (SURF - 1) * W; i < w.ph.length; i++) {
    const p = w.ph[i];
    if (p < 0.6) continue;
    c.globalAlpha = Math.min(0.35, p * 0.04);
    c.fillRect(i % W, (i / W) | 0, 1, 1);
  }
  c.globalAlpha = 1;
  drawSoilEvents(c, w, now);
  for (const f of w.falls) falling(c, f, now);
  const nurseryOpen = w.rooms.some((r) => r.type === 'crias' && active(r));
  for (const rm of w.rooms) {
    let n = rm.fung, k = 0, e = rm.type === 'crias' || (rm.type === 'rainha' && !nurseryOpen) ? S.eggs : 0;
    const items = rm.items;
    for (const i of rm.cells) {
      if (n <= 0 && k >= items.length && e <= 0) break;
      if (!S.dug[i]) continue;
      const x = i % W, y = (i / W) | 0;
      let col: string | null = null;
      if (n > 0) { col = hash(x, y) < 0.5 ? '#ece6d2' : '#cfc8b4'; n--; }
      else if (k < items.length) {
        const t = items[k++];
        col = t === 'lixo' ? (hash(x, y) < 0.5 ? '#8f8577' : '#6f665a')
          : t === 'terra' ? '#8a5a36'
          : t === 'acucar' && rm.type === 'mel' ? (hash(x, y) < 0.4 ? '#ffd27a' : '#f2a33a')
          : hash(x, y) < 0.5 ? TREATS[t].c : TREATS[t].d;
      } else if (e > 0 && (x + y) % 2 === 0) { col = EGG[e % 2]; e--; }
      if (col) R(c, x, y, 1, 1, col);
    }
  }
  for (const t of w.treats) {
    const x = t.x, y = SURF - 1 - S.mound[x], s = Math.max(1, Math.ceil(t.n / 4)), d = TREATS[t.type];
    if (t.twig) twig(c, x, y - 1, t.n, 0);
    else if (t.type === 'folha') for (let k = 0; k < s + 1; k++) { R(c, x - 2 + k * 2, y - 1 - (k % 2), 3, 1, d.c); R(c, x - 1 + k * 2, y - 2 - (k % 2), 1, 1, d.d); }
    else if (t.type === 'acucar') { R(c, x - 1, y - s, s + 1, s, d.c); R(c, x - 1, y - 1, s + 1, 1, d.d); if ((now / 300 | 0) % 2) R(c, x + s, y - s - 1, 1, 1, '#fff'); }
    else { R(c, x - 2, y - 2, Math.min(6, s + 3), 2, d.c); R(c, x - 3, y - 2, 1, 1, d.d); R(c, x + 2, y - 3, 2, 1, d.d); R(c, x - 1, y, 1, 1, d.d); R(c, x + 2, y, 1, 1, d.d); }
  }
  const wk = skinColors(SKW, S.skW, w.sp.c, w.sp.h);
  for (const a of w.ants) ant(c, a.i % W, surfY(w, a.i), a.face, wk.c, wk.h, a.step, w.sp.big, a.carry);
  const qk = skinColors(SKQ, S.skQ, w.sp.c, w.sp.h), q = w.queen;
  queen(c, q.i % W, surfY(w, q.i), q.face, qk.c, qk.h, q.step, qk.crown);
}
