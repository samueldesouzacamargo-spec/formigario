import { R } from '../px';
import { W } from '../../sim/world';
import type { Props } from './types';
// árvores retorcidas + cupinzeiros
export default {
  ground(c, r, g) {
    for (let k = 0; k < 5; k++) {
      const x = 10 + ((r() * (W - 20)) | 0);
      for (let y = 0; y < 9; y++) R(c, x + Math.round(Math.sin(y * 0.7) * 1.5), g - y, 2, 1, '#5a3b26');
      R(c, x - 5, g - 13, 12, 2, '#6f7f2e'); R(c, x - 3, g - 15, 8, 2, '#879236');
    }
    for (let k = 0; k < 2; k++) {
      const x = 20 + ((r() * (W - 40)) | 0);
      for (let y = 0; y < 10; y++) R(c, x - Math.round((10 - y) * 0.45), g - y, Math.round((10 - y) * 0.9) + 2, 1, y % 3 ? '#b5653a' : '#a35a33');
    }
  },
} satisfies Props;
