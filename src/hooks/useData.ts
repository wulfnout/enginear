import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

/** Loads data when a screen gains focus, with pull-to-refresh and optional realtime refresh. */
export function useData<T>(loader: () => Promise<T>, deps: unknown[] = [], liveTables: string[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      setData(await loaderRef.current());
      setError(null);
    } catch (e) {
      setError((e as Error).message ?? 'Couldn’t load. Pull down to try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useFocusEffect(useCallback(() => { run(); }, [run, ...deps]));

  useEffect(() => {
    if (!liveTables.length) return;
    const ch = supabase.channel(`live-${liveTables.join('-')}-${Math.random().toString(36).slice(2)}`);
    liveTables.forEach((t) => ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, () => run()));
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveTables.join(',')]);

  return { data, setData, loading, refreshing, error, reload: () => run(), refresh: () => run(true) };
}
