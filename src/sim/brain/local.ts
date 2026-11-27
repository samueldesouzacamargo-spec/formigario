// Cérebro por regras. Sempre disponível: é o modo da versão à venda e o fallback quando não há chave, rede ou o Gemini falha.
// Decide os pesos de cada função e o "pensamento" da colônia, com falas variadas por contexto e sem repetir.
import { totalFood, active, type World, type Ant } from '../world';
import { antCap } from '../../data/levels';
import { ROOMS } from '../../data/rooms';
import { TRAITS, isNight, moodName, fresh } from '../life';

/** pesos: o que a colônia precisa agora, ajustado pela hora e pelo humor */
function weights(w: World) {
  const f = totalFood(w), n = w.ants.length, b = w.brain.w, S = w.S, night = isNight(w);
  // enquanto a rainha não tem câmara, cavar vem antes de tudo
  const queenHome = active(w.rooms.find((r) => r.type === 'rainha'));
  b.dig = !w.wantLeft ? 0.05 : !queenHome ? 3 : Math.min(3, 0.6 + w.wantLeft / 150);
  // sem nenhuma câmara aberta não há onde guardar comida: primeiro cavar
  const storage = w.rooms.some((r) => r.ph <= w.level && active(r));
  b.forage = !storage ? 0.2 : f < n * 0.5 ? 2.4 : f < antCap(w.level) ? 1.2 : 0.5;
  b.nurse = S.eggs ? 1 + S.eggs * 0.3 : 0.1;
  b.garden = b.nurse * 0.6 + 0.2;
  b.haul = S.trash >= 1 ? 1 : 0;
  if (night) {
    // de noite a colônia se recolhe: menos gente lá fora, mais gente com os ovos
    if (f >= n * 0.5) b.forage *= 0.5;
    b.nurse = Math.min(3, b.nurse * 1.4 + 0.2);
    b.dig *= queenHome ? 0.8 : 1;
  } else if (w.life.phase === 'amanhecer' && storage) b.forage = Math.min(3, b.forage * 1.3);
  if (w.life.mood < -0.4 && f < n * 0.5) b.forage = Math.min(3, b.forage + 0.4); // aflitas: todo mundo atrás de comida
}

type Ctx = { key: string; lines: string[] };

