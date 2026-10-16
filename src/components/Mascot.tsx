import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { G, Path, Rect } from 'react-native-svg';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * EngiNear mark: a steel combination wrench lying on the diagonal.
 * Every few seconds it gives a short ratchet twist, like tightening a bolt, then settles back.
 * Holds still when Reduce Motion is on.
 */
export function Mascot({ size = 30, label = 'EngiNear' }: { size?: number; label?: string }) {
  const reduced = useReducedMotion();
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) { t.setValue(0); return; }
    const loop = Animated.loop(
      Animated.timing(t, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, t]);

  const twist = t.interpolate({
    inputRange: [0, 0.2, 0.3, 0.36, 0.42, 0.6, 1],
    outputRange: ['0deg', '0deg', '-16deg', '-12deg', '-14deg', '0deg', '0deg'],
  });

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={{ width: size, height: size }}>
      <Animated.View style={{ width: size, height: size, transform: [{ rotate: twist }] }}>
        <WrenchSvg />
      </Animated.View>
    </View>
  );
}

/** The wrench drawing on its own (no animation), 100 x 100 units, handle from bottom-left to top-right. */
export function WrenchSvg() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100">
      <G transform="rotate(-45 50 50)">
        {/* handle */}
        <Rect x={24} y={45} width={50} height={10} rx={3} fill="#C9D0D7" />
        <Rect x={24} y={45} width={50} height={3} rx={1.5} fill="#E9EDF1" />
        {/* open end, with the jaw cut out */}
        <Path d="M82 56 L92.65 56 A14 14 0 1 1 92.65 44 L82 44 A6 6 0 0 0 82 56 Z" fill="#C9D0D7" stroke="#9AA4AF" strokeWidth={1.5} strokeLinejoin="round" />
        {/* box end, with the hole cut out */}
        <Path d="M5 50 a13 13 0 1 0 26 0 a13 13 0 1 0 -26 0 Z M11.5 50 a6.5 6.5 0 1 0 13 0 a6.5 6.5 0 1 0 -13 0 Z"
          fill="#C9D0D7" fillRule="evenodd" stroke="#9AA4AF" strokeWidth={1.5} />
        {/* orange grip */}
        <Rect x={40} y={45} width={18} height={10} fill="#F97316" />
      </G>
    </Svg>
  );
}

/** White rounded tile holding the wrench, used on the orange headers. */
export function MascotMark({ size = 34 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.29, backgroundColor: '#FFFFFF',
      alignItems: 'center', justifyContent: 'center' }}>
      <Mascot size={size * 0.8} />
    </View>
  );
}
