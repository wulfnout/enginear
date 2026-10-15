import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { palette, type Colors } from '@/theme';

type ThemeMode = 'system' | 'light' | 'dark';
type Settings = {
  textScale: number;
  setTextScale: (n: number) => void;
  themeMode: ThemeMode;
  setThemeMode: (m: ThemeMode) => void;
  colors: Colors;
  dark: boolean;
  /** Plays the gentle "la la la" music quietly throughout the app. */
  lobbyMusic: boolean;
  setLobbyMusic: (on: boolean) => void;
};

const Ctx = createContext<Settings | null>(null);
const KEY = 'enginear.settings';

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [textScale, setTextScaleState] = useState(1);
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [lobbyMusic, setLobbyMusicState] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (!raw) return;
      try {
        const s = JSON.parse(raw);
        if (s.textScale) setTextScaleState(s.textScale);
        if (s.themeMode) setThemeModeState(s.themeMode);
        if (typeof s.lobbyMusic === 'boolean') setLobbyMusicState(s.lobbyMusic);
      } catch {
        /* ignore corrupt settings */
      }
    });
  }, []);

  const persist = (next: Partial<{ textScale: number; themeMode: ThemeMode; lobbyMusic: boolean }>) =>
    AsyncStorage.setItem(KEY, JSON.stringify({ textScale, themeMode, lobbyMusic, ...next })).catch(() => {});

  const dark = themeMode === 'dark' || (themeMode === 'system' && system === 'dark');
  const value = useMemo<Settings>(
    () => ({
      textScale,
      setTextScale: (n) => { setTextScaleState(n); persist({ textScale: n }); },
      themeMode,
      setThemeMode: (m) => { setThemeModeState(m); persist({ themeMode: m }); },
      colors: dark ? palette.dark : palette.light,
      dark,
      lobbyMusic,
      setLobbyMusic: (on) => { setLobbyMusicState(on); persist({ lobbyMusic: on }); },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [textScale, themeMode, dark, lobbyMusic],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSettings must be used inside SettingsProvider');
  return v;
}

export const useColors = () => useSettings().colors;
