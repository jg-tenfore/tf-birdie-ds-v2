import { buildTeeTimeCart } from '../../../logic/cart';
import { maxPlayers, playerHoles, playerTransport } from '../../../logic/reservation';
import { rateContext } from '../../../state/pos-store';
import type { PosState } from '../../../state/pos-store';
import { usePos } from '../../../state/PosProvider';
import type { Booking, Transport } from '../../../types';
import { orderMoney } from '../register/parts';

/**
 * Helpers for the phone's reservation screen (Weston Edits). No JSX, so the component
 * files keep fast refresh.
 */

/**
 * What "Check in & pay" will charge: the booking as the register will load it, priced by
 * the register's own money helper. Reading the same two functions the order screen reads
 * is what keeps the button's amount and the order's total from ever disagreeing.
 */
export function reservationCharge(b: Booking, state: Pick<PosState, 'courses' | 'timePrices' | 'addedGolfers'>) {
  return orderMoney(buildTeeTimeCart(b, state.courses, rateContext(state)));
}

/** The rate context (per-row price overrides and the roster) for `playerFee` / `holesFee` on the phone. */
export function useRates() {
  const { state } = usePos();
  return rateContext(state);
}

/** Bookings on the same day as `b` — what `maxPlayers` needs to see the row. */
export const sameDay = (bookings: Booking[], b: Booking) => bookings.filter((x) => x.date === b.date);

/** The course, whether its rounds are 18 holes, and the largest party the row allows. */
export function useReservationLimits(b: Booking | undefined) {
  const { state } = usePos();
  const course = b ? state.courses.find((c) => c.id === b.course) : undefined;
  return {
    course,
    /** 9/18 switching only makes sense where an 18 exists to switch to. */
    is18: (course?.holeCount ?? 9) === 18,
    max: b ? maxPlayers(b, course, sameDay(state.bookings, b)) : 0,
    day: b ? sameDay(state.bookings, b) : [],
  };
}

/** Transport on a phone: a short label and its icon ligature. */
export const TRANSPORTS: Array<{ value: Transport; label: string; long: string; icon: string }> = [
  { value: 'walking', label: 'Walk', long: 'Walking', icon: 'directions_walk' },
  { value: 'cart', label: 'Cart', long: 'Riding cart', icon: 'directions_car' },
  { value: 'push', label: 'Push', long: 'Push cart', icon: 'electric_scooter' },
];

export const transportMeta = (t: Transport) => TRANSPORTS.find((x) => x.value === t) ?? TRANSPORTS[0];

/** The party's holes for a header: `18H`, or `9/18H` when players differ. */
export function partyHoles(b: Booking): string {
  const set = [...new Set(b.playerStates.map((_, i) => playerHoles(b, i)))].sort((x, y) => x - y);
  return set.length ? `${set.join('/')}H` : b.holes;
}

/** The party's transport for a header: one label, or "Mixed transport". */
export function partyTransport(b: Booking): string {
  const set = new Set(b.playerStates.map((_, i) => playerTransport(b, i)));
  return set.size > 1 ? 'Mixed transport' : transportMeta([...set][0] ?? b.cart).long;
}
