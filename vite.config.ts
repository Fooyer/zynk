import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    // 5173, não a porta padrão do Tauri (1420) — é a que o backend real
    // (zynk-backend/src/app.ts, CORS_ORIGINS) já libera, mesma porta que o
    // Electron sempre usou em dev. Trocar aqui evita mexer no CORS do
    // backend de produção só pra rodar este MVP localmente.
    port: 5173,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 5174,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    // Sem isso os AudioWorklets pequenos (agcWorklet.js etc., ver
    // audioProcessing.ts) saem do build como `data:` URI em vez de arquivo —
    // funciona hoje (sem CSP configurada), mas quebra assim que uma CSP de
    // produção for definida em tauri.conf.json (mesma razão que o
    // zynk-frontend original força isso).
    assetsInlineLimit: 0,
  },
}));
