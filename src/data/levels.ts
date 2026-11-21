/**
 * Prosperidade acumulada pra atingir cada nível.
 * Calibrado a 1x com a colônia perto do teto de operárias:
 * nível 1 ≈ 20 min, nível 5 ≈ 8 h (1 dia de trabalho), nível 10 ≈ 80 h (~2 semanas).
 */
export const LV = [0, 500, 3600, 10700, 24700, 44100, 105000, 196000, 322000, 488000, 725000];
export const levelOf = (pros: number) => LV.filter((v) => pros >= v).length - 1;
export const antCap = (level: number) => Math.min(60, 6 + level * 6);
