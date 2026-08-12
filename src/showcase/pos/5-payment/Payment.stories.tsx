import type { Meta, StoryObj } from '@storybook/react-vite';
import { Screen, paidFoursome, screenParams, withLoadedBooking, withWalkInOrder } from '../screen-helpers';

/**
 * POS Screens / 5 · Payment
 *
 * Receipt left, keypad right. The keypad has two modes because the operator does two
 * different arithmetic jobs here — cash tendered (to compute change) and tip. Tips are
 * *staged* rather than applied: they change the charge, so Recalculate is required
 * before the balance moves. That's what stops a mistyped tip becoming the amount charged.
 */
const meta = {
  title: 'POS Screens/5 · Payment',
  parameters: screenParams,
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Checkout for a walk-in order, showing per-player receipt lines. */
export const Checkout: Story = {
  render: () => <Screen initialState={withWalkInOrder({ modal: { kind: 'checkout' } })} />,
};

/** Checkout for a tee-sheet booking — tax arrives on the booking's own line. */
export const CheckoutLoadedBooking: Story = {
  render: () => (
    <Screen
      initialState={withLoadedBooking(paidFoursome(), { modal: { kind: 'checkout' } })}
    />
  ),
};

/** The card reader prompt — insert, swipe, or tap, with manual key-in offered. */
export const PaymentReaderCard: Story = {
  render: () => (
    <Screen
      initialState={withWalkInOrder({ modal: { kind: 'paymentReader', method: 'card' } })}
    />
  ),
};

/** Cash tender — no key-in path, and the operator confirms receipt rather than the reader. */
export const PaymentReaderCash: Story = {
  render: () => (
    <Screen
      initialState={withWalkInOrder({ modal: { kind: 'paymentReader', method: 'cash' } })}
    />
  ),
};

/** Gift certificate tender. */
export const PaymentReaderGiftCert: Story = {
  render: () => (
    <Screen
      initialState={withWalkInOrder({ modal: { kind: 'paymentReader', method: 'giftcert' } })}
    />
  ),
};

/**
 * The paid state. After approval the Pay button becomes a receipt: method, total, and
 * time, with a New order reset — so the operator can confirm what happened before
 * clearing the counter.
 */
export const PaidReceipt: Story = {
  render: () => (
    <Screen
      initialState={withWalkInOrder({
        lastPayment: { method: 'card', amount: 213.32, time: '1:42 PM' },
      })}
    />
  ),
};
