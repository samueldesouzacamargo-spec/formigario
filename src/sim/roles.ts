// Divisão de trabalho: cada operária tem uma função fixa (construtora, coletora…).
// O cérebro decide a proporção; as trocas de função são graduais pra ninguém largar tudo de uma vez.
import { totalFood, active, type World, type Role } from './world';
import { antCap } from '../data/levels';

export const ROLE_NAMES: Record<Role, string> = { dig: 'Construtoras', forage: 'Coletoras', nurse: 'Cuidadoras', garden: 'Jardineiras', haul: 'Faxineiras' };

export const rolesOf = (w: World): Role[] => (w.sp.fungus ? ['dig', 'forage', 'nurse', 'garden', 'haul'] : ['dig', 'forage', 'nurse', 'haul']);

export function roleCounts(w: World) {
  const c = Object.fromEntries(rolesOf(w).map((r) => [r, 0])) as Record<Role, number>;
  for (const a of w.ants) c[a.role] = (c[a.role] ?? 0) + 1;
  return c;
}

/** quantas de cada função o cérebro quer agora (maiores restos) */
export function roleTargets(w: World) {
  const roles = rolesOf(w), n = w.ants.length;
  const wt = roles.map((r) => Math.max(0.05, w.brain.w[r]));
  const sum = wt.reduce((a, b) => a + b, 0);
  const raw = wt.map((x) => (x / sum) * n), t = raw.map(Math.floor);
  let left = n - t.reduce((a, b) => a + b, 0);
  raw.map((x, k) => [x - t[k], k]).sort((a, b) => b[0] - a[0]).forEach(([, k]) => { if (left-- > 0) t[k]++; });
  return Object.fromEntries(roles.map((r, k) => [r, t[k]])) as Record<Role, number>;
}

/** função mais desfalcada: é a que uma operária recém-nascida assume */
export function neededRole(w: World): Role {
  const t = roleTargets(w), c = roleCounts(w);
  return rolesOf(w).reduce((best, r) => (t[r] - c[r] > t[best] - c[best] ? r : best), 'dig' as Role);
}

/** move no máximo ~10% da colônia por rodada, das funções que sobram pras que faltam */
export function rebalance(w: World) {
  const t = roleTargets(w), c = roleCounts(w), roles = rolesOf(w);
  for (let moves = Math.max(1, Math.round(w.ants.length / 10)); moves > 0; moves--) {
    const over = roles.reduce((b, r) => (c[r] - t[r] > c[b] - t[b] ? r : b));
    const under = roles.reduce((b, r) => (t[r] - c[r] > t[b] - c[b] ? r : b));
    if (c[over] - t[over] <= 0 || t[under] - c[under] <= 0) return;
    // prefere quem não está no meio do próprio serviço
    const a = w.ants.find((x) => x.role === over && x.task !== over) ?? w.ants.find((x) => x.role === over);
    if (!a) return;
    a.role = under; c[over]--; c[under]++;
  }
}

/** progresso de cada função, 0–100 */
export function roleProgress(w: World): Record<Role, number> {
  let plan = 0, dug = 0;
  for (let i = 0; i < w.plan.length; i++) if (w.plan[i] >= 0 && w.plan[i] <= w.level) { plan++; dug += w.S.dug[i]; }
  const fungRooms = w.rooms.filter((r) => r.type === 'fungo' && active(r));
  const fungCap = fungRooms.reduce((s, r) => s + r.cells.length * 0.45, 0);
  const pct = (x: number) => Math.round(Math.max(0, Math.min(1, x)) * 100);
  return {
    dig: pct(plan ? dug / plan : 1),
    forage: pct(totalFood(w) / antCap(w.level)),
    nurse: pct(w.S.eggs ? w.S.prog / 10 : 1),
    garden: pct(fungCap ? fungRooms.reduce((s, r) => s + r.fung, 0) / fungCap : 0),
    haul: pct(1 - w.S.trash / 8),
  };
}
