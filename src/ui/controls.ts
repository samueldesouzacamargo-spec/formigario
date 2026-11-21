// Barra de controles, petiscos, estatísticas, cérebro, diário e opções.
import { active, totalFood } from '../sim/world';
import { addTreat } from '../sim/ants';
import { fmtDur } from '../sim/economy';
import { LV, antCap } from '../data/levels';
import { TREATS } from '../data/treats';
import { treatIcon } from '../render/sprites';
import { exportJSON, importJSON, saveOpts, DEFAULT_MODEL, type Opts } from '../store/save';
import type { App } from './app';
import { ROLE_NAMES, rolesOf, roleCounts, roleProgress } from '../sim/roles';
import { ask, tell } from './dialog';
import { feed, growth } from '../aquarium/sim';
import { darkness } from '../sim/clock';

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;
const SPEEDS = [0.75, 1, 1.5, 2];
const hhmm = (t: number) => { const d = new Date(t); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

export function initControls(app: App, opts: Opts, onOpts: (o: Opts) => void) {
  // referências guardadas: os elementos podem ir pra janela destacada
  const el = { stats: $('#stats'), lvl: $('#lvl'), castes: $('#castes'), treats: $('#treats'), speed: $('#speed'), prio: $('#prio'), thought: $('#thought'), src: $('#brainsrc'), log: $('#log') };
  let logN = -1, brainKey = '';

  function speed() {
    el.speed.innerHTML = SPEEDS.map((v) => `<button aria-pressed="${app.w.S.speed === v}" data-v="${v}">${String(v).replace('.', ',')}x</button>`).join('');
    el.speed.querySelectorAll<HTMLButtonElement>('button').forEach((b) => (b.onclick = () => { app.w.S.speed = +b.dataset.v!; speed(); app.save(); }));
  }
  function treats() {
    if (app.habitat === 'reef') {
      el.treats.innerHTML = '<button aria-label="Alimentar os peixes"><canvas width="8" height="8"></canvas><span>Alimentar</span></button>';
      const b = el.treats.querySelector('button')!, c = b.querySelector('canvas')!.getContext('2d')!;
      c.fillStyle = '#e8a050'; for (const [x, y] of [[1, 1], [4, 2], [2, 4], [6, 5], [3, 6], [6, 1]]) c.fillRect(x, y, 1, 1);
      b.onclick = () => { if (app.cool > 0) return; feed(app.reef); app.cool = 4; };
      return;
    }
    el.treats.innerHTML = app.w.sp.treats.map((t) => `<button data-tr="${t}" aria-label="Dar ${TREATS[t].name}"><canvas width="8" height="8"></canvas><span>${TREATS[t].name}</span></button>`).join('');
    el.treats.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
      treatIcon(b.querySelector('canvas')!.getContext('2d')!, b.dataset.tr as keyof typeof TREATS);
      b.onclick = () => { if (app.cool > 0) return; addTreat(app.w, b.dataset.tr as keyof typeof TREATS); app.cool = 3; };
    });
  }
  function reefStats() {
    const r = app.reef, g = Math.round(growth(r) * 100);
    const fish = r.fish.length, night = app.w.S.dayNight && darkness() > 0.3;
    el.stats.innerHTML = [[fmtDur(app.w.S.focus), 'tempo de foco'], [fish, 'peixes'], [`${g}%`, 'corais crescidos'], [night ? 'Luar' : 'Dia', 'iluminação']]
      .map((s) => `<div class="stat"><b>${s[0]}</b><span>${s[1]}</span></div>`).join('');
    el.lvl.innerHTML = `Aquário marinho<i><b style="width:${g}%"></b></i>`;
    el.treats.querySelectorAll('button').forEach((b) => ((b as HTMLButtonElement).disabled = app.cool > 0));
  }
  function stats() {
    if (app.habitat === 'reef') return reefStats();
    const w = app.w, S = w.S;
    const open = w.rooms.filter((r) => r.ph <= w.level && active(r)).length;
    el.stats.innerHTML = [[fmtDur(S.focus), 'tempo de foco'], [`${w.ants.length}/${antCap(w.level)}`, 'operárias'], [`${open}/${w.rooms.length}`, 'câmaras'], [totalFood(w), 'porções de comida']]
      .map((s) => `<div class="stat"><b>${s[0]}</b><span>${s[1]}</span></div>`).join('');
    const lo = LV[w.level], hi = LV[w.level + 1];
    el.lvl.innerHTML = `Nível ${w.level} · ${w.sp.name}<i><b style="width:${hi ? Math.min(100, ((S.pros - lo) / (hi - lo)) * 100) : 100}%"></b></i>`;
    if (!el.castes.hidden) castes();
    el.treats.querySelectorAll('button').forEach((b) => ((b as HTMLButtonElement).disabled = app.cool > 0));
    brain();
    if (w.logN !== logN) {
      logN = w.logN;
      // texto do diário pode vir do Gemini ou de save importado: sempre textContent
      el.log.replaceChildren(...S.logs.map(([t, txt]) => { const li = document.createElement('li'), tm = document.createElement('time'); tm.textContent = hhmm(t); li.append(tm, txt); return li; }));
    }
  }
  // escondido por padrão: abre clicando no nível
  function castes() {
    const w = app.w, c = roleCounts(w), p = roleProgress(w);
    const hint: Record<string, string> = { dig: 'plano do nível', forage: 'despensa', nurse: w.S.eggs ? 'próxima operária' : 'sem ovos', garden: 'jardim de fungo', haul: 'casa limpa' };
    el.castes.innerHTML = `<span class="h">${w.ants.length} operárias · % = progresso da função</span>` + rolesOf(w)
      .map((r) => `<span title="${hint[r]}">${ROLE_NAMES[r]}</span><span class="n">${c[r]}</span><i title="${hint[r]}"><b style="width:${p[r]}%"></b></i><span class="p">${p[r]}%</span>`).join('');
  }
  el.lvl.onclick = () => {
    if (app.habitat === 'reef') return;
    el.castes.hidden = !el.castes.hidden;
    el.lvl.setAttribute('aria-expanded', String(!el.castes.hidden));
    if (!el.castes.hidden) castes();
  };

  function brain() {
    const b = app.w.brain, x = b.w;
    const L: [string, number][] = [['Cavar', x.dig], ['Forragear', x.forage], ['Cuidar crias', x.nurse], ...(app.w.sp.fungus ? [['Jardinar', x.garden] as [string, number]] : []), ['Limpeza', x.haul]];
    const key = L.map((l) => l[1].toFixed(2)).join() + b.thought + b.source + app.brainError;
    if (key === brainKey) return;
    brainKey = key;
    const mx = Math.max(...L.map((l) => l[1]), 0.01), sum = L.reduce((a, l) => a + l[1], 0) || 1;
    el.prio.innerHTML = L.map((l) => `<span>${l[0]}</span><i><b style="width:${(l[1] / mx) * 100}%"></b></i><span>${Math.round((l[1] / sum) * 100)}%</span>`).join('');
    el.thought.textContent = `“${b.thought}”`;
    el.src.textContent = b.source === 'gemini' ? 'Cérebro: Gemini' : `Cérebro: local${app.brainError ? ` (Gemini: ${app.brainError})` : ''}`;
  }

  $('#new').onclick = async () => { if (await ask('Começar uma fazenda nova? A colônia atual será perdida.', 'Nova fazenda')) app.newFarm(); };
  $('#plan').onclick = (e) => { app.showPlan = !app.showPlan; (e.currentTarget as HTMLElement).setAttribute('aria-pressed', String(app.showPlan)); app.w.dirty = true; };

  // opções
  const key = $<HTMLInputElement>('#key'), model = $<HTMLInputElement>('#model');
  key.value = opts.geminiKey; model.value = opts.model;
  $<HTMLFormElement>('#opts').onsubmit = (e) => {
    e.preventDefault();
    const o = { geminiKey: key.value.trim(), model: model.value.trim() || DEFAULT_MODEL };
    saveOpts(o); onOpts(o);
    tell(o.geminiKey ? 'Salvo. O Gemini assume o cérebro na próxima rodada.' : 'Salvo. Cérebro local.');
  };
  $('#export').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([exportJSON(app.w)], { type: 'application/json' }));
    a.download = `formigario-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(a.href);
  };
  $<HTMLInputElement>('#import').onchange = async (e) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    (e.target as HTMLInputElement).value = '';
    if (!f) return;
    try { app.load(importJSON(await f.text())); } catch (err) { tell(`Não deu pra importar: ${(err as Error).message}`); }
  };

  return { speed, treats, stats };
}
