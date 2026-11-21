// Abas Fundo · Espécie · Skins, com miniaturas desenhadas de verdade.
import { W, SURF } from '../sim/world';
import { BGS, CATS } from '../data/backgrounds';
import { SPECIES, type SpeciesId } from '../data/species';
import { TREATS } from '../data/treats';
import { SKW, SKQ } from '../data/skins';
import { drawBg } from '../render/backgrounds';
import { ant, queen } from '../render/sprites';
import type { App } from './app';
import { ask } from './dialog';

const paint = (cnv: HTMLCanvasElement | null, draw: (c: CanvasRenderingContext2D) => void) => {
  const c = cnv!.getContext('2d')!; c.imageSmoothingEnabled = false; draw(c);
};

export function initPanel(app: App, pane: HTMLElement, tabs: NodeListOf<HTMLButtonElement>) {
  let tab = 'bg', cat = 'Todos';

  function render() {
    const S = app.w.S, sp = app.w.sp;
    if (tab === 'bg') {
      const list = BGS.filter((b) => cat === 'Todos' || b.cat === cat);
      pane.className = 'card';
      pane.innerHTML = `<label class="toggle"><input type="checkbox" id="daynight" ${S.dayNight ? 'checked' : ''}> Céu segue o relógio (dia e noite)</label>
        <div class="chips">${CATS.map((c) => `<button aria-pressed="${c === cat}" data-c="${c}">${c}</button>`).join('')}</div>
        <div class="grid">${list.map((b) => `<button class="opt" aria-pressed="${S.bg === b.id}" data-b="${b.id}"><canvas width="${W}" height="${SURF}"></canvas><b>${b.name}</b><span>${b.cat}</span></button>`).join('')}</div>`;
      pane.querySelectorAll<HTMLButtonElement>('.opt').forEach((o, k) => {
        paint(o.querySelector('canvas'), (c) => drawBg(c, list[k]));
        o.onclick = () => { app.w.S.bg = o.dataset.b!; render(); app.save(); };
      });
      pane.querySelector<HTMLInputElement>('#daynight')!.onchange = (e) => { app.w.S.dayNight = (e.target as HTMLInputElement).checked; app.save(); };
      pane.querySelectorAll<HTMLButtonElement>('.chips button').forEach((b) => (b.onclick = () => { cat = b.dataset.c!; render(); }));
    } else if (tab === 'sp') {
      pane.className = 'card sp';
      pane.innerHTML = `<p class="small" style="margin:0 0 10px">Trocar de espécie começa uma fazenda nova.</p><div class="grid">${Object.entries(SPECIES).map(([k, s]) => `<button class="opt" aria-pressed="${S.sp === k}" data-s="${k}"><canvas width="12" height="6"></canvas><div><b>${s.name}</b><span>${s.sub}</span><span>Petiscos: ${s.treats.map((t) => TREATS[t].name.toLowerCase()).join(', ')}</span></div></button>`).join('')}</div>`;
      pane.querySelectorAll<HTMLButtonElement>('.opt').forEach((o) => {
        const id = o.dataset.s as SpeciesId, s = SPECIES[id];
        paint(o.querySelector('canvas'), (c) => ant(c, 6, 3, 1, s.c, s.h, 0, 'big' in s));
        o.onclick = async () => {
          if (app.w.S.sp === id) return;
          if (!(await ask(`Trocar pra ${s.name} começa uma fazenda nova. A colônia atual será perdida.`, `Trocar pra ${s.name}`))) return;
          app.newFarm(id);
        };
      });
    } else {
      pane.className = 'card sk';
      pane.innerHTML = `<h3>Operária</h3><div class="grid two">${SKW.map((s) => `<button class="opt" aria-pressed="${S.skW === s.id}" data-w="${s.id}"><canvas width="12" height="6"></canvas><b>${s.name}</b></button>`).join('')}</div>
        <h3 style="margin-top:14px">Rainha</h3><div class="grid two">${SKQ.map((s) => `<button class="opt" aria-pressed="${S.skQ === s.id}" data-q="${s.id}"><canvas width="12" height="6"></canvas><b>${s.name}</b></button>`).join('')}</div>`;
      pane.querySelectorAll<HTMLButtonElement>('[data-w]').forEach((o) => {
        const s = SKW.find((x) => x.id === o.dataset.w)!;
        paint(o.querySelector('canvas'), (c) => ant(c, 6, 3, 1, s.c ?? sp.c, s.h ?? sp.h, 0, sp.big));
        o.onclick = () => { app.w.S.skW = s.id; render(); app.save(); };
      });
      pane.querySelectorAll<HTMLButtonElement>('[data-q]').forEach((o) => {
        const s = SKQ.find((x) => x.id === o.dataset.q)!;
        paint(o.querySelector('canvas'), (c) => queen(c, 6, 3, 1, s.c ?? sp.c, s.h ?? sp.h, 0, s.crown));
        o.onclick = () => { app.w.S.skQ = s.id; render(); app.save(); };
      });
    }
  }

  tabs.forEach((b) => (b.onclick = () => { tab = b.dataset.t!; tabs.forEach((x) => x.setAttribute('aria-selected', String(x === b))); render(); }));
  return render;
}
