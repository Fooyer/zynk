import { Channel, invoke } from '@tauri-apps/api/core';

export interface NativeScreenInfo {
  id: number;
  name: string;
  width: number;
  height: number;
  isPrimary: boolean;
}

const CAPTURE_FPS = 15;

export async function listNativeScreens(): Promise<NativeScreenInfo[]> {
  return invoke<NativeScreenInfo[]>('list_capture_screens');
}

/**
 * Compartilhamento de tela nativo (Rust/xcap), usado no Linux no lugar de
 * `getDisplayMedia()` — no WebKitGTK a captura via portal PipeWire depende
 * de versão/distro/driver de GPU e comumente falha (tela preta ou timeout
 * do portal, ver `captureScreen` em screenCapture.ts). Aqui os frames são
 * capturados no lado Rust e chegam via IPC channel, desenhados num
 * <canvas> escondido — `canvas.captureStream()` devolve um MediaStream de
 * verdade, então o resto do app (WebRTC, senders) não precisa saber a
 * diferença.
 */
export async function captureScreenNative(screenId?: number): Promise<MediaStream> {
  const screens = await listNativeScreens();
  if (screens.length === 0) throw new Error('Nenhuma tela encontrada pra compartilhar.');
  const target =
    (screenId != null ? screens.find((s) => s.id === screenId) : undefined) ??
    screens.find((s) => s.isPrimary) ??
    screens[0];

  const canvas = document.createElement('canvas');
  canvas.width = target.width;
  canvas.height = target.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível criar o canvas de captura de tela.');

  const channel = new Channel<ArrayBuffer>();
  channel.onmessage = (buf) => {
    createImageBitmap(new Blob([buf], { type: 'image/jpeg' }))
      .then((bitmap) => {
        if (canvas.width !== bitmap.width) canvas.width = bitmap.width;
        if (canvas.height !== bitmap.height) canvas.height = bitmap.height;
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close();
      })
      .catch(() => {});
  };

  await invoke('start_screen_capture', { screenId: target.id, fps: CAPTURE_FPS, channel });

  const stream = canvas.captureStream(CAPTURE_FPS);
  const [videoTrack] = stream.getVideoTracks();
  if (videoTrack) {
    // `track.stop()` não dispara `onended` (é assim que a spec define —
    // só eventos vindos da fonte real disparam `ended`), então o
    // stopScreenShare() do useVoiceRoom, que já chama stop() nas tracks pra
    // encerrar, é o único lugar que precisamos interceptar pra também
    // avisar o lado Rust de parar a thread de captura.
    const originalStop = videoTrack.stop.bind(videoTrack);
    videoTrack.stop = () => {
      originalStop();
      invoke('stop_screen_capture').catch(() => {});
    };
  }
  return stream;
}
