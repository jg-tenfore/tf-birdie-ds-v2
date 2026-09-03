import type { Meta, StoryObj } from '@storybook/react-vite';
import { Exhibit, T0, actionParams, afterShows, mk, row } from './action-helpers';
import type { PlayerState } from '../../pos/types';

/**
 * Tee Sheet Actions / **5 · Move & Select**
 *
 * Actions that operate on more than one booking: moving a group to a different time or
 * course, and the multi-select bar that applies one change to a hand-picked set.
 *
 * Multi-select exists because the alternatives are worse. A rain delay means rain-checking
 * fifteen groups; doing that through fifteen context menus is where mistakes get made, and
 * doing it to the whole row would catch groups that already went out.
 */
const meta = {
  title: 'Tee Sheet Actions/5 · Move & Select',
  parameters: actionParams,
} satisfies Meta;

export default meta;
type Story = StoryObj;

const states = (n: number, patch: Partial<PlayerState> = {}): PlayerState[] =>
  Array.from({ length: n }, () => ({ paid: false, step: -1, noShow: false, ...patch }));

/** Four unpaid groups spread over two rows and two courses. */
const spread = () => ({
  venueId: 'three-nines' as const,
  shift: 'early' as const,
  bookings: [
    mk({ id: 's1', course: 'ponds', timeMin: T0, slot: 0, players: 2, name: 'Adams, F.', pay: 'open', playerStates: states(2) }),
    mk({ id: 's2', course: 'ponds', timeMin: T0, slot: 2, players: 2, name: 'Blake, E.', pay: 'open', playerStates: states(2) }),
    mk({ id: 's3', course: 'valley', timeMin: row(1), slot: 0, players: 3, name: 'Scott, B.', pay: 'open', playerStates: states(3) }),
    mk({ id: 's4', course: 'valley', timeMin: row(1), slot: 3, players: 1, name: 'Lewis, K.', pay: 'paid', playerStates: states(1, { paid: true }) }),
  ],
});

// ═══════════════════════════════════════════════════════════════════════════
// Move
// ═══════════════════════════════════════════════════════════════════════════

/**
 * **Move players** — to another time on another course.
 *
 * Rewrites `course`, `timeMin` and `slot` on the booking. The slot matters as much as the
 * time: a move has to land the party on adjacent cells at the destination, so the target is
 * an *opening* wide enough for them rather than just an empty-looking row.
 *
 * The change list shows all three fields moving together, which is what a correct move looks
 * like.
 */
export const MovePlayers: Story = {
  render: () => (
    <Exhibit
      note="The 6:00 pair on Ponds moves to the 6:08 row on Rolling."
      before={spread()}
      modal={{ kind: 'movePlayers', timeMin: T0 }}
      apply={[
        {
          type: 'patchBooking',
          bookingId: 's1',
          patch: { course: 'rolling', timeMin: row(1), slot: 0 },
        },
      ]}
    />
  ),
  play: afterShows({ has: [/Adams, F\.\|2\|open/] }),
};

/**
 * **Moving a whole row out.**
 *
 * The same dialog reached from the time-label menu, applied to every booking in the row.
 * Used for a delay: the 6:08 groups all slide back a row rather than being cancelled.
 */
export const MoveRowOut: Story = {
  render: () => (
    <Exhibit
      note="Both 6:08 tee times on Valley slide to 6:16, keeping their courses and their order."
      before={spread()}
      modal={{ kind: 'movePlayers', timeMin: row(1) }}
      apply={[
        { type: 'patchBooking', bookingId: 's3', patch: { timeMin: row(2), slot: 0 } },
        { type: 'patchBooking', bookingId: 's4', patch: { timeMin: row(2), slot: 3 } },
      ]}
    />
  ),
  play: afterShows({ has: [/Scott, B\.\|3\|open/, /Lewis, K\.\|1\|paid/] }),
};

// ═══════════════════════════════════════════════════════════════════════════
// Multi-select
// ═══════════════════════════════════════════════════════════════════════════

