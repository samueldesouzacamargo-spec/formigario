import { W, N, SURF, fresh, calcWant, active, dugIn, speciesOf, log, type World, type Save } from './world';
import { genPlan } from './gen';
import { spawn, stepAnts, moveQueen } from './ants';
import { econ } from './economy';
import { localThink } from './brain/local';
import { rebalance } from './roles';
import { levelOf } from '../data/levels';
import type { SpeciesId } from '../data/species';

export function createWorld(S: Save): World {
  const w: World = {
    S, sp: speciesOf(S), plan: new Int8Array(N), roomId: new Int8Array(N), stone: new Uint8Array(N), want: new Uint8Array(N),
    rooms: [], ex: 0, wantLeft: 0, level: 0, dirty: true, ants: [], queen: null!, treats: [], reserved: new Map(),
    brain: { w: { dig: 1, forage: 1, nurse: 0.3, garden: 0.3, haul: 0 }, t: 0, lock: 0, thought: 'Acordando…', source: 'local', foco: 'proxima_camara', event: false },
    tm: { eat: 0, egg: 0, fun: 0, ev: 0, evap: 0 }, ph: new Float32Array(N), rain: 0, wx: { storm: false, plug: 0, flood: 0, plugged: false, flooded: false }, falls: [], worm: null, holes: new Map(), lastFood: 0, logN: 0,
  };
  genPlan(w);
  if (S.store) S.store.forEach((s, k) => { const r = w.rooms[k]; if (r) { r.items = s[0] || []; r.fung = s[1] || 0; } });
  for (const rm of w.rooms) rm.dugN = rm.cells.filter((i) => S.dug[i]).length;
  w.level = levelOf(S.pros);
  calcWant(w);

  const qr = w.rooms.find((r) => r.type === 'rainha');
  const home = qr && active(qr) ? dugIn(w, qr) : [];
  for (let k = 0; k < S.nAnts; k++) spawn(w, home.length ? home[k % home.length] : (SURF - 1) * W + w.ex - 3 + (k % 7));
  w.queen = { i: home.length ? home[0] : (SURF - 1) * W + w.ex + 2, path: null, pi: 0, mt: 0, face: -1, step: 0, carry: null, wait: 2, then: null, task: 'idle', role: 'nurse' /* rainha não escolhe tarefa */, spd: 0, target: -1, load: 0, home: home.length > 0 };
  w.lastFood = 1;
  localThink(w);
  rebalance(w);
  return w;
}

export function newFarm(o: Partial<Save> & { sp?: SpeciesId } = {}): World {
  const w = createWorld(fresh((Math.random() * 2 ** 31) | 0, o));
  log(w, `Uma rainha de ${w.sp.name.toLowerCase()} pousou e começou a cavar.`);
  return w;
}

/** um passo de simulação (d = segundos simulados) */
export function tick(w: World, d: number) {
  econ(w, d);
  moveQueen(w, d);
  stepAnts(w, d);
}
