import { isTauri } from '@tauri-apps/api/core';

/**
 * Tauri no Linux (WebKitGTK) — usado pra desviar de bugs conhecidos do
 * engine WebRTC do WebKitGTK/GStreamer que não existem no WebView2
 * (Windows) nem no WKWebView (macOS):
 *
 * - `getDisplayMedia()` depende do portal PipeWire (versão/distro/driver de
 *   GPU) e falha com frequência — ver nativeScreenCapture.ts.
 */
export function isLinuxTauri(): boolean {
  return isTauri() && navigator.userAgent.includes('Linux') && !navigator.userAgent.includes('Android');
}
