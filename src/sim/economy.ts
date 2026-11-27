// Comida, rainha, ovos, nascimento, prosperidade, níveis e o catch-up de aba oculta.
import { W, totalFood, roomOf, calcWant, log, type World } from './world';
import { spawn, birthCell, digCell, dropTreat } from './ants';
import { walkable } from './path';
import { localThink } from './brain/local';
import { startRain, startWorm, nature } from './events';
import { rebalance } from './roles';
import { stepLife, react, TRAITS } from './life';
import { levelOf, antCap } from '../data/levels';
import { ROOMS } from '../data/rooms';

const prosRate = (w: World) => 0.6 + w.ants.length * 0.04;

function eat(w: World) {
  let need = Math.ceil(w.ants.length / 14);
  for (const r of w.rooms) {
    if (r.type === 'lixo') continue;
    while (need > 0 && r.fung > 0) { r.fung--; need--; w.S.trash += 0.5; }
    while (need > 0 && r.type !== 'fungo' && r.items.length) { const it = r.items.pop(); need--; if (it === 'grilo') w.S.trash += 0.6; }
  }
}

function checkLevel(w: World) {
  const nl = levelOf(w.S.pros);
  if (nl === w.level) return;
  w.level = nl; calcWant(w); w.dirty = true;
  const nr = w.rooms.find((r) => r.ph === nl);
  log(w, `Nível ${nl}! ` + (nr ? `Nova câmara liberada: ${ROOMS[nr.type][0]}.` : 'A colônia está mais forte.'));
  w.brain.t = 0; w.brain.lock = 0; w.brain.event = true;
  react(w, 'nivel');
}

export function econ(w: World, d: number) {
  const S = w.S, food = totalFood(w);
  S.pros += d * prosRate(w) * (food > 0 ? 1 : 0.35);
  checkLevel(w);
  if (food === 0 && w.lastFood > 0) { w.brain.t = 0; w.brain.lock = 0; w.brain.event = true; react(w, 'fome'); }
  w.lastFood = food;

  if ((w.tm.eat += d) > 4) { w.tm.eat = 0; eat(w); }
  if (w.sp.fungus && (w.tm.fun += d) > 3) {
    w.tm.fun = 0;
    for (const r of w.rooms) if (r.type === 'fungo' && r.items.length && r.fung < r.cells.length * 0.45) { r.items.shift(); r.fung += 2; }
  }
  if (w.queen.home && (w.tm.egg += d) > 7) {
    w.tm.egg = 0;
    if (food > 0 && w.ants.length + S.eggs < antCap(w.level)) {
      const n = Math.random() < 0.3 ? 2 : 1;
      S.eggs += n;
      if (Math.random() < 0.35) log(w, `A rainha botou ${n} ${n > 1 ? 'ovos' : 'ovo'}.`);
    }
  }
  const nurses = w.ants.filter((a) => a.task === 'nurse' && a.wait > 0).length;
  S.prog += d * (0.25 + nurses * 0.5);
  if (S.prog >= 10 && S.eggs > 0 && w.ants.length < antCap(w.level)) {
    S.prog = 0; S.eggs--;
    const a = spawn(w, birthCell(w));
    log(w, `Nasceu a ${a.mind.name}, uma operária ${TRAITS[a.mind.trait].nome}. Agora são ${w.ants.length}.`);
    react(w, 'nasceu', -1, a);
  }
  if ((w.tm.evap += d) > 1) { w.tm.evap = 0; evaporate(w.ph); }
  weather(w, d);
  nature(w, d);
  stepLife(w, d, food);
  if (w.brain.lock > 0) w.brain.lock -= d;
  if ((w.brain.t -= d) <= 0) { w.brain.t = 10; if (w.brain.lock <= 0) localThink(w); rebalance(w); }
}

/** feromônio some aos poucos: ~3 %/s, e zera quando fica fraco */
export function evaporate(ph: Float32Array) {
  for (let i = 0; i < ph.length; i++) if (ph[i]) ph[i] = ph[i] < 0.05 ? 0 : ph[i] * 0.97;
}

const GIFT: Record<string, string> = { folha: 'Uma folha veio caindo do alto e pousou no chão.', acucar: 'Alguém derrubou um torrão de açúcar lá em cima.', grilo: 'Um grilo distraído pousou na superfície.' };

/** eventos aleatórios: a cada ~90 s simulados, chance de chuva, minhoca ou um presente da natureza */
export function weather(w: World, d: number) {
  if (w.rain > 0 && (w.rain -= d) <= 0) {
    w.rain = 0;
    log(w, w.wx.plug > 0 ? 'A chuva passou. Estão reabrindo a entrada.' : 'A chuva passou. Forrageiras de volta à superfície.');
    w.brain.t = 0; w.brain.lock = 0; w.brain.event = true;
    react(w, 'chuva_passou');
    if (!w.worm && Math.random() < 0.5) startWorm(w); // terra molhada chama minhoca
  }
  if ((w.tm.ev += d) < 90) return;
  w.tm.ev = 0;
  const r = Math.random();
  if (r < 0.12 && !w.rain) startRain(w, Math.random() < 0.4);
  else if (r < 0.24 && !w.rain && w.treats.length + w.falls.length < 2) {
    const t = w.sp.nat[(Math.random() * w.sp.nat.length) | 0], twig = t === 'folha' && Math.random() < 0.5;
    dropTreat(w, t, twig);
    log(w, twig ? 'Um galho cheio de folhas caiu perto do formigueiro.' : GIFT[t]);
  } else if (r < 0.32 && !w.worm) startWorm(w);
}

export const fmtDur = (s: number) => {
  s = Math.floor(s);
  const h = (s / 3600) | 0, m = ((s % 3600) / 60) | 0;
  return h ? `${h}h ${String(m).padStart(2, '0')}min` : m ? `${m}min ${String(s % 60).padStart(2, '0')}s` : `${s}s`;
};

export const CATCHUP_MAX = 8 * 3600;

/** Simulação aproximada e rápida do tempo com a aba oculta. sec = tempo real. */
export function catchUp(w: World, sec: number) {
  sec = Math.min(sec, CATCHUP_MAX);
  if (sec < 5) return;
  const S = w.S, s = sec * S.speed;
  S.focus += sec;
  S.pros += s * prosRate(w) * 0.8;
  checkLevel(w);

  // escava a fronteira do plano, camada por camada
  let digs = Math.floor(s * w.ants.length * 0.4), done = 0;
  while (digs > 0) {
    const f: number[] = [];
    for (let i = 0; i < w.want.length; i++) if (w.want[i]) {
      const x = i % W;
      if (walkable(S.dug, i - W) || walkable(S.dug, i + W) || (x > 0 && walkable(S.dug, i - 1)) || (x < W - 1 && walkable(S.dug, i + 1))) f.push(i);
    }
    if (!f.length) break;
    for (const i of f) { if (digs <= 0) break; const k = digCell(w, i); digs -= k; done += k; }
  }
  let born = 0;
  while (born < s / 25 && w.ants.length < antCap(w.level)) { spawn(w, birthCell(w)); born++; }
  const fr = roomOf(w, 'comida') || roomOf(w, 'fungo') || roomOf(w, 'mel');
  if (fr) for (let k = 0; k < Math.min(20, s / 15); k++) if (fr.items.length < fr.cells.length * 0.55) fr.items.push(w.sp.nat[0]);
  w.dirty = true;
  log(w, `Enquanto você trabalhava (${fmtDur(sec)}): cavaram ${done} grãos${born ? `, nasceram ${born}` : ''}.`);
}
