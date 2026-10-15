import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { AppState, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { webReturnLink } from '@/lib/links';
import { supabase } from '@/lib/supabase';
import type { Role } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';
import { useColors } from '@/providers/SettingsProvider';
import { TopHeader, Button, Field, LinkButton, Notice, Pill, Row, Segmented, T } from './ui';

/** Sign up / sign in for ONE account type. Clients and mechanics each get their own screen. */
export function AuthForm({ role }: { role: Role }) {
  const c = useColors();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [awaiting, setAwaiting] = useState<string | null>(null);
  const creds = useRef<{ email: string; pw: string } | null>(null);
  const cl = role === 'mechanic';

  // After sign-up, sign in automatically as soon as the person comes back from confirming their email.
  const tryContinue = async (quiet: boolean) => {
    if (!creds.current) return;
    try {
      await signIn(role, creds.current.email, creds.current.pw);
      creds.current = null;
      router.replace('/');
    } catch (e) {
      if (!quiet) setErr((e as Error).message);
    }
  };
  useEffect(() => {
    if (!awaiting) return;
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') tryContinue(true); });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awaiting]);

  const submit = async () => {
    setErr(''); setInfo('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErr('Please enter a valid email address.');
    if (mode === 'signup') {
      if (!name.trim()) return setErr('Please enter your full name.');
      if (pw.length < 8) return setErr('Your password needs at least 8 characters.');
    }
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { needsConfirmation } = await signUp(role, name, email, pw);
        if (needsConfirmation) {
          creds.current = { email, pw };
          setAwaiting(email.trim());
        } else router.replace('/');
      } else {
        await signIn(role, email, pw);
        router.replace('/');
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErr('Type your email above first, then tap Forgot password.');
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: webReturnLink('reset', 'reset-password') });
    setErr('');
    setInfo('If that email has an account, we sent a link to reset your password.');
  };

  if (awaiting) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <TopHeader back title={cl ? 'EngiNear Pro' : 'EngiNear'} showActions={false} />
        <ScrollView contentContainerStyle={{ padding: 20, gap: 14, alignItems: 'center', paddingTop: 36 }}>
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: c.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="mail-unread-outline" size={44} color={c.brand} />
          </View>
          <T v="h1" center>Check your email</T>
          <T muted center>We sent a confirmation link to <T bold>{awaiting}</T>.</T>
          <View style={{ alignSelf: 'stretch', gap: 10, backgroundColor: c.surface, borderRadius: 16, padding: 16 }}>
            {['Open the email from EngiNear on this phone.', 'Tap “Confirm your email”. A page opens saying your email is confirmed.', 'Come back to this app. We’ll sign you in automatically.'].map((t, i) => (
              <Row key={i} gap={12} style={{ alignItems: 'flex-start' }}>
                <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center' }}>
                  <T v="small" bold color="#fff">{i + 1}</T>
                </View>
                <T style={{ flex: 1 }}>{t}</T>
              </Row>
            ))}
          </View>
          {err ? <Notice text={err} /> : null}
          <Button style={{ alignSelf: 'stretch' }} title="I’ve confirmed, continue" onPress={() => { setErr(''); tryContinue(false); }} />
          <LinkButton title="Use a different email" onPress={() => { creds.current = null; setAwaiting(null); setMode('signup'); setErr(''); }} />
          <T v="tiny" muted center>Can’t find it? Check your spam or promotions folder.</T>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <TopHeader back title={cl ? 'EngiNear Pro' : 'EngiNear'} showActions={false}
        right={<Pill label={cl ? 'For mechanics' : 'For clients'} />} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
          <T v="h1">{mode === 'signup' ? (cl ? 'Start earning with EngiNear' : 'Create your account') : cl ? 'Mechanic sign in' : 'Client sign in'}</T>
          <T muted>{mode === 'signup'
            ? cl ? 'Setup takes about 10 minutes. Your progress saves as you go.' : 'Answer a few quick questions and we’ll match you with the right mechanic.'
            : 'Welcome back.'}</T>
          <Segmented value={mode} onChange={(m) => { setMode(m); setErr(''); }} options={[{ value: 'signup', label: 'Create account' }, { value: 'signin', label: 'Sign in' }]} />
          {err ? <Notice text={err} /> : null}
          {info ? <Notice tone="ok" text={info} /> : null}
          {mode === 'signup' ? <Field label="Full name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" autoCapitalize="words" /> : null}
          <Field label="Email" value={email} onChangeText={setEmail} autoComplete="email" textContentType="emailAddress" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          <Field label="Password" value={pw} onChangeText={setPw} secureTextEntry={!show}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} textContentType={mode === 'signup' ? 'newPassword' : 'password'}
            hint={mode === 'signup' ? 'At least 8 characters' : undefined} onSubmitEditing={submit} />
          <Row style={{ justifyContent: 'space-between' }}>
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: show }} onPress={() => setShow(!show)} hitSlop={8}>
              <T v="label" color={c.brand}>{show ? 'Hide password' : 'Show password'}</T>
            </Pressable>
            {mode === 'signin' ? <LinkButton title="Forgot password?" onPress={forgot} /> : null}
          </Row>
          <Button title={mode === 'signup' ? 'Create account' : 'Sign in'} onPress={submit} loading={busy} />
          {mode === 'signup' ? (
            <T v="tiny" muted center>By creating an account you agree to our Terms of Service and Privacy Policy.</T>
          ) : null}
          <View style={{ height: 1, backgroundColor: c.line, marginVertical: 6 }} />
          <T v="small" muted center>{cl ? 'Need to book a mechanic instead?' : 'Are you a mechanic?'}</T>
          <View style={{ alignItems: 'center' }}>
            <LinkButton title={cl ? 'Go to client sign in' : 'Go to mechanic sign in'} onPress={() => router.replace(cl ? '/auth/client' : '/auth/mechanic')} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
