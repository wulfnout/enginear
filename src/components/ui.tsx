import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View,
  type PressableProps, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { IconName } from '@/lib/constants';
import { initials } from '@/lib/format';
import { useAuth } from '@/providers/AuthProvider';
import { useColors, useSettings } from '@/providers/SettingsProvider';
import { ACCENT, BRAND, HEADER, colorFor, radius } from '@/theme';
import { Rise, Sparks } from './Motion';
import { Mascot, MascotMark } from './Mascot';

/* ---------- Text ---------- */
type Variant = 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'tiny' | 'label' | 'price';
const sizes: Record<Variant, { fontSize: number; fontWeight: TextStyle['fontWeight']; lineHeight?: number }> = {
  h1: { fontSize: 27, fontWeight: '800', lineHeight: 33 },
  h2: { fontSize: 20, fontWeight: '800', lineHeight: 26 },
  h3: { fontSize: 17, fontWeight: '700', lineHeight: 22 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 23 },
  small: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  tiny: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  label: { fontSize: 15, fontWeight: '700' },
  price: { fontSize: 19, fontWeight: '800' },
};

export function T({ v = 'body', color, muted, bold, center, style, children, numberOfLines, selectable }: {
  v?: Variant; color?: string; muted?: boolean; bold?: boolean; center?: boolean;
  style?: StyleProp<TextStyle>; children: React.ReactNode; numberOfLines?: number; selectable?: boolean;
}) {
  const c = useColors();
  const { textScale } = useSettings();
  const s = sizes[v];
  return (
    <Text
      numberOfLines={numberOfLines}
      selectable={selectable}
      maxFontSizeMultiplier={1.6}
      style={[{
        fontSize: s.fontSize * textScale,
        lineHeight: s.lineHeight ? s.lineHeight * textScale : undefined,
        fontWeight: bold ? '700' : s.fontWeight,
        color: color ?? (muted ? c.muted : c.text),
        textAlign: center ? 'center' : undefined,
        fontVariant: ['tabular-nums'],
      }, style]}
    >
      {children}
    </Text>
  );
}

/* ---------- Buttons ---------- */
type BtnKind = 'primary' | 'soft' | 'ghost' | 'danger' | 'ok' | 'white';
export function Button({ title, onPress, kind = 'primary', icon, loading, disabled, small, style, accessibilityLabel }: {
  title?: string; onPress?: () => void; kind?: BtnKind; icon?: IconName; loading?: boolean; disabled?: boolean;
  small?: boolean; style?: StyleProp<ViewStyle>; accessibilityLabel?: string;
}) {
  const c = useColors();
  const { textScale } = useSettings();
  const bg = { primary: BRAND, soft: c.brandSoft, ghost: 'transparent', danger: c.bad, ok: c.ok, white: '#FFFFFF' }[kind];
  const fg = { primary: '#fff', soft: c.brandInk, ghost: c.brand, danger: '#fff', ok: '#fff', white: '#9A3412' }[kind];
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!off }}
      disabled={off}
      onPress={() => { Haptics.selectionAsync().catch(() => {}); onPress?.(); }}
      style={({ pressed }) => [{
        minHeight: small ? 44 : 52, paddingHorizontal: title ? (small ? 16 : 22) : 12, borderRadius: radius.pill,
        backgroundColor: bg, borderWidth: kind === 'ghost' ? 2 : 0, borderColor: c.brand,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        opacity: off ? 0.45 : pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }],
      }, style]}
    >
      {loading ? <ActivityIndicator color={fg} /> : (
        <>
          {icon ? <Ionicons name={icon} size={20 * textScale} color={fg} /> : null}
          {title ? <Text maxFontSizeMultiplier={1.4} style={{ color: fg, fontWeight: '700', fontSize: (small ? 15 : 16) * textScale, textAlign: 'center' }}>{title}</Text> : null}
        </>
      )}
    </Pressable>
  );
}

export function LinkButton({ title, onPress, color }: { title: string; onPress: () => void; color?: string }) {
  const c = useColors();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={10} style={{ paddingVertical: 6 }}>
      <T v="label" color={color ?? c.brand}>{title}</T>
    </Pressable>
  );
}

