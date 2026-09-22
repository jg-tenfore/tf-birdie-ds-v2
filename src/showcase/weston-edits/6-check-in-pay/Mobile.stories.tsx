import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { MobileStory, mobileMeta } from '../../pos-mobile/mobile-helpers';
import { adjustedParty, at18, loadedOrder, memberParty, paidParty, partlyPaidNamed, withBookings } from '../mobile-scenarios';

/**
 * Weston Edits / 6 · Check In & Pay / Mobile
 *
 * The reservation's pinned bottom action — the one moment the golf goes to the register.
 * Its amount is what the order will charge for the reservation *as adjusted* (fees, holes,
 * transport, tax on the seats still paying). When nothing is due — paid in full, or a
 * member at $0 — it doesn't ask for money at all: it checks the party in, with the
 * register one tap away for anything they buy. Like the tablet's, it checks everyone in
 * (no-shows aside) as it opens the order.
 *
 * Two routes into it that used to skip it: the tee sheet's long-press **quick sheet** now
 * offers **Open reservation** instead of a straight-to-register Check in & pay, and the
 * Register's **Walk-in** (or a CHECK IN rate with nothing on the order) creates a walk-in
 * reservation at the next open tee time and pushes it — base edition unchanged.
 */
const meta = {
  title: 'Weston Edits/6 · Check In & Pay/Mobile',
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const detail = (b: ReturnType<typeof adjustedParty>) => (
  <MobileStory edition="weston" initialState={at18(withBookings(b))} tab="tee" stack={[{ name: 'bookingDetail', bookingId: b.id }]} />
);

/** An adjusted, unpaid reservation: **Check in & pay · $amount**, with the amount the order will show. */
export const CheckInAndPay: Story = {
  render: () => detail(adjustedParty()),
};

/**
 * Tapping it: the reservation is loaded into the register and the Register destination
 * opens on the order — its golf summary and total match the button.
 */
export const AfterCheckInAndPay: Story = {
  render: CheckInAndPay.render,
  play: async ({ canvasElement }) => {
    await userEvent.click(await within(canvasElement).findByRole('button', { name: /^Check in & pay/ }));
  },
};

/** Partly paid: the button charges only the players who haven't paid. */
export const PartlyPaid: Story = {
  render: () => detail(partlyPaidNamed()),
};

/**
 * Paid in full: no second request for money. The bar says so and offers **Check in**, with
 * **Register** for anything else they buy.
 */
export const PaidInFull: Story = {
  render: () => detail(paidParty()),
};

/** A member at $0: check-in only, no "pay". */
export const MemberNoCharge: Story = {
  render: () => detail(memberParty()),
};

/** The order a paid-in-full reservation opens: every seat struck through, nothing to charge. */
export const PaidInFullOrder: Story = {
  render: () => <MobileStory edition="weston" initialState={loadedOrder(paidParty())} tab="register" stack={[{ name: 'order' }]} />,
};

/**
 * **Quick sheet → Open reservation.** Long-pressing a booking on the tee sheet used to offer
 * "Check in & pay", which went straight to the register past the reservation. In the Weston
 * edition it offers **Open reservation** (players, holes, tee fees, transport) — Check in &
 * pay lives on the reservation. The play test checks the item, taps it, and lands on the
 * reservation's Check in & pay.
 */
export const QuickSheetOpensReservation: Story = {
  render: () => (
    <MobileStory
      edition="weston"
      initialState={at18(withBookings(adjustedParty()), { contextMenu: { kind: 'booking', bookingId: adjustedParty().id, x: 0, y: 0 } })}
      tab="tee"
    />
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByText('Open reservation'));
    await waitFor(() => expect(c.queryByText('Open reservation')).toBeNull());
    await c.findByRole('button', { name: /^Check in & pay · / });
  },
};

/**
 * **Walk-in → reservation.** On an empty Register, the **Walk-in** start card puts a walk-in
 * (`W-0001`, one player) at the next open tee time and pushes its reservation screen, where
 * the party is set up; its Check in & pay brings it to the order.
 */
export const WalkInFromRegister: Story = {
  render: () => <MobileStory edition="weston" initialState={at18()} tab="register" />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByText('Walk-in'));
    await waitFor(() => expect(c.getAllByText(/W-0001/).length).toBeGreaterThan(0));
    await c.findByRole('button', { name: /^Check in & pay · / });
  },
};
