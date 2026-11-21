// Gera o PLANO do formigueiro a partir da seed. As formigas é que cavam, célula por célula.
import { W, H, SURF, N, rng, type World, type Room } from './world';

export function genPlan(w: World) {
  const S = w.S, r = rng(S.seed), { plan, roomId, stone } = w;
  plan.fill(-1); roomId.fill(-1); stone.fill(0);
  const rooms: Room[] = (w.rooms = []);
  const ex = (w.ex = 40 + ((r() * (W - 80)) | 0));
  const nodes: [number, number, number][] = []; // x, y, fase

  const carve = (x: number, y: number, wd: number, ph: number, rid = -1) => {
    for (let dy = -wd; dy <= wd; dy++) for (let dx = -wd; dx <= wd; dx++) {
      const X = x + dx, Y = y + dy;
      if (X < 2 || X > W - 3 || Y < SURF || Y > H - 3) continue;
      const i = Y * W + X;
      if (plan[i] < 0 || plan[i] > ph) plan[i] = ph;
      if (rid >= 0) roomId[i] = rid;
    }
  };
  // caminhada com ângulo + ruído; pincel 3×3 garante conectividade 4-vizinhos
  const tunnel = (x0: number, y0: number, x1: number, y1: number, ph: number) => {
    let x = x0, y = y0, a = Math.atan2(y1 - y0, x1 - x0), k = 0;
    while (Math.hypot(x1 - x, y1 - y) > 1.5 && k++ < 900) {
      const t = Math.atan2(y1 - y, x1 - x);
      a += (((t - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * 0.25 + (r() - 0.5) * 0.7;
      x += Math.cos(a); y = Math.max(SURF, y + Math.sin(a));
      carve(Math.round(x), Math.round(y), 1, ph);
    }
    carve(x1, y1, 1, ph);
  };

  carve(ex, SURF, 1, 0);
  const depth = SURF + 16 + ((r() * 10) | 0);
  const sx = ex + ((r() * 24 - 12) | 0);
  tunnel(ex, SURF, sx, depth, 0);
  nodes.push([sx, depth, 0]);

  w.sp.rooms.forEach((type, k) => {
    const ph = k < 2 ? 0 : k - 1;
    let best: Room | null = null;
    for (let t = 0; t < 80 && !best; t++) {
      const rx = 7 + ((r() * 6) | 0), ry = 4 + ((r() * 2) | 0), cx = rx + 5 + ((r() * (W - 2 * rx - 10)) | 0);
      const cy = type === 'rainha' ? H - 12 - ry - ((r() * 10) | 0) : SURF + 12 + ry + ((r() * (H - SURF - 30 - ry)) | 0);
      if (rooms.every((o) => Math.abs(o.cx - cx) > o.rx + rx + 6 || Math.abs(o.cy - cy) > o.ry + ry + 5))
        best = { type, cx, cy, rx, ry, ph, cells: [], items: [], fung: 0, dugN: 0 };
    }
    if (!best) return;
    const id = rooms.length, rm = best;
    rooms.push(rm);
    let nd = nodes[0], bd = 1e9;
    for (const n of nodes) { const d = Math.hypot(n[0] - rm.cx, (n[1] - rm.cy) * 1.6); if (d < bd) { bd = d; nd = n; } }
    tunnel(nd[0], nd[1], rm.cx, rm.cy, ph);
    for (let y = -rm.ry; y <= rm.ry; y++) for (let x = -rm.rx; x <= rm.rx; x++)
      if ((x / rm.rx) ** 2 + (y / rm.ry) ** 2 <= 1) carve(rm.cx + x, rm.cy + y, 0, ph, id);
    nodes.push([rm.cx, rm.cy, ph]);
  });

  for (let i = 0; i < N; i++) if (roomId[i] >= 0) rooms[roomId[i]].cells.push(i);
  for (const rm of rooms) rm.cells.sort((a, b) => ((b / W) | 0) - ((a / W) | 0) || Math.abs((a % W) - rm.cx) - Math.abs((b % W) - rm.cx));

  // galerias sem saída; fase ≥ a do nó de onde saem, senão ficariam isoladas
  for (let k = 0; k < 3; k++) {
    const n = nodes[(r() * nodes.length) | 0];
    const tx = Math.min(W - 5, Math.max(4, n[0] + ((r() * 60 - 30) | 0)));
    const ty = Math.min(H - 5, Math.max(SURF + 2, n[1] + ((r() * 20 - 6) | 0)));
    tunnel(n[0], n[1], tx, ty, Math.max(n[2], 2 + k));
  }
  // pedras inquebráveis, só fora do plano
  for (let k = 0; k < 16; k++) {
    const cx = (r() * W) | 0, cy = SURF + 6 + ((r() * (H - SURF - 8)) | 0), rr = 1 + r() * 3;
    for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) {
      const X = cx + x, Y = cy + y;
      if (X < 0 || X >= W || Y < SURF || Y >= H) continue;
      const i = Y * W + X;
      if (x * x + y * y * 1.6 <= rr * rr && plan[i] < 0) stone[i] = 1;
    }
  }
}
