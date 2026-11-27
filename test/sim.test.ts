import { describe, it, expect } from 'vitest';
import { W, N, SURF, fresh } from '../src/sim/world';
import { createWorld, tick } from '../src/sim/index';
import { bfs } from '../src/sim/path';
import { catchUp, evaporate, weather } from '../src/sim/economy';
import { darkness } from '../src/render/sky';
import { roleCounts, roleTargets, rebalance, roleProgress } from '../src/sim/roles';
import { sanitize, rateLimiter } from '../src/sim/brain/gemini';
import { SPECIES, type SpeciesId } from '../src/data/species';
import { LV } from '../src/data/levels';
import { exportJSON, importJSON } from '../src/store/save';

// relógio fixo ao meio-dia: o resultado não depende da hora em que o teste roda (de madrugada a colônia dorme)
const world = (seed: number, sp: SpeciesId = 'sauva') => { const w = createWorld(fresh(seed, { sp })); w.life.clock = () => new Date(2026, 0, 1, 13, 0); return w; };

describe('geração', () => {
  it('é determinística por seed', () => {
    const a = world(123), b = world(123);
    expect(a.plan).toEqual(b.plan);
    expect(a.stone).toEqual(b.stone);
    expect(a.rooms.map((r) => [r.type, r.cx, r.cy])).toEqual(b.rooms.map((r) => [r.type, r.cx, r.cy]));
  });

  it('seeds diferentes dão formigueiros visivelmente diferentes', () => {
    const ws = [1, 2, 3].map((s) => world(s));
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
      let diff = 0;
      for (let k = 0; k < N; k++) if ((ws[i].plan[k] >= 0) !== (ws[j].plan[k] >= 0)) diff++;
      expect(diff).toBeGreaterThan(500);
    }
  });

  it('todas as células do plano são alcançáveis da entrada, em cada nível', () => {
    for (const sp of Object.keys(SPECIES) as SpeciesId[]) for (let seed = 1; seed <= 40; seed++) {
      const w = world(seed * 7919, sp);
      expect(w.rooms.find((r) => r.type === 'rainha')).toBeTruthy();
      for (let L = 0; L < LV.length; L++) {
        // finge que tudo até o nível L foi cavado e roda BFS a partir da superfície
        const dug = new Uint8Array(N);
        let total = 0;
        for (let i = 0; i < N; i++) if (w.plan[i] >= 0 && w.plan[i] <= L) { dug[i] = 1; total++; }
        let seen = 0;
        bfs(dug, (SURF - 1) * W + w.ex, (c) => { if (dug[c]) seen++; return false; });
        expect(seen, `${sp} seed ${seed * 7919} nível ${L}`).toBe(total);
      }
    }
  });
});

describe('BFS', () => {
  it('acha o caminho mais curto pelas células cavadas', () => {
    const dug = new Uint8Array(N);
    const s = (SURF - 1) * W + 10;
    for (let y = SURF; y < SURF + 5; y++) dug[y * W + 10] = 1;
    const r = bfs(dug, s, (c) => c === (SURF + 4) * W + 10);
    expect(r?.path.length).toBe(6);
    expect(bfs(dug, s, (c) => c === (SURF + 6) * W + 10)).toBeNull();
  });
});

describe('simulação e economia', () => {
  it('as formigas cavam, a rainha desce e a colônia cresce', () => {
    const w = world(42);
    for (let k = 0; k < 30 * 600; k++) tick(w, 1 / 30); // 10 min simulados
    expect(w.S.dug.reduce((a, b) => a + b, 0)).toBeGreaterThan(300);
    expect(w.queen.home).toBe(true);
    expect(w.S.pros).toBeGreaterThan(100);
    expect(w.S.mound.some((m) => m > 0)).toBe(true);
  });

  it('nível 1 chega perto de 20 min a 1x', () => {
    const w = world(7);
    let t = 0;
    while (w.level < 1 && t < 3600) { tick(w, 1 / 30); t += 1 / 30; }
    expect(t).toBeGreaterThan(12 * 60);
    expect(t).toBeLessThan(30 * 60);
  });

  it('catch-up de 10 min avança a colônia e escreve no diário', () => {
    const w = world(99);
    const dug0 = w.S.dug.reduce((a, b) => a + b, 0), pros0 = w.S.pros;
    catchUp(w, 600);
    expect(w.S.dug.reduce((a, b) => a + b, 0)).toBeGreaterThan(dug0);
    expect(w.S.pros).toBeGreaterThan(pros0);
    expect(w.S.focus).toBe(600);
    expect(w.S.logs[0][1]).toMatch(/Enquanto você trabalhava \(10min 00s\)/);
  });

  it('catch-up tem teto de 8 h', () => {
    const w = world(5);
    catchUp(w, 24 * 3600);
    expect(w.S.focus).toBe(8 * 3600);
  });
});