/* ---------- Layout ---------- */
export function Screen({ children, scroll = true, padded = true, footer, header, refreshControl, style }: {
  children: React.ReactNode; scroll?: boolean; padded?: boolean; footer?: React.ReactNode; header?: React.ReactNode;
  refreshControl?: React.ComponentProps<typeof ScrollView>['refreshControl']; style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const body = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
      contentContainerStyle={[{ padding: padded ? 16 : 0, paddingBottom: 32, gap: 12 }, style]}
    >
      {React.Children.toArray(children).filter(Boolean).map((child, i) => <Rise key={i} index={i}>{child}</Rise>)}
    </ScrollView>
  ) : <View style={[{ flex: 1, padding: padded ? 16 : 0, gap: 12 }, style]}>{children}</View>;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {header}
      <View style={{ flex: 1 }}>{body}</View>
      {footer}
    </View>
  );
}

export function Footer({ children }: { children: React.ReactNode }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 12,
      paddingBottom: 12 + insets.bottom, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.line }}>
      {children}
    </View>
  );
}

/** Graphite top bar with an orange edge. Used by every main screen so the brand and Help are always in the same place. */
export function TopHeader({ title, children, back, right, showActions = true }: {
  title: string; children?: React.ReactNode; back?: boolean; right?: React.ReactNode; showActions?: boolean;
}) {
  const { textScale } = useSettings();
  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: HEADER, overflow: 'hidden', borderBottomWidth: 3, borderBottomColor: ACCENT }}>
      <Sparks count={6} />
      <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: 6 }}>
          {back ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 8 }}>
              <Ionicons name="chevron-back" size={26} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 * textScale }}>Back</Text>
            </Pressable>
          ) : (
            <View style={{ marginRight: 4 }}><MascotMark size={34} /></View>
          )}
          <Text numberOfLines={1} maxFontSizeMultiplier={1.4} style={{ flex: 1, color: '#fff', fontWeight: '800', fontSize: (back ? 19 : 20) * textScale }}>{title}</Text>
          {right}
          {showActions ? <HeaderActions /> : null}
        </View>
        {children}
      </View>
    </SafeAreaView>
  );
}

function HeaderActions() {
  const { unreadCount, profile } = useAuth();
  const { textScale } = useSettings();
  const item = (icon: IconName, label: string, onPress: () => void, dot = false) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={4}
      style={{ alignItems: 'center', minWidth: 52, paddingVertical: 2 }}>
      <Ionicons name={icon} size={23} color="#fff" />
      <Text maxFontSizeMultiplier={1.2} style={{ color: '#fff', fontSize: 11.5 * Math.min(textScale, 1.15), fontWeight: '700' }}>{label}</Text>
      {dot ? <View style={{ position: 'absolute', top: 0, right: 12, width: 10, height: 10, borderRadius: 5, backgroundColor: ACCENT, borderWidth: 2, borderColor: HEADER }} /> : null}
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row' }}>
      {item('help-buoy-outline', 'Help', () => router.push('/assistant'))}
      {profile?.role === 'client' ? item('chatbubbles-outline', 'Messages', () => router.push('/conversations')) : null}
      {item('notifications-outline', 'Alerts', () => router.push('/notifications'), unreadCount > 0)}
    </View>
  );
}

