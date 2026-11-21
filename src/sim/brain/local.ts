// Cérebro por regras. Sempre disponível: é o fallback quando não há chave, rede ou o Gemini falha.
import { totalFood, active, type World } from '../world';
import { antCap } from '../../data/levels';
import { ROOMS } from '../../data/rooms';

export function localThink(w: World) {
  const f = totalFood(w), n = w.ants.length, b = w.brain.w, S = w.S;
  // enquanto a rainha não tem câmara, cavar vem antes de tudo
  const queenHome = active(w.rooms.find((r) => r.type === 'rainha'));
  b.dig = !w.wantLeft ? 0.05 : !queenHome ? 3 : Math.min(3, 0.6 + w.wantLeft / 150);
  // sem nenhuma câmara aberta não há onde guardar comida: primeiro cavar
  const storage = w.rooms.some((r) => r.ph <= w.level && active(r));
  b.forage = !storage ? 0.2 : f < n * 0.5 ? 2.4 : f < antCap(w.level) ? 1.2 : 0.5;
  b.nurse = S.eggs ? 1 + S.eggs * 0.3 : 0.1;
  b.garden = b.nurse * 0.6 + 0.2;
  b.haul = S.trash >= 1 ? 1 : 0;
  const tr = w.treats[0];
  const room = w.rooms.find((r) => r.ph <= w.level && r.dugN < r.cells.length * 0.6);
  w.brain.thought = w.rain > 0
    ? 'Chuva lá fora. Ninguém sai: hora de cavar e arrumar a casa.'
    : tr
    ? { folha: 'Folhas frescas na superfície. Cortar, carregar, direto pro jardim de fungo.', acucar: 'Cheiro de açúcar lá em cima! Todas as forrageiras pra superfície.', grilo: 'Um grilo! Equipe de mordida, agora. Pedaço por pedaço pra despensa.' }[tr.type]
    : room ? `Faltam ${Math.ceil(room.cells.length * 0.6 - room.dugN)} grãos pra abrir a ${ROOMS[room.type][0].toLowerCase()}. Reforço na escavação.`
    : f < n * 0.5 ? `Só ${f} porções pra ${n} bocas. Prioridade: buscar comida lá fora.`
    : S.eggs ? `${S.eggs} ${S.eggs > 1 ? 'ovos' : 'ovo'} no berçário. Babás de plantão.`
    : 'Colônia estável. Hora de alargar os túneis e explorar.';
  w.brain.foco = room ? 'proxima_camara' : w.wantLeft ? 'alargar_tuneis' : 'explorar';
  w.brain.source = 'local';
}
