import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';
import { MobileStory, mobileMeta } from '../../pos-mobile/mobile-helpers';
import { at18, loadedOrder, memberParty, offRateParty, openParty, paidParty } from '../mobile-scenarios';

/**
 * Weston Edits / 8 · Bug Fixes / Mobile
 *
 * The bugs found in Weston's recording, checked on the phone. They were fixed in shared
 * cart logic, so they apply in **every edition** — which is why most stories here render
 * the **base** edition: the phone everyone else uses gets the fix too. One phone-only cause
 * was also fixed: the booking screen's **Check in & pay · $amount** counted unpaid players ×
 * rate and left out carts and tax, so it disagreed with the order it opened. It now reads
 * the order's own total.
 */
const meta = {
  title: 'Weston Edits/8 · Bug Fixes/Mobile',
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/**
 * A reserved tee time loaded into the order reads **Tee Time 18 holes** under the
 * booking's name — not "Walk-in". (Base edition.)
 */
export const ReservedNotWalkIn: Story = {
  render: () => <MobileStory edition="base" initialState={loadedOrder(openParty())} tab="register" stack={[{ name: 'order' }]} />,
};

/**
 * The order charges the booking's own rate. A twilight or group booking used to arrive as
 * the card's $59 with a time-of-day discount taken off; now the per-player price is the
 * rate on the reservation. (Base edition.)
 */
export const RateMatchesBooking: Story = {
  render: () => <MobileStory edition="base" initialState={loadedOrder(offRateParty())} tab="register" stack={[{ name: 'order' }]} />,
};

/**
 * The booking screen's button carries the order's total — fees, transport and tax — so
 * the amount on the button is the amount on the order. (Base edition; phone-only cause.)
 */
export const ButtonMatchesOrder: Story = {
  render: () => (
    <MobileStory edition="base" initialState={at18()} tab="tee" stack={[{ name: 'bookingDetail', bookingId: openParty().id }]} />
  ),
};

/** A booking that's already paid opens an order with nothing to charge — no second payment. (Base edition.) */
export const PaidNotChargedAgain: Story = {
  render: () => <MobileStory edition="base" initialState={loadedOrder(paidParty())} tab="register" stack={[{ name: 'order' }]} />,
};

/** No tax on a $0 subtotal: a member at the member rate shows tax $0.00 and nothing to charge. (Base edition.) */
export const NoTaxOnZero: Story = {
  render: () => <MobileStory edition="base" initialState={loadedOrder(memberParty())} tab="register" stack={[{ name: 'order' }]} />,
};

/**
 * Leaving an order detaches its booking: clear the order and the Register is empty again —
 * no booking left attached to the next sale. (Base edition.)
 */
export const BookingDetaches: Story = {
  render: () => <MobileStory edition="base" initialState={loadedOrder(openParty())} tab="register" stack={[{ name: 'order' }]} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByLabelText('Order options'));
    await userEvent.click((await c.findAllByText('Clear order'))[0]);
    // The sheet's confirm is the last "Clear order" on screen.
    await c.findByText('Clear this order?');
    const confirm = await c.findAllByText('Clear order');
    await userEvent.click(confirm[confirm.length - 1]);
  },
};

/** The same fixes in the Weston edition: the paid-in-full order, as the golf summary shows it. */
export const WestonPaidOrder: Story = {
  render: () => <MobileStory edition="weston" initialState={loadedOrder(paidParty())} tab="register" stack={[{ name: 'order' }]} />,
};
