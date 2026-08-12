import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Screen,
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
