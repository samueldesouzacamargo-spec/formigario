// Comportamento local: máquina de estados por formiga. O cérebro só define os pesos.
import { W, N, SURF, roomOf, active, dugIn, log, type World, type Ant, type Room, type Task, type Role } from './world';
import { bfs, toCell, walkable } from './path';
import { TREATS, type TreatId } from '../data/treats';
import { neededRole } from './roles';
import { newMind, traitOf, wantsNap, napTime, isNight, emote } from './life';

type Res = { path: number[] } | null;
const nav = <T>(w: World, s: number, goal: (c: number) => T | false) => bfs(w.S.dug, s, goal, w.rain > 0);

export function spawn(w: World, i: number) {
  const mind = newMind(w.S.seed, w.ants.length, w.S.sp);
  const a: Ant = { i, path: null, pi: 0, mt: Math.random(), face: Math.random() < 0.5 ? 1 : -1, step: 0, carry: null, wait: 0, then: null, task: 'idle', role: neededRole(w), spd: w.sp.spd * (0.85 + Math.random() * 0.3), target: -1, load: 0, home: false, mind };
  a.spd *= traitOf(a).spd;
  w.ants.push(a);
  return a;
}
/** célula de nascimento: berçário, câmara real ou superfície */
export function birthCell(w: World) {
  const b = roomOf(w, 'crias') || roomOf(w, 'rainha');
  const c = b ? dugIn(w, b) : [];
  return c.length ? c[(Math.random() * c.length) | 0] : (SURF - 1) * W + w.ex;
}

function go(a: Ant, res: Res, then?: () => void) {
  if (!res) { a.wait = 1; a.then = null; return; }
  a.path = res.path; a.pi = 0; a.then = then ?? null;
}
function goRoom(w: World, a: Ant, rm: Room | null, then?: () => void) {
  const c = rm ? dugIn(w, rm) : [];
  if (!c.length) return go(a, null);
  go(a, nav(w, a.i, toCell(c[(Math.random() * c.length) | 0])), then);
}
function pick(opts: [Task, number][]) {
  let r = Math.random() * opts.reduce((a, o) => a + o[1], 0);
  for (const o of opts) if ((r -= o[1]) <= 0) return o[0];
  return opts[0][0];
}
const digGoal = (w: World) => (c: number) => {
  const x = c % W;
  for (const n of [c + W, x > 0 ? c - 1 : -1, x < W - 1 ? c + 1 : -1, c - W])
    if (n >= 0 && n < N && w.want[n] && !w.reserved.has(n)) return n;
  return false;
};
const toSurface = (pred: (x: number) => boolean) => (c: number) => ((c / W) | 0) === SURF - 1 && pred(c % W);

/**
 * O "pensamento" de cada operária: faz o serviço da própria função; se não há o que fazer nele,
 * olha em volta e ajuda onde o cérebro pede. De vez em quando dá uma mão fora da função mesmo assim.
 */
