import React from 'react';
import { AppTabs } from '@/components/TabBar';

export default function MechanicTabs() {
  return (
    <AppTabs
      tabs={[
        { name: 'earnings', title: 'Earnings', icon: 'wallet-outline', iconOn: 'wallet' },
        { name: 'jobs', title: 'Find jobs', icon: 'search-outline', iconOn: 'search' },
        { name: 'schedule', title: 'Schedule', icon: 'calendar-outline', iconOn: 'calendar' },
        { name: 'messages', title: 'Messages', icon: 'chatbubbles-outline', iconOn: 'chatbubbles' },
        { name: 'profile', title: 'Me', icon: 'person-outline', iconOn: 'person' },
      ]}
    />
  );
}
