import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { useColors } from '@/providers/SettingsProvider';

/** Simple accessible bar chart. Values are in cents. The last bar is emphasized. */
export function BarChart({ data, height = 180 }: { data: { label: string; cents: number }[]; height?: number }) {
  const c = useColors();
  const [width, setWidth] = useState(320);
  const padL = 46, padB = 24, padT = 18;
  const max = Math.max(5000, ...data.map((d) => d.cents));
  const nice = Math.ceil(max / 10000) * 10000;
  const bw = (width - padL) / Math.max(1, data.length);
  const y = (v: number) => height - padB - (v / nice) * (height - padB - padT);
  const summary = data.map((d) => `${d.label} $${Math.round(d.cents / 100)}`).join(', ');
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessible accessibilityLabel={`Chart: ${summary}`}>
      <Svg width={width} height={height}>
        {[0, nice / 2, nice].map((t) => (
          <React.Fragment key={t}>
            <Line x1={padL} x2={width} y1={y(t)} y2={y(t)} stroke={c.line} strokeWidth={1} />
            <SvgText x={padL - 6} y={y(t) + 4} fontSize={11} fill={c.muted} textAnchor="end">${Math.round(t / 100)}</SvgText>
          </React.Fragment>
        ))}
        {data.map((d, i) => {
          const h = Math.max(0, height - padB - y(d.cents));
          const x = padL + i * bw + bw * 0.2;
          const last = i === data.length - 1;
          return (
            <React.Fragment key={d.label + i}>
              <Rect x={x} y={y(d.cents)} width={bw * 0.6} height={h} rx={5} fill={c.brand} opacity={last ? 1 : 0.55} />
              {d.cents > 0 ? (
                <SvgText x={x + bw * 0.3} y={y(d.cents) - 4} fontSize={10.5} fontWeight="700" fill={c.text} textAnchor="middle">
                  ${Math.round(d.cents / 100)}
                </SvgText>
              ) : null}
              <SvgText x={x + bw * 0.3} y={height - 6} fontSize={11} fill={c.muted} textAnchor="middle">{d.label}</SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}
