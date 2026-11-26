// A parte "viva" das formigas, sem IA e sem custo: personalidade, energia e sono,
// ciclo de dia e noite, cumprimentos de antena e reações aos eventos.
// O cérebro (local ou Gemini) decide a política; aqui é o jeito de cada uma.
import { W, SURF, rng, log, type World, type Ant, type Mind, type Trait, type Emote, type Phase, type Life } from './world';
import { darkness } from './clock';
import { BGS } from '../data/backgrounds';
import type { SpeciesId } from '../data/species';

export interface TraitDef {
  nome: string; // como aparece no texto ("uma operária curiosa")
  spd: number; // multiplica a velocidade
  idle: number; // multiplica a vontade de ficar à toa
  tire: number; // multiplica o cansaço
  social: number; // chance de parar pra cumprimentar
}
export const TRAITS: Record<Trait, TraitDef> = {
  trabalhadora: { nome: 'trabalhadora', spd: 1.15, idle: 0.4, tire: 0.85, social: 0.25 },
  curiosa: { nome: 'curiosa', spd: 1.05, idle: 0.9, tire: 1, social: 0.5 },
  sociavel: { nome: 'sociável', spd: 1, idle: 1, tire: 1, social: 1 },
  preguicosa: { nome: 'preguiçosa', spd: 0.85, idle: 2.2, tire: 1.6, social: 0.6 },
  gulosa: { nome: 'gulosa', spd: 0.95, idle: 1.1, tire: 1.1, social: 0.5 },
  medrosa: { nome: 'medrosa', spd: 1.05, idle: 1, tire: 1, social: 0.35 },
  corajosa: { nome: 'corajosa', spd: 1.1, idle: 0.7, tire: 0.9, social: 0.4 },
};

/** cada espécie puxa pra um jeito: saúva trabalha, lava-pés é agitada, pote-de-mel é gulosa, bala é brava */
const MIX: Record<SpeciesId, Partial<Record<Trait, number>>> = {
  sauva: { trabalhadora: 4 },
  lavape: { curiosa: 3, corajosa: 2.5 },
  pote: { gulosa: 3.5, sociavel: 3 },
  bala: { corajosa: 4, medrosa: 0.5 },
};
const BASE: Record<Trait, number> = { trabalhadora: 3, curiosa: 2, sociavel: 2, preguicosa: 1.8, gulosa: 1.5, medrosa: 1.5, corajosa: 1.5 };

export const NAMES = [
  'Tica', 'Zuza', 'Pipoca', 'Nina', 'Cotinha', 'Juju', 'Lelê', 'Bidu', 'Fifi', 'Mimosa', 'Dona Cida', 'Paçoca', 'Tetê', 'Quinha', 'Bia',
  'Lua', 'Neca', 'Dudu', 'Zizi', 'Mel', 'Faísca', 'Biscoito', 'Jabuticaba', 'Dona Lurdes', 'Cacau', 'Pitanga', 'Nana', 'Tuca', 'Rosinha', 'Xica',
  'Mariquinha', 'Pingo', 'Gigi', 'Totó', 'Belinha', 'Farofa', 'Jujuba', 'Lili', 'Zefa', 'Didi', 'Bolinha', 'Cuca', 'Ritinha', 'Fubá', 'Tainá',
  'Dona Zica', 'Pimenta', 'Iara', 'Vivi', 'Quindim', 'Cocada', 'Tati', 'Branca', 'Dalva', 'Graúda', 'Miúda', 'Sapeca', 'Brisa', 'Canela', 'Zélia',
];
export const QUEEN_NAMES = ['Dona Formosa', 'Rainha Jurema', 'Dona Benedita', 'Rainha Iracema', 'Dona Clotilde', 'Rainha Dalila', 'Dona Filó', 'Rainha Aurora'];

/** nome e traço estáveis por seed + posição: recarregar a colônia traz as mesmas formigas */
export function newMind(seed: number, k: number, sp: SpeciesId): Mind {
  const r = rng((seed ^ Math.imul(k + 1, 0x9e3779b1)) | 0);
  r(); r();
  const order = shuffled(seed);
  const L = NAMES.length, base = NAMES[order[k % L]];
  const name = k < L ? base : `${base} ${Math.floor(k / L) + 1}`;
  const wt = (Object.keys(BASE) as Trait[]).map((t) => [t, BASE[t] * (MIX[sp]?.[t] ?? 1)] as const);
  let x = r() * wt.reduce((a, b) => a + b[1], 0), trait: Trait = 'trabalhadora';
  for (const [t, v] of wt) if ((x -= v) <= 0) { trait = t; break; }
  return { name, trait, energy: 0.6 + r() * 0.4, emote: null, emoteT: 0, hold: 0, greetT: 2 + r() * 6, nap: false, born: 0 };
}
export const queenMind = (seed: number): Mind => ({ ...newMind(seed, 999, 'sauva'), name: QUEEN_NAMES[(seed >>> 3) % QUEEN_NAMES.length], trait: 'sociavel' });

