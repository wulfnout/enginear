import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Path, Polygon } from 'react-native-svg';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * EngiNear mascot "Hex": a friendly steel hex bolt. Every 2.6 seconds he gets tightened a sixth
 * of a turn (click!), squints with a big grin, and a burst of orange sparks flies out.
 * Rests with eyes open when Reduce Motion is on.
 */
export function Mascot({ size = 30, label = 'EngiNear' }: { size?: number; label?: string }) {
  const reduced = useReducedMotion();
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) { t.setValue(0); return; }
    const loop = Animated.loop(
      Animated.timing(t, { toValue: 1, duration: 2600, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, t]);

  const u = size / 34;
  // The bolt head turns one flat (60 degrees) with a little overshoot, like a ratchet click.
  const turn = t.interpolate({
    inputRange: [0, 0.16, 0.3, 0.36, 0.42, 1],
    outputRange: ['0deg', '0deg', '66deg', '57deg', '60deg', '60deg'],
  });
  // A tiny squash on the click.
  const squash = t.interpolate({ inputRange: [0, 0.28, 0.33, 0.4, 0.48, 1], outputRange: [1, 1, 0.9, 1.04, 1, 1] });
  const happy = t.interpolate({ inputRange: [0, 0.14, 0.2, 0.7, 0.78, 1], outputRange: [0, 0, 1, 1, 0, 0] });
  const calm = t.interpolate({ inputRange: [0, 0.14, 0.2, 0.7, 0.78, 1], outputRange: [1, 1, 0, 0, 1, 1] });

  // Sparks shoot out in a fan when the bolt clicks into place, then fade.
  const SPARKS = [
    { a: -150, d: 15, at: 0.3 }, { a: -115, d: 17, at: 0.31 }, { a: -65, d: 17, at: 0.31 },
    { a: -30, d: 15, at: 0.3 }, { a: -90, d: 18, at: 0.32 }, { a: 10, d: 12, at: 0.33 }, { a: 170, d: 12, at: 0.33 },
  ];
  const spark = (s: (typeof SPARKS)[number]) => {
    const rad = (s.a * Math.PI) / 180;
    const dx = Math.cos(rad) * s.d * u;
    const dy = Math.sin(rad) * s.d * u;
    return {
      opacity: t.interpolate({ inputRange: [0, s.at, s.at + 0.03, s.at + 0.2, s.at + 0.28, 1], outputRange: [0, 0, 1, 0.9, 0, 0] }),
      transform: [
        { translateX: t.interpolate({ inputRange: [0, s.at, s.at + 0.28, 1], outputRange: [0, 0, dx, dx] }) },
        { translateY: t.interpolate({ inputRange: [0, s.at, s.at + 0.28, 1], outputRange: [0, 0, dy, dy] }) },
        { rotate: `${s.a + 90}deg` },
        { scale: t.interpolate({ inputRange: [0, s.at, s.at + 0.08, s.at + 0.28, 1], outputRange: [0.3, 0.3, 1.1, 0.6, 0.6] }) },
      ],
    };
  };

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={{ width: size, height: size, overflow: 'visible' }}>
      {SPARKS.map((s, i) => (
        <Animated.View key={i} pointerEvents="none"
          style={[{ position: 'absolute', left: 15 * u, top: 15 * u, width: 4 * u, height: 4 * u }, spark(s)]}>
          <Svg width="100%" height="100%" viewBox="0 0 4 4">
            <Path d="M2 0L2.7 1.3L4 2L2.7 2.7L2 4L1.3 2.7L0 2L1.3 1.3Z" fill={i % 2 ? '#FFB020' : '#F97316'} />
          </Svg>
        </Animated.View>
      ))}
      <Animated.View style={{ position: 'absolute', left: 2 * u, top: 2 * u, width: 30 * u, height: 30 * u, transform: [{ scale: squash }] }}>
        {/* Bolt head (turns) */}
        <Animated.View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, transform: [{ rotate: turn }] }}>
          <Svg width="100%" height="100%" viewBox="0 0 30 30">
            <Polygon points="15,1 27.1,8 27.1,22 15,29 2.9,22 2.9,8" fill="#9AA4AF" />
            <Polygon points="15,3 25.4,9 25.4,21 15,27 4.6,21 4.6,9" fill="#C9D0D7" />
            {/* a shiny flat so you can see it turn */}
            <Polygon points="15,3 25.4,9 21,11.5 15,8" fill="#E9EDF1" />
            <Polygon points="4.6,21 15,27 15,22 9,18.5" fill="#AEB7C0" />
          </Svg>
        </Animated.View>
        {/* Face (stays upright) */}
        <Animated.View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, opacity: calm }}>
          <Svg width="100%" height="100%" viewBox="0 0 30 30">
            <Circle cx={11.2} cy={14} r={1.6} fill="#1D232B" />
            <Circle cx={18.8} cy={14} r={1.6} fill="#1D232B" />
            <Circle cx={11.7} cy={13.4} r={0.5} fill="#fff" />
            <Circle cx={19.3} cy={13.4} r={0.5} fill="#fff" />
            <Path d="M12.4 18.2q2.6 2 5.2 0" stroke="#1D232B" strokeWidth={1.3} fill="none" strokeLinecap="round" />
          </Svg>
        </Animated.View>
        <Animated.View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, opacity: happy }}>
          <Svg width="100%" height="100%" viewBox="0 0 30 30">
            <Path d="M9.4 14.4q1.8-2 3.6 0" stroke="#1D232B" strokeWidth={1.3} fill="none" strokeLinecap="round" />
            <Path d="M17 14.4q1.8-2 3.6 0" stroke="#1D232B" strokeWidth={1.3} fill="none" strokeLinecap="round" />
            <Circle cx={8.2} cy={17.4} r={1.5} fill="#F97316" opacity={0.45} />
            <Circle cx={21.8} cy={17.4} r={1.5} fill="#F97316" opacity={0.45} />
            <Path d="M11 17.2h8a4 4 0 0 1-8 0z" fill="#1D232B" />
            <Path d="M13.2 19.9a1.8 1.1 0 0 1 3.6 0a1.8 1.3 0 0 1-3.6 0z" fill="#F26B5B" />
          </Svg>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

/** Dark rounded tile holding Hex, used in headers. */
export function MascotMark({ size = 34 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.29, backgroundColor: '#2B323B', borderWidth: 1.5, borderColor: '#F97316',
      alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
      <Mascot size={size * 0.86} />
    </View>
  );
}
