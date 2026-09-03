import type { Meta, StoryObj } from '@storybook/react-vite';
import { Exhibit, T0, actionParams, afterShows, mk, row } from './action-helpers';
import type { PlayerState } from '../../pos/types';

/**
 * Tee Sheet Actions / **2 · Booking**
 *
 * Everything reachable by right-clicking a booking chip. These are the actions staff run
 * most: a group arrives, tees off, finishes, settles up, or fails to show.
 *
 * Most of them write only to **per-player** state, not to the booking's own fields — a
 * foursome routinely arrives in twos and pays separately, so "checked in" and "paid" are
 * counts, never flags. The change list spells those counts out because they are invisible
 * in a field-by-field comparison.
 */
const meta = {
  title: 'Tee Sheet Actions/2 · Booking',
  parameters: actionParams,
} satisfies Meta;

export default meta;
type Story = StoryObj;

const states = (n: number, patch: Partial<PlayerState> = {}): PlayerState[] =>
  Array.from({ length: n }, () => ({ paid: false, step: -1, noShow: false, ...patch }));

/** A foursome and a pair on the single-nine club, both untouched. */
const arriving = () => ({
  venueId: 'nine' as const,
  shift: 'early' as const,
  bookings: [
    mk({
      id: 'four',
      course: 'the-nine',
      timeMin: T0,
      slot: 0,
      players: 4,
      name: 'Harrison, T.',
      pay: 'open',
      playerStates: states(4),
    }),
    mk({
      id: 'pair',
      course: 'the-nine',
      timeMin: row(1),
      slot: 0,
      players: 2,
      name: 'Garcia, L.',
      pay: 'open',
      playerStates: states(2),
    }),
  ],
});

const chipMenu = (bookingId: string) => ({
  contextMenu: { kind: 'booking' as const, bookingId, x: 240, y: 210 },
});

// ═══════════════════════════════════════════════════════════════════════════
// Check-in rail
// ═══════════════════════════════════════════════════════════════════════════

/**
 * **Check in all players.**
 *
 * Moves every player in the group to step 0. The chip's colour does not change — colour is
 * payment, and checking in is not paying — so the only visible difference is the step
 * marker. That separation is deliberate: an operator's first question at the counter is
 * who still owes money.
 */
export const CheckInAllPlayers: Story = {
  render: () => (
    <Exhibit
      note="The foursome at 6:00 arrives. Four players move to checked-in; the chip stays unpaid-white."
      before={{ ...arriving(), ...chipMenu('four') }}
      apply={[
        {
          type: 'patchBooking',
          bookingId: 'four',
          patch: { playerStates: states(4, { step: 0 }) },
        },
      ]}
    />
  ),
  play: afterShows({ has: [/Harrison, T\.\|4\|open\|booked\|ci:4\|paid:0/] }),
};

/**
 * **Mark teed off.**
 *
 * Step 1. Used when a group leaves the first tee without stopping at the counter, which is
 * why every step on the rail is reachable directly rather than only the next one — staff
 * correct the record after the fact far more often than they walk it forward.
 */
export const MarkTeedOff: Story = {
  render: () => (
    <Exhibit
      note="Straight from booked to teed off, skipping check-in — the common real-world case."
      before={{ ...arriving(), ...chipMenu('four') }}
      apply={[
        { type: 'patchBooking', bookingId: 'four', patch: { playerStates: states(4, { step: 1 }) } },
      ]}
    />
  ),
  play: afterShows({ has: [/Harrison, T\.\|4\|open\|booked\|ci:4/] }),
};

/**
 * **Mark finished.**
 *
 * Step 4, the end of the rail. The tee time stays on the sheet — it is a record of the day,
 * not a queue — so a finished round looks the same as a checked-in one apart from its step.
 */
export const MarkFinished: Story = {
  render: () => (
    <Exhibit
      note="The group is in. The chip remains on the sheet as the day's record."
      before={{ ...arriving(), ...chipMenu('four') }}
      apply={[
        { type: 'patchBooking', bookingId: 'four', patch: { playerStates: states(4, { step: 4 }) } },
      ]}
    />
  ),
  play: afterShows({ has: [/Harrison, T\.\|4\|open\|booked\|ci:4/] }),
};

// ═══════════════════════════════════════════════════════════════════════════
// Payment
// ═══════════════════════════════════════════════════════════════════════════

