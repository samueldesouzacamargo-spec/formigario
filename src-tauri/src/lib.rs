// Formigário de desktop: uma janela transparente, sem bordas e sempre por cima,
// mais um ícone na bandeja. O jogo inteiro é o mesmo da versão web (pasta src/).
use std::time::Duration;
use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, WindowEvent, Wry,
};

/// Item "Sempre por cima" da bandeja, guardado pra ficar igual ao botão da janela.
struct Topo(CheckMenuItem<Wry>);

fn janela(app: &AppHandle) -> Option<tauri::WebviewWindow> {
    app.get_webview_window("main")
}

fn mostrar(app: &AppHandle) {
    if let Some(w) = janela(app) {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

fn alternar(app: &AppHandle) {
    if let Some(w) = janela(app) {
        if w.is_visible().unwrap_or(false) {
            let _ = w.hide();
        } else {
            mostrar(app);
        }
    }
}

fn aplicar_topo(app: &AppHandle, on: bool) {
    if let Some(w) = janela(app) {
        let _ = w.set_always_on_top(on);
    }
    if let Some(t) = app.try_state::<Topo>() {
        let _ = t.0.set_checked(on);
    }
}

/// Chamado pela página (botão do alfinete e ao abrir, com a preferência salva).
#[tauri::command]
fn topo(app: AppHandle, on: bool) {
    aplicar_topo(&app, on);
}

/// A página já salvou a colônia: pode fechar.
#[tauri::command]
fn sair(app: AppHandle) {
    app.exit(0);
}

/// Pede pra página salvar e sair; se ela não responder em 3 s, sai assim mesmo.
fn pedir_saida(app: &AppHandle) {
    let _ = app.emit("formigario://sair", ());
    let h = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(Duration::from_secs(3));
        h.exit(0);
    });
}

pub fn run() {
    tauri::Builder::default()
        // uma colônia só: abrir de novo só traz a janela pra frente (dois apps brigariam pelo mesmo save)
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| mostrar(app)))
        .invoke_handler(tauri::generate_handler![topo, sair])
        .setup(|app| {
            let h = app.handle();
            let item_mostrar = MenuItem::with_id(h, "mostrar", "Mostrar / esconder", true, None::<&str>)?;
            let item_painel = MenuItem::with_id(h, "painel", "Abrir o painel", true, None::<&str>)?;
            let item_topo = CheckMenuItem::with_id(h, "topo", "Sempre por cima", true, true, None::<&str>)?;
            let item_sair = MenuItem::with_id(h, "sair", "Sair (salva a colônia)", true, None::<&str>)?;
            let sep = PredefinedMenuItem::separator(h)?;
            let menu = Menu::with_items(h, &[&item_mostrar, &item_painel, &item_topo, &sep, &item_sair])?;
            app.manage(Topo(item_topo.clone()));

            let mut tray = TrayIconBuilder::with_id("bandeja")
                .tooltip("Formigário")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, e| match e.id().as_ref() {
                    "mostrar" => alternar(app),
                    "painel" => {
                        mostrar(app);
                        let _ = app.emit("formigario://painel", ());
                    }
                    "topo" => {
                        // o menu já inverteu a marca; a janela e a página seguem
                        let on = app.try_state::<Topo>().and_then(|t| t.0.is_checked().ok()).unwrap_or(true);
                        aplicar_topo(app, on);
                        let _ = app.emit("formigario://topo", on);
                    }
                    "sair" => pedir_saida(app),
                    _ => {}
                })
                .on_tray_icon_event(|tray, e| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = e {
                        alternar(tray.app_handle());
                    }
                });
            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            tray.build(h)?;

            // a página mostra a janela depois de posicionar; se algo der errado, aparece mesmo assim
            let h2 = h.clone();
            std::thread::spawn(move || {
                std::thread::sleep(Duration::from_secs(4));
                if let Some(w) = janela(&h2) {
                    if !w.is_visible().unwrap_or(true) {
                        let _ = w.show();
                    }
                }
            });
            Ok(())
        })
        // fechar (Alt+F4) só esconde na bandeja; sair de verdade é pelo menu da bandeja
        .on_window_event(|w, e| {
            if let WindowEvent::CloseRequested { api, .. } = e {
                api.prevent_close();
                let _ = w.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("erro ao abrir o Formigário");
}
