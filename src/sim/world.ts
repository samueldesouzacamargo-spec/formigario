// Tipos e utilidades do mundo. Nada aqui (nem em sim/) toca DOM: dá pra rodar em Worker e em teste.
import { SPECIES, type Species, type SpeciesId } from '../data/species';
import type { RoomType } from '../data/rooms';
import type { TreatId } from '../data/treats';

export const W = 240, H = 150, SURF = 44, N = W * H;

/** PRNG determinístico (mulberry32) */
export const rng = (a: number) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
/** ruído estável por célula, pra textura */
export const hash = (x: number, y: number) => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

export type Carry = TreatId | 'terra' | 'lixo';
export type Task = 'idle' | 'dig' | 'forage' | 'nurse' | 'garden' | 'haul';
export type Role = Exclude<Task, 'idle'>;

export interface Room {
  type: RoomType; cx: number; cy: number; rx: number; ry: number;
  ph: number; // nível em que é liberada
  cells: number[]; // do chão pra cima
  items: Carry[]; fung: number; dugN: number;
}
export interface Ant {
  i: number; path: number[] | null; pi: number; mt: number; face: 1 | -1; step: number;
  carry: Carry | null; wait: number; then: (() => void) | null; task: Task; role: Role; spd: number;
  target: number; load: number; home: boolean;
}
export interface Treat { type: TreatId; x: number; n: number; twig?: boolean }
/** algo caindo do céu (folha, galho, petisco) até tocar o chão */
export interface Fall { type: TreatId; x: number; y: number; vy: number; n: number; twig: boolean }
/** minhoca: só visual, atravessa a terra deixando um buraco que fecha depois */
export interface Worm { x: number; y: number; y0: number; dir: 1 | -1; ph: number; mt: number; body: number[] }
export interface Weights { dig: number; forage: number; nurse: number; garden: number; haul: number }

/** O que é salvo. */
export interface Save {
  v: number; seed: number; bg: string; sp: SpeciesId; skW: string; skQ: string; speed: number;
  pros: number; focus: number; eggs: number; trash: number; prog: number;
  dug: Uint8Array; mound: number[]; store: [Carry[], number][] | null; nAnts: number;
  logs: [number, string][]; // [timestamp, texto], mais novo primeiro
  lastTreat: number;
  dayNight: boolean; // céu segue o relógio real
}

export interface World {
  S: Save; sp: Species;
  plan: Int8Array; roomId: Int8Array; stone: Uint8Array; want: Uint8Array;
  rooms: Room[]; ex: number; wantLeft: number; level: number;
  dirty: boolean; // terreno precisa redesenhar
  ants: Ant[]; queen: Ant; treats: Treat[]; reserved: Map<number, Ant>;
  brain: { w: Weights; t: number; lock: number; thought: string; source: 'local' | 'gemini'; foco: string; event: boolean };
  tm: { eat: number; egg: number; fun: number; ev: number; evap: number };
  ph: Float32Array; // feromônio por célula, evapora
  rain: number; // segundos de chuva restantes (simulados)
  wx: { storm: boolean; plug: number; flood: number; plugged: boolean; flooded: boolean }; // tempestade: entrada tampada 0–1, água lá dentro 0–1
  falls: Fall[]; worm: Worm | null; holes: Map<number, number>; // célula → segundos até fechar
  lastFood: number;
  logN: number; // muda quando o diário muda
}

export const SAVE_VERSION = 1;
export function fresh(seed: number, o: Partial<Save> = {}): Save {
  return {
    v: SAVE_VERSION, seed, bg: o.bg ?? 'amanhecer', sp: o.sp ?? 'sauva', skW: o.skW ?? 'natural', skQ: o.skQ ?? 'natural', speed: o.speed ?? 1,
    pros: 0, focus: 0, eggs: 0, trash: 0, prog: 0, dug: new Uint8Array(N), mound: new Array(W).fill(0), store: null, nAnts: 5, logs: [], lastTreat: 0, dayNight: o.dayNight ?? true,
  };
}

export const speciesOf = (S: Save) => SPECIES[S.sp];
export const active = (rm: Room | undefined | null) => !!rm && rm.dugN >= rm.cells.length * 0.6;
export const roomOf = (w: World, t: RoomType) => {
  const l = w.rooms.filter((r) => r.type === t && r.ph <= w.level && active(r));
  return l.length ? l[(Math.random() * l.length) | 0] : null;
};
export const dugIn = (w: World, rm: Room) => rm.cells.filter((i) => w.S.dug[i]);
export const totalFood = (w: World) => w.rooms.reduce((s, r) => s + (r.type === 'lixo' ? 0 : r.items.filter((x) => x !== 'lixo').length + r.fung), 0);

export function calcWant(w: World) {
  w.wantLeft = 0;
  for (let i = 0; i < N; i++) { w.want[i] = w.plan[i] >= 0 && w.plan[i] <= w.level && !w.S.dug[i] ? 1 : 0; w.wantLeft += w.want[i]; }
}

export function log(w: World, text: string) {
  w.S.logs.unshift([Date.now(), text]);
  if (w.S.logs.length > 40) w.S.logs.length = 40;
  w.logN++;
}
