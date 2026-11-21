import { R, disk } from '../px';
import { W } from '../../sim/world';
import type { Props } from './types';
export default {
  ground(c, _r, g) {
    R(c, 0, g - 8, W, 1, '#c6ad86'); R(c, 0, g - 4, W, 1, '#c6ad86');
    for (let x = 1; x < W; x += 6) { R(c, x, g - 10, 3, 10, '#e4d1ad'); R(c, x + 1, g - 11, 1, 1, '#e4d1ad'); R(c, x + 2, g - 9, 1, 9, '#c6ad86'); }
    const v = W - 30; R(c, v, g - 6, 6, 6, '#b5543a'); disk(c, v + 3, g - 9, 2, '#e25a7a');
  },
} satisfies Props;