function newTask(w: World, a: Ant) {
  const b = w.brain.w, S = w.S;
  // tempestade: construtoras (e umas ajudantes) tampam a entrada com terra
  if (w.rain > 0 && w.wx.storm && w.wx.plug < 1 && S.dug[SURF * W + w.ex] && (a.role === 'dig' || Math.random() < 0.4)) return plug(w, a);
  if (w.rain > 0 && ((a.i / W) | 0) < SURF + 2) return shelter(w, a);
  if (wantsNap(w, a)) return nap(w, a);
  if (quirk(w, a)) return;
  const can: Record<Role, boolean> = {
    dig: w.wantLeft > w.reserved.size,
    forage: !w.rain, // na chuva ninguém sai
    nurse: S.eggs > 0 && !!roomOf(w, 'crias'),
    garden: !!w.sp.fungus && !!roomOf(w, 'fungo'),
    haul: S.trash >= 1 && !!roomOf(w, 'lixo'),
  };
  // com petisco lá fora, coletoras correm
  const tr = a.mind.trait, bold = tr === 'corajosa' || tr === 'curiosa';
  const forageMul = (w.treats.length ? (tr === 'corajosa' ? 5 : 3) : w.rooms.some((r) => r.type !== 'rainha' && active(r)) ? 1 : 0.25)
    * (isNight(w) && !w.treats.length && !bold ? 0.45 : 1); // de noite só as mais ousadas saem sem motivo
  const own = can[a.role];
  const o: [Task, number][] = [['idle', (own ? 0.5 : 0.3) * traitOf(a).idle]];
  for (const r of Object.keys(can) as Role[]) {
    if (!can[r]) continue;
    const base = r === a.role ? 6 : own ? b[r] * 0.12 : b[r];
    o.push([r, base * (r === 'forage' ? forageMul : 1)]);
  }
  const t = (a.task = pick(o));

  if (t === 'dig') {
    const r = nav(w, a.i, digGoal(w));
    if (!r) return idle(w, a);
    w.reserved.set(r.g, a); a.target = r.g;
    go(a, r, () => dig(w, a));
  } else if (t === 'forage') {
    const tr = w.treats.length ? w.treats[(Math.random() * w.treats.length) | 0] : null;
    const trail = tr ? -1 : strongestTrail(w);
    const gx = tr ? tr.x : trail >= 0 && Math.random() < 0.6 ? trail + ((Math.random() * 7 - 3) | 0) : 4 + ((Math.random() * (W - 8)) | 0);
    go(a, nav(w, a.i, toSurface((x) => Math.abs(x - gx) <= 1)), () => {
      if (tr && tr.n > 0) {
        tr.n--; a.carry = tr.type;
        if (tr.n <= 0) w.treats.splice(w.treats.indexOf(tr), 1);
        deliver(w, a);
      } else {
        // procura comida natural por perto
        a.wait = 1 + Math.random() * 2;
        a.then = () => { if (Math.random() < 0.55) { a.carry = w.sp.nat[(Math.random() * w.sp.nat.length) | 0]; w.ph[a.i] = Math.min(12, w.ph[a.i] + 4); deliver(w, a); } else newTask(w, a); };
      }
    });
  } else if (t === 'nurse' || t === 'garden') {
    goRoom(w, a, roomOf(w, t === 'nurse' ? 'crias' : 'fungo'), () => { a.wait = 2 + Math.random() * 3; a.then = null; });
  } else if (t === 'haul') {
    goRoom(w, a, roomOf(w, 'fungo') || roomOf(w, 'comida') || w.rooms[0], () => {
      a.carry = null;
      if (S.trash < 1) return;
      S.trash--; a.carry = 'lixo';
      const l = roomOf(w, 'lixo');
      if (l) goRoom(w, a, l, () => { if (l.items.length < l.cells.length * 0.5) l.items.push('lixo'); a.carry = null; });
    });
  } else idle(w, a);
}

/** a boca do túnel: até 3 linhas abaixo da superfície, perto da entrada */
export const isMouth = (w: World, i: number) => { const y = (i / W) | 0; return y >= SURF && y < SURF + 3 && Math.abs((i % W) - w.ex) <= 2; };

function plug(w: World, a: Ant) {
  a.task = 'dig'; a.carry = 'terra';
  go(a, nav(w, a.i, (c) => { const y = (c / W) | 0; return y >= SURF + 3 && y <= SURF + 6 && Math.abs((c % W) - w.ex) <= 4; }), () => {
    a.wait = 1 + Math.random();
    a.then = () => { a.carry = null; w.wx.plug = Math.min(1, w.wx.plug + 0.125); shelter(w, a); };
  });
}

/** desce pra longe da entrada e espera a chuva */
function shelter(w: World, a: Ant) {
  a.task = 'idle';
  const deep = a.mind.trait === 'medrosa' ? SURF + 16 : SURF + 5; // a medrosa corre lá pro fundo
  go(a, nav(w, a.i, (c) => ((c / W) | 0) >= deep) ?? nav(w, a.i, (c) => ((c / W) | 0) >= SURF + 5), () => { a.wait = 2 + Math.random() * 4; });
}

/** cochilo: vai pra uma câmara tranquila (nunca a lixeira) e dorme */
function nap(w: World, a: Ant) {
  a.task = 'idle';
  const quiet = w.rooms.filter((r) => r.type !== 'lixo' && r.ph <= w.level && active(r));
  const pref = quiet.filter((r) => r.type === (a.mind.trait === 'preguicosa' ? 'crias' : 'rainha'));
  const list = pref.length && Math.random() < 0.5 ? pref : quiet;
  const rm = list.length ? list[(Math.random() * list.length) | 0] : null;
  const sleep = () => {
    a.wait = napTime(w, a); a.mind.nap = true; emote(a, 'z', 2);
    a.then = () => { a.mind.nap = false; if (Math.random() < 0.3) emote(a, 'nota', 1.5); };
  };
  if (!rm) return sleep(); // sem câmara ainda: dorme onde está
  goRoom(w, a, rm, sleep);
  if (!a.path) sleep(); // sem caminho: idem
}

/**
 * O jeito de cada uma: a curiosa sai pra olhar, a gulosa passa na despensa, a sociável visita a rainha.
 * Devolve true quando a formiga foi fazer outra coisa.
 */
