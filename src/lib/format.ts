import { PROMO_CENTS, SERVICE_FEE_RATE } from './constants';
import type { ServicePrice } from './types';

export const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
export const money0 = (cents: number) => `$${Math.round(cents / 100).toLocaleString()}`;

export const startOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
export const addDays = (n: number, from = new Date()) => {
  const d = startOfDay(from);
  d.setDate(d.getDate() + n);
  return d;
};
export const shortDate = (d: Date | string) =>
  new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
export const longDate = (d: Date | string) =>
  new Date(d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
export const timeOf = (d: Date | string) =>
  new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
export const dayLabel = (d: Date | string) => {
  const diff = Math.round((startOfDay(new Date(d)).getTime() - startOfDay().getTime()) / 864e5);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return shortDate(d);
};
export const firstName = (n?: string | null) => (n ?? '').trim().split(/\s+/)[0] || 'there';
export const initials = (n?: string | null) =>
  (n ?? '?').trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();

/** Combines a day and a label like "10:00 AM" into a Date. */
export function atTime(day: Date, label: string): Date {
  const m = label.match(/(\d+):(\d+)\s*(AM|PM)/i);
  const d = new Date(day);
  if (!m) return d;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  d.setHours(h, Number(m[2]), 0, 0);
  return d;
}

export interface PriceEstimate {
  /** What the booking starts at: the flat price, hours x rate, or the diagnostic fee. */
  base: number;
  baseLabel: string;
  promo: number;
  fee: number;
  total: number;
  /** True when more may be added later through a quote the client approves (parts, repairs). */
  more: boolean;
}

/**
 * Display-only price estimate. The server (create_booking / price_booking) computes the real price
 * the same way: base, minus promo, plus the 6% service fee.
 */
export function estimate(sp: ServicePrice, rate: number, diagFee: number, hours: number, promo: boolean): PriceEstimate {
  let base = 0;
  let baseLabel = '';
  if (sp.pricing === 'flat') {
    base = Math.round((sp.price ?? 0) * 100);
    baseLabel = 'Flat price';
  } else if (sp.pricing === 'hourly') {
    base = Math.round(rate * hours * 100);
    baseLabel = `${hours} hr labor × $${rate}`;
  } else {
    base = diagFee * 100;
    baseLabel = 'Diagnostic fee';
  }
  const fee = Math.round(base * SERVICE_FEE_RATE);
  const promoCents = promo ? PROMO_CENTS : 0;
  return { base, baseLabel, promo: promoCents, fee, total: Math.max(base - promoCents + fee, 0), more: sp.pricing !== 'flat' };
}

/** "From $79", "$95/hr + parts" or "$60 diagnosis + quote" for one service. */
export function priceHint(sp: ServicePrice | undefined, rate: number, diagFee: number) {
  if (!sp || sp.pricing === 'quote') return `$${diagFee} diagnosis + quote`;
  if (sp.pricing === 'hourly') return `$${rate}/hr + parts`;
  return `$${sp.price ?? 0} flat`;
}

export function milesBetween(a: { lat: number | null; lng: number | null }, b: { lat: number | null; lng: number | null }) {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return null;
  const R = 3958.8;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const miles = (m: number | null | undefined) => (m == null ? '' : m < 10 ? `${m.toFixed(1)} mi` : `${Math.round(m)} mi`);
