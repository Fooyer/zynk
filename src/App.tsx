import { useEffect, useState } from 'react';
import { useAuthStore } from './stores/authStore';
import { useFriendStore } from './stores/friendStore';
import { useGroupStore } from './stores/groupStore';
import { useUiStore } from './stores/uiStore';
import { useThemeStore } from './stores/themeStore';
import { generateAccentRamp, getReadableTextColor, mixHex, rgbTriple } from './utils/color';
import { PRESET_RAMPS } from './utils/accentPresets';
import { useCallStore } from './stores/callStore';
import { useEventStore } from './stores/eventStore';
import { useSocket } from './hooks/useSocket';
import { useVoiceRoom } from './hooks/useVoiceRoom';
import { ActiveCallOverlay } from './components/call/ActiveCallOverlay';
import { CallManager } from './components/call/CallManager';
import { ShortcutManager } from './components/call/ShortcutManager';
import { TitleBar } from './components/layout/TitleBar';
import { NavBar } from './components/layout/NavBar';
import { HomeLayout } from './components/home/HomeLayout';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { SettingsPage } from './components/settings/SettingsPage';
import { GroupLayout } from './components/groups/GroupLayout';
import { WatchTogetherFloatingPlayer } from './components/groups/WatchTogetherFloatingPlayer';
import { EventsHub } from './components/events/EventsHub';
import { EventInviteModal } from './components/events/EventInviteModal';
import { EventCountdownOverlay } from './components/events/EventCountdownOverlay';
import { DialogHost } from './components/common/DialogHost';
import { ContextMenuHost } from './components/common/ContextMenuHost';
import { AppShellSkeleton } from './components/common/Skeleton';

function AppLayout() {
  const view = useUiStore((s) => s.view);
  const loadFriends = useFriendStore((s) => s.loadAll);
  const loadDmChannels = useFriendStore((s) => s.loadDmChannels);
  const loadGroups = useGroupStore((s) => s.loadGroups);
  const groups = useGroupStore((s) => s.groups);
  const activeGroupId = useGroupStore((s) => s.activeGroupId);
  const callStatus = useCallStore((s) => s.status);
  const activeDmChannelId = useFriendStore((s) => s.activeDmChannelId);
  const callChannelId = useCallStore((s) => s.channelId);

  useSocket();

  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? null;
  const voice = useVoiceRoom(activeGroupId ?? 0, activeGroup?.channelId ?? null);

  const loadEvents = useEventStore((s) => s.loadEvents);

  useEffect(() => {
    loadFriends();
    loadDmChannels();
    loadGroups();
    loadEvents();
  }, [loadFriends, loadDmChannels, loadGroups, loadEvents]);

  const showFloatingCall =
    callStatus !== 'idle' && !(view === 'home' && activeDmChannelId === callChannelId);

  return (
    <div className="window-shell h-screen flex flex-col overflow-hidden bg-surface-950">
      <TitleBar />
      <div className="flex-1 flex gap-2 p-2 overflow-hidden">
        <NavBar />
        {view === 'settings' ? <SettingsPage />
          : view === 'group' ? <GroupLayout voice={voice} />
          : view === 'events' ? <EventsHub />
          : <HomeLayout voice={voice} />}
      </div>
      <CallManager />
      <ShortcutManager voice={voice} />
      <WatchTogetherFloatingPlayer voice={voice} />
      {showFloatingCall && <ActiveCallOverlay />}
      <EventCountdownOverlay voice={voice} />
      <EventInviteModal />
      <DialogHost />
      <ContextMenuHost />
    </div>
  );
}

function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  return (
    <div className="window-shell h-screen flex flex-col bg-surface-950">
      <TitleBar />
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[560px] h-[560px] rounded-full bg-accent-500/[0.07] blur-[120px]" />
        {isLogin ? (
          <LoginForm onSwitch={() => setIsLogin(false)} />
        ) : (
          <RegisterForm onSwitch={() => setIsLogin(true)} />
        )}
      </div>
    </div>
  );
}

export default function App() {
  const { token, isLoading, loadUser } = useAuthStore();
  const mode = useThemeStore((s) => s.mode);
  const accentMode = useThemeStore((s) => s.accentMode);
  const accentPreset = useThemeStore((s) => s.accentPreset);
  const customColor = useThemeStore((s) => s.customColor);
  const gradientFrom = useThemeStore((s) => s.gradientFrom);
  const gradientTo = useThemeStore((s) => s.gradientTo);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  useEffect(() => {
    const root = document.documentElement;
    const ramp =
      accentMode === 'preset'
        ? PRESET_RAMPS[accentPreset]
        : accentMode === 'custom'
          ? generateAccentRamp(customColor)
          : generateAccentRamp(mixHex(gradientFrom, gradientTo, 0.5));

    (Object.keys(ramp) as (keyof typeof ramp)[]).forEach((step) => {
      root.style.setProperty(`--color-accent-${step}`, rgbTriple(ramp[step]));
    });

    const textColor = accentMode === 'preset' ? ([255, 255, 255] as const) : getReadableTextColor(ramp['600']);
    root.style.setProperty('--color-accent-foreground', rgbTriple(textColor as unknown as [number, number, number]));

    if (accentMode === 'gradient') {
      root.style.setProperty('--color-accent-gradient', `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`);
      root.setAttribute('data-accent-style', 'gradient');
    } else {
      root.removeAttribute('data-accent-style');
    }
  }, [accentMode, accentPreset, customColor, gradientFrom, gradientTo]);

  useEffect(() => {
    if (!isLoading) {
      const splash = document.getElementById('splash');
      if (splash) {
        splash.classList.add('fade-out');
        setTimeout(() => splash.remove(), 300);
      }
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="window-shell">
        <AppShellSkeleton />
      </div>
    );
  }

  return token ? <AppLayout /> : <AuthScreen />;
}
