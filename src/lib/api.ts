import { decode } from 'base64-arraybuffer';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { callFunction, supabase } from './supabase';
import type { Booking, BookingWithPeople, MechanicListing, JobFeedRow, Quote, QuoteItem, Review, Vehicle, WorkPlace } from './types';

async function rpc(name: string, args: Record<string, unknown>) {
  const { error } = await supabase.rpc(name, args);
  if (error) throw error;
}

/* ---------- Mechanics ---------- */
export async function searchMechanics(opts: { lat: number | null; lng: number | null; service?: string | null; query?: string; radius?: number }) {
  const { data, error } = await supabase.rpc('search_mechanics', {
    p_lat: opts.lat, p_lng: opts.lng, p_radius: opts.radius ?? 25, p_service: opts.service ?? null, p_query: opts.query ?? null,
  });
  if (error) throw error;
  return (data ?? []) as MechanicListing[];
}

export async function getMechanic(id: string, from?: { lat: number | null; lng: number | null }) {
  const list = await searchMechanics({ lat: from?.lat ?? null, lng: from?.lng ?? null, radius: 10000 });
  const hit = list.find((c) => c.id === id);
  if (hit) return hit;
  const { data } = await supabase.from('mechanic_directory').select('*').eq('id', id).single();
  return data ? ({ ...data, distance_miles: null } as MechanicListing) : null;
}

export async function getMechanicReviews(id: string) {
  const { data, error } = await supabase.rpc('mechanic_reviews', { p_mechanic: id });
  if (error) throw error;
  return (data ?? []) as Review[];
}

export async function getSaved(): Promise<string[]> {
  const { data } = await supabase.from('saved_mechanics').select('mechanic_id');
  return (data ?? []).map((r) => r.mechanic_id as string);
}
export async function setSaved(clientId: string, mechanicId: string, save: boolean) {
  if (save) await supabase.from('saved_mechanics').upsert({ client_id: clientId, mechanic_id: mechanicId });
  else await supabase.from('saved_mechanics').delete().eq('client_id', clientId).eq('mechanic_id', mechanicId);
}

/* ---------- Bookings ---------- */
const WITH_PEOPLE = '*, mechanic:profiles!bookings_mechanic_id_fkey(full_name, avatar_url), client:profiles!bookings_client_id_fkey(full_name, avatar_url)';

export async function myBookings(): Promise<BookingWithPeople[]> {
  const { data, error } = await supabase.from('bookings').select(WITH_PEOPLE).order('scheduled_at', { ascending: false }).limit(200);
  if (error) throw error;
  return (data ?? []) as BookingWithPeople[];
}

export async function getBooking(id: string): Promise<BookingWithPeople | null> {
  const { data } = await supabase.from('bookings').select(WITH_PEOPLE).eq('id', id).single();
  return (data as BookingWithPeople) ?? null;
}

export async function createBooking(input: {
  mechanicId: string | null; service: string; vehicleId: string; place: WorkPlace; hours: number; when: Date; notes?: string; promo?: string;
}) {
  const { data, error } = await supabase.rpc('create_booking', {
    p_mechanic_id: input.mechanicId, p_service: input.service, p_vehicle: input.vehicleId, p_location: input.place,
    p_hours: input.hours, p_scheduled_at: input.when.toISOString(), p_notes: input.notes ?? null, p_promo: input.promo || null,
  });
  if (error) throw error;
  return data as Booking;
}

export const rescheduleBooking = async (id: string, when: Date) => {
  const { error } = await supabase.rpc('reschedule_booking', { p_booking: id, p_when: when.toISOString() });
  if (error) throw error;
};
export const cancelBooking = (id: string) => callFunction<{ feeCents: number }>('cancel-booking', { bookingId: id });
/** Tip the worker (100% theirs), or `to: 'platform'` for an optional thank-you to EngiNear itself. */
export const addTip = (id: string, cents: number, to: 'worker' | 'platform' = 'worker') => callFunction('add-tip', { bookingId: id, amountCents: cents, to });
export const reportProblem = async (id: string, text: string) => {
  const { error } = await supabase.rpc('report_problem', { p_booking: id, p_text: text });
  if (error) throw error;
};
export const submitReview = async (id: string, rating: number, tags: string[], body: string) => {
  const { error } = await supabase.rpc('submit_review', { p_booking: id, p_rating: rating, p_tags: tags, p_body: body });
  if (error) throw error;
};

