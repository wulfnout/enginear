// EngiNear's own backend. These are public keys (they ship inside the app); secrets live only in Supabase.
// Filled in once EngiNear's Supabase project and Stripe account exist. Build settings (eas.json) can override them.
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://pujquptettumkufegwil.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_X4-zhDXs48dKfZN_dWqiPw_I94OBdzE';
// Shares Clean Connect's Stripe account.
export const STRIPE_LIVE_PUBLISHABLE_KEY =
  'pk_live_51UQ7wKFgYJ8Mq75hVBACeUAhV2LH0qeslhKg6wx76PCbdrZv61elH3jwbzFRdpwQTzgy38jzRpLiemW8oEDyE3KD00jAMz1xow';
export const STRIPE_TEST_PUBLISHABLE_KEY =
  'pk_test_51UQ7wYFd2J7TUjkstJoZqx7BUL0vbGRnhrFwGvdj8JDg5pZSWKMuKv7LudegCPMtGYGyPYHfpgCIR3LIXy5VMKCl00vgDnYs3p';
