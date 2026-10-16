import type { Session } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import type { MechanicProfile, ClientProfile, Profile, Role } from '@/lib/types';
import { webReturnLink } from '@/lib/links';

type Auth = {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  client: ClientProfile | null;
  mechanic: MechanicProfile | null;
  unreadCount: number;
  refresh: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  updateClient: (patch: Partial<ClientProfile>) => Promise<void>;
  updateMechanic: (patch: Partial<MechanicProfile>) => Promise<void>;
  signUp: (role: Role, name: string, email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  signIn: (role: Role, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<Auth | null>(null);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerPush(userId: string) {
  try {
    if (!Device.isDevice) return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'EngiNear',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;
    if (!granted) granted = (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
    await supabase.from('profiles').update({ expo_push_token: token }).eq('id', userId);
  } catch {
    // Push is optional; the in-app Alerts list still works.
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [mechanic, setMechanic] = useState<MechanicProfile | null>(null);
  const [unreadCount, setUnread] = useState(0);

  const load = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null); setClient(null); setMechanic(null); setUnread(0);
      return;
    }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', s.user.id).single();
    setProfile(p as Profile | null);
    // Remember this phone's time zone so booking times in notifications show in local time, anywhere in the US.
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (p && tz && (p as Profile).timezone !== tz) supabase.from('profiles').update({ timezone: tz }).eq('id', s.user.id).then(() => {});
    } catch { /* not critical */ }
    if (p?.role === 'client') {
      const { data } = await supabase.from('client_profiles').select('*').eq('id', s.user.id).single();
      setClient(data as ClientProfile | null); setMechanic(null);
    } else if (p?.role === 'mechanic') {
      const { data } = await supabase.from('mechanic_profiles').select('*').eq('id', s.user.id).single();
      setMechanic(data as MechanicProfile | null); setClient(null);
    }
    const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('read', false);
    setUnread(count ?? 0);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await load(data.session);
      setReady(true);
      if (data.session) registerPush(data.session.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      load(s);
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  // Live unread badge
  useEffect(() => {
    if (!session) return;
    const ch = supabase
      .channel('my-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` }, async () => {
        const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('read', false);
        setUnread(count ?? 0);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [session]);

  const value: Auth = {
    ready,
    session,
    profile,
    client,
    mechanic,
    unreadCount,
    refresh: () => load(session),
    updateProfile: async (patch) => {
      if (!session) return;
      const { error } = await supabase.from('profiles').update(patch).eq('id', session.user.id);
      if (error) throw error;
      setProfile((p) => (p ? { ...p, ...patch } : p));
    },
    updateClient: async (patch) => {
      if (!session) return;
      const { error } = await supabase.from('client_profiles').update(patch).eq('id', session.user.id);
      if (error) throw error;
      setClient((c) => (c ? { ...c, ...patch } : c));
    },
    updateMechanic: async (patch) => {
      if (!session) return;
      const { error } = await supabase.from('mechanic_profiles').update(patch).eq('id', session.user.id);
      if (error) throw error;
      setMechanic((c) => (c ? { ...c, ...patch } : c));
    },
    signUp: async (role, name, email, password) => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { role, full_name: name.trim() }, emailRedirectTo: webReturnLink('confirmed', '/') },
      });
      if (error) {
        if (/already registered/i.test(error.message)) {
          throw new Error('This email already has a EngiNear account. Client and mechanic accounts are separate, so sign in, or use a different email for this account type.');
        }
        throw error;
      }
      // Supabase hides existing emails by returning a user with no identities.
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        throw new Error('This email already has a EngiNear account. Client and mechanic accounts are separate, so sign in, or use a different email for this account type.');
      }
      return { needsConfirmation: !data.session };
    },
    signIn: async (role, email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) {
        if (/invalid login/i.test(error.message)) throw new Error('That email and password don’t match. Please try again.');
        if (/not confirmed/i.test(error.message)) throw new Error('Please confirm your email first. Check your inbox for the link we sent.');
        throw error;
      }
      const { data: p } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
      if (p?.role !== role) {
        await supabase.auth.signOut();
        throw new Error(
          p?.role === 'mechanic'
            ? 'This email is registered as a mechanic account. Go back and choose “I’m a mechanic” to sign in.'
            : 'This email is registered as a client account. Go back and choose “I need a mechanic” to sign in.',
        );
      }
      registerPush(data.user.id);
    },
    signOut: async () => {
      if (session) await supabase.from('profiles').update({ expo_push_token: null }).eq('id', session.user.id);
      await supabase.auth.signOut();
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
