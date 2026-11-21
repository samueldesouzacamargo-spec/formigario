import { R } from '../px';
import { W } from '../../sim/world';
import type { Props } from './types';
// as mesas grandes saem dos morros (ver drawBg); aqui só as pedrinhas
export default {
  ground(c, r, g) { for (let k = 0; k < 3; k++) { const x = (r() * W) | 0; R(c, x, g - 5, 3, 5, '#8e4a30'); R(c, x - 1, g - 6, 5, 1, '#a8583a'); } },
} satisfies Props;
