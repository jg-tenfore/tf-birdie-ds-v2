import type { Meta, StoryObj } from '@storybook/react-vite';
import { withEdition } from '../../edition-decorator';
import { mobileMeta } from '../../pos-mobile/mobile-helpers';
import * as Archived from '../../pos-mobile/5-payment/Payment.stories';

/**
 * Prototypes / Mobile / Pro Shop / Payment
 *
 * The stories of **Archive › Original port › Mobile › Payment**, rendered in the current edition:
 * Weston Edits (`CURRENT_EDITION.mobile`). Each one is that story, unchanged (same state, same
 * `play`); only the edition differs, so the two pages are a before and after of the same screen.
 * The notes under each story were written for the original port, so where this edition behaves
 * differently, the screen wins.
 */
const meta = {
  title: 'Prototypes/Mobile/Pro Shop/Payment',
  decorators: [withEdition('current-mobile')],
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

// Copies, not the archived objects themselves: Storybook annotates each export it indexes, and
// sharing the object would let this file's annotations overwrite the archive's.
export const Checkout: Story = { ...Archived.Checkout };
export const CheckoutLoadedBooking: Story = { ...Archived.CheckoutLoadedBooking };
export const CheckoutMember: Story = { ...Archived.CheckoutMember };
export const Tip: Story = { ...Archived.Tip };
export const ReaderCard: Story = { ...Archived.ReaderCard };
export const ReaderCash: Story = { ...Archived.ReaderCash };
export const ReaderGiftCert: Story = { ...Archived.ReaderGiftCert };
export const PaymentComplete: Story = { ...Archived.PaymentComplete };
export const PaymentCompleteFromBooking: Story = { ...Archived.PaymentCompleteFromBooking };
