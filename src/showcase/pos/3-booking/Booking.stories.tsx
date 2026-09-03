import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';
import {
  Screen,
  atVenue,
  onTeeSheet,
  paidFoursome,
  screenParams,
  unpaidBooking,
  withLoadedBooking,
} from '../screen-helpers';

/**
 * POS Screens / 3 · Booking & Check-in
 *
 * The booking record and the flows that change it. Tab order follows how staff work a
 * tee time: confirm what it is, move players through check-in, settle money, read notes,
 * then audit. Player state is per-person throughout, because a foursome routinely
 * arrives in twos and pays separately.
 */
const meta = {
  title: 'POS Screens/3 · Booking & Check-in',
  parameters: screenParams,
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Details — the reservation as recorded, plus the transport control. */
export const BookingDetail: Story = {
  render: () => {
    const b = paidFoursome();
    return (
      <Screen
        initialState={withLoadedBooking(b, { modal: { kind: 'bookingDetail', bookingId: b.id, tab: 0 } })}
      />
    );
  },
};

/**
 * Players & Status. Every step on the rail is clickable, not just the next one — staff
 * correct mis-taps and jump groups straight to Finished after the fact, so forcing a
 * linear walk would be worse than allowing the jump.
 */
export const PlayersAndStatus: Story = {
  render: () => {
    const b = paidFoursome();
    return (
      <Screen
        initialState={withLoadedBooking(b, { modal: { kind: 'bookingDetail', bookingId: b.id, tab: 1 } })}
      />
    );
  },
};

/** Financial — per-player balances, plus refund and rain-check actions and their trail. */
export const Financial: Story = {
  render: () => {
    const b = unpaidBooking();
    return (
      <Screen
        initialState={withLoadedBooking(b, { modal: { kind: 'bookingDetail', bookingId: b.id, tab: 2 } })}
      />
    );
  },
};

/**
 * Group Notes. Player notes matter operationally: they surface on the cart line at point
 * of sale, so "needs an accessible cart" reaches whoever checks them in.
 */
export const GroupNotes: Story = {
  render: () => {
    const b = paidFoursome();
    return (
      <Screen
        initialState={withLoadedBooking(b, { modal: { kind: 'bookingDetail', bookingId: b.id, tab: 3 } })}
      />
    );
  },
};

/** Activity — the audit trail, seeded from the booking's state so it's never empty. */
export const Activity: Story = {
  render: () => {
    const b = paidFoursome();
    return (
      <Screen
        initialState={withLoadedBooking(b, { modal: { kind: 'bookingDetail', bookingId: b.id, tab: 4 } })}
      />
    );
  },
};

/** Step 1 — walk-in or reservation. The answer decides whether payment is due now. */
export const NewTeeTimeType: Story = {
  render: () => (
    <Screen
      initialState={onTeeSheet({
        modal: { kind: 'newBooking', courseId: 'valley', timeMin: 8 * 60 + 40, startSlot: 0 },
      })}
    />
  ),
};

/** The booking-chip context menu — most of the sheet's power without opening a dialog. */
export const ChipContextMenu: Story = {
  render: () => {
    const b = paidFoursome();
    return (
      <Screen
        initialState={onTeeSheet({
          contextMenu: { kind: 'booking', bookingId: b.id, x: 420, y: 220 },
        })}
      />
    );
  },
};

/** The check-in action panel, finding a player by search across the day. */
export const CheckInPanel: Story = {
  render: () => (
    <Screen initialState={onTeeSheet({ modal: { kind: 'actionPanel', action: 'checkin' } })} />
  ),
};

// ═══════════════════════════════════════════════════════════════════════════
// Booking by party size
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Open a new booking from the Nth open cell of a row and read back the party size it
 * proposes.
 *
 * These carry `play` functions, so they are the regression test for the rule in
 * `src/pos/logic/openings.ts` — the unit tests cover the arithmetic, and these cover the
 * wiring from a click through to the dialog. The failure they guard against is the two
 * drifting apart: the runs computing correctly while the grid passes the raw slot index.
 */
const bookFromNthOpenCell = (nth: number): Story['play'] =>
  async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Matched by accessible name rather than position: the grid also contains chips and
    // toolbar buttons, and an index into "every button" quietly picks the wrong one.
    const label = new RegExp(`^Book ${nth} players? on `);
    await waitFor(() => expect(canvas.getAllByLabelText(label).length).toBeGreaterThan(0));
    await userEvent.click(canvas.getAllByLabelText(label)[0]);

    const dialog = within(await screen.findByRole('dialog'));
    await userEvent.click(await dialog.findByText('Walk-in'));
    // Any rate moves to step 3; the first one keeps the story independent of the rate list.
    await userEvent.click((await dialog.findAllByText(/RATE|^Free$|\$/))[0]);

    const players = await dialog.findByLabelText('Players');
    await expect(players).toHaveValue(String(nth));
    // The picker offers the run, and nothing beyond it.
    await expect(within(players as HTMLSelectElement).getAllByRole('option')).toHaveLength(4);
  };

/** An empty 4-slot row on the single-nine club: the picker at its widest. */
const emptyNine = () => atVenue('nine', { bookings: [], shift: 'peak' });

/** Leftmost open cell — one player. */
export const BookOnePlayer: Story = {
  render: () => <Screen initialState={emptyNine()} />,
  play: bookFromNthOpenCell(1),
};

/** Third open cell — three players, starting at the run's first slot. */
export const BookThreePlayers: Story = {
  render: () => <Screen initialState={emptyNine()} />,
  play: bookFromNthOpenCell(3),
};

/** Rightmost open cell — the whole remaining opening, four players. */
export const BookFourPlayers: Story = {
  render: () => <Screen initialState={emptyNine()} />,
  play: bookFromNthOpenCell(4),
};
