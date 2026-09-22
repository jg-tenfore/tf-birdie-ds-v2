import type { Meta, StoryObj } from '@storybook/react-vite';
import { MobileStory, mobileMeta } from '../../pos-mobile/mobile-helpers';
import { adjustedParty, at18, compedParty, partlyPaidNamed, withBookings } from '../mobile-scenarios';

/**
 * Weston Edits / 5 · Financial, Notes & Activity / Mobile
 *
 * The rest of the reservation, as tabs. **Financial** now reads the reservation *as
 * adjusted*: the amount due is priced by the same functions the register uses (per-player
 * fee, transport, tax on the seats that still pay), so the tab, the Check in & pay button
 * and the order total are one number. Each player shows their holes and transport. Notes
 * and Activity are unchanged from the base edition, and sit on the same tab row.
 */
const meta = {
  title: 'Weston Edits/5 · Financial, Notes & Activity/Mobile',
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/**
 * Financial on an adjusted party: due at check-in, the fee/transport/tax split, and per
 * player what they'll be charged with their holes and transport underneath.
 */
export const Financial: Story = {
  render: () => {
    const b = adjustedParty();
    return <MobileStory edition="weston" initialState={at18(withBookings(b))} tab="tee" stack={[{ name: 'bookingDetail', bookingId: b.id, tab: 'financial' }]} />;
  },
};

/** A comped player: their fee reads **No charge**, and the amount due drops by it. */
export const FinancialWithComp: Story = {
  render: () => {
    const b = compedParty();
    return <MobileStory edition="weston" initialState={at18(withBookings(b))} tab="tee" stack={[{ name: 'bookingDetail', bookingId: b.id, tab: 'financial' }]} />;
  },
};

/** Partly paid: paid players read **Paid**, and only the rest are due. */
export const FinancialPartlyPaid: Story = {
  render: () => {
    const b = partlyPaidNamed();
    return <MobileStory edition="weston" initialState={at18(withBookings(b))} tab="tee" stack={[{ name: 'bookingDetail', bookingId: b.id, tab: 'financial' }]} />;
  },
};

/** Notes — tags, the group note and per-player notes — on the reservation's tab row. */
export const Notes: Story = {
  render: () => {
    const b = adjustedParty();
    return <MobileStory edition="weston" initialState={at18(withBookings(b))} tab="tee" stack={[{ name: 'bookingDetail', bookingId: b.id, tab: 'notes' }]} />;
  },
};

/** Activity — the audit trail, seeded from the booking's state. */
export const Activity: Story = {
  render: () => {
    const b = partlyPaidNamed();
    return <MobileStory edition="weston" initialState={at18(withBookings(b))} tab="tee" stack={[{ name: 'bookingDetail', bookingId: b.id, tab: 'activity' }]} />;
  },
};
