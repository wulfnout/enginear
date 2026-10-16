import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import type { Pricing, ServicePrice } from './types';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/** The EngiNear website (return pages after email links and Stripe, terms, sharing). */
export const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL ?? 'https://cleanconnect.info/enginear';

export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? 'enginearsupport@gmail.com';

/** The service menu. `pricing` is the usual way it's priced; each mechanic can change it. */
export const SERVICES: { name: string; icon: IconName; desc: string; pricing: Pricing; price?: number; hours: number }[] = [
  { name: 'Oil change', icon: 'water-outline', desc: 'Oil, filter and a quick check-over', pricing: 'flat', price: 79, hours: 1 },
  { name: 'Diagnostics', icon: 'pulse-outline', desc: 'Check engine light, noises, won’t start', pricing: 'quote', hours: 1 },
  { name: 'Brakes', icon: 'disc-outline', desc: 'Pads, rotors, squeaks and grinding', pricing: 'quote', hours: 2 },
  { name: 'Battery', icon: 'battery-charging-outline', desc: 'Test, jump or replace', pricing: 'flat', price: 60, hours: 1 },
  { name: 'Tires & rotation', icon: 'ellipse-outline', desc: 'Rotate, swap, patch and balance', pricing: 'flat', price: 50, hours: 1 },
  { name: 'Tune-up', icon: 'construct-outline', desc: 'Plugs, filters, belts and fluids', pricing: 'flat', price: 180, hours: 2 },
  { name: 'AC & heating', icon: 'thermometer-outline', desc: 'Recharge, leaks, blower and heater', pricing: 'quote', hours: 2 },
  { name: 'Suspension & steering', icon: 'git-commit-outline', desc: 'Shocks, struts, tie rods, alignment', pricing: 'quote', hours: 3 },
  { name: 'Electrical', icon: 'flash-outline', desc: 'Lights, alternator, starter, wiring', pricing: 'hourly', hours: 2 },
  { name: 'Engine repair', icon: 'cog-outline', desc: 'Leaks, gaskets, timing, overheating', pricing: 'quote', hours: 4 },
  { name: 'Cooling system', icon: 'snow-outline', desc: 'Radiator, hoses, water pump, coolant', pricing: 'quote', hours: 2 },
  { name: 'Pre-purchase inspection', icon: 'clipboard-outline', desc: 'Full check before you buy a used car', pricing: 'flat', price: 120, hours: 1.5 },
];
export const SERVICE_NAMES = SERVICES.map((s) => s.name);
export const BOOKABLE_SERVICES = SERVICES.slice(0, 8);
export const serviceIcon = (name: string): IconName => SERVICES.find((s) => s.name === name)?.icon ?? 'construct-outline';
export const defaultServicePrice = (name: string): ServicePrice => {
  const s = SERVICES.find((x) => x.name === name);
  return { pricing: s?.pricing ?? 'quote', price: s?.price, hours: s?.hours ?? 1 };
};

export const PRICING: { value: Pricing; label: string; short: string; desc: string; icon: IconName }[] = [
  { value: 'flat', label: 'Flat price', short: 'Flat', desc: 'One set price for the job', icon: 'pricetag-outline' },
  { value: 'hourly', label: 'Hourly + parts', short: 'Hourly', desc: 'Your labor rate times the hours, plus parts', icon: 'time-outline' },
  { value: 'quote', label: 'Diagnose, then quote', short: 'Quote', desc: 'Diagnostic fee first, then a parts and labor quote', icon: 'document-text-outline' },
];
export const pricingLabel = (p: Pricing) => PRICING.find((x) => x.value === p)?.label ?? p;

/** Diagnostic fee for an open request (no mechanic chosen). Mirrors open_request_diag_cents() on the server. */
export const OPEN_REQUEST_DIAG_CENTS = 4900;

export const CERTIFICATIONS = ['ASE Certified', 'ASE Master Technician', 'Manufacturer trained', 'EV / Hybrid certified', 'Diesel certified', 'State inspector', 'Trade school graduate'];
export const SPECIALTIES = ['Domestic', 'Asian', 'European', 'Trucks & diesel', 'EV & hybrid', 'Classic cars', 'Motorcycles'];
export const WARRANTIES: { days: number; label: string }[] = [
  { days: 0, label: 'No warranty' }, { days: 30, label: '30 days' }, { days: 90, label: '90 days' },
  { days: 365, label: '12 months' },
];
export const warrantyLabel = (days: number) => WARRANTIES.find((w) => w.days === days)?.label ?? `${days} days`;

