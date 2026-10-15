import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { RefreshControl, View } from 'react-native';
import { Button, Card, EmptyState, Loading, Row, Screen, T, TopHeader } from '@/components/ui';
import { useData } from '@/hooks/useData';
import { myBookings, myVehicles, vehicleName } from '@/lib/api';
import { shortDate } from '@/lib/format';
import { useColors } from '@/providers/SettingsProvider';

/** My garage: every car on the account, with its service history. */
export default function Vehicles() {
  const c = useColors();
  const { data, loading, refreshing, refresh } = useData(async () => {
    const [vehicles, bookings] = await Promise.all([myVehicles(), myBookings()]);
    return { vehicles, bookings };
  });
  if (loading && !data) return <Loading />;
  const vehicles = data?.vehicles ?? [];

  return (
    <Screen header={<TopHeader back title="My garage" showActions={false} />} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      footer={vehicles.length ? <View style={{ padding: 16 }}><Button icon="add" title="Add a vehicle" onPress={() => router.push('/vehicle')} /></View> : undefined}>
      {!vehicles.length ? (
        <EmptyState icon="car-sport-outline" title="No vehicles yet" text="Add your car so mechanics know what they’re working on." action="Add a vehicle" onAction={() => router.push('/vehicle')} />
      ) : vehicles.map((v) => {
        const history = (data?.bookings ?? []).filter((b) => b.vehicle_id === v.id && b.status === 'completed');
        return (
          <Card key={v.id} onPress={() => router.push({ pathname: '/vehicle', params: { id: v.id } })} accessibilityLabel={`Edit ${vehicleName(v)}`}>
            <Row>
              <Ionicons name="car-sport" size={28} color={c.brand} />
              <View style={{ flex: 1 }}>
                <T v="h3">{v.nickname || vehicleName(v)}</T>
                {v.nickname ? <T v="small" muted>{vehicleName(v)}</T> : null}
                <T v="tiny" muted>{[v.mileage != null ? `${v.mileage.toLocaleString()} mi` : null, v.color, v.plate, v.vin ? `VIN …${v.vin.slice(-6)}` : null].filter(Boolean).join(' · ') || 'Tap to add mileage and VIN'}</T>
              </View>
              <Ionicons name="create-outline" size={22} color={c.muted} />
            </Row>
            {history.length ? (
              <View style={{ gap: 4, borderTopWidth: 1, borderTopColor: c.line, paddingTop: 8 }}>
                <T v="label">Service history</T>
                {history.slice(0, 5).map((b) => (
                  <Row key={b.id} style={{ justifyContent: 'space-between' }}>
                    <T v="small">{b.service}</T><T v="small" muted>{shortDate(b.completed_at ?? b.scheduled_at)}</T>
                  </Row>
                ))}
              </View>
            ) : null}
            <Button small kind="soft" icon="construct-outline" title="Book service for this car"
              onPress={() => router.push({ pathname: '/quick-book', params: { vehicleId: v.id } })} />
          </Card>
        );
      })}
    </Screen>
  );
}
