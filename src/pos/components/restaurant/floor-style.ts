import { useEffect, useState, type RefObject } from 'react';
import { md3 } from '../../../theme/tokens';
import { FLOOR_H, FLOOR_W } from '../../data/floor';
import type { TableStatus } from '../../logic/restaurant';

/**
 * The floor's look and fit, shared by `FloorPlan` and the Table Chart editor (V1 → V2, Wave 2).
 *
 * Kept out of `FloorPlan.tsx` because a file that exports components should export only
 * components — React's fast refresh reloads the whole module otherwise.
 */

/** How each derived table status looks on the live floor. Status is never stored — see `logic/restaurant.ts`. */
export const TABLE_STATUS_STYLE: Record<TableStatus, { bg: string; border: string; text: string; label: string }> = {
  free: { bg: '#ffffff', border: md3.primary, text: md3.onSurface, label: 'Free' },
  reserved: { bg: '#fef3c7', border: '#d97706', text: '#78350f', label: 'Reserved' },
  seated: { bg: md3.primary, border: md3.primary, text: '#ffffff', label: 'Seated' },
  check: { bg: '#ea580c', border: '#c2410c', text: '#ffffff', label: 'Check' },
  blocked: { bg: '#e5e7eb', border: '#9ca3af', text: '#4b5563', label: 'Out of service' },
};

/** Scale floor units to fit a box, preserving aspect ratio. */
export function useFitScale(ref: RefObject<HTMLElement | null>, w = FLOOR_W, h = FLOOR_H): number {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width && r.height) setScale(Math.min(r.width / w, r.height / h));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, w, h]);
  return scale;
}
