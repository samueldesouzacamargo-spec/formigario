import { describe, it, expect } from 'vitest';
import { fresh } from '../src/sim/world';
import { createWorld, tick } from '../src/sim/index';
import { catchUp } from '../src/sim/economy';
import { startRain } from '../src/sim/events';
import { dropTreat } from '../src/sim/ants';
import { newMind, phaseOf, moodName } from '../src/sim/life';
import type { SpeciesId } from '../src/data/species';

const at = (h: number) => () => new Date(2026, 0, 1, h, 0);
const run = (w: ReturnType<typeof createWorld>, sec: number, each?: () => void) => { for (let k = 0; k < sec * 30; k++) { tick(w, 1 / 30); if (each && k % 15 === 0) each(); } };
function grown(seed: number, hour = 13, sp: SpeciesId = 'sauva') {
  const w = createWorld(fresh(seed, { sp }));
  w.life.clock = at(hour);
  catchUp(w, 3600);
  w.tm.ev = -1e9; w.rain = 0; // sem clima sorteado
  run(w, 5);
  return w;
}

describe('personalidade', () => {
  it('nomes e traços são os mesmos ao recarregar o save', () => {
    const a = grown(31), b = createWorld({ ...a.S, nAnts: a.ants.length });
    expect(b.ants.map((x) => x.mind.name)).toEqual(a.ants.map((x) => x.mind.name));
    expect(b.ants.map((x) => x.mind.trait)).toEqual(a.ants.map((x) => x.mind.trait));
    expect(b.queen.mind.name).toBe(a.queen.mind.name);
  });

  it('a colônia tem jeitos variados e nomes sem repetir', () => {
    const w = grown(32);
    expect(new Set(w.ants.map((a) => a.mind.trait)).size).toBeGreaterThanOrEqual(4);
    expect(new Set(w.ants.map((a) => a.mind.name)).size).toBe(w.ants.length);
  });

  it('cada espécie puxa pro seu jeito', () => {
    const count = (sp: SpeciesId, t: string) => { let n = 0; for (let k = 0; k < 400; k++) if (newMind(77, k, sp).trait === t) n++; return n; };
    expect(count('bala', 'corajosa')).toBeGreaterThan(count('sauva', 'corajosa') * 1.8);
    expect(count('pote', 'gulosa')).toBeGreaterThan(count('sauva', 'gulosa') * 1.8);
  });
});

describe('dia e noite', () => {
  it('período segue o relógio, e fundo noturno é sempre noite', () => {
    const w = grown(40);
    expect(phaseOf(w).phase).toBe('dia');
    w.life.clock = at(2); expect(phaseOf(w).phase).toBe('madrugada');
    w.life.clock = at(6); expect(phaseOf(w).phase).toBe('amanhecer');
    w.life.clock = at(13); w.S.bg = 'estrelada'; expect(phaseOf(w).phase).toBe('noite');
    w.S.bg = 'amanhecer'; w.S.dayNight = false; w.life.clock = at(2); expect(phaseOf(w).phase).toBe('dia');
  });

  it('de madrugada muito mais formigas dormem que de dia', () => {
    const nap = (hour: number) => {
      const w = grown(41, hour);
      let s = 0, n = 0;
      run(w, 240, () => { s += w.ants.filter((a) => a.mind.nap).length; n += w.ants.length; });
      return s / n;
    };
    const day = nap(13), night = nap(2);
    expect(night).toBeGreaterThan(0.08); // medido: ~0,12 a 0,2; margem pra variação aleatória
    expect(night).toBeGreaterThan(day * 1.8);
  });

  it('anoitecer escreve no diário', () => {
    const w = grown(42, 13);
    w.life.clock = at(20);
    run(w, 2);
    expect(w.S.logs.some((l) => /Anoiteceu|Noite\./.test(l[1]))).toBe(true);
  });

  it('nível 1 continua chegando num tempo razoável mesmo de madrugada', () => {
    const w = createWorld(fresh(7)); w.life.clock = at(2);
    let t = 0;
    while (w.level < 1 && t < 3600) { tick(w, 1 / 30); t += 1 / 30; }
    expect(t).toBeLessThan(35 * 60);
  });
});

describe('reações e vida social', () => {
  it('chuva assusta as medrosas', () => {
    const w = grown(50);
    startRain(w, true);
    const scared = w.ants.filter((a) => a.mind.trait === 'medrosa');
    for (const a of scared) expect(a.mind.emote).toBe('!');
  });

  it('comida caindo chama atenção e melhora o humor', () => {
    const w = grown(51);
    w.life.mood = -0.2;
    dropTreat(w, 'folha');
    run(w, 12);
    expect(w.life.lastTreatT).toBeLessThan(12);
    run(w, 20);
    expect(w.life.mood).toBeGreaterThan(-0.2);
    expect(moodName(w.life.mood)).toBeTruthy();
  });

  it('formigas se cumprimentam nos túneis', () => {
    const w = grown(52);
    let greets = 0;
    run(w, 180, () => { greets += w.ants.filter((a) => a.mind.hold > 0).length; });
    expect(greets).toBeGreaterThan(0);
  });

  it('nascimento tem nome no diário', () => {
    const w = grown(53);
    w.ants.splice(0, 3); w.S.eggs = 3; w.S.prog = 9.9; // abre vaga e deixa um ovo no ponto
    run(w, 3);
    expect(w.S.logs.some((l) => /Nasceu a .+, uma operária \S+/.test(l[1]))).toBe(true);
  });
});

describe('voz da colônia', () => {
  it('o pensamento muda com o tempo e não repete em seguida', () => {
    const w = grown(60);
    const seen: string[] = [];
    run(w, 600, () => { const t = w.brain.thought; if (seen[seen.length - 1] !== t) seen.push(t); });
    expect(new Set(seen).size).toBeGreaterThanOrEqual(5);
    for (let k = 1; k < seen.length; k++) expect(seen[k]).not.toBe(seen[k - 1]);
  });

  it('o diário ganha fofocas das formigas sem virar spam', () => {
    const w = grown(61);
    const n0 = w.S.logs.length;
    run(w, 600);
    const names = new Set([...w.ants.map((a) => a.mind.name), w.queen.mind.name]);
    const gossip = w.S.logs.slice(0, w.S.logs.length - n0 + 5).filter((l) => [...names].some((n) => l[1].startsWith(n)));
    expect(gossip.length).toBeGreaterThan(0);
    expect(gossip.length).toBeLessThan(12);
  });
});
