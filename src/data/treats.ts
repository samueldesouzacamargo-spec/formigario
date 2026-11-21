export type TreatId = 'folha' | 'acucar' | 'grilo';
/** c/d = cor clara/escura, n = pedaços por petisco */
export const TREATS: Record<TreatId, { name: string; c: string; d: string; n: number }> = {
  folha: { name: 'Folhas', c: '#58b847', d: '#2e7d25', n: 8 },
  acucar: { name: 'Açúcar', c: '#ffffff', d: '#cdd9e6', n: 10 },
  grilo: { name: 'Grilo', c: '#7a5d34', d: '#3f2f18', n: 12 },
};
