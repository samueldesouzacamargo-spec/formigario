import type { World, Save } from '../sim/world';
import type { SpeciesId } from '../data/species';
import type { Reef } from '../aquarium/sim';

/** estado da página compartilhado entre os módulos de UI */
export interface App {
  w: World;
  reef: Reef;
  habitat: 'ants' | 'reef';
  setHabitat(h: 'ants' | 'reef'): void;
  showPlan: boolean;
  cool: number; // recarga do petisco (s)
  save(): void;
  newFarm(sp?: SpeciesId): void;
  load(S: Save): void;
  brainError: string;
  refresh(): void; // redesenha painéis que dependem da fazenda
}
