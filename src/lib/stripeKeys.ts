// Stripe publishable keys are public by design (they ship inside every app).
// The server tells the app whether it is in live or test mode, and the app
// uses the matching key so the two always line up.
import { STRIPE_LIVE_PUBLISHABLE_KEY, STRIPE_TEST_PUBLISHABLE_KEY } from './config';

export const STRIPE_LIVE_KEY = STRIPE_LIVE_PUBLISHABLE_KEY;
export const STRIPE_TEST_KEY = STRIPE_TEST_PUBLISHABLE_KEY;
export const STRIPE_DEFAULT_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || STRIPE_LIVE_KEY;
