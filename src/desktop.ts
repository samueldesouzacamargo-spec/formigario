// Versão de desktop (Tauri): o vidro vira um pet transparente num canto da tela.
// Na web nada disto roda; a API do Tauri só é carregada dentro do app.
import type { App } from './ui/app';

export const isDesktop = () => '__TAURI_INTERNALS__' in window;

const PET = 'formigario-pet', TOPO = 'formigario-topo';
interface Bounds { x: number; y: number; w: number; h: number } // x/y físicos, w/h lógicos

const read = <T>(k: string): T | null => { try { return JSON.parse(localStorage.getItem(k) ?? 'null'); } catch { return null; } };
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem storage: só não lembra */ } };

/**
 * Liga o modo desktop. `flush` grava a colônia e espera terminar (usado antes de sair).
 * Botões #mini ("Só o vidro") e #wout ("Painel") já trocam o layout; aqui só ajustamos a janela.
 */
export async function initDesktop(app: App, flush: () => Promise<unknown>) {
  const { getCurrentWindow, LogicalSize, PhysicalPosition, availableMonitors, primaryMonitor, currentMonitor } = await import('@tauri-apps/api/window');
  const { invoke } = await import('@tauri-apps/api/core');
  const { listen } = await import('@tauri-apps/api/event');
  const win = getCurrentWindow();
  const body = document.body;
  body.classList.add('desk');
  document.querySelector('#pip')?.remove(); // "Destacar" não faz sentido: o app já é a janela destacada

  /* ---------- barra do pet: alfinete, painel, esconder ---------- */
  const glass = document.querySelector<HTMLElement>('.glass')!;
  const bar = document.createElement('div');
  bar.className = 'deskbar';
  bar.innerHTML = `<button type="button" data-a="topo" title="Sempre por cima" aria-pressed="true">Fixar</button>`
    + `<button type="button" data-a="hide" title="Esconder na bandeja (o ícone da formiga perto do relógio traz de volta)">Esconder</button>`;
  const grip = document.createElement('div');
  grip.className = 'grip'; grip.title = 'Arraste pra mudar o tamanho';
  glass.append(bar, grip);
  const pin = bar.querySelector<HTMLButtonElement>('[data-a=topo]')!;

  let topo = read<boolean>(TOPO) ?? true;
  const setTopo = (on: boolean, tellRust = true) => {
    topo = on; write(TOPO, on);
    pin.setAttribute('aria-pressed', String(on));
    pin.textContent = on ? 'Fixado' : 'Fixar';
    if (tellRust) invoke('topo', { on: on && body.classList.contains('widget') }).catch(() => {});
  };
  pin.onclick = () => setTopo(!topo);
  bar.querySelector<HTMLButtonElement>('[data-a=hide]')!.onclick = () => { flush(); win.hide(); };
  listen<boolean>('formigario://topo', (e) => setTopo(e.payload, false));

  /* ---------- arrastar e redimensionar (a janela não tem borda) ---------- */
  glass.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || !body.classList.contains('widget')) return;
    const t = e.target as HTMLElement;
    if (t.closest('button, input, a, .castes, .grip')) return;
    e.preventDefault();
    win.startDragging().catch(() => {});
  });
  grip.addEventListener('mousedown', (e) => { if (e.button === 0) { e.preventDefault(); win.startResizeDragging('SouthEast').catch(() => {}); } });

  /* ---------- barra de título própria do painel (sem a borda do Windows, que não combina com janela transparente) ---------- */
  const head = document.createElement('div');
  head.className = 'deskhead';
  head.innerHTML = `<span class="t">Formigário</span>`
    + `<button type="button" data-a="pet" title="Volta a ser o pet no canto da tela">Só o vidro</button>`
    + `<button type="button" data-a="min" title="Minimizar" aria-label="Minimizar">–</button>`
    + `<button type="button" data-a="close" title="Esconder na bandeja" aria-label="Fechar">×</button>`;
  const pgrip = document.createElement('div');
  pgrip.className = 'pgrip'; pgrip.title = 'Arraste pra mudar o tamanho';
  body.prepend(head); body.append(pgrip);
  head.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    if (e.detail === 2) win.toggleMaximize().catch(() => {}); else win.startDragging().catch(() => {});
  });
  head.querySelector<HTMLButtonElement>('[data-a=pet]')!.onclick = () => document.querySelector<HTMLButtonElement>('#mini')?.click();
  head.querySelector<HTMLButtonElement>('[data-a=min]')!.onclick = () => { flush(); win.minimize(); };
  head.querySelector<HTMLButtonElement>('[data-a=close]')!.onclick = () => { flush(); win.hide(); };
  pgrip.addEventListener('mousedown', (e) => { if (e.button === 0) { e.preventDefault(); win.startResizeDragging('SouthEast').catch(() => {}); } });

  /* ---------- lembrar onde o pet mora ---------- */
  let petMode = true, timer = 0;
  const remember = () => {
    clearTimeout(timer);
    timer = window.setTimeout(async () => {
      if (!petMode) return;
      const [pos, size, k] = await Promise.all([win.outerPosition(), win.innerSize(), win.scaleFactor()]);
      write(PET, { x: pos.x, y: pos.y, w: Math.round(size.width / k), h: Math.round(size.height / k) } satisfies Bounds);
    }, 400);
  };
  win.onMoved(remember);
  win.onResized(remember);

  // pet: a janela segue a proporção do vidro (240×150 + moldura), senão sobra um retângulo de madeira
  const FRAME = 14, RATIO = 240 / 150;
  let fitT = 0, fitting = false;
  win.onResized(() => {
    if (!petMode || fitting) return;
    clearTimeout(fitT);
    fitT = window.setTimeout(async () => {
      const [size, k] = await Promise.all([win.innerSize(), win.scaleFactor()]);
      const w = size.width / k, h = size.height / k, want = Math.round((w - FRAME) / RATIO + FRAME);
      if (Math.abs(h - want) <= 2) return;
      fitting = true;
      await win.setSize(new LogicalSize(Math.round(w), want)).catch(() => {});
      setTimeout(() => (fitting = false), 200);
    }, 180);
  });

  async function placePet() {
    const b = read<Bounds>(PET);
    const mons = await availableMonitors().catch(() => []);
    const onScreen = b && mons.some((m) => b.x + 40 >= m.position.x && b.y + 20 >= m.position.y && b.x + 40 <= m.position.x + m.size.width && b.y + 20 <= m.position.y + m.size.height);
    const w = b?.w ?? 480, h = Math.round((w - 14) / (240 / 150) + 14);
    await win.setSize(new LogicalSize(w, h));
    if (b && onScreen) return win.setPosition(new PhysicalPosition(b.x, b.y));
    // primeira vez (ou monitor sumiu): canto de baixo à direita, acima da barra de tarefas
    const m = await primaryMonitor().catch(() => null);
    if (!m) return win.center();
    const a = m.workArea, k = m.scaleFactor;
    await win.setPosition(new PhysicalPosition(a.position.x + a.size.width - Math.round((w + 24) * k), a.position.y + a.size.height - Math.round((h + 24) * k)));
  }

  /* ---------- pet ⇄ painel ---------- */
  async function toPanel() {
    petMode = false;
    await invoke('topo', { on: false }).catch(() => {});
    const m = await currentMonitor().catch(() => null);
    const k = m?.scaleFactor ?? 1, aw = m ? m.workArea.size.width / k : 1240, ah = m ? m.workArea.size.height / k : 820;
    const w = Math.min(1240, Math.round(aw * 0.92)), h = Math.min(820, Math.round(ah * 0.9));
    await win.setSize(new LogicalSize(w, h));
    // centraliza na conta (center() pode usar o tamanho antigo enquanto a janela ainda está crescendo)
    if (m) await win.setPosition(new PhysicalPosition(m.workArea.position.x + Math.round((m.workArea.size.width - w * k) / 2), m.workArea.position.y + Math.round((m.workArea.size.height - h * k) / 2)));
    else await win.center();
  }
  async function toPet() {
    await placePet();
    petMode = true;
    await invoke('topo', { on: topo }).catch(() => {});
  }
  // os botões já trocam a classe .widget (ui/mini.ts); aqui a janela acompanha
  new MutationObserver(() => {
    const pet = body.classList.contains('widget');
    if (pet !== petMode) (pet ? toPet() : toPanel()).catch(console.warn);
  }).observe(body, { attributes: true, attributeFilter: ['class'] });
  listen('formigario://painel', () => { if (body.classList.contains('widget')) document.querySelector<HTMLButtonElement>('#wout')?.click(); });

  /* ---------- salvar antes de sair ---------- */
  listen('formigario://sair', async () => {
    try { await Promise.race([flush(), new Promise((r) => setTimeout(r, 2000))]); } finally { invoke('sair').catch(() => {}); }
  });
  // esconder/minimizar também grava (o laço pode pausar com a janela fora da tela)
  win.onFocusChanged(({ payload: focused }) => { if (!focused) flush(); });

  // abre sempre como pet
  if (!body.classList.contains('widget')) document.querySelector<HTMLButtonElement>('#mini')?.click();
  await placePet();
  setTopo(topo);
  await win.show();
  app.refresh();
}
