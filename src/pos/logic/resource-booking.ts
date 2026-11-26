import { formatTimeLabel } from '../data/courses';
import { membershipPlan } from '../data/memberships';
import { BAY_DAILY_LIMIT, SHEETS, bayFeeFor, capacityOf, resourceById, type ResourceBooking, type ResourceKind } from '../data/resources';
import { liveCustomer } from '../data/roster';
import type { CartItem } from '../types';

/**
 * The rules for booking a court or a bay. Pure, so the sheet, the panel and the tests agree.
 */

/** Whether a booking's golfer holds a plan Buck gives the member bay rate. */
export const holdsMemberSimRate = (b: Pick<ResourceBooking, 'crmId'>): boolean =>
  (liveCustomer(b.crmId)?.memberships ?? []).some((m) => membershipPlan(m.name)?.memberSimRate);

/**
 * The fee a booking pays and why: for a bay, Buck's fee for its start time and golfer ("Sim Hour
 * Evening", "Member Sim Hour"); for a court, the court's hourly rate.
 */
export function resourceFee(b: Pick<ResourceBooking, 'kind' | 'resourceId' | 'durationMin' | 'startMin' | 'crmId'>): { name: string; hourly: number; amount: number } {
  const r = resourceById(b.resourceId);
  if (!r) return { name: '', hourly: 0, amount: 0 };
  if (r.kind === 'bay') return bayFeeFor(holdsMemberSimRate(b), b.startMin, b.durationMin);
  return { name: `${r.name} hourly`, hourly: r.hourly, amount: Math.round(r.hourly * (b.durationMin / 60) * 100) / 100 };
}

/** What a booking costs, to the cent. */
export function resourcePrice(b: Pick<ResourceBooking, 'kind' | 'resourceId' | 'durationMin' | 'startMin' | 'crmId'>): number {
  return resourceFee(b).amount;
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

// ─── Buck's bay rules: the daily limit, and refusals that say why ──────────

/**
 * The golfer's other bookings on the same sheet and day — what Buck's daily limit counts. Matched by
 * customer record, never by name: two "Kim, D."s are two golfers until somebody links them.
 */
export function sameDayBookings(b: ResourceBooking, all: ResourceBooking[]): ResourceBooking[] {
  if (!b.crmId) return [];
  return all.filter((x) => x.id !== b.id && !x.draft && x.kind === b.kind && x.date === b.date && x.crmId === b.crmId);
}

/**
 * Why Buck's daily limit refuses this booking, or `null`. Bays only — Buck set the limit for bays.
 * Staff can override it; the panel says so rather than hiding the button.
 */
export function dailyLimitProblem(b: ResourceBooking, all: ResourceBooking[]): string | null {
  if (b.kind !== 'bay') return null;
  const others = sameDayBookings(b, all);
  if (others.length < BAY_DAILY_LIMIT) return null;
  const list = others
    .sort((x, y) => x.startMin - y.startMin)
    .map((x) => `${resourceById(x.resourceId)?.name ?? 'a bay'} at ${formatTimeLabel(x.startMin)}`)
    .join(' and ');
  return `${b.name} already has ${others.length} bookings today (${list}). The limit is ${BAY_DAILY_LIMIT} a day.`;
}

/**
 * Why a booking cannot be moved or resized to `to`, in words — or `null` when it can. Buck's rule is
 * that a refusal explains itself: the sheet names the booking in the way, the closing time, or the
 * bay's capacity, instead of snapping back in silence.
 */
export function moveProblem(
  b: ResourceBooking,
  to: { resourceId: string; startMin: number; durationMin: number },
  all: ResourceBooking[],
): string | null {
  const cfg = SHEETS[b.kind];
  const r = resourceById(to.resourceId);
  if (!r || r.kind !== b.kind) return 'That is not somewhere this booking can go.';
  if (to.startMin < cfg.openMin) return `${r.name} opens at ${formatTimeLabel(cfg.openMin)}.`;
  if (to.startMin + to.durationMin > cfg.closeMin) return `${r.name} closes at ${formatTimeLabel(cfg.closeMin)}.`;
  if (to.durationMin < cfg.minDurationMin) return `The shortest booking is ${formatDuration(cfg.minDurationMin)}.`;
  if (to.durationMin > cfg.maxDurationMin) return `The longest booking is ${formatDuration(cfg.maxDurationMin)}.`;
  if (b.players > capacityOf(r)) return `${r.name} holds ${capacityOf(r)}; this booking is for ${b.players}.`;
  const clash = conflictsWith({ ...b, ...to }, all)[0];
  if (clash) {
    return `${r.name} has ${clash.name} from ${formatTimeLabel(clash.startMin)} to ${formatTimeLabel(endMin(clash))}.`;
  }
  // The same golfer cannot be in two bays at once.
  const elsewhere = b.crmId
    ? all.find((x) => x.id !== b.id && x.crmId === b.crmId && x.kind === b.kind && x.date === b.date && overlaps(x, { ...b, ...to }))
    : undefined;
  if (elsewhere) {
    return `${b.name} is already in ${resourceById(elsewhere.resourceId)?.name ?? 'another bay'} from ${formatTimeLabel(elsewhere.startMin)}.`;
  }
  return null;
}
