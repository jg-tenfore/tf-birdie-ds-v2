import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { MobileStory, mobileMeta } from '../../pos-mobile/mobile-helpers';
import { adjustedParty, at18, bookerWithRecord, nameOnlyGuest, openParty, withBookings } from '../mobile-scenarios';
import { seatRecord } from '../../../pos/logic/seat-pricing';
import type { Booking } from '../../../pos/types';

/**
 * Weston Edits / 4 · Customer Profile / Mobile
 *
 * The Customer **tab** is gone on the phone too. Weston's third round: "I don't think it needs
 * to be a tab on the reservation, I wonder if it's its own thing." A customer record is not a
 * property of a tee time — the same person is on four other bookings this month, and the
 * questions staff get asked ("do I still have that gift card", "I didn't no-show") are about
 * the person, not the round.
 *
 * So the reservation drops to four tabs, and a player's **name** opens their record as a
 * full-screen dialog over it. ✕ returns to the reservation exactly as you left it.
 *
 * The problem it solves, in his words: "they're like, hey, is your email jonah.hamlet@hotmail?
 * No, actually it's at Gmail. If I want to fix that, currently I go all the way to customer
 * lookup." Now it is one tap from the seat, with one-tap domain chips so nobody types a whole
 * address on glass.
 *
 * Contact edits in place. Memberships, customer types, punch cards, rain checks, gift cards and
 * rounds played are shown but not edited — taking money stays the register's job. Customer
 * types are chips with an expander rather than the column of eighteen checkboxes Weston called
 * ugly.
 */
const meta = {
  title: 'Weston Edits/4 · Customer Profile/Mobile',
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** The reservation, then that seat's record stacked over it. */
const recordOver = (b: Booking, seat: number) => (
  <MobileStory
    edition="weston"
    initialState={at18(withBookings(b))}
    tab="tee"
    stack={[
      { name: 'bookingDetail', bookingId: b.id },
      { name: 'customerRecord', customerId: seatRecord(b, seat)?.id ?? null, bookingId: b.id, seat },
    ]}
  />
);

/**
 * The booker's record: contact, membership, account, credits and rounds played.
 *
 * Deliberately a booking whose booker *resolves* — by the booking's phone. Most do not, because
 * a name on a sheet is just a string until someone links it, and that is the rule this round
 * exists to enforce rather than a gap in the data.
 */
export const BookerRecord: Story = {
  render: () => recordOver(bookerWithRecord(), 0),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText('Contact');
    await expect(canvas.getByText('Account')).toBeTruthy();
    await expect(canvas.getByText('Tee time history')).toBeTruthy();
  },
};

/** A guest seat linked to a real customer — their record, not the booker's. */
export const LinkedGuest: Story = {
  render: () => recordOver(adjustedParty(), 1),
};

/**
 * An empty seat opens the same route in assign mode: search the roster, or create somebody.
 * That is how Guest 3 becomes a person — and linking is what makes them price the round.
 */
export const AssignASeat: Story = {
  render: () => recordOver(openParty(), 1),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText(/Who is in seat 2\?/);
  },
};

/**
 * A seat *named* like a customer but not linked. It still opens in assign mode, because a name
 * is not an identification — and until someone links it, the seat pays the booking's rate.
 */
export const NameIsNotAnIdentification: Story = {
  render: () => recordOver(nameOnlyGuest(), 1),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText(/Who is in seat 2\?/);
  },
};

/** The reservation underneath, now four tabs rather than five. */
export const FourTabs: Story = {
  render: () => {
    const b = adjustedParty();
    return (
      <MobileStory
        edition="weston"
        initialState={at18(withBookings(b))}
        tab="tee"
        stack={[{ name: 'bookingDetail', bookingId: b.id }]}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole('tab', { name: 'Players' });
    // The tab it replaced is gone, not hidden.
    await expect(canvas.queryByRole('tab', { name: 'Customer' })).toBeNull();
  },
};
