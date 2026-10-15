import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';
import { shortDate } from '@/lib/format';
import type { Review } from '@/lib/types';
import { useColors } from '@/providers/SettingsProvider';
import { Card, Pill, Progress, Row, T } from './ui';

/** Five stars with halves, e.g. 4.5 shows four full stars and one half star. */
export function StarRow({ rating, size = 18 }: { rating: number; size?: number }) {
  const c = useColors();
  return (
    <View accessible accessibilityLabel={`${rating.toFixed(1)} out of 5 stars`} style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const name = rating >= n - 0.25 ? 'star' : rating >= n - 0.75 ? 'star-half' : 'star-outline';
        return <Ionicons key={n} name={name} size={size} color={name === 'star-outline' ? c.line : c.star} />;
      })}
    </View>
  );
}

/** A mechanic's own rating: average, star breakdown and their most recent reviews. */
export function RatingCard({ rating, count, reviews, limit = 3 }: { rating: number; count: number; reviews: Review[]; limit?: number }) {
  const c = useColors();
  const avg = Number(rating) || 0;
  const total = reviews.length || 1;
  const dist = [5, 4, 3, 2, 1].map((s) => [s, reviews.filter((r) => r.rating === s).length] as const);

  return (
    <Card>
      <T v="h3">My rating</T>
      {count > 0 ? (
        <>
          <Row gap={14} style={{ alignItems: 'center' }}>
            <T v="h1" style={{ fontSize: 44, lineHeight: 50 }}>{avg.toFixed(1)}</T>
            <View style={{ gap: 4 }}>
              <StarRow rating={avg} size={22} />
              <T v="small" muted>{count} {count === 1 ? 'review' : 'reviews'} from clients</T>
            </View>
          </Row>
          {dist.map(([s, n]) => (
            <Row key={s} gap={8}>
              <T v="small" style={{ width: 52 }}>{s} star</T>
              <View style={{ flex: 1 }}><Progress value={n / total} color={c.star} /></View>
              <T v="small" muted style={{ width: 30, textAlign: 'right' }}>{n}</T>
            </Row>
          ))}
          {reviews.slice(0, limit).map((r) => (
            <View key={r.id} style={{ gap: 4, borderTopWidth: 1, borderTopColor: c.line, paddingTop: 10 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T v="label">{r.author}</T>
                <StarRow rating={r.rating} size={14} />
              </Row>
              {r.tags.length ? <Row gap={6} wrap>{r.tags.map((t) => <Pill key={t} label={t} />)}</Row> : null}
              {r.body ? <T v="small">{r.body}</T> : null}
              <T v="tiny" muted>{shortDate(r.created_at)}</T>
            </View>
          ))}
        </>
      ) : (
        <Row gap={12} style={{ alignItems: 'center' }}>
          <StarRow rating={0} size={22} />
          <T v="small" muted style={{ flex: 1 }}>No ratings yet. Your stars show here after your first completed job.</T>
        </Row>
      )}
    </Card>
  );
}