/** o que está acontecendo, do mais urgente pro mais corriqueiro */
function context(w: World): Ctx {
  const S = w.S, f = totalFood(w), n = w.ants.length, L = w.life, Q = w.queen.mind.name;
  const tr = w.treats[0];
  const room = w.rooms.find((r) => r.ph <= w.level && r.dugN < r.cells.length * 0.6);
  const sleeping = w.ants.filter((a) => a.mind.nap).length;

  if (w.rain > 0 && w.wx.storm && w.wx.flooded) return { key: 'alagou', lines: [
    'Água nas galerias! Salvem a comida e subam os ovos pras câmaras altas.',
    'Entrou água. Ninguém entra em pânico. Quer dizer, a gente entra um pouquinho.',
    'Galeria molhada, comida estragada. Assim que parar, todo mundo cavando de novo.',
  ] };
  if (w.rain > 0 && w.wx.storm) return { key: 'tempestade', lines: w.wx.plugged ? [
    'Entrada tampada. Lá fora o mundo acaba, aqui dentro está sequinho.',
    'Trovão de novo. As medrosas estão todas lá no fundo, abraçadas na rainha.',
    'Tempestade braba. Aproveitando pra arrumar a despensa enquanto passa.',
  ] : [
    'Tempestade! Construtoras, terra na entrada, agora!',
    'Vento forte lá fora. Cada grão de terra na boca do túnel conta.',
    'Tampem a entrada antes que a água desça. Rápido, rápido!',
  ] };
  if (w.rain > 0) return { key: 'chuva', lines: [
    'Chuva lá fora. Ninguém sai: hora de cavar e arrumar a casa.',
    'Chovendo fininho. Barulho bom pra cochilar, dizem as preguiçosas.',
    'Terra molhada é terra mole. Construtoras felizes, coletoras de cara feia.',
    'Ninguém põe a antena pra fora até a chuva passar.',
  ] };
  if (tr) {
    const pool = {
      folha: ['Folhas frescas na superfície. Cortar, carregar, direto pro jardim de fungo.', 'Folha nova lá em cima! Fila indiana, tesouras afiadas.', 'Cheiro de folha verde. O fungo vai adorar.'],
      acucar: ['Cheiro de açúcar lá em cima! Todas as coletoras pra superfície.', 'Açúcar! Quem chegar primeiro escolhe o pedaço.', 'Um torrão inteiro de açúcar. Hoje é dia de festa.'],
      grilo: ['Um grilo! Equipe de mordida, agora. Pedaço por pedaço pra despensa.', 'Grilo na superfície. As corajosas já estão lá, as outras vão atrás.', 'Proteína! Esse grilo alimenta o berçário por dias.'],
    }[tr.type];
    return { key: 'petisco' + tr.type, lines: pool };
  }
  if (f === 0) return { key: 'fome', lines: [
    `Despensa vazia. ${n} barrigas roncando. Todo mundo procurando comida.`,
    'Nenhuma migalha guardada. As coletoras saem e não voltam sem nada.',
    `${Q} está preocupada: sem comida, sem ovos novos.`,
  ] };
  if (f < n * 0.5) return { key: 'pouca', lines: [
    `Só ${f} porções pra ${n} bocas. Prioridade: buscar comida lá fora.`,
    `Estoque baixo. ${f} porções não duram muito com ${n} operárias.`,
    'Comida curta. As gulosas estão sendo vigiadas de perto.',
  ] };
  if (room) {
    const left = Math.ceil(room.cells.length * 0.6 - room.dugN), nome = ROOMS[room.type][0].toLowerCase();
    return { key: 'obra' + room.type, lines: [
      `Faltam ${left} grãos pra abrir a ${nome}. Reforço na escavação.`,
      `A ${nome} está quase. Mais ${left} grãos e ela abre.`,
      `Obra na ${nome}: ${left} grãos de terra pra tirar ainda.`,
    ] };
  }
  if (L.phase === 'madrugada') return { key: 'madrugada', lines: [
    `Madrugada. ${sleeping} dormindo, o resto de vigia no berçário.`,
    'Silêncio no formigueiro. Só as babás acordadas, contando ovos.',
    'Hora de dormir. Amanhã cedo tem muita terra pra tirar.',
  ] };
  if (L.phase === 'noite') return { key: 'noite', lines: [
    `Noite lá fora. ${sleeping ? `${sleeping} já cochilando` : 'Ninguém dormiu ainda'}, turno da noite cuidando dos ovos.`,
    'Escureceu. Quem estava na superfície voltou pra casa.',
    'Noite tranquila. As curiosas ficam olhando a lua pela boca do túnel.',
  ] };
  if (L.phase === 'amanhecer') return { key: 'amanhecer', lines: [
    'Bom dia, formigueiro. Antenas pra cima, coletoras pra fora.',
    'Amanheceu. A primeira a sair sempre volta contando novidade.',
    'Sol nascendo. Dia bom pra encher a despensa.',
  ] };
  if (L.phase === 'entardecer') return { key: 'entardecer', lines: [
    'Fim de tarde. Últimas viagens antes de escurecer.',
    'O sol está indo embora. Quem estiver longe, pode voltando.',
  ] };
  if (S.eggs) return { key: 'ovos', lines: [
    `${S.eggs} ${S.eggs > 1 ? 'ovos' : 'ovo'} no berçário. Babás de plantão.`,
    `${Q} botou mais ovos. O berçário está ficando cheio.`,
    `Cuidando de ${S.eggs} ${S.eggs > 1 ? 'ovinhos' : 'ovinho'}. Lambe, vira, lambe de novo.`,
  ] };
  if (S.trash >= 3) return { key: 'lixo', lines: ['Lixo acumulando. Faxineiras, a casa agradece.', 'Tem resto de comida pelos cantos. Ninguém merece.'] };
  return { key: 'estavel', lines: [
    'Colônia estável. Hora de alargar os túneis e explorar.',
    'Tudo em ordem. Despensa cheia, rainha feliz, túneis limpos.',
    'Dia calmo. Dá até tempo de cumprimentar todo mundo no corredor.',
    `${Q} mandou dizer que está orgulhosa da colônia.`,
  ] };
}

/** de vez em quando o pensamento é sobre uma formiga específica */
function gossip(w: World): string | null {
  const pool: [Ant, string][] = [];
  for (const a of w.ants) {
    const m = a.mind, n = m.name, t = TRAITS[m.trait].nome;
    if (m.nap) pool.push([a, m.trait === 'preguicosa' ? `${n} cochilou de novo. Ninguém se surpreende.` : `${n} está tirando um cochilo merecido.`]);
    else if (m.hold > 0) pool.push([a, `${n} parou no meio do túnel pra trocar cheiro com uma colega.`]);
    else if (a.carry === 'grilo') pool.push([a, `${n} está carregando um pedaço de grilo maior que ela.`]);
    else if (m.energy < 0.25) pool.push([a, `${n}, a ${t}, está exausta mas não larga o serviço.`]);
    else if (m.born < 60) pool.push([a, `${n} acabou de nascer e já quer ajudar.`]);
  }
  if (!pool.length) return null;
  return pool[(Math.random() * pool.length) | 0][1];
}

export function localThink(w: World) {
  weights(w);
  const L = w.life, c = context(w);
  L.thoughtT -= 10;
  // troca o pensamento quando a situação muda; parado, troca a cada ~30 s pra não ficar repetitivo
  if (c.key !== L.ctx || L.thoughtT <= 0 || !w.brain.thought || w.brain.source !== 'local') {
    const g = c.key === L.ctx && Math.random() < 0.35 ? gossip(w) : null;
    w.brain.thought = g ?? fresh(w, c.lines);
    L.ctx = c.key; L.thoughtT = 30;
  }
  const room = w.rooms.find((r) => r.ph <= w.level && r.dugN < r.cells.length * 0.6);
  w.brain.foco = room ? 'proxima_camara' : w.wantLeft ? 'alargar_tuneis' : 'explorar';
  w.brain.source = 'local';
}

/** uma linha curta pro painel: período e humor */
export const lifeLine = (w: World) => `${w.life.phase[0].toUpperCase()}${w.life.phase.slice(1)} · humor ${moodName(w.life.mood)}`;
