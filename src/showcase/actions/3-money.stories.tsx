import type { Meta, StoryObj } from '@storybook/react-vite';
import { Exhibit, T0, actionParams, afterShows, mk, row, rowKey } from './action-helpers';
import type { PlayerState } from '../../pos/types';

/**
 * Tee Sheet Actions / **3 · Money**
 *
 * Actions that change what is owed. All three leave the tee time in place and change only
 * its payment state, because the round happened (or was paid for) either way — the sheet is
 * a record, and erasing a refunded booking would erase the reason for the refund.
 *
 * Payment state is the strongest signal on the sheet: it owns chip colour outright. These
 * stories are the clearest way to see why.
 */
const meta = {
  title: 'Tee Sheet Actions/3 · Money',
  parameters: actionParams,
} satisfies Meta;

export default meta;
type Story = StoryObj;

const states = (n: number, patch: Partial<PlayerState> = {}): PlayerState[] =>
  Array.from({ length: n }, () => ({ paid: false, step: -1, noShow: false, ...patch }));

/** A settled morning: two paid groups. */
const settled = () => ({
  venueId: 'nine' as const,
  shift: 'early' as const,
  bookings: [
    mk({
      id: 'm1',
      course: 'the-nine',
      timeMin: T0,
      slot: 0,
      players: 4,
      name: 'Mitchell, R.',
      pay: 'paid',
      price: 100,
      playerStates: states(4, { paid: true, step: 1 }),
    }),
    mk({
      id: 'm2',
      course: 'the-nine',
      timeMin: row(1),
      slot: 0,
      players: 2,
      name: 'Cooper, S.',
      pay: 'paid',
      price: 100,
      playerStates: states(2, { paid: true, step: 0 }),
    }),
  ],
});

/**
 * **Refund.**
 *
 * The chip turns orange. Orange is its own state rather than a return to unpaid, because
 * "was paid then refunded" and "never paid" need different follow-ups — one is closed, the
 * other is money still to collect.
 */
export const Refund: Story = {
  render: () => (
    <Exhibit
      note="Refunding the 6:00 foursome. The tee time stays: the round is still part of the day's record."
      before={settled()}
      modal={{ kind: 'actionPanel', action: 'refund' }}
      apply={[{ type: 'patchBooking', bookingId: 'm1', patch: { pay: 'refund' } }]}
    />
  ),
  play: afterShows({ has: [/Mitchell, R\.\|4\|refund\|booked/], lacks: [/Mitchell, R\.\|4\|paid/] }),
};

/**
 * **Issue rain check.**
 *
 * Hatched grey, the same treatment as a no-show — both mean "this round did not happen as
 * sold". They differ in what the golfer holds afterwards, which is a record on the booking
 * rather than something the sheet needs to show at a glance.
 */
export const RainCheck: Story = {
  render: () => (
    <Exhibit
      note="Weather closed the course after the 6:08 pair teed off. Their chip goes hatched."
      before={settled()}
      modal={{ kind: 'actionPanel', action: 'raincheck' }}
      apply={[{ type: 'patchBooking', bookingId: 'm2', patch: { pay: 'rain_chk' } }]}
    />
  ),
  play: afterShows({ has: [/Cooper, S\.\|2\|rain_chk\|booked/] }),
};

/**
 * **Override price** — on a whole time row.
 *
 * The only money action that writes to the row rather than to a booking. It is stored in
 * `timePrices`, keyed by date and minute, so it applies to whatever gets booked into that
 * row later — which is the point of setting it in advance.
 *
 * A banner appears above the row. Existing bookings keep the price they were sold at.
 */
export const PriceOverride: Story = {
  render: () => (
    <Exhibit
      note="Twilight pricing set on the 6:08 row. Note the banner, and that the existing pair's price is untouched."
      before={settled()}
      modal={{ kind: 'timePrice', timeMin: row(1) }}
      apply={[
        {
          type: 'setTimePrice',
          key: rowKey(row(1)),
          price: { label: 'Twilight rate', fee: 39 },
        },
      ]}
    />
  ),
  play: afterShows({ has: [/Cooper, S\.\|2\|paid/] }),
};

/**
 * **Clearing an override.**
 *
 * Removing the banner restores the course's normal rate card for that row. Shown separately
 * because "no override" and "an override of the standard price" are not the same record,
 * and only the first makes the banner go away.
 */
export const PriceOverrideCleared: Story = {
  render: () => (
    <Exhibit
      note="The override is removed. The row returns to the rate card with no banner."
      before={{
        ...settled(),
        timePrices: { [rowKey(row(1))]: { label: 'Twilight rate', fee: 39 } },
      }}
      modal={{ kind: 'timePrice', timeMin: row(1) }}
      apply={[{ type: 'setTimePrice', key: rowKey(row(1)), price: null }]}
    />
  ),
  play: afterShows({ has: [/Cooper, S\.\|2\|paid/] }),
};
