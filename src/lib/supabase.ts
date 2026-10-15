import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config';

const url = SUPABASE_URL;
const anonKey = SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Keep the session fresh only while the app is open.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

/** Calls a server function and throws a friendly Error on failure. */
export async function callFunction<T = unknown>(name: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let message = 'Something went wrong. Please try again.';
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') {
        const j = await ctx.json();
        if (j?.error) message = j.error;
      }
    } catch {
      /* keep default message */
    }
    throw new Error(message);
  }
  return data as T;
}

/** Turns a Postgres/Supabase error into a sentence a person can act on. */
export function friendlyError(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? '';
  if (!msg) return 'Something went wrong. Please try again.';
  if (/network|fetch/i.test(msg)) return 'You appear to be offline. Check your connection and try again.';
  return msg.replace(/^.*?ERROR:\s*/i, '');
}
