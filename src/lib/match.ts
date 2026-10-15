import type { MechanicListing, ClientProfile } from './types';

/** Ranks mechanics for a client using their setup answers. Higher is better. */
export function matchScore(c: MechanicListing, p: ClientProfile | null): number {
  let s = (c.rating_count ? Number(c.rating) : 4.5) * 2;
  if (!p) return s;
  for (const n of p.needs ?? []) if (c.services.includes(n)) s += 2;
  const w = p.priorities ?? [];
  const ase = c.certifications.some((x) => x.startsWith('ASE'));
  if (w.includes('ASE certified') && ase) s += 2;
  if (w.includes('Comes to me') && c.work_mode !== 'shop') s += 2;
  if (w.includes('Warranty on work') && c.warranty_days > 0) s += 2;
  if (w.includes('Same-day availability') && c.same_day) s += 2;
  if (w.includes('Speaks Spanish') && /spanish/i.test(c.languages)) s += 2;
  if (w.includes('Top rated only') && Number(c.rating) >= 4.8) s += 2;
  if (p.prefers === 'mobile' && c.work_mode === 'shop') s -= 3;
  if (p.prefers === 'shop' && c.work_mode === 'mobile') s -= 3;
  if (c.verified) s += 1;
  if (c.distance_miles != null) s -= c.distance_miles * 0.2;
  return s;
}

export type SortKey = 'match' | 'rating' | 'price' | 'distance';

export function sortMechanics(list: MechanicListing[], key: SortKey, p: ClientProfile | null) {
  const copy = list.slice();
  const by: Record<SortKey, (a: MechanicListing, b: MechanicListing) => number> = {
    match: (a, b) => matchScore(b, p) - matchScore(a, p),
    rating: (a, b) => Number(b.rating) - Number(a.rating) || b.rating_count - a.rating_count,
    price: (a, b) => a.hourly_rate - b.hourly_rate,
    distance: (a, b) => (a.distance_miles ?? 999) - (b.distance_miles ?? 999),
  };
  return copy.sort(by[key]);
}

export const FILTERS = ['4.8+ stars', 'Comes to me', 'Has a shop', 'ASE certified', 'Warranty', 'Same day', 'Verified'] as const;
export type Filter = (typeof FILTERS)[number];

export function applyFilters(list: MechanicListing[], filters: Filter[]) {
  return list.filter((c) => filters.every((f) => {
    switch (f) {
      case '4.8+ stars': return Number(c.rating) >= 4.8;
      case 'Comes to me': return c.work_mode !== 'shop';
      case 'Has a shop': return c.work_mode !== 'mobile';
      case 'ASE certified': return c.certifications.some((x) => x.startsWith('ASE'));
      case 'Warranty': return c.warranty_days > 0;
      case 'Same day': return c.same_day;
      case 'Verified': return c.verified;
      default: return true;
    }
  }));
}