/* ---------- Vehicles ---------- */
export type VehicleInput = Omit<Vehicle, 'id' | 'client_id' | 'created_at'>;
export async function myVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabase.from('vehicles').select('*').order('created_at');
  if (error) throw error;
  return (data ?? []) as Vehicle[];
}
export async function getVehicle(id: string): Promise<Vehicle | null> {
  const { data } = await supabase.from('vehicles').select('*').eq('id', id).maybeSingle();
  return (data as Vehicle) ?? null;
}
export async function saveVehicle(clientId: string, v: VehicleInput, id?: string) {
  const row = { ...v, vin: v.vin?.trim().toUpperCase() || null, client_id: clientId };
  const { data, error } = id
    ? await supabase.from('vehicles').update(row).eq('id', id).select().single()
    : await supabase.from('vehicles').insert(row).select().single();
  if (error) throw error;
  return data as Vehicle;
}
export async function deleteVehicle(id: string) {
  const { error } = await supabase.from('vehicles').delete().eq('id', id);
  if (error) throw error;
}
export const vehicleName = (v: Pick<Vehicle, 'year' | 'make' | 'model' | 'trim'>) => [v.year, v.make, v.model, v.trim].filter(Boolean).join(' ');

/* ---------- Quotes (parts + labor the client approves) ---------- */
export async function bookingQuotes(bookingId: string): Promise<Quote[]> {
  const { data, error } = await supabase.from('quotes').select('*').eq('booking_id', bookingId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Quote[];
}
export async function sendQuote(bookingId: string, items: QuoteItem[], note?: string) {
  const { data, error } = await supabase.rpc('send_quote', { p_booking: bookingId, p_items: items, p_note: note ?? null });
  if (error) throw error;
  return data as Quote;
}
export const approveQuote = (id: string) => rpc('approve_quote', { p_quote: id });
export const declineQuote = (id: string, reason?: string) => rpc('decline_quote', { p_quote: id, p_reason: reason ?? null });

/* ---------- Parts market ---------- */
export interface PartListing {
  id: string; title: string; price: number | null; currency: string; shipping: number | null;
  condition: string | null; image: string | null; url: string; seller: string | null; sellerRating: string | null;
  fits: 'yes' | 'maybe' | 'unknown';
}
/** Live new and used listings (eBay Motors). `configured: false` until eBay keys are added on the server. */
export const searchParts = (query: string, condition: 'new' | 'used' | 'any', car?: { year: number; make: string; model: string } | null) =>
  callFunction<{ configured: boolean; items: PartListing[]; total?: number }>('parts-search', { query, condition, car: car ?? null });

/* ---------- Mechanic jobs ---------- */
export async function jobFeed(lat?: number | null, lng?: number | null): Promise<JobFeedRow[]> {
  const { data, error } = await supabase.rpc('job_feed', { p_lat: lat ?? null, p_lng: lng ?? null });
  if (error) throw error;
  return (data ?? []) as JobFeedRow[];
}
export const acceptJob = async (id: string) => {
  const { error } = await supabase.rpc('accept_booking', { p_booking: id });
  if (error) throw error;
};
export const declineJob = async (id: string) => {
  const { error } = await supabase.rpc('decline_booking', { p_booking: id });
  if (error) throw error;
};
export const startJob = async (id: string) => {
  const { error } = await supabase.rpc('start_booking', { p_booking: id });
  if (error) throw error;
};
export const finishJob = (id: string) => callFunction<{ paymentStatus: string; earnedCents: number }>('complete-booking', { bookingId: id });

/* ---------- Client-controlled job flow ---------- */
/** Check in. Mobile: the mechanic says "I've arrived". Shop: the client says "I dropped off my car". */
export const checkIn = (id: string) => rpc('check_in', { p_booking: id });
/** The other person confirms. Mobile: the client. Shop: the mechanic. Only then can work begin. */
export const confirmCheckIn = (id: string) => rpc('confirm_check_in', { p_booking: id });
/** Client (not home): ask the mechanic for photos of the finished work. */
export const requestPhotos = (id: string) => rpc('request_photos', { p_booking: id });
/** Client: approve the finished work, in person (checklist) or from photos. */
export const approveCompletion = (id: string, checklist: Record<string, boolean>, method: 'in_person' | 'photos') =>
  rpc('approve_completion', { p_booking: id, p_checklist: checklist, p_method: method });
/** Mechanic: upload photos of the finished work and ask the client to approve. */
export async function sendCompletionPhotos(bookingId: string, uris: string[]) {
  const paths: string[] = [];
  for (const [i, uri] of uris.entries()) {
    const b64 = await toJpegBase64(uri, 1400);
    const path = `${bookingId}/${Date.now()}-${i}.jpg`;
    const { error } = await supabase.storage.from('job-photos').upload(path, decode(b64), { contentType: 'image/jpeg' });
    if (error) throw error;
    paths.push(path);
  }
  await rpc('submit_completion_photos', { p_booking: bookingId, p_paths: paths });
}
/** Temporary links to view a job's photos (private bucket). */
export async function jobPhotoUrls(paths: string[]) {
  if (!paths.length) return [];
  const { data, error } = await supabase.storage.from('job-photos').createSignedUrls(paths, 60 * 60);
  if (error) throw error;
  return (data ?? []).map((d) => d.signedUrl).filter(Boolean) as string[];
}
/** Pick several photos from the library (or take one with the camera). */
export async function pickPhotos(source: 'camera' | 'library'): Promise<string[]> {
  const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error(source === 'camera' ? 'Please allow camera access in your phone’s Settings.' : 'Please allow photo access in your phone’s Settings.');
  const res = source === 'camera'
    ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 })
    : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, allowsMultipleSelection: true, selectionLimit: 8 });
  if (res.canceled) return [];
  return res.assets.map((a) => a.uri);
}
/** Client: retry a declined payment with the card on file. */
export const retryPayment = (id: string) =>
  callFunction<{ ok: boolean; paymentStatus?: string; needsAction?: boolean; clientSecret?: string }>('retry-payment', { bookingId: id });