describe('cérebro Gemini', () => {
  it('limita pesos e texto', () => {
    const o = sanitize({ prioridades: { cavar: 99, forragear: -4, cuidar_crias: 'x' }, foco_escavacao: 'rm -rf', pensamento: 'a'.repeat(500) });
    expect(o.w.dig).toBe(3);
    expect(o.w.forage).toBe(0);
    expect(o.w.nurse).toBe(0.5);
    expect(o.foco).toBe('proxima_camara');
    expect(o.thought.length).toBe(140);
    expect(sanitize(null).thought).toBeTruthy();
  });
  it('rate limit de 30/h', () => {
    const ok = rateLimiter(30);
    for (let i = 0; i < 30; i++) expect(ok(i)).toBe(true);
    expect(ok(31)).toBe(false);
    expect(ok(3600_000 + 1)).toBe(true);
  });
});

describe('save', () => {
  it('exporta e importa JSON sem perder nada', () => {
    const w = world(11);
    for (let k = 0; k < 30 * 120; k++) tick(w, 1 / 30);
    const back = importJSON(exportJSON(w));
    expect(back.dug).toEqual(w.S.dug);
    expect(back.seed).toBe(w.S.seed);
    expect(back.nAnts).toBe(w.ants.length);
  });
  it('recusa lixo', () => {
    expect(() => importJSON('{"v":1}')).toThrow();
    expect(() => importJSON('nao é json')).toThrow();
  });
});

describe('polimento', () => {
  it('feromônio evapora até zerar', () => {
    const ph = new Float32Array(4); ph[1] = 10;
    evaporate(ph);
    expect(ph[1]).toBeCloseTo(9.7);
    for (let k = 0; k < 200; k++) evaporate(ph);
    expect(ph[1]).toBe(0);
  });

  it('forrageiras deixam trilha da comida até a câmara', () => {
    const w = world(42);
    catchUp(w, 1800); // abre as primeiras câmaras
    w.tm.ev = -1e9; // sem chuva sorteada no meio do teste
    for (let k = 0; k < 30 * 300; k++) tick(w, 1 / 30);
    expect(w.ph.some((p) => p > 1)).toBe(true);
  });

  it('chuva começa, segura as forrageiras e passa', () => {
    const w = world(3);
    w.rain = 2;
    weather(w, 1);
    expect(w.rain).toBe(1);
    weather(w, 1.5);
    expect(w.rain).toBe(0);
    expect(w.S.logs.some((l) => /chuva passou/.test(l[1]))).toBe(true);
  });

  it('eventos aleatórios acontecem de vez em quando', () => {
    const w = world(8);
    for (let k = 0; k < 200; k++) { w.rain = 0; w.treats.length = 0; weather(w, 91); }
    const txt = w.S.logs.map((l) => l[1]).join('|');
    expect(txt).toMatch(/chover|Tempestade/);
    expect(txt).toMatch(/caiu|derrubou|pousou/);
  });

  it('dia/noite: claro à tarde, escuro de madrugada', () => {
    const at = (h: number) => darkness(new Date(2026, 0, 1, h, 0));
    expect(at(13)).toBe(0);
    expect(at(1)).toBeGreaterThan(0.5);
    expect(at(19)).toBeGreaterThan(at(13));
  });
});

describe('funções das operárias', () => {
  const grown = () => { const w = world(21); catchUp(w, 3600); w.tm.ev = -1e9; return w; }; // sem chuva sorteada

  it('toda operária tem uma função e a soma bate', () => {
    const w = grown();
    const c = roleCounts(w);
    expect(Object.values(c).reduce((a, b) => a + b, 0)).toBe(w.ants.length);
    expect(Object.values(roleTargets(w)).reduce((a, b) => a + b, 0)).toBe(w.ants.length);
  });

  it('a troca de função é gradual (no máximo ~10% por rodada)', () => {
    const w = grown();
    const n = w.ants.length;
    for (const a of w.ants) a.role = 'dig';
    Object.assign(w.brain.w, { dig: 0.1, forage: 3, nurse: 0.1, garden: 0.1, haul: 0.1 });
    rebalance(w);
    const moved = w.ants.filter((a) => a.role !== 'dig').length;
    expect(moved).toBeGreaterThan(0);
    expect(moved).toBeLessThanOrEqual(Math.max(1, Math.round(n / 10)));
    for (let k = 0; k < 20; k++) rebalance(w);
    const c = roleCounts(w), t = roleTargets(w);
    expect(c.forage).toBe(t.forage);
  });

  it('cada função segue no próprio serviço, sem todo mundo virar a mesma coisa', () => {
    const w = grown();
    for (let k = 0; k < 30 * 120; k++) tick(w, 1 / 30);
    const busy = new Set(w.ants.map((a) => a.task).filter((t) => t !== 'idle'));
    expect(busy.size).toBeGreaterThanOrEqual(2);
    const p = roleProgress(w);
    for (const v of Object.values(p)) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(100); }
  });
});