const shuffleCache = new Map<number, number[]>();
function shuffled(seed: number) {
  let o = shuffleCache.get(seed);
  if (o) return o;
  const r = rng(seed ^ 0x51ed), a = NAMES.map((_, i) => i);
  for (let i = a.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; }
  shuffleCache.set(seed, a);
  if (shuffleCache.size > 8) shuffleCache.delete(shuffleCache.keys().next().value!);
  return a;
}

export function freshLife(): Life {
  return { clock: () => new Date(), phase: 'dia', dark: 0, mood: 0.3, said: [], thoughtT: 0, ctx: '', quipT: 40 + Math.random() * 40, t: 1, gt: 0, lastTreatT: 1e9 };
}

export const traitOf = (a: Ant) => TRAITS[a.mind.trait];
export const isNight = (w: World) => w.life.phase === 'noite' || w.life.phase === 'madrugada';

export function emote(a: Ant, e: Emote, t = 2.5) { a.mind.emote = e; a.mind.emoteT = t; }

/** período pelo relógio real (ou noite eterna nos fundos noturnos; dia eterno com o ciclo desligado) */
export function phaseOf(w: World): { phase: Phase; dark: number } {
  const bg = BGS.find((b) => b.id === w.S.bg);
  if (bg && bg.cel[0] === 'moon') return { phase: 'noite', dark: 0.5 };
  if (!w.S.dayNight) return { phase: 'dia', dark: 0 };
  const d = w.life.clock(), h = d.getHours() + d.getMinutes() / 60;
  const phase: Phase = h < 5 ? 'madrugada' : h < 7 ? 'amanhecer' : h < 17.5 ? 'dia' : h < 19 ? 'entardecer' : 'noite';
  return { phase, dark: darkness(d) };
}

const PHASE_LOG: Partial<Record<Phase, string[]>> = {
  amanhecer: ['Amanheceu. As primeiras coletoras esticaram as antenas na boca do túnel.', 'O sol apareceu e a colônia acordou de uma vez, todo mundo esbarrando em todo mundo.'],
  dia: ['Dia claro lá fora. Turno cheio em todas as câmaras.'],
  entardecer: ['Fim de tarde. As coletoras fazem as últimas viagens antes de escurecer.', 'O sol baixou. Quem estava longe começou a voltar pra casa.'],
  noite: ['Anoiteceu. Metade da colônia foi dormir, a outra metade ficou de vigia no berçário.', 'Noite. O formigueiro ficou mais quieto, só se ouve o barulhinho das babás.'],
  madrugada: ['Madrugada. Quase todo mundo dormindo, menos as insones de sempre.'],
};

/** cansaço por segundo: trabalho pesado cansa mais, à noite cansa mais ainda */
function tireRate(w: World, a: Ant) {
  const t = a.task, base = t === 'dig' || t === 'haul' ? 1 / 200 : t === 'forage' ? 1 / 230 : t === 'idle' ? 1 / 700 : 1 / 300;
  return base * traitOf(a).tire * (isNight(w) ? 2.2 : 1) * (a.carry ? 1.15 : 1);
}

/** quer cochilar agora? */
export function wantsNap(w: World, a: Ant) {
  const m = a.mind;
  if (!w.queen.home) return m.energy < 0.05; // fundação: ninguém dorme enquanto a rainha não tem casa
  if (m.energy < 0.18) return true;
  if (isNight(w) && m.energy < 0.55) return Math.random() < (m.trait === 'preguicosa' ? 0.8 : 0.45);
  return m.trait === 'preguicosa' && m.energy < 0.4 && Math.random() < 0.3;
}
/** duração do cochilo */
export const napTime = (w: World, a: Ant) => (isNight(w) ? 18 : 7) + Math.random() * (a.mind.trait === 'preguicosa' ? 18 : 9);

/** humor da colônia: comida, chuva, petiscos recentes, casa cheia de lixo */
function moodTarget(w: World, food: number) {
  const n = Math.max(1, w.ants.length);
  let m = Math.min(1, food / (n * 1.2)) * 0.9 - 0.2;
  if (food === 0) m -= 0.5;
  if (w.rain > 0) m -= w.wx.storm ? 0.35 : 0.15;
  if (w.wx.flooded && w.rain > 0) m -= 0.3;
  if (w.life.lastTreatT < 90) m += 0.45;
  if (w.S.trash > 4) m -= 0.2;
  if (w.life.phase === 'amanhecer') m += 0.1;
  return Math.max(-1, Math.min(1, m));
}

export const moodName = (m: number) => (m > 0.65 ? 'eufórica' : m > 0.3 ? 'animada' : m > -0.05 ? 'tranquila' : m > -0.4 ? 'preocupada' : 'aflita');

