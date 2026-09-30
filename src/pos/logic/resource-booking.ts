import { SHEETS, resourceById, type ResourceBooking, type ResourceKind } from '../data/resources';
import type { CartItem } from '../types';

/**
 * The rules for booking a court or a bay. Pure, so the sheet, the panel and the tests agree.
 */

/** What a booking costs: the resource's hourly rate for its length, to the cent. */
export function resourcePrice(b: Pick<ResourceBooking, 'resourceId' | 'durationMin'>): number {
  const r = resourceById(b.resourceId);
  if (!r) return 0;
  return Math.round(r.hourly * (b.durationMin / 60) * 100) / 100;
}

export const endMin = (b: Pick<ResourceBooking, 'startMin' | 'durationMin'>): number => b.startMin + b.durationMin;

/** Two half-open intervals `[start, end)` overlap. Back-to-back bookings do not. */
export const overlaps = (
  a: Pick<ResourceBooking, 'startMin' | 'durationMin'>,
  b: Pick<ResourceBooking, 'startMin' | 'durationMin'>,
): boolean => a.startMin < endMin(b) && b.startMin < endMin(a);

/**
 * Whatever on the same resource and day would collide with `candidate`.
 *
 * `candidate` is excluded by id, so resizing a booking does not collide with itself.
 */
export function conflictsWith(candidate: ResourceBooking, all: ResourceBooking[]): ResourceBooking[] {
  return all.filter(
    (b) =>
      b.id !== candidate.id &&
      b.resourceId === candidate.resourceId &&
      b.date === candidate.date &&
      overlaps(b, candidate),
  );
}

/** Snap a minute value down to the sheet's grid. */
export function snap(kind: ResourceKind, minute: number): number {
  const { stepMin, openMin, closeMin } = SHEETS[kind];
  const s = Math.floor((minute - openMin) / stepMin) * stepMin + openMin;
  return Math.max(openMin, Math.min(s, closeMin - stepMin));
}

/**
 * The longest a booking starting at `startMin` can run before it hits the next booking or
 * closing time — so the duration stepper cannot offer a length that would collide.
 */
export function maxDurationAt(
  kind: ResourceKind,
  resourceId: string,
  date: string,
  startMin: number,
  all: ResourceBooking[],
  ignoreId?: string,
): number {
  const cfg = SHEETS[kind];
  const next = all
    .filter((b) => b.id !== ignoreId && b.resourceId === resourceId && b.date === date && b.startMin >= startMin)
    .reduce((m, b) => Math.min(m, b.startMin), cfg.closeMin);
  return Math.max(0, Math.min(cfg.maxDurationMin, next - startMin));
}

/**
 * Whether a new booking can start at `startMin` at all — i.e. the minimum length fits there.
 * Used to decide whether tapping an empty stretch of the sheet offers a booking.
 */
export function canStartAt(
  kind: ResourceKind,
  resourceId: string,
  date: string,
  startMin: number,
  all: ResourceBooking[],
): boolean {
  const inside = all.some(
    (b) => b.resourceId === resourceId && b.date === date && startMin >= b.startMin && startMin < endMin(b),
  );
  if (inside) return false;
  return maxDurationAt(kind, resourceId, date, startMin, all) >= SHEETS[kind].minDurationMin;
}

/** Clamp a proposed duration to the grid, the sheet's limits and the room available. */
export function clampDuration(kind: ResourceKind, proposed: number, room: number): number {
  const { stepMin, minDurationMin, maxDurationMin } = SHEETS[kind];
  const snapped = Math.round(proposed / stepMin) * stepMin;
  return Math.max(minDurationMin, Math.min(snapped, maxDurationMin, room));
}

/**
 * The order line a booking becomes at Check in & pay.
 *
 * `resourceBookingId` is how the payment finds its way back: `recordPayment` marks every
 * booking named on the order as paid, exactly as it does for the tee time behind an order.
 */
export function resourceCartLine(b: ResourceBooking): CartItem {
  const r = resourceById(b.resourceId);
  const price = resourcePrice(b);
  return {
    name: `${r?.name ?? 'Resource'} · ${formatDuration(b.durationMin)}`,
    price,
    unitPrice: price,
    qty: 1,
    resourceBookingId: b.id,
  };
}

/** `90` → `1 hr 30 min`, `60` → `1 hr`, `30` → `30 min`. */
export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h} hr ${m} min`;
  if (h) return `${h} hr`;
  return `${m} min`;
}
