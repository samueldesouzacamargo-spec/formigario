import { R, disk } from '../px';
import { W } from '../../sim/world';
import type { Props } from './types';
export default {
  ground(c, r, g) {
    for (let k = 0; k < 5; k++) {
      const x = 10 + ((r() * (W - 20)) | 0), h = 10 + ((r() * 6) | 0);
      R(c, x, g - h, 1, h, '#fff'); disk(c, x, g - h - 3, 3, ['#ff6fa5', '#7fd3ff', '#ffd166'][k % 3]); R(c, x - 1, g - h - 4, 2, 1, '#fff9');
    }
  },
} satisfies Props;
