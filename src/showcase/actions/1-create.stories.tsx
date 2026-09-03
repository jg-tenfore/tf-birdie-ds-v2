import type { Meta, StoryObj } from '@storybook/react-vite';
import { Exhibit, T0, actionParams, afterShows, convergesOnAfter, mk, row } from './action-helpers';

/**
 * Tee Sheet Actions / **1 · Create**
 *
 * The three ways a tee time appears on the sheet: booked one party at a time, reserved in
 * bulk as a league or outing, or closed off as a block.
 *
 * Each story shows the sheet before with the action's dialog over it, the sheet after, and
 * the writes derived by diffing the two. Nothing here is hand-authored prose about the
 * outcome — the change list comes from the reducer, and the `play` function drives the real
 * dialog to prove the dialog agrees.
 */
const meta = {
  title: 'Tee Sheet Actions/1 · Create',
  parameters: actionParams,
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** A single course with four slots, so before and after are unambiguous at half width. */
const oneCourse = (bookings = []) => ({ venueId: 'nine' as const, bookings, shift: 'early' as const });

// ═══════════════════════════════════════════════════════════════════════════
// New booking
// ═══════════════════════════════════════════════════════════════════════════

/**
 * **New booking** — clicking an open cell.
 *
 * Three steps: walk-in or reservation, then a rate, then the party. The party size arrives
 * pre-filled from *which* cell was clicked: the Nth open cell seats N, so the operator
 * usually confirms rather than chooses.
 */
export const NewBooking: Story = {
  render: () => (
    <Exhibit
      note="Clicked the third open cell of the 6:00 AM row, so the dialog opens on a threesome."
      before={oneCourse()}
      modal={{ kind: 'newBooking', courseId: 'the-nine', timeMin: T0, startSlot: 0, players: 3, maxPlayers: 4 }}
      apply={[
        {
          type: 'addBookings',
          bookings: [
            mk({
              id: 'new-1',
              course: 'the-nine',
              timeMin: T0,
              slot: 0,
              players: 3,
              name: 'Reed, M.',
              pay: 'paid',
              price: 59,
              holes: '9H',
              status: 'walkin',
              cart: 'cart',
              playerStates: Array.from({ length: 3 }, () => ({ paid: true, step: 0, noShow: false })),
            }),
          ],
        },
      ]}
    />
  ),
  play: afterShows({ has: [/Reed, M\.\|3\|paid\|walkin/] }),
};

/**
 * **New booking, walked through for real.**
 *
 * The same action, but the `play` function completes the dialog rather than asserting on a
 * pre-computed result: pick Walk-in, pick a rate, confirm. The left sheet then has to end
 * up holding exactly what the right sheet holds.
 *
 * This is the story that would have caught the modal host dropping the party size — the
 * dialog looked right and produced a foursome.
 */
export const NewBookingDriven: Story = {
  render: () => (
    <Exhibit
      note="The play function fills this dialog in and confirms it. Both sheets must agree afterwards."
      before={oneCourse()}
      modal={{ kind: 'newBooking', courseId: 'the-nine', timeMin: T0, startSlot: 0, players: 2, maxPlayers: 4 }}
      apply={[
        {
          type: 'addBookings',
          bookings: [
            mk({
              id: 'driven',
              course: 'the-nine',
              timeMin: T0,
              slot: 0,
              players: 2,
              // A walk-in pays at the counter, so the reducer lands on paid/walkin. The
              // story asserts that rather than restating it.
              name: 'Okafor, N.',
              pay: 'paid',
              status: 'walkin',
              cart: 'cart',
              // A walk-in is at the counter, so the dialog checks them in as it books them.
              playerStates: Array.from({ length: 2 }, () => ({ paid: true, step: 0, noShow: false })),
            }),
          ],
        },
      ]}
    />
  ),
  play: convergesOnAfter(async (dialog) => {
    const { userEvent } = await import('storybook/test');
    await userEvent.click(await dialog.findByText('Walk-in'));
    // Any non-member rate: a member rate would set `status: 'member'` instead, which is a
    // different story.
    const rates = await dialog.findAllByText(/RATE|GUEST|TWILIGHT|\$/);
    const guest = rates.find((el: HTMLElement) => !/Member/i.test(el.textContent ?? '')) ?? rates[0];
    await userEvent.click(guest);
    // Typing a name and taking the "Use ..." row keeps the story independent of the CRM.
    await userEvent.type(await dialog.findByPlaceholderText(/Search name or phone/i), 'Okafor, N.');
    await userEvent.click(await dialog.findByText(/^Use "Okafor, N\."$/));
    await userEvent.click(await dialog.findByText(/Create booking/i));
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
// Block
// ═══════════════════════════════════════════════════════════════════════════

/**
 * **Block this time** — from the time-label menu.
 *
 * A block spans the full width of every course it covers, because a half-blocked row reads
 * as available at a glance and that is exactly the mistake it exists to prevent. It is
 * stored as a booking with `status: 'block'`, which is why it shows in the change list as an
 * added tee time rather than as a setting.
 */
export const BlockTime: Story = {
  render: () => (
    <Exhibit
      note="Greens maintenance on the 6:08 row. The block covers all four slots, so nothing can be booked into it."
      before={oneCourse()}
      modal={{ kind: 'blockTime', timeMin: row(1) }}
      apply={[
        {
          type: 'addBookings',
          bookings: [
            mk({
              id: 'blk-1',
              course: 'the-nine',
              timeMin: row(1),
              slot: 0,
              players: 4,
              name: 'Course Maintenance',
              status: 'block',
              pay: 'block',
              price: 0,
              holes: '',
              cart: 'walking',
              note: 'Greens maintenance — slot unavailable',
              playerStates: [],
            }),
          ],
        },
      ]}
    />
  ),
  play: afterShows({ has: [/Course Maintenance\|4\|block\|block/] }),
};

/**
 * **Block clears what it lands on.**
 *
 * Blocking a row that already has bookings deletes them first. That is destructive and
 * deliberate — a course closing for maintenance does not negotiate with the tee sheet — so
 * the change list shows both the removal and the block.
 */
export const BlockOverBookings: Story = {
  render: () => (
    <Exhibit
      note="The 6:08 row already holds a pair and a single. Blocking it removes both."
      before={{
        venueId: 'nine',
        shift: 'early',
        bookings: [
          mk({ id: 'occ-1', course: 'the-nine', timeMin: row(1), slot: 0, players: 2, name: 'Garcia, L.', pay: 'paid' }),
          mk({ id: 'occ-2', course: 'the-nine', timeMin: row(1), slot: 2, players: 1, name: 'Bennett, L.', pay: 'open' }),
        ],
      }}
      modal={{ kind: 'blockTime', timeMin: row(1) }}
      apply={[
        { type: 'deleteBookings', bookingIds: ['occ-1', 'occ-2'] },
        {
          type: 'addBookings',
          bookings: [
            mk({
              id: 'blk-2',
              course: 'the-nine',
              timeMin: row(1),
              slot: 0,
              players: 4,
              name: 'Ranger Hold',
              status: 'block',
              pay: 'block',
              price: 0,
              holes: '',
              cart: 'walking',
              playerStates: [],
            }),
          ],
        },
      ]}
    />
  ),
  play: afterShows({
    has: [/Ranger Hold\|4\|block\|block/],
    lacks: [/Garcia/, /Bennett/],
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
// League
// ═══════════════════════════════════════════════════════════════════════════

/**
 * **Create league / outing** — from the time-label menu.
 *
 * A league writes one booking per course per row for its whole duration, sharing a
 * `groupId`. Six tee times is a normal Thursday evening, which is why the change list
 * collapses a group into a single line rather than listing every row.
 */
export const CreateLeague: Story = {
  render: () => (
    <Exhibit
      note="Three consecutive rows across two of the three nines — twelve players, six tee times, one group."
      before={{ venueId: 'three-nines', shift: 'early', bookings: [] }}
      modal={{ kind: 'league', timeMin: T0 }}
      apply={[
        {
          type: 'addBookings',
          bookings: [0, 1, 2].flatMap((n) =>
            ['ponds', 'valley'].map((course) =>
              mk({
                id: `lg-${course}-${n}`,
                course,
                timeMin: row(n),
                slot: 0,
                players: 4,
                name: "Thursday Men's League",
                status: 'event',
                pay: 'event',
                price: 42,
                holes: '18H',
                groupId: 'grp-thursday',
                groupEvent: true,
                note: "Thursday Men's League — reserved",
                playerStates: [],
              }),
            ),
          ),
        },
      ]}
    />
  ),
  play: afterShows({ has: [/Thursday Men's League\|4\|event\|event/] }),
};

/**
 * **Delete league.**
 *
 * Removing a league takes every row in the group, not just the chip that was right-clicked
 * — the inverse of how it was created. The whole block of rows returns to bookable.
 */
export const DeleteLeague: Story = {
  render: () => {
    const league = [0, 1, 2].flatMap((n) =>
      ['ponds', 'valley'].map((course) =>
        mk({
          id: `dl-${course}-${n}`,
          course,
          timeMin: row(n),
          slot: 0,
          players: 4,
          name: 'Corporate Outing',
          status: 'event',
          pay: 'event',
          price: 42,
          holes: '18H',
          groupId: 'grp-outing',
          groupEvent: true,
          playerStates: [],
        }),
      ),
    );
    return (
      <Exhibit
          note="Right-clicked one chip of a six-row outing and chose Delete league."
        before={{ venueId: 'three-nines', shift: 'early', bookings: league }}
        modal={{
          kind: 'confirm',
          title: 'Delete league?',
          body: 'This removes all 6 tee times in Corporate Outing.',
          confirmLabel: 'Delete league',
          onConfirm: 'deleteGroup:grp-outing',
        }}
        apply={[{ type: 'deleteBookings', bookingIds: league.map((b) => b.id) }]}
      />
    );
  },
  play: afterShows({ lacks: [/Corporate Outing/] }),
};
