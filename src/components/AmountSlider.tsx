import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { PanResponder, Pressable, View } from 'react-native';
import { useColors } from '@/providers/SettingsProvider';
import { BRAND } from '@/theme';
import { T } from './ui';

const fmt = (n: number) => `$${n.toLocaleString('en-US')}`;

/**
 * Dollar amount slider ($200 to $10,000 by default). Drag the knob or tap anywhere on the track;
 * the minus and plus buttons fine-tune by one step. `onCommit` runs when the finger lifts,
 * so the value is saved once instead of on every movement.
 */
export function AmountSlider({ value, onCommit, min = 200, max = 10000, step = 50, label }: {
  value: number; onCommit: (v: number) => void; min?: number; max?: number; step?: number; label: string;
}) {
  const c = useColors();
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step));
  const [v, setV] = useState(clamp(value));
  const width = useRef(1);
  const startX = useRef(0);
  const live = useRef(v);
  live.current = v;
  const commit = useRef(onCommit);
  commit.current = onCommit;

  useEffect(() => { setV(clamp(value)); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fromX = (x: number) => clamp(min + (Math.min(Math.max(x, 0), width.current) / width.current) * (max - min));

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => { startX.current = e.nativeEvent.locationX; setV(fromX(startX.current)); },
    onPanResponderMove: (_e, g) => setV(fromX(startX.current + g.dx)),
    onPanResponderRelease: () => commit.current(live.current),
    onPanResponderTerminate: () => commit.current(live.current),
  })).current;

  const nudge = (dir: 1 | -1) => { const n = clamp(v + dir * step); setV(n); onCommit(n); };
  const pct = ((v - min) / (max - min)) * 100;

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Lower ${label}`} onPress={() => nudge(-1)} hitSlop={8}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="remove" size={22} color={c.brandInk} />
        </Pressable>
        <T v="h1" style={{ fontSize: 34, lineHeight: 40 }}>{fmt(v)}</T>
        <Pressable accessibilityRole="button" accessibilityLabel={`Raise ${label}`} onPress={() => nudge(1)} hitSlop={8}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="add" size={22} color={c.brandInk} />
        </Pressable>
      </View>

      <View
        {...pan.panHandlers}
        onLayout={(e) => { width.current = Math.max(1, e.nativeEvent.layout.width); }}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min, max, now: v, text: fmt(v) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => nudge(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
        style={{ height: 44, justifyContent: 'center' }}
      >
        <View pointerEvents="none" style={{ height: 8, borderRadius: 4, backgroundColor: c.line, overflow: 'hidden' }}>
          <View style={{ width: `${pct}%`, height: '100%', backgroundColor: BRAND }} />
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', left: `${pct}%`, marginLeft: -14, width: 28, height: 28, borderRadius: 14,
          backgroundColor: '#fff', borderWidth: 3, borderColor: BRAND, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 3 }} />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <T v="tiny" muted>{fmt(min)}</T>
        <T v="tiny" muted>{fmt(max)}</T>
      </View>
    </View>
  );
}