/**
 * **Entering multi-select.**
 *
 * Writes nothing. It changes the sheet into a picking surface: chips gain a selection
 * outline, unselected ones dim, and the action bar appears under the toolbar. Worth its own
 * story because the mode is a precondition for the three that follow, and because an empty
 * change list here is the correct answer.
 */
export const EnterMultiSelect: Story = {
  render: () => (
    <Exhibit
      note="Right-clicked a chip and chose Select multiple. That chip is seeded as the first selection."
      before={spread()}
      apply={[{ type: 'enterMultiSelect', seedId: 's1' }]}
    />
  ),
  play: afterShows({ has: [/Adams, F\.\|2\|open/] }),
};

/**
 * **Mark paid, on a selection.**
 *
 * Three groups chosen by hand across two courses and two rows, settled in one action. Note
 * what is *not* included: the paid single at 6:08 was never selected, so it is unchanged —
 * the distinction a row-wide action cannot make.
 */
export const MultiSelectMarkPaid: Story = {
  render: () => (
    <Exhibit
      note="Three of the four groups are selected and marked paid. The fourth was already paid and was left out."
      before={{ ...spread(), multiSelectActive: true, multiSelectIds: ['s1', 's2', 's3'] }}
      apply={[
        { type: 'patchBooking', bookingId: 's1', patch: { pay: 'paid', playerStates: states(2, { paid: true }) } },
        { type: 'patchBooking', bookingId: 's2', patch: { pay: 'paid', playerStates: states(2, { paid: true }) } },
        { type: 'patchBooking', bookingId: 's3', patch: { pay: 'paid', playerStates: states(3, { paid: true }) } },
        // The bar leaves the mode once it has run, so the After sheet is not still picking.
        { type: 'exitMultiSelect' },
      ]}
    />
  ),
  play: afterShows({
    has: [/Adams, F\.\|2\|paid/, /Blake, E\.\|2\|paid/, /Scott, B\.\|3\|paid/],
    lacks: [/\|open\|/],
  }),
};

/**
 * **Rain check, on a selection.**
 *
 * The rain-delay case the mode was built for: the groups still waiting get rain checks, and
 * the group already on the course does not.
 */
export const MultiSelectRainCheck: Story = {
  render: () => (
    <Exhibit
      note="Weather stops play. The two Ponds groups still at the counter are rain-checked; the others are not."
      before={{ ...spread(), multiSelectActive: true, multiSelectIds: ['s1', 's2'] }}
      apply={[
        { type: 'patchBookings', bookingIds: ['s1', 's2'], patch: { pay: 'rain_chk' } },
        { type: 'exitMultiSelect' },
      ]}
    />
  ),
  play: afterShows({
    has: [/Adams, F\.\|2\|rain_chk/, /Blake, E\.\|2\|rain_chk/, /Scott, B\.\|3\|open/],
  }),
};

/**
 * **No show, on a selection.**
 *
 * Marks a hand-picked set as no-shows. Destructive to the golfers' records but not to the
 * sheet — the slots stay held, for the same reason a single no-show holds its slot.
 */
export const MultiSelectNoShow: Story = {
  render: () => (
    <Exhibit
      note="Two groups never arrived. Their chips go hatched and keep their slots."
      before={{ ...spread(), multiSelectActive: true, multiSelectIds: ['s2', 's3'] }}
      apply={[
        { type: 'patchBooking', bookingId: 's2', patch: { pay: 'no_show', playerStates: states(2, { noShow: true, step: -1 }) } },
        { type: 'patchBooking', bookingId: 's3', patch: { pay: 'no_show', playerStates: states(3, { noShow: true, step: -1 }) } },
        { type: 'exitMultiSelect' },
      ]}
    />
  ),
  play: afterShows({
    has: [/Blake, E\.\|2\|no_show/, /Scott, B\.\|3\|no_show/, /Adams, F\.\|2\|open/],
  }),
};
