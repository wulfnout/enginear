import * as Linking from 'expo-linking';
import { SITE_URL } from './constants';

/**
 * Email links and Stripe can't open the app directly, so they go to a small page on
 * the EngiNear website that explains what happened and has a button back into the app.
 * `appPath` is where the app should land; it works both in Expo Go and the real app.
 */
export function webReturnLink(page: 'confirmed' | 'reset' | 'payouts-done', appPath: string) {
  return `${SITE_URL}/${page}.html?to=${encodeURIComponent(Linking.createURL(appPath))}`;
}
