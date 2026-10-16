import React from 'react';
import { AppTabs } from '@/components/TabBar';

export default function ClientTabs() {
  return (
    <AppTabs
      tabs={[
        { name: 'home', title: 'Home', icon: 'home-outline', iconOn: 'home' },
        { name: 'find', title: 'Find', icon: 'search-outline', iconOn: 'search' },
        { name: 'parts', title: 'Parts', icon: 'cog-outline', iconOn: 'cog' },
        { name: 'bookings', title: 'Bookings', icon: 'calendar-outline', iconOn: 'calendar' },
        // Spending is opened from Me, so it has no tab of its own.
        { name: 'spending', title: 'Spending', icon: 'wallet-outline', iconOn: 'wallet', hidden: true },
        { name: 'account', title: 'Me', icon: 'person-outline', iconOn: 'person' },
      ]}
    />
  );
}
