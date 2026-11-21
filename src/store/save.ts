// Persistência em IndexedDB (idb-keyval) + export/import em JSON.
import { get, set } from 'idb-keyval';
import { W, N, SAVE_VERSION, type Save, type World } from '../sim/world';
import { SPECIES } from '../data/species';
import type { ReefSave } from '../aquarium/sim';

const KEY = 'formigario', OPTS = 'formigario-opts';

export function snapshot(w: World): Save {
  return { ...w.S, store: w.rooms.map((r) => [r.items, r.fung]), nAnts: w.ants.length };
}

/** Migra saves antigos pra versão atual. Hoje só existe a v1. */
function migrate(o: any): Save {
  if (!o || typeof o !== 'object' || o.v !== SAVE_VERSION) throw new Error('Versão de save desconhecida');
  return o;
}
/** Confere o formato antes de aceitar (save importado é entrada externa). */
function validate(o: Save): Save {
  const n = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
  if (!n(o.seed) || !n(o.pros) || !n(o.focus) || !n(o.eggs) || !n(o.trash) || !n(o.prog) || !n(o.speed) || !n(o.nAnts)) throw new Error('Save inválido');
  if (!(o.sp in SPECIES) || !(o.dug instanceof Uint8Array) || o.dug.length !== N) throw new Error('Save inválido');
  if (!Array.isArray(o.mound) || o.mound.length !== W || !o.mound.every(n)) throw new Error('Save inválido');
  o.nAnts = Math.max(1, Math.min(60, o.nAnts | 0));
  o.logs = Array.isArray(o.logs) ? o.logs.filter((l) => Array.isArray(l) && n(l[0]) && typeof l[1] === 'string').slice(0, 40) : [];
  o.store = Array.isArray(o.store) ? o.store : null;
  o.lastTreat = n(o.lastTreat) ? o.lastTreat : 0;
  o.dayNight = o.dayNight !== false;
  for (const k of ['bg', 'skW', 'skQ'] as const) if (typeof o[k] !== 'string') o[k] = 'natural';
  return o;
}

export async function loadSave(): Promise<Save | null> {
  try { const o = await get(KEY); return o ? validate(migrate(o)) : null; } catch (e) { console.warn('save ignorado:', e); return null; }
}
export const writeSave = (w: World) => set(KEY, snapshot(w)).catch((e) => console.warn('falha ao salvar', e));

// dug vira run-length no JSON (36 000 células → algumas centenas de números)
export function exportJSON(w: World) {
  const s = snapshot(w), d: number[] = [];
  let c = 0, run = 0;
  for (const v of s.dug) { if (v === c) run++; else { d.push(run); c = v; run = 1; } }
  d.push(run);
  return JSON.stringify({ ...s, dug: d });
}
export function importJSON(txt: string): Save {
  const o = JSON.parse(txt);
  if (!o || !Array.isArray(o.dug)) throw new Error('Save inválido');
  const dug = new Uint8Array(N);
  let p = 0, c = 0;
  for (const run of o.dug) {
    if (!Number.isInteger(run) || run < 0 || p + run > N) throw new Error('Save inválido');
    dug.fill(c, p, p + run); p += run; c ^= 1;
  }
  if (p !== N) throw new Error('Save inválido');
  return validate(migrate({ ...o, dug }));
}

const REEF = 'formigario-aquario';
export async function loadReef(): Promise<ReefSave | null> {
  const o = await get(REEF).catch(() => null);
  return o && o.v === 1 && Number.isFinite(o.seed) && Number.isFinite(o.age) ? { v: 1, seed: o.seed, age: o.age, on: !!o.on } : null;
}
export const writeReef = (S: ReefSave) => set(REEF, { ...S }).catch((e) => console.warn('falha ao salvar aquário', e));

export interface Opts { geminiKey: string; model: string }
export const DEFAULT_MODEL = 'gemini-flash-lite-latest'; // apelido: acompanha o Flash-Lite atual
export async function loadOpts(): Promise<Opts> {
  const o: Opts = { geminiKey: '', model: DEFAULT_MODEL, ...((await get(OPTS).catch(() => null)) ?? {}) };
  if (o.model === 'gemini-2.5-flash-lite') o.model = DEFAULT_MODEL; // aposentado pra contas novas
  return o;
}
export const saveOpts = (o: Opts) => set(OPTS, o);
