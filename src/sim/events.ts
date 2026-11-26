// Coisas que acontecem sozinhas: chuva fraca/tempestade (tampar a entrada ou alagar),
// folhas e galhos caindo, minhoca atravessando a terra.
import { W, H, SURF, log, type World } from './world';
import { takeCover, dropTreat } from './ants';
import { react } from './life';

const wake = (w: World) => { w.brain.t = 0; w.brain.lock = 0; w.brain.event = true; };

export function startRain(w: World, storm: boolean) {
  w.rain = storm ? 90 + Math.random() * 120 : 50 + Math.random() * 90;
  w.wx.storm = storm; w.wx.plugged = false; w.wx.flooded = false;
  log(w, storm ? 'Tempestade chegando! As construtoras correm pra tampar a entrada com terra.' : 'Começou a chover fraquinho. Todo mundo pra dentro do formigueiro.');
  takeCover(w); wake(w);
  react(w, storm ? 'tempestade' : 'chuva');
}

export function startWorm(w: World) {
  const dir = Math.random() < 0.5 ? 1 : -1;
  const y = SURF + 14 + ((Math.random() * (H - SURF - 34)) | 0);
  w.worm = { x: dir > 0 ? -10 : W + 10, y, y0: y, dir, ph: Math.random() * 6, mt: 0, body: [] };
  log(w, 'Uma minhoca está atravessando a terra.');
}

function stepStorm(w: World, d: number) {
  const x = w.wx, open = w.S.dug[SURF * W + w.ex] === 1;
  if (w.rain > 0 && x.storm) {
    if (x.plug >= 1 && !x.plugged) { x.plugged = true; log(w, 'Entrada tampada. A água parou de entrar.'); react(w, 'tampou'); }
    if (open && x.plug < 1) x.flood = Math.min(1, x.flood + d * 0.007 * (1 - x.plug));
    else x.flood = Math.max(0, x.flood - d * 0.01); // tampado: a terra vai bebendo a água
    if (x.flood > 0.5 && !x.flooded) {
      x.flooded = true;
      log(w, 'Entrou água antes de tamparem! Umas galerias alagaram e estragou um pouco de comida.');
      react(w, 'alagou');
      for (const r of w.rooms) if (r.type !== 'lixo' && r.items.length) r.items.splice(0, Math.min(2, r.items.length));
    }
  } else {
    x.flood = Math.max(0, x.flood - d * 0.01);
    if (!w.rain && x.plug > 0 && (x.plug = Math.max(0, x.plug - d * 0.04)) === 0) log(w, 'Reabriram a entrada.');
  }
  // vento da tempestade derruba galho de vez em quando
  if (w.rain > 0 && x.storm && Math.random() < d / 60 && w.falls.length + w.treats.length < 3) { dropTreat(w, 'folha', true); log(w, 'O vento derrubou um galho com folhas.'); }
}

function stepFalls(w: World, d: number) {
  for (let k = w.falls.length - 1; k >= 0; k--) {
    const f = w.falls[k], ground = SURF - 1 - w.S.mound[f.x];
    f.y += f.vy * d;
    if (f.y < ground) continue;
    w.falls.splice(k, 1);
    w.treats.push({ type: f.type, x: f.x, n: f.n, twig: f.twig || undefined });
    wake(w);
    react(w, 'petisco', f.x);
  }
}

function stepWorm(w: World, d: number) {
  const m = w.worm;
  if (m) {
    m.mt += d * 2.5;
    while (m.mt >= 1) {
      m.mt--; m.x += m.dir;
      m.y = Math.max(SURF + 5, Math.min(H - 4, Math.round(m.y0 + Math.sin(m.ph + m.x * 0.06) * 5))); // ondula devagar
      if (m.x < 0 || m.x >= W) continue;
      const i = m.y * W + m.x;
      if (w.stone[i]) m.y += m.y > SURF + 20 ? -2 : 2; // contorna pedra
      const c = m.y * W + m.x;
      m.body.unshift(c); if (m.body.length > 9) m.body.pop();
      if (!w.S.dug[c] && !w.stone[c]) w.holes.set(c, 15 + Math.random() * 20);
    }
    if (m.x < -12 || m.x > W + 12) { w.worm = null; log(w, 'A minhoca foi embora. A terra vai se acomodando no rastro dela.'); }
    return;
  }
  // sem minhoca: o rastro vai fechando aos poucos
  for (const [c, t] of w.holes) { const n = t - d; if (n <= 0) w.holes.delete(c); else w.holes.set(c, n); }
}

export function nature(w: World, d: number) {
  stepStorm(w, d);
  stepFalls(w, d);
  stepWorm(w, d);
}
