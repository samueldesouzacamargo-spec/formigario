import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import '@fontsource/pixelify-sans/700.css';
import '@fontsource/work-sans/400.css';
import '@fontsource/work-sans/500.css';
import '@fontsource/work-sans/600.css';
import './style.css';
import { createWorld, newFarm, tick } from './sim/index';
import { log, type Save } from './sim/world';
import { catchUp } from './sim/economy';
import { makeClock, darkness } from './sim/clock';
import { createReef, freshReef, tickReef } from './aquarium/sim';
import { createReefRenderer } from './aquarium/render';
import { geminiProvider, snapshot, applyBrain, rateLimiter, type BrainProvider } from './sim/brain/gemini';
import { createRenderer } from './render/overlay';
import { loadSave, writeSave, loadOpts, loadReef, writeReef, type Opts } from './store/save';
import { initPanel } from './ui/panel';
import { initControls } from './ui/controls';
import { initDetach, initMini } from './ui/mini';
import type { App } from './ui/app';
import { isDesktop, initDesktop } from './desktop';
import type { SpeciesId } from './data/species';

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;

const [saved, opts, savedReef] = await Promise.all([loadSave(), loadOpts(), loadReef()]);
const reef = createReef(savedReef ?? freshReef());

const app: App = {
  w: saved ? createWorld(saved) : newFarm(),
  reef, habitat: reef.S.on ? 'reef' : 'ants',
  setHabitat(h) {
    app.habitat = h; app.reef.S.on = h === 'reef';
    document.body.classList.toggle('reef', h === 'reef');
    document.querySelectorAll<HTMLButtonElement>('#habitat button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.h === h)));
    renderer.reset(); app.cool = 0;
    app.refresh(); app.save();
  },
  showPlan: false, cool: 0, brainError: '',
  save: () => { writeSave(app.w); writeReef(app.reef.S); },
  newFarm(sp?: SpeciesId) {
    const S = app.w.S;
    app.w = newFarm({ bg: S.bg, skW: S.skW, skQ: S.skQ, speed: S.speed, dayNight: S.dayNight, sp: sp ?? S.sp });
    app.refresh(); app.save();
  },
  load(S: Save) {
    app.w = createWorld(S);
    log(app.w, 'Save importado.');
    app.refresh(); app.save();
  },
  refresh() { ctl.speed(); ctl.treats(); ctl.stats(); renderPane(); },
};
if (saved) log(app.w, 'Bem-vindo de volta. A colônia estava te esperando.');

const renderer = createRenderer($<HTMLCanvasElement>('#cv'), $('#tags'));
const reefRenderer = createReefRenderer($<HTMLCanvasElement>('#cv'));
const renderPane = initPanel(app, $('#pane'), document.querySelectorAll('.tabs button'));
const ctl = initControls(app, opts, (o) => setBrain(o));
document.querySelectorAll<HTMLButtonElement>('#habitat button').forEach((b) => (b.onclick = () => app.setHabitat(b.dataset.h as App['habitat'])));
app.setHabitat(app.habitat);
initMini($<HTMLButtonElement>('#mini'), $<HTMLButtonElement>('#wout'));

/* ---------- cérebro Gemini (opcional) ---------- */
let provider: BrainProvider | null = null, lastCall = 0, inflight = false;
const allowCall = rateLimiter(30);
function setBrain(o: Opts) { provider = o.geminiKey ? geminiProvider(o.geminiKey, o.model) : null; lastCall = 0; app.brainError = ''; }
setBrain(opts);
function brainTick() {
  const w = app.w;
  if (!provider) { w.brain.event = false; return; }
  if (inflight || (document.hidden && !detached)) return; // aba oculta: nenhuma chamada
  const now = Date.now(), due = now - lastCall > 150_000 || (w.brain.event && now - lastCall > 10_000);
  if (!due || !allowCall(now)) return;
  w.brain.event = false; lastCall = now; inflight = true;
  provider.think(snapshot(w))
    .then((out) => { if (app.w !== w) return; applyBrain(w, out); app.brainError = ''; if (out.evento) log(w, out.evento); })
    .catch((e) => { app.brainError = e.message || 'erro'; w.brain.source = 'local'; console.warn('Gemini:', e); })
    .finally(() => (inflight = false));
}

/* ---------- relógio no canto do vidro ---------- */
const clockEl = $('#clock');
function tickClock() {
  const d = new Date(), w = app.w, hh = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const wx = app.habitat === 'ants' && w.rain > 0 ? (w.wx.storm ? ' · tempestade' : ' · chuva') : '';
  const txt = hh + wx;
  if (clockEl.textContent !== txt) clockEl.textContent = txt;
}
tickClock();

/* ---------- laço, foco e aba oculta ---------- */
let host: Window = window, detached = false, hiddenAt = 0, loopId = 0;
let reefNight = false; // recalculado por quadro, não por passo
const clock = makeClock((d) => { tick(app.w, d); tickReef(app.reef, d, reefNight); });

function start() {
  const id = ++loopId;
  let last = performance.now(), lastDraw = 0, ui = 0, sv = 0;
  const f = () => {
    if (id !== loopId) return;
    const now = performance.now(), dt = (now - last) / 1000;
    last = now;
    try {
      const dark = app.w.S.dayNight ? darkness() : 0;
      reefNight = dark > 0.3;
      const real = clock(dt, app.w.S.speed);
      app.w.S.focus += real; app.reef.S.age += real;
      app.cool = Math.max(0, app.cool - dt);
      if (now - lastDraw >= (detached ? 1000 / 30 : 0) - 2) { lastDraw = now; if (app.habitat === 'reef') reefRenderer.frame(app.reef, dark, now); else renderer.frame(app.w, app.showPlan, now); } // 30 fps destacado
      if ((ui += dt) > 0.5) { ui = 0; ctl.stats(); tickClock(); }
      if ((sv += dt) > 5) { sv = 0; app.save(); }
      brainTick();
    } catch (e) { console.error(e); }
    host.requestAnimationFrame(f);
  };
  host.requestAnimationFrame(f);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { app.save(); if (!detached) hiddenAt = Date.now(); }
  else if (hiddenAt) { const sec = (Date.now() - hiddenAt) / 1000; catchUp(app.w, sec); app.reef.S.age += Math.min(sec, 8 * 3600); hiddenAt = 0; app.save(); start(); }
});
window.addEventListener('pagehide', () => app.save());

initDetach($<HTMLButtonElement>('#pip'), [$('#frame'), $('#speed')], (w) => {
  detached = !!w;
  host = w ?? window;
  if (!w && document.hidden) hiddenAt = Date.now(); // janela fechou com a aba escondida: o catch-up assume
  start();
});

start();

if (isDesktop()) initDesktop(app, () => Promise.all([writeSave(app.w), writeReef(app.reef.S)])).catch((e) => console.error('desktop:', e));
else if (import.meta.env.PROD && 'serviceWorker' in navigator) navigator.serviceWorker.register('sw.js') // relativo: funciona em qualquer subpasta (ex.: GitHub Pages);
if (import.meta.env.DEV) (window as any).formigario = app; // depuração no console
