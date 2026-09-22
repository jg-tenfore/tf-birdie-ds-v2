import type { Meta, StoryObj } from '@storybook/react-vite';
import { Screen } from '../../pos/screen-helpers';
import { adjustedParty, noShowParty, openParty, paidTwilight, sheetWithPanel } from '../tablet-scenarios';

/**
 * Weston Edits / 5 · Financial, Notes & Activity / Tablet
 *
 * The rest of the old Booking Detail dialog, moved into the panel so the reservation is one
 * place. These are the *same components* the dialog renders (`components/BookingTabs.tsx`) —
 * one copy, so the slide-over and the dialog can't drift into two ideas of what a booking
 * owes. One change, in both: **Financial** now reads each player's own fee, so a player
 * switched to 18 or given a different rate owes that, not the booking's flat rate.
 */
const meta = {
  title: 'Weston Edits/5 · Financial, Notes & Activity/Tablet',
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'counterTerminal', isRotated: false } },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/**
 * Financial on an adjusted party: the outstanding balance is the sum of each player's own
 * fee (the 18-hole player owes more, the booker's $25 less), and the rate line says it is
 * adjusted per player. Refund and rain check stay per player.
 */
export const FinancialAdjusted: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(adjustedParty(), 'financial')} />,
};

/** Financial on a paid booking — nothing outstanding; the same $29 the reservation shows. */
export const FinancialPaid: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(paidTwilight(), 'financial')} />,
};

/** Financial on a no-show party: nobody owes, and the rain-check trail is where action is. */
export const FinancialNoShow: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(noShowParty(), 'financial')} />,
};

/** Notes: tags, the group note (shown on the chip and cart), and per-player notes. */
export const Notes: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(openParty(), 'notes')} />,
};

/** Activity: the audit trail, seeded from the booking's state so it is never empty. */
export const Activity: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(paidTwilight(), 'activity')} />,
};
