import { useEffect, useRef } from 'react';
import { getSocket } from '../services/socket';
import { notifyMessage, requestNotificationPermission } from '../services/notification';
import { useChatStore } from '../stores/chatStore';
import { useFriendStore } from '../stores/friendStore';
import { useUiStore } from '../stores/uiStore';
import { useUnreadStore } from '../stores/unreadStore';
import { usePollStore } from '../stores/pollStore';
import type { Message, Poll, TypingEvent, UserStatusEvent } from '../types';

export function useSocket() {
  const addMessage = useChatStore((s) => s.addMessage);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const removeMessage = useChatStore((s) => s.removeMessage);
  const setTyping = useChatStore((s) => s.setTyping);
  const loadDmChannels = useFriendStore((s) => s.loadDmChannels);
  const updateFriendStatus = useFriendStore((s) => s.updateFriendStatus);
  const updateFriendIdentity = useFriendStore((s) => s.updateFriendIdentity);
  const hasSetup = useRef(false);

  useEffect(() => {
    if (hasSetup.current) return;
    hasSetup.current = true;

    const socket = getSocket();

    requestNotificationPermission();

    socket.on('message:new', (message: Message) => {
      addMessage(message);
      notifyMessage(message);
    });

    socket.on('message:typing', (event: TypingEvent) => {
      setTyping(event);
    });

    socket.on('message:updated', (message: Message) => {
      updateMessage(message);
    });

    socket.on('message:deleted', (data: { channelId: number; messageId: number }) => {
      removeMessage(data.channelId, data.messageId);
    });

    // Novo DM aberto pelo outro usuário — recarrega lista de DMs
    socket.on('dm:new', () => {
      loadDmChannels();
    });

    socket.on('user:status', (event: UserStatusEvent) => {
      updateFriendStatus(event.userId, event.status);
    });

    // Alguém mudou o username (Configurações > Conta) — reflete na lista de DMs
    socket.on('user:identity-updated', (data: { userId: number; username: string }) => {
      updateFriendIdentity(data.userId, data.username);
    });

    // Enquete criada/votada por outro membro do canal
    socket.on('poll:created', (poll: Poll) => usePollStore.getState().upsertPoll(poll));
    socket.on('poll:updated', (poll: Poll) => usePollStore.getState().upsertPoll(poll));
    socket.on('poll:deleted', (data: { channelId: number; pollId: number }) => {
      usePollStore.getState().removePoll(data.channelId, data.pollId);
    });

    socket.on('error', (err: { message: string }) => {
      console.error('[Socket Error]', err.message);
    });

    socket.on('connect', () => console.log('[Socket] Conectado'));
    socket.on('disconnect', (reason: string) => console.log('[Socket] Desconectado:', reason));
    socket.on('reconnect', (attempt: number) =>
      console.log(`[Socket] Reconectado após ${attempt} tentativa(s)`),
    );

    // ── Away detection ─────────────────────────────────────────
    // Marca como "away" após 5 min sem foco na janela
    let awayTimer: ReturnType<typeof setTimeout> | null = null;

    const emitStatus = (status: 'online' | 'away') => {
      if (socket.connected) socket.emit('user:status_update', { status });
    };

    const onBlur = () => {
      awayTimer = setTimeout(() => emitStatus('away'), 5 * 60 * 1000);
    };

    const onFocus = () => {
      if (awayTimer) { clearTimeout(awayTimer); awayTimer = null; }
      emitStatus('online');

      // Recuperou o foco com a conversa certa já aberta — zera o não lida
      // dela em vez de esperar o usuário trocar de canal.
      const { view } = useUiStore.getState();
      if (view === 'home') {
        const { activeDmChannelId } = useFriendStore.getState();
        if (activeDmChannelId) useUnreadStore.getState().clear(activeDmChannelId);
      }
    };

    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);

    return () => {
      socket.off('message:new');
      socket.off('message:typing');
      socket.off('message:updated');
      socket.off('message:deleted');
      socket.off('dm:new');
      socket.off('user:status');
      socket.off('user:identity-updated');
      socket.off('poll:created');
      socket.off('poll:updated');
      socket.off('poll:deleted');
      socket.off('error');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('reconnect');
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      if (awayTimer) clearTimeout(awayTimer);
      hasSetup.current = false;
    };
  }, [
    addMessage, updateMessage, removeMessage, setTyping,
    loadDmChannels, updateFriendStatus, updateFriendIdentity,
  ]);
}