export const WORK_MODES: { value: 'mobile' | 'shop' | 'both'; label: string; desc: string; icon: IconName }[] = [
  { value: 'mobile', label: 'Mobile', desc: 'I go to the customer’s driveway or parking lot', icon: 'car-sport-outline' },
  { value: 'shop', label: 'At my shop', desc: 'Customers bring the car to me', icon: 'business-outline' },
  { value: 'both', label: 'Both', desc: 'Mobile for small jobs, shop for bigger ones', icon: 'swap-horizontal-outline' },
];
export const placeLabel = (p: 'mobile' | 'shop') => (p === 'shop' ? 'At the shop' : 'Mobile · they come to you');

export const ARRIVAL_TIMES = ['8:00 AM', '10:00 AM', '12:00 PM', '2:00 PM', '4:00 PM', '6:00 PM'];

export const SERVICE_FEE_RATE = 0.06;
export const PLATFORM_COMMISSION = 0.1;
export const LATE_CANCEL_FEE_CENTS = 1500;
export const PROMO_CODE = 'FIRSTFIX10';
export const PROMO_CENTS = 1000;

export const PRIORITIES: { name: string; icon: IconName }[] = [
  { name: 'ASE certified', icon: 'ribbon-outline' },
  { name: 'Comes to me', icon: 'car-sport-outline' },
  { name: 'Warranty on work', icon: 'shield-checkmark-outline' },
  { name: 'Same-day availability', icon: 'flash-outline' },
  { name: 'Speaks Spanish', icon: 'chatbubbles-outline' },
  { name: 'Top rated only', icon: 'star-outline' },
];

export const MAKES = ['Acura', 'Audi', 'BMW', 'Buick', 'Cadillac', 'Chevrolet', 'Chrysler', 'Dodge', 'Ford', 'GMC', 'Honda', 'Hyundai',
  'Infiniti', 'Jeep', 'Kia', 'Lexus', 'Lincoln', 'Mazda', 'Mercedes-Benz', 'Mitsubishi', 'Nissan', 'Ram', 'Subaru', 'Tesla', 'Toyota',
  'Volkswagen', 'Volvo'];

export const MECHANIC_STEPS: { key: string; title: string; desc: string; icon: IconName }[] = [
  { key: 'info', title: 'Your basic info', desc: 'Name, phone and ZIP code', icon: 'person-outline' },
  { key: 'skills', title: 'Skills & certifications', desc: 'What you fix and what you’re certified in', icon: 'construct-outline' },
  { key: 'pricing', title: 'Your prices', desc: 'Labor rate, diagnostic fee and price per service', icon: 'pricetag-outline' },
  { key: 'where', title: 'Where you work', desc: 'Mobile, at your shop, or both', icon: 'location-outline' },
  { key: 'availability', title: 'When you can work', desc: 'Days and times you prefer', icon: 'calendar-outline' },
  { key: 'verify', title: 'Verify your identity', desc: 'Photo ID, selfie and background check', icon: 'id-card-outline' },
  { key: 'quiz', title: 'EngiNear 101', desc: '3 quick questions on our standards', icon: 'school-outline' },
  { key: 'payouts', title: 'Set up payouts', desc: 'Where your earnings go', icon: 'wallet-outline' },
];

export const STANDARDS_QUIZ: { q: string; options: string[]; answer: number }[] = [
  {
    q: 'Halfway through a brake job you find the calipers are seized too. What do you do?',
    options: ['Replace them and add it to the bill', 'Send the client a quote in the app and wait for their approval', 'Leave them and say nothing'],
    answer: 1,
  },
  {
    q: 'You’re going to be 20 minutes late. When do you tell the client?',
    options: ['As soon as you know, in the app', 'When you arrive', 'No need to mention it'],
    answer: 0,
  },
  {
    q: 'You leave a scratch on the client’s bumper. What’s next?',
    options: ['Buff it out and hope they don’t notice', 'Take a photo and report it in the app the same day', 'Fix it next time'],
    answer: 1,
  },
];

export const REVIEW_TAGS = ['On time', 'Fixed it right', 'Fair price', 'Explained everything', 'Clean work area', 'Would book again'];
export const CLIENT_REVIEW_TAGS = ['Clear description', 'Car was ready', 'Respectful', 'Easy to reach', 'Would work again'];
