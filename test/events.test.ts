import { describe, it, expect } from 'vitest';
import { W, SURF, fresh } from '../src/sim/world';
import { createWorld, tick } from '../src/sim/index';
import { startRain, startWorm } from '../src/sim/events';
import { dropTreat } from '../src/sim/ants';
import { skyArc } from '../src/sim/clock';

const grown = (seed: number) => { const w = createWorld(fresh(seed)); for (let k = 0; k < 30 * 600; k++) tick(w, 1 / 30); w.rain = 0; w.tm.ev = -1e9; return w; }; // sem clima sorteado
const run = (w: ReturnType<typeof grown>, sec: number) => { for (let k = 0; k < sec * 30; k++) tick(w, 1 / 30); };

describe('eventos do formigário', () => {
  it('chuva fraca: todo mundo se esconde lá dentro', () => {
    const w = grown(11);
    startRain(w, false); w.rain = 1e4;
    run(w, 40);
    expect(w.ants.filter((a) => ((a.i / W) | 0) < SURF).length).toBe(0);
    expect(w.wx.plug).toBe(0);
  });

  it('tempestade: construtoras tampam a entrada e a água não sobe', () => {
    const w = grown(12);
    startRain(w, true); w.rain = 1e4;
    run(w, 120);
    expect(w.wx.plug).toBe(1);
    expect(w.wx.flood).toBeLessThan(0.5);
    expect(w.S.logs.some((l) => /tampada/.test(l[1]))).toBe(true);
    w.rain = 0.01; run(w, 60); // passou: reabrem
    expect(w.wx.plug).toBe(0);
  });

  it('galho cai do céu e vira comida no chão', () => {
    const w = grown(13);
    w.treats.length = 0; w.falls.length = 0;
    dropTreat(w, 'folha', true);
    expect(w.falls.length).toBe(1);
    run(w, 5);
    expect(w.falls.length).toBe(0);
    expect(w.treats.some((t) => t.twig && t.n > 0) || w.ants.some((a) => a.carry === 'folha')).toBe(true);
  });

  it('minhoca atravessa, deixa rastro e o rastro fecha depois', () => {
    const w = grown(14);
    startWorm(w);
    run(w, 60);
    expect(w.holes.size).toBeGreaterThan(20);
    run(w, 80);
    expect(w.worm).toBeNull();
    run(w, 40);
    expect(w.holes.size).toBe(0);
  });

  it('sol de dia, lua de noite', () => {
    const at = (h: number) => skyArc(new Date(2026, 0, 1, h, 0));
    expect(at(12).sun).not.toBeNull(); expect(at(12).moon).toBeNull();
    expect(at(0).sun).toBeNull(); expect(at(0).moon).not.toBeNull();
  });
});
