import { R } from '../px';
import { W } from '../../sim/world';
import type { Props } from './types';
export default {
  ground(c, r, g) {
    for (let k = 0; k < 5; k++) {
      const x = 10 + ((r() * (W - 20)) | 0), h = 7 + ((r() * 7) | 0), s = 4 + ((r() * 4) | 0);
      R(c, x, g - h, 3, h, '#efe6d0');
      for (let y = 0; y < s; y++) { const w = Math.round(Math.sqrt(s * s - y * y)) + 2; R(c, x + 1 - w, g - h - y, w * 2, 1, '#c43b4b'); }
      R(c, x - 2, g - h - 2, 1, 1, '#fff'); R(c, x + 3, g - h - 3, 1, 1, '#fff'); R(c, x + 1, g - h - s + 1, 1, 1, '#fff');
    }
  },
} satisfies Props;