/** When the booked time is up, counted from when the job began. Only hourly jobs wait for it before finishing. */
export const jobEndsAt = (b: { started_at: string | null; hours: number }) =>
  b.started_at ? new Date(b.started_at).getTime() + Number(b.hours) * 36e5 : null;

/* ---------- Payments ---------- */
export const paymentSheetParams = () =>
  callFunction<{ setupIntent: string; ephemeralKey: string; customer: string; livemode?: boolean }>('payment-sheet');
/** The link Stripe's website sends mechanics back to. Works in the real app and in Expo Go. */
export const payoutsReturnLink = () => Linking.createURL('payouts-done');
export const connect = <T = { url: string }>(action: 'onboard' | 'dashboard' | 'status' | 'balance' | 'instant_payout') =>
  callFunction<T>('stripe-connect', { action, returnTo: payoutsReturnLink() });

/* ---------- Messaging ---------- */
export async function startConversation(mechanicId: string) {
  const { data, error } = await supabase.rpc('start_conversation', { p_mechanic: mechanicId });
  if (error) throw error;
  return data as string;
}

/* ---------- AI assistant ---------- */
export const askAssistant = (messages: { role: 'user' | 'assistant'; content: string }[]) =>
  callFunction<{ reply: string }>('ai-assistant', { messages, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });

/* ---------- Photos & files ---------- */
export async function pickImage(source: 'camera' | 'library', square = true): Promise<string | null> {
  const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error(source === 'camera' ? 'Please allow camera access in your phone’s Settings.' : 'Please allow photo access in your phone’s Settings.');
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: square ? [1, 1] : undefined, quality: 0.9 };
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets?.[0]) return null;
  return res.assets[0].uri;
}

async function toJpegBase64(uri: string, width: number) {
  const ctx = ImageManipulator.ImageManipulator.manipulate(uri);
  ctx.resize({ width });
  const image = await ctx.renderAsync();
  const out = await image.saveAsync({ compress: 0.82, format: ImageManipulator.SaveFormat.JPEG, base64: true });
  return out.base64 ?? '';
}

export async function uploadAvatar(userId: string, uri: string) {
  const b64 = await toJpegBase64(uri, 512);
  const path = `${userId}/avatar-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from('avatars').upload(path, decode(b64), { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}

export async function uploadVerification(userId: string, uri: string, kind: 'id' | 'selfie') {
  const b64 = await toJpegBase64(uri, 1600);
  const path = `${userId}/${kind}-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from('verification').upload(path, decode(b64), { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  return path;
}

/* ---------- Location ---------- */
export async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await Location.geocodeAsync(address);
    return res[0] ? { lat: res[0].latitude, lng: res[0].longitude } : null;
  } catch {
    return null;
  }
}

export async function currentPosition(): Promise<{ lat: number; lng: number } | null> {
  const { granted } = await Location.requestForegroundPermissionsAsync();
  if (!granted) return null;
  const pos = await Location.getLastKnownPositionAsync() ?? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return pos ? { lat: pos.coords.latitude, lng: pos.coords.longitude } : null;
}
