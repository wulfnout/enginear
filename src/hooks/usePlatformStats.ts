import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type PlatformStats = { mechanics_live: number; requests_posted: number; total_posts: number };

/**
 * Live count of posts on EngiNear (mechanic profiles + repair requests).
 * `null` while loading, so the "Be the first to post" message never flashes by mistake.
 */
export function usePlatformStats() {
  const [stats, setStats] = useState<PlatformStats | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('platform_stats');
    const row = (Array.isArray(data) ? data[0] : data) as PlatformStats | undefined;
    if (row) setStats(row);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // The moment someone posts anywhere, everyone's message goes away.
  useEffect(() => {
    const ch = supabase
      .channel(`platform-stats-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, load)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mechanic_profiles' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  useEffect(() => {
    if (stats?.total_posts !== 0) return;
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [stats?.total_posts, load]);

  return { stats, isEmpty: stats?.total_posts === 0, reload: load };
}
