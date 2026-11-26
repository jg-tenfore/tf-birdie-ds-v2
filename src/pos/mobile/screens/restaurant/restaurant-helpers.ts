import { md3, playerAccents } from '../../../../theme/tokens';
import type { Tab } from '../../../logic/restaurant';
import type { PosState } from '../../../state/pos-store';
import type { MobileNav, MobileRoute, RouteName } from '../../navigation';

/**
 * Pure helpers for the handheld restaurant (V1 → V2). Kept out of the component files so each of
 * those exports only components.
 *
 * None of the restaurant's rules live here — they are `logic/restaurant.ts`, `logic/dining.ts`,
 * `logic/tab-list.ts` and the reducer in `state/restaurant.ts`, exactly as the tablet uses them.
 * This file only answers presentation questions: which colour a seat is, what a seat is called,
 * and where "done" goes back to.
 */

/** The kitchen's colour, as on the tablet: unsent dishes and the Send button are amber. */
export const KITCHEN = { solid: '#b45309', text: '#92400e', dot: '#d97706', tint: '#fffaf0', edge: '#f5d9a6' } as const;

/** A seat's accent — the tablet's ramp, so seat 2 is blue on both. `null` is the shared plate. */
export const seatColor = (seat: number | null | undefined): string =>
  seat ? playerAccents[(seat - 1) % playerAccents.length] : md3.outline;

export const seatLabel = (seat: number | null | undefined): string => (seat ? `Seat ${seat}` : 'Shared');

/** The seat the menu should open on: the first with nothing ordered, else seat 1. */
export function nextEmptySeat(tab: Pick<Tab, 'guests' | 'lines'>): number {
  for (let s = 1; s <= tab.guests; s += 1) if (!tab.lines.some((l) => l.dish?.seat === s)) return s;
  return 1;
}

/**
 * The id the store will give the next tab it opens — `openTab` and `seatReservation` both take
 * `T-${seq + 1}`. Read before dispatching, so the screen can go straight to the tab it opened.
 */
export const nextTabId = (s: Pick<PosState, 'restaurantSeq'>): string => `T-${s.restaurantSeq.tab + 1}`;

/** The restaurant's list screens: where a finished payment, a seated party or a moved tab returns to. */
export const RESTAURANT_LISTS: RouteName[] = ['tables', 'tabs', 'quickOrder', 'reservations'];

/**
 * How many screens to pop to get back to the nearest restaurant list under the top screen, or
 * `null` when the stack has none (a golf payment from the Register). The receipt uses it, so paying
 * a tab ends on the floor or the tab list the server came from, whichever bar they are on.
 */
export function popsToRestaurantList(stack: MobileRoute[]): number | null {
  for (let i = stack.length - 2; i >= 0; i -= 1) {
    if (RESTAURANT_LISTS.includes(stack[i].name)) return stack.length - 1 - i;
  }
  return null;
}

/** True when `route` is its destination's root — no back arrow, the navigation bar showing. */
export const isRootRoute = (nav: Pick<MobileNav, 'stack'>, route: MobileRoute): boolean => nav.stack[0] === route;
