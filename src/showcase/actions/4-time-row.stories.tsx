import type { Meta, StoryObj } from '@storybook/react-vite';
import { Exhibit, T0, actionParams, afterShows, mk, row, rowKey } from './action-helpers';
import type { PlayerState } from '../../pos/types';

/**
 * Tee Sheet Actions / **4 · Time Row**
 *
 * Right-clicking the time in the gutter acts on the whole row, across every course at once.
 * That is the row's reason to exist as a target: a frost delay, a shotgun start or a
 * marshal's hold are facts about a *time*, not about one course.
 *
 * Two of these write annotations rather than bookings — notes and price overrides live in
 * `timeNotes` / `timePrices`, keyed by date and minute, so they attach to the row itself and
 * survive whatever gets booked into it later.
 */
const meta = {
  title: 'Tee Sheet Actions/4 · Time Row',
  parameters: actionParams,
} satisfies Meta;

export default meta;
type Story = StoryObj;

const states = (n: number, patch: Partial<PlayerState> = {}): PlayerState[] =>
  Array.from({ length: n }, () => ({ paid: false, step: -1, noShow: false, ...patch }));

/** A busy 6:08 row across all three nines — the case where a row action earns its keep. */
const busyRow = () => ({
  venueId: 'three-nines' as const,
  shift: 'early' as const,
  bookings: [
    mk({ id: 'r1', course: 'ponds', timeMin: row(1), slot: 0, players: 4, name: 'King, D.', pay: 'open', playerStates: states(4) }),
    mk({ id: 'r2', course: 'valley', timeMin: row(1), slot: 0, players: 2, name: 'Hall, V.', pay: 'open', playerStates: states(2) }),
    mk({ id: 'r3', course: 'rolling', timeMin: row(1), slot: 0, players: 3, name: 'White, E.', pay: 'open', playerStates: states(3) }),
    mk({ id: 'r4', course: 'ponds', timeMin: T0, slot: 0, players: 2, name: 'Early, E.', pay: 'paid', playerStates: states(2, { paid: true }) }),
  ],
});

const rowMenu = (timeMin: number) => ({
  contextMenu: { kind: 'timeLabel' as const, timeMin, x: 120, y: 200 },
});

// ═══════════════════════════════════════════════════════════════════════════
// Annotate
// ═══════════════════════════════════════════════════════════════════════════

/**
 * **Add note.**
 *
 * A coloured banner under the row, visible to anyone working the sheet. Notes are the
 * pressure valve for everything the data model does not have a field for — a frost delay,
 * a member's complaint, a marshal's instruction.
 *
 * It is an annotation, not a booking: nothing about the tee times changes, which is why the
 * change list reports a note rather than an edit.
 */
export const AddNote: Story = {
  render: () => (
    <Exhibit
      note="A frost delay recorded on the 6:08 row. The tee times are untouched."
      before={{ ...busyRow(), ...rowMenu(row(1)) }}
      modal={{ kind: 'timeNote', timeMin: row(1) }}
      apply={[
        {
          type: 'setTimeNote',
          key: rowKey(row(1)),
          note: { text: 'Frost delay — hold groups at the first tee', color: 'yellow' },
        },
      ]}
    />
  ),
  play: afterShows({ has: [/King, D\.\|4\|open/] }),
};

/**
 * **Clear note.**
 *
 * The banner goes. Shown as its own story because clearing is a distinct write — setting a
 * note to empty text would leave a blank banner on the row, which reads as a mistake rather
 * than as an absence.
 */
export const ClearNote: Story = {
  render: () => (
    <Exhibit
      note="The delay is over and the note is removed."
      before={{
        ...busyRow(),
        ...rowMenu(row(1)),
        timeNotes: {
          [rowKey(row(1))]: { text: 'Frost delay — hold groups at the first tee', color: 'yellow' as const },
        },
      }}
      modal={{ kind: 'timeNote', timeMin: row(1) }}
      apply={[{ type: 'setTimeNote', key: rowKey(row(1)), note: null }]}
    />
  ),
  play: afterShows({ has: [/King, D\.\|4\|open/] }),
};

// ═══════════════════════════════════════════════════════════════════════════
// Bulk
// ═══════════════════════════════════════════════════════════════════════════

/**
 * **Mark row paid.**
 *
 * Every booking in the row, on every course, settled at once — three separate patches, one
 * per booking. Used for a shotgun start or an outing that pays as one party.
 *
 * The 6:00 row above is deliberately left alone, so it is clear the action is scoped to the
 * row and not to the day.
 */
export const MarkRowPaid: Story = {
  render: () => (
    <Exhibit
      note="Nine players across three courses settle together. The 6:00 row is untouched."
      before={{ ...busyRow(), ...rowMenu(row(1)) }}
      apply={[
        { type: 'patchBooking', bookingId: 'r1', patch: { pay: 'paid', playerStates: states(4, { paid: true }) } },
        { type: 'patchBooking', bookingId: 'r2', patch: { pay: 'paid', playerStates: states(2, { paid: true }) } },
        { type: 'patchBooking', bookingId: 'r3', patch: { pay: 'paid', playerStates: states(3, { paid: true }) } },
      ]}
    />
  ),
  play: afterShows({
    has: [/King, D\.\|4\|paid/, /Hall, V\.\|2\|paid/, /White, E\.\|3\|paid/],
    lacks: [/King, D\.\|4\|open/],
  }),
};

/**
 * **Check in row.**
 *
 * The same shape as Mark row paid, but on the check-in rail rather than the balance. Chip
 * colours do not move at all — which is the clearest demonstration in the whole set that
 * colour means money and nothing else.
 */
export const CheckInRow: Story = {
  render: () => (
    <Exhibit
      note="Every player in the row checks in. Compare the colours: identical, because nothing was paid."
      before={{ ...busyRow(), ...rowMenu(row(1)) }}
      apply={[
        { type: 'patchBooking', bookingId: 'r1', patch: { playerStates: states(4, { step: 0 }) } },
        { type: 'patchBooking', bookingId: 'r2', patch: { playerStates: states(2, { step: 0 }) } },
        { type: 'patchBooking', bookingId: 'r3', patch: { playerStates: states(3, { step: 0 }) } },
      ]}
    />
  ),
  play: afterShows({ has: [/King, D\.\|4\|open\|booked\|ci:4\|paid:0/] }),
};

/**
 * **Clear this time** — behind a confirmation.
 *
 * Removes every booking in the row across all courses and releases the slots. The most
 * destructive action on the sheet, and the reason the row menu has a confirmation at all.
 */
export const ClearThisTime: Story = {
  render: () => (
    <Exhibit
      note="All three tee times in the 6:08 row are removed. The row returns to fully bookable."
      before={busyRow()}
      modal={{
        kind: 'confirm',
        title: 'Clear 6:08 AM?',
        body: '3 tee times across all courses will be removed and the slots released.',
        confirmLabel: 'Clear time',
        onConfirm: `clearTime:${row(1)}`,
      }}
      apply={[{ type: 'deleteBookings', bookingIds: ['r1', 'r2', 'r3'] }]}
    />
  ),
  play: afterShows({
    has: [/Early, E\.\|2\|paid/],
    lacks: [/King/, /Hall/, /White/],
  }),
};
