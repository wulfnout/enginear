import React from 'react';
import { Linking } from 'react-native';
import { TopHeader, Button, Card, Screen, T } from '@/components/ui';
import { SITE_URL, SUPPORT_EMAIL } from '@/lib/constants';

// Policy pages on the EngiNear website. App Store and Google Play require a privacy policy URL.
const TERMS_URL = `${SITE_URL}/#terms`;
const PRIVACY_URL = `${SITE_URL}/#privacy`;

export default function Legal() {
  return (
    <Screen header={<TopHeader back title="Terms & privacy" showActions={false} />}>
      <Card>
        <T v="h3">Terms of Service</T>
        <T v="small" muted>The rules for using EngiNear, including payments, cancellations and how disputes are handled.</T>
        <Button kind="soft" title="Read Terms of Service" onPress={() => Linking.openURL(TERMS_URL)} />
      </Card>
      <Card>
        <T v="h3">Privacy Policy</T>
        <T v="small" muted>What we collect, why, and how you can download or delete your data.</T>
        <Button kind="soft" title="Read Privacy Policy" onPress={() => Linking.openURL(PRIVACY_URL)} />
      </Card>
      <Card>
        <T v="h3">Delete my account</T>
        <T v="small" muted>Email {SUPPORT_EMAIL} from the address on your account and we’ll delete your account and data within 30 days.</T>
        <Button kind="ghost" title="Request account deletion" onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Delete%20my%20EngiNear%20account`)} />
      </Card>
    </Screen>
  );
}