/**
 * **Mark all paid.**
 *
 * Sets the booking to paid *and* every player's balance with it. Both matter: the chip
 * reads its colour from the booking, and the Financial tab reads per-player. Writing only
 * one leaves a group that looks settled and still shows a balance when opened.
 */
export const MarkAllPaid: Story = {
  render: () => (
    <Exhibit
      note="White-with-green-outline becomes solid green, and all four balances clear."
      before={{ ...arriving(), ...chipMenu('four') }}
      apply={[
        {
          type: 'patchBooking',
          bookingId: 'four',
          patch: { pay: 'paid', playerStates: states(4, { paid: true }) },
        },
      ]}
    />
  ),
  play: afterShows({ has: [/Harrison, T\.\|4\|paid\|booked\|ci:0\|paid:4/] }),
};

/**
 * **Mark all unpaid** — reopening a balance.
 *
 * The inverse, used after a mis-tap or a reversed card. It reopens the booking and every
 * player, which is why it is a separate action rather than a toggle: half-reverted payment
 * is the state that causes arguments at the counter.
 */
export const MarkAllUnpaid: Story = {
  render: () => (
    <Exhibit
      note="A paid foursome has its balance reopened — solid green back to outline."
      before={{
        venueId: 'nine',
        shift: 'early',
        bookings: [
          mk({
            id: 'paid4',
            course: 'the-nine',
            timeMin: T0,
            slot: 0,
            players: 4,
            name: 'Torres, C.',
            pay: 'paid',
            playerStates: states(4, { paid: true, step: 0 }),
          }),
        ],
        contextMenu: { kind: 'booking', bookingId: 'paid4', x: 240, y: 210 },
      }}
      apply={[
        {
          type: 'patchBooking',
          bookingId: 'paid4',
          patch: { pay: 'open', playerStates: states(4, { paid: false, step: 0 }) },
        },
      ]}
    />
  ),
  play: afterShows({ has: [/Torres, C\.\|4\|open\|booked\|ci:4\|paid:0/] }),
};

// ═══════════════════════════════════════════════════════════════════════════
// Manage
// ═══════════════════════════════════════════════════════════════════════════

/**
 * **Mark no-show.**
 *
 * Sets the booking to `no_show` and flags every player, and pushes them back off the
 * check-in rail. The slot is *not* released — the tee time is still a record of what was
 * booked, and releasing it would lose the reason the course ran a gap.
 */
export const MarkNoShow: Story = {
  render: () => (
    <Exhibit
      note="The chip goes hatched grey. It keeps its slot: the row stays unavailable, and the day's record survives."
      before={{ ...arriving(), ...chipMenu('pair') }}
      apply={[
        {
          type: 'patchBooking',
          bookingId: 'pair',
          patch: { pay: 'no_show', playerStates: states(2, { noShow: true, step: -1 }) },
        },
      ]}
    />
  ),
  play: afterShows({ has: [/Garcia, L\.\|2\|no_show\|booked/] }),
};

/**
 * **Delete booking** — behind a confirmation.
 *
 * The only chip action that releases the slot. It is confirmed because it is the one that
 * destroys information rather than changing it: a no-show keeps the record, a delete does
 * not.
 */
export const DeleteBooking: Story = {
  render: () => (
    <Exhibit
      note="The 6:08 pair is removed and its two slots return to bookable."
      before={arriving()}
      modal={{
        kind: 'confirm',
        title: 'Delete this booking?',
        body: 'Garcia, L. · 6:08 AM · The Nine. The slot is released and this cannot be undone.',
        confirmLabel: 'Delete booking',
        onConfirm: 'deleteBooking:pair',
      }}
      apply={[{ type: 'deleteBookings', bookingIds: ['pair'] }]}
    />
  ),
  play: afterShows({ has: [/Harrison/], lacks: [/Garcia/] }),
};

/**
 * **Load into register** — the action that writes nothing to the sheet.
 *
 * It moves the booking onto the order panel so it can be paid for. Worth a story precisely
 * because the change list is empty: the sheet is unchanged, and the outcome lives in the
 * register. Anything that *did* appear here would be a bug.
 */
export const LoadIntoRegister: Story = {
  render: () => (
    <Exhibit
      note="Compare the two sheets: identical. The result of this action is on the order panel, which these panes deliberately hide."
      before={{ ...arriving(), ...chipMenu('four') }}
      apply={[{ type: 'loadBooking', bookingId: 'four' }]}
    />
  ),
  play: afterShows({ has: [/Harrison, T\.\|4/, /Garcia, L\.\|2/] }),
};
