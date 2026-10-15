import React from 'react';
import { AppTabs } from '@/components/TabBar';

export default function ClientTabs() {
  return (
    <AppTabs
      tabs={[
        { name: 'home', title: 'Home', icon: 'home-outline', iconOn: 'home' },
        { name: 'find', title: 'Find', icon: 'search-outline', iconOn: 'search' },
        { name: 'bookings', title: 'Bookings', icon: 'calendar-outline', iconOn: 'calendar' },
        { name: 'spending', title: 'Spending', icon: 'wallet-outline', iconOn: 'wallet' },
        { name: 'account', title: 'Me', icon: 'person-outline', iconOn: 'person' },
      ]}
    />
  );
}
