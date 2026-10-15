import { router } from 'expo-router';
import React from 'react';
import { TopHeader, Button, Screen, T } from '@/components/ui';

export default function NotFound() {
  return (
    <Screen header={<TopHeader title="EngiNear" showActions={false} />}>
      <T v="h2">This page isn’t available</T>
      <T muted>It may have moved. Let’s get you back home.</T>
      <Button title="Go home" onPress={() => router.replace('/')} />
    </Screen>
  );
}
