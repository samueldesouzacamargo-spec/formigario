export type Ctx = CanvasRenderingContext2D;
export const R = (c: Ctx, x: number, y: number, w: number, h: number, col: string) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
export const disk = (c: Ctx, cx: number, cy: number, r: number, col: string) => {
  c.fillStyle = col;
  for (let y = -r; y <= r; y++) { const w = Math.floor(Math.sqrt(r * r - y * y + r * 0.8)); c.fillRect(cx - w, cy + y, w * 2 + 1, 1); }
};
export const hex = (c: string): [number, number, number] => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