export function SearchBar({ value, onChangeText, onSubmit, placeholder }: {
  value: string; onChangeText: (t: string) => void; onSubmit?: () => void; placeholder: string;
}) {
  const { textScale } = useSettings();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: radius.pill, height: 50, paddingLeft: 16, paddingRight: 6, gap: 8 }}>
      <Ionicons name="search" size={20} color="#565D66" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor="#6B7280"
        returnKeyType="search"
        accessibilityLabel={placeholder}
        style={{ flex: 1, fontSize: 16 * textScale, color: '#16191D' }}
      />
      {value ? (
        <Pressable accessibilityLabel="Clear search" onPress={() => { onChangeText(''); }} hitSlop={8}>
          <Ionicons name="close-circle" size={22} color="#6B7A90" />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Card({ children, style, onPress, accessibilityLabel }: {
  children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accessibilityLabel?: string;
}) {
  const c = useColors();
  const base: ViewStyle = { backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, padding: 16, gap: 10 };
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress}
        style={({ pressed }) => [base, { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

export const Row = ({ children, gap = 10, style, wrap }: { children: React.ReactNode; gap?: number; style?: StyleProp<ViewStyle>; wrap?: boolean }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center', gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>
);

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
      <T v="h2">{title}</T>
      {action && onAction ? <LinkButton title={action} onPress={onAction} /> : null}
    </Row>
  );
}

export function Chip({ label, on, onPress, icon }: { label: string; on?: boolean; onPress?: () => void; icon?: IconName }) {
  const c = useColors();
  const { textScale } = useSettings();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!on }} onPress={onPress}
      style={{ minHeight: 42, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1.5,
        borderColor: on ? c.brand : c.line, backgroundColor: on ? c.brandSoft : c.surface,
        flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {icon ? <Ionicons name={icon} size={16} color={on ? c.brandInk : c.muted} /> : null}
      <Text maxFontSizeMultiplier={1.4} style={{ fontWeight: '600', fontSize: 14.5 * textScale, color: on ? c.brandInk : c.text }}>{label}</Text>
    </Pressable>
  );
}

export function ChipScroll({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 4 }}>
      {children}
    </ScrollView>
  );
}

export function Pill({ label, tone = 'brand', icon }: { label: string; tone?: 'brand' | 'ok' | 'warn' | 'bad'; icon?: IconName }) {
  const c = useColors();
  const map = { brand: [c.brandSoft, c.brandInk], ok: [c.okSoft, c.ok], warn: [c.warnSoft, c.warn], bad: [c.badSoft, c.bad] }[tone];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: map[0], paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start' }}>
      {icon ? <Ionicons name={icon} size={14} color={map[1]} /> : null}
      <T v="tiny" bold color={map[1]}>{label}</T>
    </View>
  );
}

export function Stars({ rating, count, size = 16 }: { rating: number; count?: number; size?: number }) {
  const c = useColors();
  if (!count && count !== undefined) return <Pill label="New" />;
  return (
    <Row gap={4}>
      <Ionicons name="star" size={size} color={c.star} />
      <T v="small" bold>{Number(rating).toFixed(1)}</T>
      {count != null ? <T v="small" muted>({count})</T> : null}
    </Row>
  );
}

export function Avatar({ name, url, id, size = 56 }: { name?: string | null; url?: string | null; id?: string; size?: number }) {
  if (url) return <Image source={{ uri: url }} accessibilityLabel={`${name ?? 'Profile'} photo`} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return (
    <View accessibilityLabel={name ?? 'Profile'} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colorFor(id ?? name ?? '?'), alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size / 2.8 }}>{initials(name)}</Text>
    </View>
  );
}

export function Field({ label, hint, error, ...props }: TextInputProps & { label: string; hint?: string; error?: string }) {
  const c = useColors();
  const { textScale } = useSettings();
  return (
    <View style={{ gap: 6 }}>
      <T v="label">{label}</T>
      <TextInput
        placeholderTextColor={c.muted}
        accessibilityLabel={label}
        {...props}
        style={[{ minHeight: props.multiline ? 100 : 52, borderWidth: 1.5, borderColor: error ? c.bad : c.line, borderRadius: 12,
          paddingHorizontal: 14, paddingVertical: props.multiline ? 12 : 0, backgroundColor: c.surface, color: c.text,
          fontSize: 16 * textScale, textAlignVertical: props.multiline ? 'top' : 'center' }, props.style]}
      />
      {error ? <T v="tiny" color={c.bad}>{error}</T> : hint ? <T v="tiny" muted>{hint}</T> : null}
    </View>
  );
}

export function Notice({ text, tone = 'warn' }: { text: string; tone?: 'warn' | 'ok' | 'brand' | 'bad' }) {
  const c = useColors();
  const map = { warn: [c.warnSoft, c.warn], ok: [c.okSoft, c.ok], brand: [c.brandSoft, c.brandInk], bad: [c.badSoft, c.bad] }[tone];
  return (
    <View accessibilityRole="alert" style={{ backgroundColor: map[0], borderRadius: 12, padding: 14 }}>
      <T v="small" bold color={map[1]}>{text}</T>
    </View>
  );
}