/** um passo de vida: roda todo tick, o pesado só 1×/s */
export function stepLife(w: World, d: number, food: number) {
  const L = w.life;
  L.lastTreatT += d;
  for (const a of w.ants) tickMind(w, a, d);
  tickMind(w, w.queen, d);
  if ((L.gt += d) >= 0.5) { L.gt = 0; greetings(w); }
  if ((L.t -= d) > 0) return;
  L.t = 1;
  const { phase, dark } = phaseOf(w);
  L.dark = dark;
  if (phase !== L.phase) {
    const old = L.phase;
    L.phase = phase;
    const pool = PHASE_LOG[phase];
    if (pool && old) log(w, pick(pool));
    if (phase === 'amanhecer') for (const a of w.ants) if (a.mind.nap && Math.random() < 0.5) emote(a, 'brilho', 2);
    w.brain.t = 0; L.thoughtT = 0;
  }
  L.mood += (moodTarget(w, food) - L.mood) * 0.08;
  // minhoca passando perto assusta (ou interessa)
  const m = w.worm;
  if (m) for (const a of w.ants) {
    const x = a.i % W, y = (a.i / W) | 0;
    if (Math.abs(x - m.x) < 7 && Math.abs(y - m.y) < 6 && !a.mind.emote) emote(a, a.mind.trait === 'medrosa' ? '!' : a.mind.trait === 'curiosa' || a.mind.trait === 'corajosa' ? '?' : '!', 1.8);
  }
  if ((L.quipT -= 1) <= 0) { L.quipT = 70 + Math.random() * 90; quip(w); }
}

function tickMind(w: World, a: Ant, d: number) {
  const m = a.mind;
  m.born += d;
  if (m.emoteT > 0 && (m.emoteT -= d) <= 0) m.emote = null;
  if (m.greetT > 0) m.greetT -= d;
  if (m.nap) {
    if (a.wait <= 0) m.nap = false; // interrompido (chuva, etc.)
    else { m.energy = Math.min(1, m.energy + d / 11); if (!m.emote) emote(a, 'z', 1.6); }
  } else if (a !== w.queen) m.energy = Math.max(0, m.energy - d * tireRate(w, a));
}

/** duas formigas se cruzando no túnel param e encostam as antenas */
function greetings(w: World) {
  if (!w.queen.home) return;
  const at = new Map<number, Ant>();
  for (const a of w.ants) if (!a.mind.nap) at.set(a.i, a);
  for (const a of w.ants) {
    const m = a.mind;
    if (m.greetT > 0 || m.nap || m.hold > 0 || !a.path) continue;
    const ahead = a.i + a.face, b = at.get(ahead) ?? at.get(ahead + a.face);
    if (!b || b === a || b.mind.greetT > 0 || b.mind.nap || b.mind.hold > 0 || Math.abs((b.i % W) - (a.i % W)) > 2) continue;
    if (Math.random() > 0.35 * (traitOf(a).social + traitOf(b).social)) { m.greetT = 3; continue; }
    const t = 0.7 + Math.random() * 0.8;
    m.hold = b.mind.hold = t;
    m.greetT = b.mind.greetT = 12 + Math.random() * 14;
    b.face = a.face === 1 ? -1 : 1;
    const hungry = a.mind.energy < 0.35 || b.mind.energy < 0.35;
    // trofalaxia: quem carrega comida divide com a cansada
    const share = hungry && (a.carry === 'acucar' || b.carry === 'acucar' || w.S.sp === 'pote');
    if (share) { a.mind.energy = Math.min(1, a.mind.energy + 0.25); b.mind.energy = Math.min(1, b.mind.energy + 0.25); }
    const e: Emote = share ? 'coracao' : a.mind.trait === 'sociavel' || b.mind.trait === 'sociavel' ? 'coracao' : Math.random() < 0.5 ? 'reticencias' : 'nota';
    emote(a, e, t + 0.6); emote(b, e === 'coracao' ? 'coracao' : 'reticencias', t + 0.6);
  }
}

export type Reaction = 'chuva' | 'tempestade' | 'chuva_passou' | 'petisco' | 'alagou' | 'tampou' | 'nasceu' | 'nivel' | 'fome';

