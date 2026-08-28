import type { RefObject } from 'react';
import { useContextMenuStore } from '../stores/contextMenuStore';
import { ContextMenuItem, ContextMenuSeparator } from '../components/common/ContextMenuItem';

/**
 * Substitui o menu nativo do WebView (Desfazer/Recortar/Copiar/Colar...) por
 * um com a mesma cara dos outros menus de contexto do app. Sem window.electronAPI
 * (ex.: build Tauri, que não expõe essa ponte) não faz preventDefault — o
 * WebView2 mostra o menu de contexto nativo dele normalmente.
 */
export function useEditableContextMenu(ref: RefObject<HTMLInputElement | HTMLTextAreaElement | null>) {
  return (e: React.MouseEvent) => {
    if (!window.electronAPI) return;
    e.preventDefault();
    const el = ref.current;
    if (!el) return;

    const hasSelection = el.selectionStart !== el.selectionEnd;
    const hasValue = el.value.length > 0;
    const canUndo = document.queryCommandEnabled('undo');
    const canRedo = document.queryCommandEnabled('redo');

    const run = (action: () => void) => {
      useContextMenuStore.getState().close();
      el.focus();
      action();
    };

    useContextMenuStore.getState().open({ x: e.clientX, y: e.clientY }, (
      <>
        <ContextMenuItem
          label="Desfazer"
          disabled={!canUndo}
          onClick={() => run(() => window.electronAPI?.editUndo())}
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          }
        />
        <ContextMenuItem
          label="Refazer"
          disabled={!canRedo}
          onClick={() => run(() => window.electronAPI?.editRedo())}
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          }
        />
        <ContextMenuSeparator />
        <ContextMenuItem
          label="Recortar"
          disabled={!hasSelection}
          onClick={() => run(() => window.electronAPI?.editCut())}
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
              <line x1="20" y1="4" x2="8.12" y2="15.88" />
              <line x1="14.47" y1="14.48" x2="20" y2="20" />
              <line x1="8.12" y1="8.12" x2="12" y2="12" />
            </svg>
          }
        />
        <ContextMenuItem
          label="Copiar"
          disabled={!hasSelection}
          onClick={() => run(() => window.electronAPI?.editCopy())}
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          }
        />
        <ContextMenuItem
          label="Colar"
          onClick={() => run(() => window.electronAPI?.editPaste())}
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            </svg>
          }
        />
        <ContextMenuSeparator />
        <ContextMenuItem
          label="Selecionar tudo"
          disabled={!hasValue}
          onClick={() => run(() => window.electronAPI?.editSelectAll())}
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 3" />
            </svg>
          }
        />
      </>
    ));
  };
}
