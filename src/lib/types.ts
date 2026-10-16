export type Role = 'client' | 'mechanic';
export type WorkMode = 'mobile' | 'shop' | 'both';
export type WorkPlace = 'mobile' | 'shop';
export type Pricing = 'flat' | 'hourly' | 'quote';
/** How a mechanic prices one service. price is dollars (flat only); hours is the usual time it takes. */
export interface ServicePrice { pricing: Pricing; price?: number; hours?: number }
export type ServicePrices = Record<string, ServicePrice>;
export type BookingStatus = 'open' | 'requested' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'declined';

export interface Profile {
  id: string;
  role: Role;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  expo_push_token: string | null;
}

export interface ClientProfile {
  id: string;
  onboarded: boolean;
  needs: string[];
  priorities: string[];
  prefers: WorkPlace | 'either';
  monthly_budget: number;
  address: string | null;
  entry_notes: string | null;
  lat: number | null;
  lng: number | null;
  card_brand: string | null;
  card_last4: string | null;
  payment_method_id: string | null;
  rating: number;
  rating_count: number;
}

export interface MechanicProfile {
  id: string;
  legal_name: string | null;
  bio: string;
  services: string[];
  service_prices: ServicePrices;
  certifications: string[];
  specialties: string[];
  experience: string | null;
  days: string[];
  time_blocks: string[];
  work_mode: WorkMode;
  shop_name: string | null;
  shop_address: string | null;
  radius_miles: number;
  sources_parts: boolean;
  warranty_days: number;
  same_day: boolean;
  languages: string;
  hourly_rate: number;
  diag_fee: number;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  onboarding_steps: Record<string, boolean>;
  onboarding_complete: boolean;
  standards_quiz_passed: boolean;
  id_document_path: string | null;
  selfie_path: string | null;
  background_consent_at: string | null;
  verification_status: 'not_started' | 'pending' | 'approved' | 'needs_review' | 'rejected';
  stripe_account_id: string | null;
  payouts_enabled: boolean;
  is_online: boolean;
  weekly_goal: number;
  rating: number;
  rating_count: number;
  jobs_completed: number;
  on_time_count: number;
}

export interface MechanicListing {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string;
  services: string[];
  service_prices: ServicePrices;
  certifications: string[];
  specialties: string[];
  experience: string | null;
  work_mode: WorkMode;
  shop_name: string | null;
  shop_address: string | null;
  radius_miles: number;
  sources_parts: boolean;
  warranty_days: number;
  same_day: boolean;
  languages: string;
  hourly_rate: number;
  diag_fee: number;
  lat: number | null;
  lng: number | null;
  rating: number;
  rating_count: number;
  jobs_completed: number;
  on_time_pct: number | null;
  verified: boolean;
  is_online: boolean;
  distance_miles: number | null;
}

export interface Booking {
  id: string;
  client_id: string;
  mechanic_id: string | null;
  status: BookingStatus;
  service: string;
  pricing: Pricing;
  location_type: WorkPlace;
  vehicle_id: string | null;
  vehicle_label: string;
  hours: number;
  scheduled_at: string;
  notes: string | null;
  address: string;
  area: string | null;
  lat: number | null;
  lng: number | null;
  hourly_rate: number;
  base_cents: number;
  labor_extra_cents: number;
  parts_cents: number;
  subtotal_cents: number;
  discount_cents: number;
  fee_cents: number;
  total_cents: number;
  mechanic_payout_cents: number;
  tip_cents: number;
  platform_tip_cents: number;
  cancel_fee_cents: number;
  payment_status: string;
  client_reviewed: boolean;
  mechanic_reviewed: boolean;
  problem_report: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  // client-controlled job flow
  arrived_at: string | null;
  arrival_confirmed_at: string | null;
  photos_requested_at: string | null;
  completion_requested_at: string | null;
  completion_photos: string[];
  client_approved_at: string | null;
  approval_method: 'in_person' | 'photos' | 'auto' | null;
  review_reminder_at: string | null;
  client_checklist: Record<string, boolean> | null;
}

export interface Vehicle {
  id: string;
  client_id: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  mileage: number | null;
  vin: string | null;
  plate: string | null;
  color: string | null;
  nickname: string | null;
  created_at: string;
}

export interface QuoteItem { kind: 'part' | 'labor'; desc: string; cents: number }
export interface Quote {
  id: string;
  booking_id: string;
  mechanic_id: string;
  items: QuoteItem[];
  labor_cents: number;
  parts_cents: number;
  total_cents: number;
  note: string | null;
  status: 'sent' | 'approved' | 'declined' | 'replaced';
  decline_reason: string | null;
  created_at: string;
  decided_at: string | null;
}

export interface BookingWithPeople extends Booking {
  mechanic?: { full_name: string; avatar_url: string | null } | null;
  client?: { full_name: string; avatar_url: string | null } | null;
}

export interface JobFeedRow {
  booking: Booking;
  distance_miles: number | null;
  client_rating: number;
  client_first_name: string;
}

export interface Review {
  id: string;
  rating: number;
  tags: string[];
  body: string | null;
  created_at: string;
  author: string;
}

export interface Conversation {
  id: string;
  client_id: string;
  mechanic_id: string;
  last_message: string | null;
  last_message_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  data: Record<string, string>;
  read: boolean;
  created_at: string;
}
