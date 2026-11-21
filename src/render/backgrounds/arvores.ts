import { R, disk } from '../px';
import { W } from '../../sim/world';
import type { Props } from './types';
export default {
  ground(c, r, g) {
    for (let k = 0; k < 6; k++) {
      const x = 8 + ((r() * (W - 16)) | 0), h = 10 + ((r() * 6) | 0);
      R(c, x, g - h, 2, h, '#5b3a24'); disk(c, x + 1, g - h - 3, 5, '#2f6b35'); disk(c, x - 1, g - h - 5, 3, '#3d8442'); R(c, x - 2, g - h - 7, 2, 1, '#5fa451');
    }
  },
} satisfies Props;
