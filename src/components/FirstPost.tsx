import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { usePlatformStats } from '@/hooks/usePlatformStats';
import { useColors } from '@/providers/SettingsProvider';
import { BRAND } from '@/theme';
import { WiggleIcon } from './Motion';
import { Button, T } from './ui';

const DISMISS_KEY = 'firstpost-dismissed';

/**
 * "Be the first to post" message. Shows only while nothing has been posted on
 * EngiNear yet, and disappears for everyone as soon as the first post exists.
 * The X hides it on this phone for good.
 */
export function FirstPost({ audience, showAction = true }: { audience: 'client' | 'mechanic' | 'everyone'; showAction?: boolean }) {
  const c = useColors();
  const { isEmpty } = usePlatformStats();
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  useEffect(() => {
    AsyncStorage.getItem(DISMISS_KEY).then((v) => setDismissed(v === '1')).catch(() => setDismissed(false));
  }, []);
  const close = () => {
    setDismissed(true);
    AsyncStorage.setItem(DISMISS_KEY, '1').catch(() => {});
  };
  if (!isEmpty || dismissed !== false) return null;

  const text = {
    client: 'No mechanics or repair requests have been posted yet. Post what you need and mechanics will see it as soon as they join.',
    mechanic: 'No one has posted on EngiNear yet. Finish your setup and your profile goes live as the first mechanic clients can book.',
    everyone: 'EngiNear is brand new here. Post a repair request or your mechanic services and you’ll be the first thing people see.',
  }[audience];

  return (
    <View accessibilityRole="summary" style={{ borderRadius: 20, borderWidth: 2, borderStyle: 'dashed', borderColor: c.brand, backgroundColor: c.brandSoft, padding: 20, gap: 10, alignItems: 'center' }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={close} hitSlop={12}
        style={{ position: 'absolute', top: 10, right: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
        <Ionicons name="close" size={22} color={c.brandInk} />
      </Pressable>
      <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' }}>
        <WiggleIcon name="megaphone" size={28} color="#fff" />
      </View>
      <T v="h2" center color={c.brandInk}>Be the first to post</T>
      <T v="small" center color={c.brandInk}>{text}</T>
      {showAction && audience === 'client' ? (
        <Button icon="add" title="Post a repair request" onPress={() => router.push('/quick-book')} style={{ alignSelf: 'stretch' }} />
      ) : null}
      {showAction && audience === 'mechanic' ? (
        <Button title="Finish setup and post" onPress={() => router.push('/onboarding/checklist')} style={{ alignSelf: 'stretch' }} />
      ) : null}
    </View>
  );
}
