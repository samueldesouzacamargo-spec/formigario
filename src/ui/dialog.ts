// Confirmação/aviso dentro da página. confirm()/alert() nativos são bloqueados em alguns
// navegadores embutidos e em PWAs (voltam "não" sem mostrar nada).
let dlg: HTMLDialogElement | null = null;

function show(msg: string, ok: string, cancel: string | null): Promise<boolean> {
  if (!dlg) {
    dlg = document.createElement('dialog');
    dlg.className = 'ask';
    dlg.innerHTML = '<p></p><form method="dialog" class="row"><button class="btn" value="ok"></button><button class="btn" value="cancel"></button></form>';
    document.body.append(dlg);
  }
  const d = dlg, [okB, noB] = d.querySelectorAll('button');
  d.querySelector('p')!.textContent = msg;
  okB.textContent = ok;
  noB.textContent = cancel ?? '';
  noB.hidden = cancel === null;
  d.returnValue = '';
  d.showModal();
  (cancel === null ? okB : noB).focus(); // ação destrutiva nunca é o padrão
  return new Promise((res) => d.addEventListener('close', () => res(d.returnValue === 'ok'), { once: true }));
}

export const ask = (msg: string, ok = 'Sim') => show(msg, ok, 'Cancelar');
export const tell = (msg: string) => show(msg, 'Ok', null).then(() => {});
