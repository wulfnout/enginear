import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActionSheetIOS, Alert, Platform, Pressable, View } from 'react-native';
import { pickImage, uploadAvatar } from '@/lib/api';
import { friendlyError } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useColors, useSettings } from '@/providers/SettingsProvider';
import { BRAND } from '@/theme';
import { Avatar, Button, Card, MenuGroup, MenuItem, Pill, Row, Segmented, T } from './ui';

/** Profile card with changeable photo. Shared by the client and mechanic "Me" tabs. */
export function MeHeader({ roleLabel }: { roleLabel: string }) {
  const c = useColors();
  const { profile, session, updateProfile } = useAuth();
  const [busy, setBusy] = useState(false);

  const choose = async (source: 'camera' | 'library') => {
    try {
      const uri = await pickImage(source);
      if (!uri || !session) return;
      setBusy(true);
      const url = await uploadAvatar(session.user.id, uri);
      await updateProfile({ avatar_url: url });
    } catch (e) {
      Alert.alert('Photo not saved', friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const changePhoto = () => {
    const options = ['Take a photo', 'Choose from photos', ...(profile?.avatar_url ? ['Remove photo'] : []), 'Cancel'];
    const run = (i: number) => {
      if (options[i] === 'Take a photo') choose('camera');
      if (options[i] === 'Choose from photos') choose('library');
      if (options[i] === 'Remove photo') updateProfile({ avatar_url: null }).catch((e) => Alert.alert('Not saved', friendlyError(e)));
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: options.length - 1, destructiveButtonIndex: profile?.avatar_url ? 2 : undefined, title: 'Profile photo' },
        run,
      );
    } else {
      Alert.alert('Profile photo', undefined, options.map((o, i) => ({ text: o, style: o === 'Cancel' ? 'cancel' : o === 'Remove photo' ? 'destructive' : 'default', onPress: () => run(i) })));
    }
  };

  return (
    <Card style={{ gap: 14 }}>
      <Row gap={14}>
        <Pressable accessibilityRole="button" accessibilityLabel="Change profile photo" onPress={changePhoto} disabled={busy}>
          <Avatar name={profile?.full_name} url={profile?.avatar_url} id={profile?.id} size={76} />
          <View style={{ position: 'absolute', right: -2, bottom: -2, width: 30, height: 30, borderRadius: 15, backgroundColor: BRAND, borderWidth: 3, borderColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="camera" size={14} color="#fff" />
          </View>
        </Pressable>
        <View style={{ flex: 1, gap: 2 }}>
          <T v="h2" numberOfLines={1}>{profile?.full_name || 'Your name'}</T>
          <T v="small" muted numberOfLines={1}>{session?.user.email}</T>
          <Pill label={roleLabel} />
        </View>
      </Row>
      <Row gap={10}>
        <Button small kind="soft" icon="camera-outline" title={profile?.avatar_url ? 'Change photo' : 'Add photo'} onPress={changePhoto} loading={busy} style={{ flex: 1 }} />
        <Button small kind="ghost" icon="create-outline" title="Edit name" onPress={() => router.push('/edit-profile')} style={{ flex: 1 }} />
      </Row>
    </Card>
  );
}

export function DisplaySettings() {
  const { textScale, setTextScale, themeMode, setThemeMode } = useSettings();
  return (
    <View style={{ gap: 6 }}>
      <T v="tiny" bold muted style={{ letterSpacing: 0.8, textTransform: 'uppercase', marginLeft: 4, marginTop: 6 }}>Display</T>
      <Card>
        <Row><Ionicons name="text-outline" size={22} color={BRAND} /><T v="h3">Text size</T></Row>
        <Segmented value={textScale} onChange={setTextScale} options={[{ value: 1, label: 'Normal' }, { value: 1.12, label: 'Large' }, { value: 1.25, label: 'Largest' }]} />
        <Row style={{ marginTop: 6 }}><Ionicons name="moon-outline" size={22} color={BRAND} /><T v="h3">Appearance</T></Row>
        <Segmented value={themeMode} onChange={setThemeMode} options={[{ value: 'system', label: 'Auto' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
      </Card>
    </View>
  );
}

export function HelpMenu() {
  const { signOut } = useAuth();
  return (
    <>
      <MenuGroup title="Help & safety">
        <MenuItem icon="help-buoy-outline" label="Ask the Help Assistant" sub="Get answers any time" onPress={() => router.push('/assistant')} />
        <MenuItem icon="help-circle-outline" label="Common questions" onPress={() => router.push('/help')} />
        <MenuItem icon="shield-checkmark-outline" label="Safety center" onPress={() => router.push('/safety')} />
        <MenuItem icon="document-text-outline" label="Terms & privacy" onPress={() => router.push('/legal')} />
      </MenuGroup>
      <MenuGroup>
        <MenuItem icon="log-out-outline" label="Sign out" danger onPress={() =>
          Alert.alert('Sign out?', 'You can sign back in anytime.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: () => signOut() }])} />
      </MenuGroup>
    </>
  );
}