/** a colônia reage: balõezinhos, sustos, festa. `x` = coluna do acontecimento, quando houver */
export function react(w: World, ev: Reaction, x = -1, who?: Ant) {
  const L = w.life;
  for (const a of w.ants) {
    const t = a.mind.trait, ax = a.i % W, ay = (a.i / W) | 0;
    switch (ev) {
      case 'chuva': case 'tempestade':
        if (t === 'medrosa') emote(a, '!', 3);
        else if (ay < SURF + 4) emote(a, 'gota', 2.5);
        else if (t === 'curiosa' && Math.random() < 0.5) emote(a, '?', 2);
        if (a.mind.nap && ev === 'tempestade' && Math.random() < 0.5) { a.mind.nap = false; a.wait = 0.1; emote(a, '!', 2); } // trovão acorda
        break;
      case 'chuva_passou':
        if (t === 'curiosa' || t === 'corajosa' || Math.random() < 0.2) emote(a, 'nota', 2.5);
        break;
      case 'petisco': {
        const near = x >= 0 && Math.abs(ax - x) < 40 && ay < SURF + 12;
        if (near || t === 'corajosa' || (t === 'gulosa' && Math.random() < 0.6)) emote(a, '!', 2);
        break;
      }
      case 'alagou': emote(a, '!', 3.5); a.mind.energy = Math.max(0, a.mind.energy - 0.1); break;
      case 'tampou': if (a.role === 'dig' || Math.random() < 0.25) emote(a, 'nota', 2.5); break;
      case 'nasceu':
        if (a === who) emote(a, '?', 3);
        else if (a.task === 'nurse' || (t === 'sociavel' && Math.random() < 0.5)) emote(a, 'coracao', 2.5);
        break;
      case 'nivel': emote(a, Math.random() < 0.7 ? 'nota' : 'brilho', 4); a.mind.energy = Math.min(1, a.mind.energy + 0.2); break;
      case 'fome': if (Math.random() < 0.4) emote(a, 'reticencias', 3); break;
    }
  }
  if (ev === 'nivel') emote(w.queen, 'brilho', 5);
  if (ev === 'nasceu') emote(w.queen, 'coracao', 3);
  if (ev === 'petisco') L.lastTreatT = 0;
}

/** fofoca do diário: o que uma formiga específica anda aprontando */
function quip(w: World) {
  if (!w.ants.length) return;
  const a = w.ants[(Math.random() * w.ants.length) | 0], m = a.mind, n = m.name, night = isNight(w);
  const by: Record<Trait, string[]> = {
    trabalhadora: [`${n} carregou mais terra hoje que as outras três juntas. Ninguém pediu.`, `${n} não para. Já deu três voltas no túnel principal enquanto as outras conversavam.`, `${n} arrumou de novo a pilha de terra da entrada. Estava torta, segundo ela.`],
    curiosa: [`${n} foi até a borda do vidro só pra ver o que tinha do outro lado.`, `${n} ficou um tempão cheirando uma pedra. Concluiu que é uma pedra.`, night ? `${n} subiu pra olhar a lua e esqueceu de voltar.` : `${n} achou um caminho novo até a superfície. Ninguém mais usa.`],
    sociavel: [`${n} já cumprimentou todo mundo do formigueiro. Duas vezes.`, `${n} passou na câmara real só pra dar um oi pra ${w.queen.mind.name}.`, `${n} parou pra conversar com cada formiga que cruzou no túnel.`],
    preguicosa: [`${n} achou um cantinho quentinho no berçário e cochilou em cima dos ovos de novo.`, `${n} disse que ia cavar. Está deitada há um bom tempo.`, `${n} carregou um grão de terra e foi descansar do esforço.`],
    gulosa: [`${n} foi pega beliscando a despensa. Disse que estava conferindo o estoque.`, `${n} deu um jeito de passar pela despensa em todas as viagens.`, `Sumiu um pedacinho de comida. A ${n} está com cara de quem não sabe de nada.`],
    medrosa: [`${n} levou um susto com a própria sombra no túnel.`, `${n} só sai do formigueiro se outra for na frente.`, `${n} escutou um barulho lá fora e foi conferir se a rainha estava bem.`],
    corajosa: [`${n} encarou um besouro na superfície e o besouro foi embora.`, `${n} é sempre a primeira a chegar quando cai comida lá fora.`, `${n} se ofereceu pra tampar a entrada na próxima tempestade.`],
  };
  const pool = [...by[m.trait]];
  if (m.nap) pool.push(`${n} está dormindo pesado. Alguém passou por cima dela e ela nem sentiu.`);
  if (m.born < 120) pool.push(`${n} nasceu agora há pouco e já está seguindo as mais velhas pra todo lado.`);
  if (w.S.eggs > 2) pool.push(`${w.queen.mind.name} está orgulhosa: ${w.S.eggs} ovos no berçário.`);
  const line = fresh(w, pool);
  if (line) log(w, line);
}

const pick = <T>(l: T[]) => l[(Math.random() * l.length) | 0];

/** escolhe uma fala que não foi dita há pouco */
export function fresh(w: World, pool: string[]) {
  const said = w.life.said, ok = pool.filter((p) => !said.includes(p));
  const s = pick(ok.length ? ok : pool);
  if (!s) return '';
  said.unshift(s); if (said.length > 16) said.length = 16;
  return s;
}
