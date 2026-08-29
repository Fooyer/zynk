use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use image::codecs::jpeg::JpegEncoder;
use image::{ExtendedColorType, ImageEncoder};
use serde::Serialize;
use tauri::ipc::{Channel, InvokeResponseBody};
use xcap::Monitor;

/// Captura de tela nativa (Rust/xcap), usada como alternativa ao
/// `getDisplayMedia()` do WebKitGTK no Linux — lá a captura via portal
/// PipeWire é dependente de versão/distro/driver de GPU e frequentemente
/// falha (tela preta ou timeout do portal). Capturando via X11/Wayland
/// diretamente no lado Rust e streamando os frames pro frontend (que monta
/// um <canvas> e usa `canvas.captureStream()` pra virar um MediaStream de
/// verdade pro WebRTC), o compartilhamento de tela não depende mais do
/// suporte a WebRTC/mídia do webview.
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ScreenInfo {
    id: u32,
    name: String,
    width: u32,
    height: u32,
    is_primary: bool,
}

#[tauri::command]
pub fn list_capture_screens() -> Result<Vec<ScreenInfo>, String> {
    let monitors = Monitor::all().map_err(|e| e.to_string())?;
    monitors
        .iter()
        .map(|m| {
            Ok(ScreenInfo {
                id: m.id().map_err(|e| e.to_string())?,
                name: m.name().map_err(|e| e.to_string())?,
                width: m.width().map_err(|e| e.to_string())?,
                height: m.height().map_err(|e| e.to_string())?,
                is_primary: m.is_primary().map_err(|e| e.to_string())?,
            })
        })
        .collect()
}

#[derive(Default)]
pub struct ScreenCaptureState(Mutex<Option<Arc<AtomicBool>>>);

fn stop_running(state: &ScreenCaptureState) {
    if let Some(running) = state.0.lock().unwrap().take() {
        running.store(false, Ordering::Relaxed);
    }
}

#[tauri::command]
pub fn start_screen_capture(
    state: tauri::State<'_, ScreenCaptureState>,
    screen_id: u32,
    fps: u32,
    channel: Channel,
) -> Result<(), String> {
    // Só uma captura ativa por vez — uma nova chamada cancela a anterior.
    stop_running(&state);

    // Confere que a tela existe já aqui (erro rápido pro frontend), mas
    // NÃO move o `Monitor` pra dentro da thread — no Windows ele guarda um
    // HMONITOR (ponteiro win32, `*mut c_void`), que não é `Send`. Em vez
    // disso só o `screen_id` (um u32, Send de sobra) atravessa a fronteira
    // da thread, e o Monitor é resolvido de novo lá dentro.
    if !Monitor::all()
        .map_err(|e| e.to_string())?
        .iter()
        .any(|m| m.id().map(|id| id == screen_id).unwrap_or(false))
    {
        return Err("Tela não encontrada".to_string());
    }

    let running = Arc::new(AtomicBool::new(true));
    *state.0.lock().unwrap() = Some(running.clone());

    let frame_delay = Duration::from_millis(1000 / u64::from(fps.clamp(1, 60)));

    eprintln!("[screen_capture] iniciando captura da tela id={screen_id} a {fps}fps");

    std::thread::spawn(move || {
        let monitor = match Monitor::all()
            .ok()
            .and_then(|ms| ms.into_iter().find(|m| m.id().map(|id| id == screen_id).unwrap_or(false)))
        {
            Some(m) => m,
            None => {
                eprintln!("[screen_capture] tela id={screen_id} sumiu antes da thread iniciar");
                return;
            }
        };

        let mut frame_count: u64 = 0;
        while running.load(Ordering::Relaxed) {
            let frame_start = Instant::now();

            match monitor.capture_image() {
                Ok(image) => {
                    // JPEG não tem canal alpha — o encoder rejeita Rgba8
                    // direto, precisa descartar o alpha antes.
                    let rgb_image = image::DynamicImage::ImageRgba8(image).into_rgb8();
                    let mut jpeg_bytes = Vec::new();
                    let encoder = JpegEncoder::new_with_quality(&mut jpeg_bytes, 55);
                    match encoder.write_image(
                        rgb_image.as_raw(),
                        rgb_image.width(),
                        rgb_image.height(),
                        ExtendedColorType::Rgb8,
                    ) {
                        Ok(()) => {
                            let len = jpeg_bytes.len();
                            match channel.send(InvokeResponseBody::Raw(jpeg_bytes)) {
                                Ok(()) => {
                                    frame_count += 1;
                                    if frame_count == 1 || frame_count % 60 == 0 {
                                        eprintln!(
                                            "[screen_capture] frame #{frame_count} enviado ({len} bytes, {}x{})",
                                            rgb_image.width(),
                                            rgb_image.height()
                                        );
                                    }
                                }
                                Err(e) => {
                                    eprintln!("[screen_capture] channel.send falhou, parando: {e}");
                                    break;
                                }
                            }
                        }
                        Err(e) => eprintln!("[screen_capture] falha ao codificar JPEG: {e}"),
                    }
                }
                Err(e) => eprintln!("[screen_capture] capture_image falhou: {e}"),
            }

            if !running.load(Ordering::Relaxed) {
                break;
            }

            let elapsed = frame_start.elapsed();
            if elapsed < frame_delay {
                std::thread::sleep(frame_delay - elapsed);
            }
        }
        eprintln!("[screen_capture] thread de captura encerrada ({frame_count} frames enviados)");
    });

    Ok(())
}

#[tauri::command]
pub fn stop_screen_capture(state: tauri::State<'_, ScreenCaptureState>) -> Result<(), String> {
    stop_running(&state);
    Ok(())
}
