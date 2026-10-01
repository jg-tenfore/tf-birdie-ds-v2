import { seedEventBookings } from '../../../pos/data/events';
import { venueBookings } from '../../../pos/data/venues';
import type { PosState, ReservationTab } from '../../../pos/state/pos-store';
import type { Booking } from '../../../pos/types';
import { atVenue } from '../../pos/screen-helpers';

/**
 * The bookings the 100126 call was looked at on — Friday, May 22 at the 18-hole club, the day in
 * Justin's screenshots — so each Original story opens on the very screen Weston saw.
 */
export const MAY22 = new Date(2026, 4, 22);
export const MAY30 = new Date(2026, 4, 30);

const byId = (id: string): Booking => {
  const b = venueBookings('eighteen').find((x) => x.id === id);
  if (!b) throw new Error(`100126: no booking ${id}`);
  return b;
};

/** King, D. — the foursome whose 4th player sits below the fold. 6:56 AM, Front 9. */
export const king = () => byId('p15_p1');
/** Farnsworth, W. — two players, one paid and one not: the Financial tab's case. 6:16 AM. */
export const farnsworth = () => byId('p05_p1');

/** Farnsworth with his own seat paid this morning and Nakamura's still owed. */
export const farnsworthHalfPaid = (): Booking => {
  const b = farnsworth();
  return { ...b, playerStates: b.playerStates.map((p, i) => (i === 0 ? { ...p, paid: true } : p)) };
};

/** Every May 22 booking, with `edited` in place of the seed's. */
export const withBooking = (edited: Booking): Booking[] => venueBookings('eighteen').map((b) => (b.id === edited.id ? edited : b));

/** The tee sheet on May 22. */
export const sheet = (extra: Partial<PosState> = {}): Partial<PosState> => atVenue('eighteen', { currentDate: MAY22, ...extra });

/** The reservation open on `b`, over May 22's sheet. */
export const panelOn = (b: Booking, tab: ReservationTab = 'players', extra: Partial<PosState> = {}): Partial<PosState> =>
  sheet({ reservationPanel: { bookingId: b.id, tab, playerIndex: 0 }, ...extra });

/** The Member-Guest's tee times (V1 → V2 seeds them onto May 30). */
export const memberGuest = (): Booking[] => seedEventBookings('champ-front', 'champ-back').filter((b) => b.groupId === 'grp-member-guest');

/** May 30's sheet with the Member-Guest on it, optionally with one of its tee times open. */
export const outing = (open?: Booking): Partial<PosState> =>
  atVenue('eighteen', {
    currentDate: MAY30,
    ...(open && { reservationPanel: { bookingId: open.id, tab: 'players', playerIndex: 0 } }),
  });
