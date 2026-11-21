import { R } from '../px';
import { W } from '../../sim/world';
import { starfield } from './estrelas';
import type { Props } from './types';
export default {
  sky(c, r) {
    starfield(c, r);
    for (let x = 0; x < W; x++) {
      const y0 = 8 + Math.sin(x * 0.045) * 4 + Math.sin(x * 0.13) * 1.5;
      for (let k = 0; k < 9; k++) { c.globalAlpha = 0.55 - k * 0.055; R(c, x, Math.round(y0 + k), 1, 1, k < 4 ? '#4ef0a8' : '#7a63ff'); }
    }
    c.globalAlpha = 1;
  },
} satisfies Props;