export function OptionCard({ label, desc, icon, on, onPress }: { label: string; desc?: string; icon?: IconName; on: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, borderWidth: 2,
        borderColor: on ? c.brand : c.line, backgroundColor: on ? c.brandSoft : c.surface }}>
      {icon ? (
        <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: on ? c.surface : c.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={icon} size={24} color={c.brand} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <T v="label">{label}</T>
        {desc ? <T v="small" muted>{desc}</T> : null}
      </View>
      <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: on ? c.brand : c.line, backgroundColor: on ? c.brand : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {on ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
      </View>
    </Pressable>
  );
}

export function Segmented<V extends string | number | boolean>({ options, value, onChange }: {
  options: { value: V; label: string; icon?: IconName }[]; value: V; onChange: (v: V) => void;
}) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.bg, borderWidth: 1, borderColor: c.line, borderRadius: 12, padding: 3, gap: 3 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={String(o.value)} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(o.value)}
            style={{ flex: 1, minHeight: 44, borderRadius: 9, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center',
              backgroundColor: on ? c.surface : 'transparent', ...(on ? styles.shadow : null) }}>
            {o.icon ? <Ionicons name={o.icon} size={18} color={on ? c.brand : c.muted} /> : null}
            <T v="label" color={on ? c.brand : c.muted}>{o.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Progress({ value, color, height = 8 }: { value: number; color?: string; height?: number }) {
  const c = useColors();
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      style={{ height, borderRadius: height, backgroundColor: c.line, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height: '100%', backgroundColor: color ?? c.brand, borderRadius: height }} />
    </View>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const c = useColors();
  return <Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ true: c.ok, false: c.line }} thumbColor="#fff" />;
}

export function EmptyState({ icon, title, text, action, onAction }: { icon: IconName; title: string; text?: string; action?: string; onAction?: () => void }) {
  const c = useColors();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 36, paddingHorizontal: 20, gap: 8 }}>
      <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: c.brandSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
        <Ionicons name={icon} size={32} color={c.brand} />
      </View>
      <T v="h3" center>{title}</T>
      {text ? <T v="small" muted center>{text}</T> : null}
      {action && onAction ? <Button small title={action} onPress={onAction} style={{ marginTop: 8 }} /> : null}
    </View>
  );
}

export function MenuGroup({ title, children }: { title?: string; children: React.ReactNode }) {
  const c = useColors();
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={{ gap: 6 }}>
      {title ? <T v="tiny" bold muted style={{ letterSpacing: 0.8, textTransform: 'uppercase', marginLeft: 4, marginTop: 6 }}>{title}</T> : null}
      <View style={{ backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, overflow: 'hidden' }}>
        {items.map((child, i) => (
          <View key={i} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>{child}</View>
        ))}
      </View>
    </View>
  );
}

export function MenuItem({ icon, label, sub, onPress, danger, right }: { icon: IconName; label: string; sub?: string; onPress?: () => void; danger?: boolean; right?: React.ReactNode }) {
  const c = useColors();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, minHeight: 60, opacity: pressed ? 0.7 : 1 })}>
      <Ionicons name={icon} size={23} color={danger ? c.bad : c.brand} />
      <View style={{ flex: 1 }}>
        <T v="label" color={danger ? c.bad : undefined}>{label}</T>
        {sub ? <T v="small" muted numberOfLines={2}>{sub}</T> : null}
      </View>
      {right ?? (danger ? null : <Ionicons name="chevron-forward" size={20} color={c.muted} />)}
    </Pressable>
  );
}

export function Stat({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <Card style={{ flex: 1, gap: 2, padding: 14 }}>
      <T v="h2" color={color}>{value}</T>
      <T v="tiny" muted bold>{label}</T>
    </Card>
  );
}

export function Loading() {
  const c = useColors();
  return (
    <View accessibilityLabel="Loading" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg, gap: 10 }}>
      <Mascot size={84} label="Loading" />
      <ActivityIndicator color={c.brand} />
    </View>
  );
}

export function KV({ k, v, bold, color }: { k: string; v: string; bold?: boolean; color?: string }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <T v={bold ? 'h3' : 'small'} color={color} style={{ flexShrink: 1 }}>{k}</T>
      <T v={bold ? 'h3' : 'small'} bold={bold} color={color}>{v}</T>
    </Row>
  );
}

const styles = StyleSheet.create({
  shadow: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
});
