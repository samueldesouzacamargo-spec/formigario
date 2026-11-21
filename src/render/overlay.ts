// Etiquetas das câmaras sobre o vidro + compositor do quadro.
import { W, H, SURF, active, type World } from '../sim/world';
import { ROOMS } from '../data/rooms';
import { BGS } from '../data/backgrounds';
import { drawBg } from './backgrounds';
import { drawTerrain } from './terrain';
import { drawLife } from './sprites';
import { drawSkyBack, drawSkyFront, type Rain } from './sky';
import { drawCritters } from './critters';

export function createRenderer(cv: HTMLCanvasElement, tags: HTMLElement) {
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const sky = document.createElement('canvas'); sky.width = W; sky.height = SURF;
  const hills = document.createElement('canvas'); hills.width = W; hills.height = SURF; // só com sol/lua pelo relógio
  const ter = document.createElement('canvas'); ter.width = W; ter.height = H;
  const tctx = ter.getContext('2d')!, img = tctx.createImageData(W, H);
  let bgId = '', tagKey = '', bg = BGS[0];
  return {
    /** esquece as etiquetas (ao voltar de outro vidro) */
    reset() { tagKey = '-'; tags.innerHTML = ''; },
    frame(w: World, showPlan: boolean, now: number) {
      const b = BGS.find((x) => x.id === w.S.bg) || BGS[0], clock = w.S.dayNight && b.cel[0] === 'sun';
      if (w.S.bg + clock !== bgId) {
        bgId = w.S.bg + clock; bg = b;
        const c = sky.getContext('2d')!, h = hills.getContext('2d')!;
        c.clearRect(0, 0, W, SURF); h.clearRect(0, 0, W, SURF);
        drawBg(c, bg, clock ? 'back' : 'all'); if (clock) drawBg(h, bg, 'front');
        w.dirty = true;
      }
      const rain: Rain = w.rain > 0 ? (w.wx.storm ? 2 : 1) : 0, date = new Date();
      if (w.dirty) { drawTerrain(img, w, showPlan); tctx.putImageData(img, 0, 0); }
      ctx.drawImage(sky, 0, 0);
      drawSkyBack(ctx, clock, rain, now, date);
      if (clock) ctx.drawImage(hills, 0, 0);
      ctx.drawImage(ter, 0, 0);
      drawLife(ctx, w, now);
      drawSkyFront(ctx, bg, w.S.dayNight, rain, now, date);
      drawCritters(ctx, bg, w.S.mound, w.S.dayNight, w.rain > 0, now);
      // etiquetas só mudam quando uma câmara abre ou a planta liga
      const open = w.rooms.filter((r) => showPlan || (r.ph <= w.level && active(r)));
      const key = showPlan + open.map((r) => r.cx).join();
      if (key !== tagKey) {
        tagKey = key;
        tags.innerHTML = open.map((r) => `<span class="tag${active(r) && r.ph <= w.level ? '' : ' plan'}" style="left:${(r.cx / W) * 100}%;top:${((r.cy - r.ry - 1) / H) * 100}%">${ROOMS[r.type][0]}</span>`).join('');
      }
    },
  };
}
