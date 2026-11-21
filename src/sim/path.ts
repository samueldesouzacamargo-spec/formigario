import { W, N, SURF } from './world';

// buffers compartilhados: BFS roda muitas vezes por segundo, sem alocar
const prev = new Int32Array(N), Q = new Int32Array(N), stamp = new Int32Array(N);
let sid = 0;

/** caminhável = célula cavada ou a linha logo acima da superfície */
export const walkable = (dug: Uint8Array, i: number) => dug[i] === 1 || ((i / W) | 0) === SURF - 1;

/**
 * BFS 4-vizinhos a partir de s; goal devolve algo !== false quando a célula serve.
 * roof = está chovendo: quem já está lá dentro não sai pela superfície.
 */
export function bfs<T>(dug: Uint8Array, s: number, goal: (c: number) => T | false, roof = false): { path: number[]; g: T } | null {
  sid++;
  const top = roof && s >= SURF * W ? SURF * W : 0;
  let h = 0, t = 0;
  Q[t++] = s; stamp[s] = sid; prev[s] = -1;
  while (h < t) {
    const c = Q[h++], g = goal(c);
    if (g !== false) {
      const p: number[] = [];
      for (let q = c; q !== -1; q = prev[q]) p.push(q);
      return { path: p.reverse(), g };
    }
    const x = c % W;
    for (const n of [c + W, c - W, x > 0 ? c - 1 : -1, x < W - 1 ? c + 1 : -1]) {
      if (n < top || n >= N || stamp[n] === sid || !walkable(dug, n)) continue;
      stamp[n] = sid; prev[n] = c; Q[t++] = n;
    }
  }
  return null;
}

export const toCell = (target: number) => (c: number) => c === target;
