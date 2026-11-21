import { R } from '../px';
import { W } from '../../sim/world';
import { starfield } from './estrelas';
import type { Props } from './types';
export default {
  sky: starfield,
  ground(c, r, g) {
    let x = 0;
    while (x < W) {
      const w = 10 + ((r() * 14) | 0), h = 10 + ((r() * 22) | 0);
      R(c, x, g - h, w, h, r() < 0.5 ? '#241b3a' : '#2c2148');
      for (let yy = g - h + 2; yy < g - 2; yy += 3) for (let xx = x + 2; xx < x + w - 2; xx += 3) if (r() < 0.35) R(c, xx, yy, 1, 1, '#ffd36b');
      x += w + ((r() * 3) | 0);
    }
  },
} satisfies Props;
