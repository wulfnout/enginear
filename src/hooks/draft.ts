import { useSyncExternalStore } from 'react';

/** The client's in-progress request from "Book a mechanic": what, which car, where, when. */
export type Draft = {
  service: string;
  vehicleId: string;
  place: 'mobile' | 'shop' | 'either';
  notes: string;
  day: number;
  time: string;
} | null;

let draft: Draft = null;
const listeners = new Set<() => void>();

export const setDraft = (d: Draft) => {
  draft = d;
  listeners.forEach((l) => l());
};

export function useDraft(): Draft {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => draft,
    () => draft,
  );
}
