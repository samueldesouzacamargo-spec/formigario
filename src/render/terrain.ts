// Terra em 4 camadas com dithering, pedras, túneis cavados, monte na superfície e a planta fantasma.
import { W, H, SURF, hash, type World } from '../sim/world';
import { BGS } from '../data/backgrounds';
import { ROOMS } from '../data/rooms';
import { hex } from './px';

const DUG_TOP = [20, 12, 7], DUG_FLOOR = [44, 29, 19], DUG = [30, 19, 12];
const STONE = [[120, 112, 104], [98, 92, 86], [140, 132, 122]];
const PLAN_COL = Object.fromEntries(Object.entries(ROOMS).map(([k, v]) => [k, hex(v[1])]));
const WHITE = [255, 255, 255];

export function drawTerrain(img: ImageData, w: World, showPlan: boolean) {
  const b = BGS.find((x) => x.id === w.S.bg) || BGS[0];
  const pal = b.soil.map(hex), D = img.data, m = w.S.mound, dug = w.S.dug;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, o = i * 4;
    let p: number[], add = 0, a = 255;
    if (y < SURF) {
      if (y >= SURF - m[x]) { p = pal[0]; if (y === SURF - m[x]) add += 18; if (hash(x, y) < 0.2) add -= 10; }
      else { D[o + 3] = 0; continue; }
    } else if (dug[i]) {
      p = !dug[i - W] && y > SURF ? DUG_TOP : y < H - 1 && !dug[i + W] ? DUG_FLOOR : DUG;
    } else if (w.stone[i]) {
      const s = hash(x, y); p = STONE[s < 0.3 ? 0 : s < 0.8 ? 1 : 2];
    } else {
      const d = (y - SURF) / (H - SURF), j = hash(x, y);
      let k = d < 0.12 ? 0 : d < 0.4 ? 1 : d < 0.72 ? 2 : 3;
      if (k < 3 && j < 0.25 && ((d * [8.3, 3.6, 3.1][k]) % 1) > 0.8) k++;
      p = pal[k];
      if (j > 0.965) add += 26; else if (j < 0.06) add -= 14;
      if (y === SURF) add -= 16;
      if (showPlan && w.plan[i] >= 0) {
        const rid = w.roomId[i], pc = rid >= 0 ? PLAN_COL[w.rooms[rid].type] : WHITE, al = w.plan[i] <= w.level ? 0.42 : 0.16;
        D[o] = (p[0] + add) * (1 - al) + pc[0] * al; D[o + 1] = (p[1] + add) * (1 - al) + pc[1] * al; D[o + 2] = (p[2] + add) * (1 - al) + pc[2] * al; D[o + 3] = a;
        continue;
      }
    }
    D[o] = p[0] + add; D[o + 1] = p[1] + add; D[o + 2] = p[2] + add; D[o + 3] = a;
  }
  w.dirty = false;
}
