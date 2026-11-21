import { R } from '../px';
import { W } from '../../sim/world';
import type { Props } from './types';
export default {
  ground(c, r, g) { for (let k = 0; k < 45; k++) R(c, (r() * W) | 0, g - 1 - ((r() * 2) | 0), 1, 1, ['#ffd6e8', '#fff3a0', '#c9b6ff', '#ffffff'][k % 4]); },
} satisfies Props;
