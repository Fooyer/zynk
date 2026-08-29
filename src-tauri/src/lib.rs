mod screen_capture;

use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};
use tauri::{Manager, WindowEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(screen_capture::ScreenCaptureState::default())
        .invoke_handler(tauri::generate_handler![
            screen_capture::list_capture_screens,
            screen_capture::start_screen_capture,
            screen_capture::stop_screen_capture,
        ])
        .setup(|app| {
            let show_item = MenuItemBuilder::with_id("show", "Abrir Zynk").build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "Sair").build(app)?;
            let tray_menu = MenuBuilder::new(app)
                .item(&show_item)
                .separator()
                .item(&quit_item)
                .build()?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Zynk")
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    // Clique esquerdo (não o menu de contexto do botão direito)
                    // restaura a janela — igual ao "double-click" do Tray do
                    // Electron original.
                    if let TrayIconEvent::Click { button, .. } = event {
                        if button == tauri::tray::MouseButton::Left {
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            // WebKitGTK nega pedidos de permissão (mic/câmera) por padrão
            // quando ninguém trata o sinal "permission-request" — diferente
            // do Windows (WebView2 mostra um prompt nativo sozinho), no
            // Linux isso acontece em silêncio: sem diálogo nenhum, a call
            // simplesmente não tem acesso ao microfone.
            #[cfg(any(
                target_os = "linux",
                target_os = "dragonfly",
                target_os = "freebsd",
                target_os = "netbsd",
                target_os = "openbsd"
            ))]
            if let Some(window) = app.get_webview_window("main") {
                window.with_webview(|webview| {
                    use webkit2gtk::{glib::Cast, PermissionRequestExt, WebViewExt};

                    webview.inner().connect_permission_request(|_, request| {
                        if let Some(request) =
                            request.dynamic_cast_ref::<webkit2gtk::UserMediaPermissionRequest>()
                        {
                            request.allow();
                            true
                        } else {
                            false
                        }
                    });
                })?;
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            // Fechar (botão da TitleBar ou Alt+F4) minimiza pra bandeja em vez
            // de encerrar o processo — só o "Sair" do menu da bandeja
            // (app.exit acima) realmente fecha o Zynk.
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
