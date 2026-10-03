import type { Booking } from '../types';
import type { PosState } from './pos-store';

/** V1 → V2, 100226 · Player rows v2: which seats are on the order, and where the rail sits. */

/** Which of `b`'s seats are on the order — all of them when the whole booking was loaded. */
export function orderSeatsOf(selectedBookingId: string | null, orderSeats: number[] | null, b: Booking): number[] {
  if (selectedBookingId !== b.id) return [];
  return orderSeats ?? b.playerStates.map((_, i) => i);
}

/**
 * Whether the order rail stays live beside the open reservation (V1 → V2).
 *
 * Add puts a player on the register's order, so the order has to be in sight while the panel is
 * open: the scrim starts at the rail's edge instead of covering it, and the rail stays usable.
 * Only while it holds this reservation's order — an empty rail is collapsed anyway, and a rail
 * holding somebody else's order is not what the panel is about.
 */
export function railBesidePanel(state: PosState, v1v2: boolean): boolean {
  const panel = state.reservationPanel;
  if (!v1v2 || !panel || panel.presentation === 'modal' || state.leftPanelCollapsed) return false;
  if ((panel.width ?? state.weston.panelWidth) === 'cover') return false;
  return state.selectedBookingId === panel.bookingId && state.cart.length > 0;
}
