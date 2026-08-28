import { getCurrentWindow } from '@tauri-apps/api/window';

const appWindow = getCurrentWindow();

export function TitleBar() {
  return (
    <div className="h-9 flex-shrink-0 bg-surface-750 shadow-panel flex items-center gap-2 px-4 border-b border-white/[0.06]">
      <div data-tauri-drag-region className="flex-1 h-full flex items-center gap-2 min-w-0">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-500 shadow-glow-accent-sm animate-pulse select-none" />
        <span className="text-xs font-semibold text-surface-400 uppercase tracking-[0.2em] select-none">
          Zynk <span className="text-surface-600 normal-case tracking-normal">— MVP Tauri</span>
        </span>
      </div>
      <div className="flex items-center flex-shrink-0">
        <button
          onClick={() => appWindow.minimize()}
          className="w-9 h-9 flex items-center justify-center text-surface-400 hover:text-surface-100 hover:bg-white/[0.06] transition-colors"
          title="Minimizar"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <rect x="0" y="5.5" width="12" height="1" />
          </svg>
        </button>
        <button
          onClick={() => appWindow.toggleMaximize()}
          className="w-9 h-9 flex items-center justify-center text-surface-400 hover:text-surface-100 hover:bg-white/[0.06] transition-colors"
          title="Maximizar"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="0.5" y="0.5" width="10" height="10" />
          </svg>
        </button>
        <button
          onClick={() => appWindow.close()}
          className="w-9 h-9 flex items-center justify-center text-surface-400 hover:text-white hover:bg-danger transition-colors"
          title="Fechar"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="1" y1="1" x2="11" y2="11" />
            <line x1="11" y1="1" x2="1" y2="11" />
          </svg>
        </button>
      </div>
    </div>
  );
}
