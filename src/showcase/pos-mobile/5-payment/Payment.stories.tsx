import type { Meta, StoryObj } from '@storybook/react-vite';
import type { PosState } from '../../../pos/state/pos-store';
import type { MobileRoute } from '../../../pos/mobile/navigation';
import { orderMoney } from '../../../pos/mobile/screens/register/parts';
import {
  MobileStory,
  memberBooking,
  mobileMeta,
  paidFoursome,
  withLoadedBooking,
  withWalkInOrder,
} from '../mobile-helpers';

/**
 * Mobile Screens / 5 · Payment
 *
 * Two kinds of screen, deliberately different. Checkout and Tip are ordinary pushed
 * pages — back returns to change your mind. The reader and the receipt are
 * **takeovers**: no back arrow, no navigation bar. Once a card is on the reader the only
 * ways out are an explicit Cancel or an approval, and approval *replaces* the reader
 * with the receipt so there's nothing to go back to. The receipt's only exits are
 * forward: New order, or back to the tee sheet for a booking.
 *
 *   Order → Checkout → Tip → Reader ⇒ Receipt     (⇒ = replace)
 *                    → Reader (cash) ⇒ Receipt
 *                    → Receipt  (member charge)
 */
const meta = {
  title: 'Mobile Screens/5 · Payment',
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const walkIn = withWalkInOrder();
const due = (s: Partial<PosState>) => orderMoney(s.cart ?? []).total;
const toCheckout: MobileRoute[] = [{ name: 'order' }, { name: 'checkout' }];

/**
 * Checkout, pushed from the order's Charge button. The amount leads; the tenders are a
 * list and each one moves forward in one tap. The order summary sits below for reading
 * back to the customer, not above the decision.
 */
export const Checkout: Story = {
  render: () => <MobileStory initialState={walkIn} tab="register" stack={toCheckout} />,
};

/**
 * Checkout for a loaded tee-sheet booking. The golf's tax arrives on the booking's own line
 * and is counted once; anything else on the order pays sales tax. Phone and terminal both
 * total with `orderTotals`, so they charge the same amount.
 */
export const CheckoutLoadedBooking: Story = {
  render: () => <MobileStory initialState={withLoadedBooking(paidFoursome())} tab="register" stack={toCheckout} />,
};

/**
 * A member on the order enables Member charge. It needs no reader, so it goes straight
 * to the receipt (a takeover pushed over checkout).
 */
export const CheckoutMember: Story = {
  render: () => <MobileStory initialState={withLoadedBooking(memberBooking())} tab="register" stack={toCheckout} />,
};

/**
 * Tip, pushed from checkout for card payments only. It's before the reader because it
 * changes what the reader asks for — the total on the button is what will be charged.
 * Back returns to the tender list.
 */
export const Tip: Story = {
  render: () => (
    <MobileStory initialState={walkIn} tab="register" stack={[...toCheckout, { name: 'tip', method: 'card' }]} />
  ),
};

/**
 * The card reader — a takeover. Cancel (top left) is the only way back, and it's
 * disabled while processing. "Simulate approval" stands in for the customer tapping.
 */
export const ReaderCard: Story = {
  render: () => (
    <MobileStory
      initialState={walkIn}
      tab="register"
      stack={[...toCheckout, { name: 'tip', method: 'card' }, { name: 'paymentReader', method: 'card', amount: due(walkIn) }]}
    />
  ),
};

/**
 * Cash, the same takeover in its tendered form: quick notes, a keypad, and the change
 * due on the confirming button so it's read aloud before the drawer closes.
 */
export const ReaderCash: Story = {
  render: () => (
    <MobileStory
      initialState={walkIn}
      tab="register"
      stack={[...toCheckout, { name: 'paymentReader', method: 'cash', amount: due(walkIn) }]}
    />
  ),
};

/** Gift certificate on the reader, with manual key-in offered. */
export const ReaderGiftCert: Story = {
  render: () => (
    <MobileStory
      initialState={walkIn}
      tab="register"
      stack={[...toCheckout, { name: 'paymentReader', method: 'giftcert', amount: due(walkIn) }]}
    />
  ),
};

/**
 * The receipt, which replaced the reader. No back: the sale is done. Delivery options
 * mark themselves sent and stay put; New order clears the order and pops the Register
 * stack to its root.
 */
export const PaymentComplete: Story = {
  render: () => (
    <MobileStory
      initialState={withWalkInOrder({ lastPayment: { method: 'card', amount: due(walkIn), time: '1:42 PM' } })}
      tab="register"
      stack={[...toCheckout, { name: 'tip', method: 'card' }, { name: 'paymentComplete' }]}
    />
  ),
};

/**
 * The receipt for a tee-sheet booking adds "Back to tee sheet" — the order came from
 * there, so that's where the operator's work continues.
 */
export const PaymentCompleteFromBooking: Story = {
  render: () => {
    const s = withLoadedBooking(paidFoursome());
    return (
      <MobileStory
        initialState={{ ...s, lastPayment: { method: 'card', amount: due(s), time: '1:42 PM' } }}
        tab="register"
        stack={[...toCheckout, { name: 'tip', method: 'card' }, { name: 'paymentComplete' }]}
      />
    );
  },
};
