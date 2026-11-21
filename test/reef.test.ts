import { describe, it, expect } from 'vitest';
import { createReef, freshReef, tickReef, feed, AW } from '../src/aquarium/sim';

const run = (r: ReturnType<typeof createReef>, sec: number, night = false) => { for (let t = 0; t < sec * 30; t++) tickReef(r, 1 / 30, night); };

describe('aquário marinho', () => {
  it('mesma semente gera o mesmo recife', () => {
    const a = createReef(freshReef(7)), b = createReef(freshReef(7));
    expect(a.rock).toEqual(b.rock); expect(a.corals).toEqual(b.corals); expect(a.sub).toEqual(b.sub);
  });
  it('peixes, ermitões e polvo ficam dentro do vidro', () => {
    const r = createReef(freshReef(3));
    run(r, 600); run(r, 300, true);
    for (const f of r.fish) { expect(f.x).toBeGreaterThanOrEqual(0); expect(f.x).toBeLessThan(AW); expect(f.y).toBeLessThanOrEqual(r.rock[Math.round(f.x)]); }
    for (const c of r.crabs) { expect(c.x).toBeGreaterThan(0); expect(c.x).toBeLessThan(AW); }
    expect(r.octo.y).toBeLessThanOrEqual(r.sand[Math.round(r.octo.x)] + 1);
  });
  it('ração é comida (ou some) em menos de um minuto', () => {
    const r = createReef(freshReef(5));
    feed(r); expect(r.food.length).toBe(14);
    run(r, 60);
    expect(r.food.length).toBe(0);
  });
  it('cardume cresce com a idade do recife', () => {
    const r = createReef({ v: 1, seed: 9, age: 40 * 3600, on: true });
    const before = r.fish.filter((f) => f.kind === 'donzela').length;
    run(r, 5);
    expect(r.fish.filter((f) => f.kind === 'donzela').length).toBeGreaterThanOrEqual(before);
    expect(r.fish.filter((f) => f.kind === 'donzela').length).toBe(10);
  });
});
