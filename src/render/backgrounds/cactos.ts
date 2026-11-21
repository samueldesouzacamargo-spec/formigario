import { R } from '../px';
import { W } from '../../sim/world';
import type { Props } from './types';
export default {
  ground(c, r, g) {
    for (let k = 0; k < 4; k++) {
      const x = 10 + ((r() * (W - 20)) | 0), h = 10 + ((r() * 6) | 0), col = '#4f8a3c';
      R(c, x, g - h, 3, h, col); R(c, x - 3, g - h + 5, 3, 2, col); R(c, x - 3, g - h + 1, 2, 5, col);
      R(c, x + 3, g - h + 7, 3, 2, col); R(c, x + 4, g - h + 3, 2, 5, col); R(c, x + 1, g - h, 1, h, '#6eaa55');
    }
  },
} satisfies Props;
