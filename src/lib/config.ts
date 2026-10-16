// EngiNear's own backend. These are public keys (they ship inside the app); secrets live only in Supabase.
// Filled in once EngiNear's Supabase project and Stripe account exist. Build settings (eas.json) can override them.
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://pujquptettumkufegwil.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_X4-zhDXs48dKfZN_dWqiPw_I94OBdzE';
export const STRIPE_LIVE_PUBLISHABLE_KEY = 'ENGINEAR_STRIPE_LIVE_PUBLISHABLE_KEY';
export const STRIPE_TEST_PUBLISHABLE_KEY = 'ENGINEAR_STRIPE_TEST_PUBLISHABLE_KEY';
