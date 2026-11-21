import type { RoomType } from './rooms';
import type { TreatId } from './treats';

export interface Species {
  name: string; sub: string;
  c: string; h: string; // corpo, cabeça
  spd: number; big?: boolean; fungus?: boolean;
  treats: TreatId[]; // botões de petisco
  nat: TreatId[]; // comida natural que acham sozinhas
  rooms: RoomType[]; // ordem = ordem de liberação (0 e 1 já no nível 0)
}

// Pra adicionar espécie (correição, carpinteira, tecelã…): só uma entrada nova aqui.
export const SPECIES = {
  sauva: { name: 'Saúva', sub: 'Cortadeira. Leva folhas pro jardim de fungo.', c: '#a3431d', h: '#6e2a10', spd: 8, treats: ['folha'], nat: ['folha'], fungus: true, rooms: ['rainha', 'crias', 'fungo', 'comida', 'lixo', 'fungo', 'crias', 'fungo', 'comida'] },
  lavape: { name: 'Lava-pés', sub: 'Onívora e agitada. Come doce e carne.', c: '#b94a1e', h: '#7a2c10', spd: 10, treats: ['acucar', 'grilo'], nat: ['acucar', 'grilo'], rooms: ['rainha', 'crias', 'comida', 'lixo', 'comida', 'crias', 'comida', 'crias'] },
  pote: { name: 'Pote-de-mel', sub: 'Operárias viram potes vivos de néctar.', c: '#c88a3a', h: '#7d5220', spd: 7, treats: ['acucar'], nat: ['acucar'], rooms: ['rainha', 'crias', 'mel', 'comida', 'mel', 'lixo', 'mel', 'crias'] },
  bala: { name: 'Formiga-bala', sub: 'Carnívora gigante. Morde grilos inteiros.', c: '#2c1c12', h: '#140a05', spd: 6, big: true, treats: ['grilo', 'acucar'], nat: ['grilo'], rooms: ['rainha', 'crias', 'comida', 'lixo', 'comida', 'crias', 'comida'] },
} satisfies Record<string, Species>;
export type SpeciesId = keyof typeof SPECIES;