function quirk(w: World, a: Ant) {
  if (!w.queen.home) return false; // fundação: sem distração
  const t = a.mind.trait, r = Math.random();
  if (t === 'curiosa' && !w.rain && r < 0.07) {
    a.task = 'idle';
    const gx = 4 + ((Math.random() * (W - 8)) | 0);
    go(a, nav(w, a.i, toSurface((x) => Math.abs(x - gx) <= 1)), () => { a.wait = 1.5 + Math.random() * 2; emote(a, '?', 2); });
    return true;
  }
  if (t === 'gulosa' && r < 0.08) {
    const p = roomOf(w, 'comida') || roomOf(w, 'mel') || roomOf(w, 'fungo');
    if (!p || !p.items.length && !p.fung) return false;
    a.task = 'idle';
    goRoom(w, a, p, () => { a.wait = 1.5 + Math.random() * 2; a.mind.energy = Math.min(1, a.mind.energy + 0.2); emote(a, 'coracao', 2); });
    return true;
  }
  if (t === 'sociavel' && r < 0.04 && w.queen.home) {
    a.task = 'idle';
    go(a, nav(w, a.i, (c) => Math.abs((c % W) - (w.queen.i % W)) <= 2 && Math.abs(((c / W) | 0) - ((w.queen.i / W) | 0)) <= 1), () => { a.wait = 1.2; emote(a, 'coracao', 2); emote(w.queen, 'coracao', 2); });
    return true;
  }
  if (t === 'trabalhadora' && a.mind.energy < 0.3 && r < 0.3) emote(a, 'gota', 2); // cansada, mas segue
  return false;
}

/** começou a chover: quem está lá fora (ou indo pra lá) volta pra dentro */
export function takeCover(w: World) {
  for (const a of w.ants) {
    const out = a.i < SURF * W || (!!a.path && a.path.some((c, k) => k >= a.pi && c < SURF * W)); // lá fora ou vai passar por lá
    if (!out) continue;
    a.then = null; a.wait = 0; a.load = 0;
    if (a.target >= 0) { w.reserved.delete(a.target); a.target = -1; }
    if (a.carry && FOOD.has(a.carry)) { a.path = null; deliver(w, a); continue; } // comida vai junto pra dentro
    a.carry = null; shelter(w, a);
  }
}

function idle(w: World, a: Ant) {
  a.task = 'idle';
  const l = w.rooms.filter(active);
  if (l.length && Math.random() < 0.7) goRoom(w, a, l[(Math.random() * l.length) | 0], () => { a.wait = 1 + Math.random() * 3; });
  else a.wait = 0.5 + Math.random() * 1.5;
}

export function digCell(w: World, i: number) {
  if (w.S.dug[i] || !w.want[i]) return 0;
  w.S.dug[i] = 1; w.want[i] = 0; w.wantLeft--; w.dirty = true;
  const id = w.roomId[i];
  if (id >= 0) w.rooms[id].dugN++;
  return 1;
}

/** uma mordida tira até 4 células; até 3 mordidas antes de subir com a terra */
function dig(w: World, a: Ant) {
  w.reserved.delete(a.target);
  const t = a.target;
  let n = digCell(w, t);
  for (const o of [t + 1, t - 1, t + W, t - W, t + W + 1, t + W - 1]) {
    if (n >= 4) break;
    if (o >= 0 && o < N && Math.abs((o % W) - (t % W)) <= 1 && !w.reserved.has(o)) n += digCell(w, o);
  }
  a.load++;
  a.carry = 'terra';
  if (a.load < 3) {
    const r = nav(w, a.i, digGoal(w));
    if (r && r.path.length < 14) { w.reserved.set(r.g, a); a.target = r.g; return go(a, r, () => dig(w, a)); }
  }
  a.load = 0;
  if (w.rain > 0) { a.carry = null; a.wait = 0.5; return; } // na chuva a terra fica socada nas paredes
  const side = Math.random() < 0.5 ? -1 : 1;
  go(a, nav(w, a.i, toSurface((x) => { const d = (x - w.ex) * side; return d >= 2 && d <= 8; })), () => {
    addMound(w, a.i % W); addMound(w, a.i % W); a.carry = null;
  });
}

/** pilha com ângulo de repouso ao lado da entrada */
export function addMound(w: World, x: number) {
  const m = w.S.mound, ex = w.ex;
  if (Math.abs(x - ex) <= 1) x = ex + (x < ex ? -2 : 2);
  const dir = x < ex ? -1 : 1;
  for (let k = 0; k < 40; k++) {
    const o = x + dir, i = x - dir;
    if (o < 1 || o > W - 2) return;
    if (m[x] > m[o] || (m[x] === m[o] && m[x] > 0 && Math.random() < 0.55)) { x = o; continue; }
    if (Math.abs(i - ex) > 1 && m[x] > m[i] + 1) { x = i; continue; }
    if (m[x] < 9) { m[x]++; w.dirty = true; }
    return;
  }
}

