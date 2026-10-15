import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/** Faint orange embers drifting up behind the graphite headers, like sparks off a grinder. Purely decorative. */
export function Sparks({ count = 6 }: { count?: number }) {
  const reduced = useReducedMotion();
  if (reduced) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: count }, (_, i) => <Ember key={i} i={i} />)}
    </View>
  );
}

function Ember({ i }: { i: number }) {
  const t = useRef(new Animated.Value(0)).current;
  const size = 3 + ((i * 7) % 4);
  const duration = 7000 + ((i * 3) % 6) * 1000;
  useEffect(() => {
    const anim = Animated.loop(Animated.timing(t, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }));
    const start = setTimeout(() => anim.start(), i * 1100);
    return () => { clearTimeout(start); anim.stop(); };
  }, [t, duration, i]);
  return (
    <Animated.View
      style={{
        position: 'absolute', bottom: -30, left: `${(i * 37 + 11) % 96}%`, width: size, height: size, borderRadius: size / 2,
        backgroundColor: i % 2 ? 'rgba(249,115,22,0.55)' : 'rgba(255,176,32,0.45)',
        opacity: t.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 1, 0.6, 0] }),
        transform: [
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -190] }) },
          { translateX: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, i % 2 ? 14 : -10, i % 2 ? 4 : -18] }) },
        ],
      }}
    />
  );
}

/** Green dot with a soft pulse, for "You're online". */
export function LiveDot() {
  const reduced = useReducedMotion();
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    const a = Animated.loop(Animated.timing(t, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [reduced, t]);
  return (
    <View style={{ width: 10, height: 10, marginRight: 6 }}>
      <Animated.View style={{ position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: '#3CE38F',
        opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }), transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }] }} />
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#3CE38F' }} />
    </View>
  );
}

/** Icon that gives a little wiggle every few seconds (used on "Be the first to post"). */
export function WiggleIcon({ name, size, color }: { name: React.ComponentProps<typeof Ionicons>['name']; size: number; color: string }) {
  const reduced = useReducedMotion();
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    const a = Animated.loop(Animated.sequence([
      Animated.delay(2100),
      Animated.timing(t, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, [reduced, t]);
  const rotate = t.interpolate({ inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1], outputRange: ['0deg', '-12deg', '10deg', '-6deg', '3deg', '0deg'] });
  return <Animated.View style={{ transform: [{ rotate }] }}><Ionicons name={name} size={size} color={color} /></Animated.View>;
}

/** Fades and slides content up when a screen opens. Children appear one after another. */
export function Rise({ children, index = 0, style }: { children: React.ReactNode; index?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const t = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) { t.setValue(1); return; }
    Animated.timing(t, { toValue: 1, duration: 420, delay: Math.min(index, 14) * 40, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [reduced, t, index]);
  return (
    <Animated.View style={[{ opacity: t, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }, style]}>
      {children}
    </Animated.View>
  );
}
