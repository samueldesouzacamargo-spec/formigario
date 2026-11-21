import { R } from '../px';
import { W, SURF } from '../../sim/world';
import type { Props } from './types';
export const starfield = (c: CanvasRenderingContext2D, r: () => number) => {
  for (let k = 0; k < 70; k++) {
    const x = (r() * W) | 0, y = (r() * (SURF - 14)) | 0;
    R(c, x, y, 1, 1, r() < 0.2 ? '#fff' : '#c9d2ff');
    if (r() < 0.08) { R(c, x - 1, y, 3, 1, '#fff8'); R(c, x, y - 1, 1, 3, '#fff8'); }
  }
};
export default { sky: starfield } satisfies Props;