/** folha → fungo (saúva), açúcar → mel (pote-de-mel), resto → despensa */
function deliver(w: World, a: Ant) {
  const t = a.carry;
  const rm = (t === 'folha' && w.sp.fungus && roomOf(w, 'fungo')) || (t === 'acucar' && w.S.sp === 'pote' && roomOf(w, 'mel'))
    || roomOf(w, 'comida') || roomOf(w, 'mel') || roomOf(w, 'fungo') || roomOf(w, 'rainha');
  if (!rm) { a.carry = null; return; }
  goRoom(w, a, rm, () => { if (t && rm.items.length < rm.cells.length * 0.55) rm.items.push(t); a.carry = null; });
}

/** coluna da superfície com mais feromônio (onde já acharam comida), ou -1 */
function strongestTrail(w: World) {
  let best = -1, bv = 1;
  for (let x = 0, i = (SURF - 1) * W; x < W; x++, i++) if (w.ph[i] > bv && Math.abs(x - w.ex) > 8) { bv = w.ph[i]; best = x; } // perto da entrada toda trilha passa
  return best;
}

/** petisco cai do céu e vira comida ao tocar o chão (ver stepFalls); sem log */
export function dropTreat(w: World, type: TreatId, twig = false) {
  let x: number;
  do x = 8 + ((Math.random() * (W - 16)) | 0); while (Math.abs(x - w.ex) < 10);
  w.falls.push({ type, x, y: -4, vy: twig ? 16 : type === 'folha' ? 7 : 24, n: twig ? 20 : TREATS[type].n, twig });
}

export function addTreat(w: World, type: TreatId) {
  dropTreat(w, type);
  w.S.lastTreat = Date.now();
  log(w, `Você deu ${TREATS[type].name.toLowerCase()}.`);
}

/** formiga carregando comida marca o caminho de volta */
const FOOD = new Set(['folha', 'acucar', 'grilo']);
const deposit = (w: World, a: Ant) => { if (a.carry && FOOD.has(a.carry)) w.ph[a.i] = Math.min(12, w.ph[a.i] + 1); };

function advance(a: Ant, d: number, rate: number, done: () => void, onStep?: () => void) {
  a.mt += d * rate;
  while (a.mt >= 1 && a.path) {
    a.mt--; a.pi++;
    if (a.pi >= a.path.length) { a.path = null; done(); break; }
    const n = a.path[a.pi], dx = (n % W) - (a.i % W);
    if (dx) a.face = dx > 0 ? 1 : -1;
    a.i = n; a.step++;
    onStep?.();
  }
}

export function stepAnts(w: World, d: number) {
  for (const a of w.ants) {
    if (a.mind.hold > 0) { a.mind.hold -= d; continue; } // parada cumprimentando, sem perder a rota
    if (a.wait > 0) {
      a.wait -= d;
      // fica mexendo de um lado pro outro dentro da câmara (dormindo, não)
      if (!a.mind.nap && Math.random() < d * 1.2) {
        const x = a.i % W, n = Math.random() < 0.5 ? a.i + 1 : a.i - 1;
        if (Math.abs((n % W) - x) === 1 && walkable(w.S.dug, n) && w.roomId[n] === w.roomId[a.i]) { a.face = n > a.i ? 1 : -1; a.i = n; a.step++; }
      }
      if (a.wait <= 0) { const f = a.then; a.then = null; f ? f() : newTask(w, a); }
      continue;
    }
    if (!a.path) { newTask(w, a); continue; }
    advance(a, d, a.spd, () => { const f = a.then; a.then = null; f ? f() : newTask(w, a); }, () => deposit(w, a));
  }
}

export function moveQueen(w: World, d: number) {
  const q = w.queen, qr = w.rooms.find((r) => r.type === 'rainha');
  if (q.wait > 0) { q.wait -= d; return; }
  if (!q.path) {
    q.wait = 3;
    if (qr && qr.dugN > qr.cells.length * 0.5) {
      const c = dugIn(w, qr), r = nav(w, q.i, toCell(c[(Math.random() * c.length) | 0]));
      if (r) { q.path = r.path; q.pi = 0; q.wait = 0; if (!q.home) log(w, 'A rainha desceu pra câmara real.'); q.home = true; }
    }
    return;
  }
  advance(q, d, q.home ? 1.2 : 3, () => { q.wait = 4 + Math.random() * 5; });
}
