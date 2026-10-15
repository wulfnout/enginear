import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, View } from 'react-native';
import { useColors } from '@/providers/SettingsProvider';

/** The whole United States, used when someone has no location yet and for the "Whole USA" button. */
export const USA_REGION = { latitude: 39.5, longitude: -98.35, latitudeDelta: 32, longitudeDelta: 62 };

/** Floating map buttons: show the whole USA, or jump back to your location. */
export function MapButtons({ onUSA, onMe }: { onUSA: () => void; onMe?: () => void }) {
  const c = useColors();
  const btn = (icon: 'globe-outline' | 'locate', label: string, onPress: () => void) => (
    <Pressable key={label} accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={22} color={c.brand} />
    </Pressable>
  );
  return (
    <View style={{ position: 'absolute', right: 12, top: 12, gap: 8 }}>
      {btn('globe-outline', 'Show the whole USA', onUSA)}
      {onMe ? btn('locate', 'Center on me', onMe) : null}
    </View>
  );
}

