import type { Ctx } from '../px';
/** sky: antes do sol/lua e dos morros; ground: adereços sobre a linha do chão g */
export interface Props { sky?(c: Ctx, r: () => number): void; ground?(c: Ctx, r: () => number, g: number): void }
