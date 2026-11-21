import { tell } from './dialog';

// "Destacar": move o vidro pra uma janela sempre por cima (Document Picture-in-Picture).
// Sem a API (Firefox/Safari): popup pequeno.

declare global {
  interface Window { documentPictureInPicture?: { requestWindow(o: { width: number; height: number }): Promise<Window>; window: Window | null } }
}

/** copia os estilos da página pra janela nova (folhas cross-origin, como Google Fonts, viram <link>) */
function copyStyles(to: Document) {
  for (const ss of Array.from(document.styleSheets)) {
    try {
      const s = to.createElement('style');
      s.textContent = Array.from(ss.cssRules).map((r) => r.cssText).join('\n');
      to.head.append(s);
    } catch {
      if (!ss.href) continue;
      const l = to.createElement('link'); l.rel = 'stylesheet'; l.href = ss.href; to.head.append(l);
    }
  }
}

export function initDetach(btn: HTMLButtonElement, parts: HTMLElement[], onChange: (host: Window | null) => void) {
  let win: Window | null = null;
  const homes = parts.map((p) => { const mark = document.createComment('home'); p.before(mark); return mark; });

  function restore() {
    if (!win) return;
    parts.forEach((p, k) => homes[k].after(p));
    win = null;
    btn.textContent = 'Destacar';
    onChange(null);
  }

  async function open() {
    const W = 380, H = 300;
    let w: Window | null = null;
    if (window.documentPictureInPicture) w = await window.documentPictureInPicture.requestWindow({ width: W, height: H });
    else w = window.open('', 'formigario-mini', `popup,width=${W},height=${H}`);
    if (!w) return tell('O navegador bloqueou a janela. Libere popups pra este site ou use o Modo mini.');
    w.document.title = 'Formigário';
    copyStyles(w.document);
    w.document.documentElement.style.colorScheme = 'dark';
    w.document.body.className = 'pip';
    const frame = parts[0];
    w.document.body.append(frame);
    parts.slice(1).forEach((p) => frame.append(p));
    w.addEventListener('pagehide', restore, { once: true });
    win = w;
    btn.textContent = 'Recolher';
    onChange(w);
  }

  btn.onclick = () => (win ? win.close() : open().catch((e) => tell(`Não deu pra destacar: ${e.message}`)));
  window.addEventListener('pagehide', () => win?.close());
}

/** "Só o vidro": esconde o painel e o vidro ocupa a janela toda. Fica na URL (?widget), que é como o app instalado abre. */
export function initMini(btn: HTMLButtonElement, out: HTMLButtonElement) {
  const set = (on: boolean) => {
    document.body.classList.toggle('widget', on);
    const u = new URL(location.href);
    if (on) u.searchParams.set('widget', ''); else u.searchParams.delete('widget');
    history.replaceState(null, '', u);
    (on ? out : btn).focus({ preventScroll: true });
  };
  btn.onclick = () => set(true);
  out.onclick = () => set(false);
  if (new URLSearchParams(location.search).has('widget')) set(true);
  // app instalado: na primeira vez a janela já abre pequena, do tamanho de um pet
  if (matchMedia('(display-mode: standalone)').matches && !localStorage.getItem('formigario-janela')) {
    try { resizeTo(480, 330); localStorage.setItem('formigario-janela', '1'); } catch { /* navegador não deixou; tudo bem */ }
  }
}
