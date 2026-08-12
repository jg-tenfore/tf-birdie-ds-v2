import type { Meta, StoryObj } from '@storybook/react-vite';
import { DEMO_BOOKINGS, Screen, onTeeSheet, screenParams, withWalkInOrder } from '../screen-helpers';

/**
 * POS Screens / 7 · People
 *
 * CRM-facing dialogs. The through-line: a member rate is never a price the operator can
 * simply type — it has to be attached to a named member of the right tier.
 */
const meta = {
  title: 'POS Screens/7 · People',
  parameters: screenParams,
} satisfies Meta;

export default meta;
type Story = StoryObj;

/**
 * Member validation. Only members of the *required* tier are selectable — a senior member
 * can't buy a student rate. Non-matching records still show, greyed, so staff can see the
 * person exists and why they don't qualify rather than concluding search is broken.
 */
export const MemberLookup: Story = {
  render: () => (
    <Screen
      initialState={{
        bookings: DEMO_BOOKINGS,
        currentCategory: 'CHECK IN',
        modal: { kind: 'memberLookup', itemName: 'Senior Member 18 Holes', requiredType: 'senior' },
      }}
    />
  ),
};

/** Member validation for a tier with no matches yet — the empty-but-explained state. */
export const MemberLookupStudent: Story = {
  render: () => (
    <Screen
      initialState={{
        bookings: DEMO_BOOKINGS,
        currentCategory: 'CHECK IN',
        modal: { kind: 'memberLookup', itemName: 'Student Member 9 Holes', requiredType: 'student' },
      }}
    />
  ),
};

/** Golfer search across the roster and guest records, filterable by tier. */
export const GolferSearch: Story = {
  render: () => (
    <Screen
      initialState={{ bookings: DEMO_BOOKINGS, modal: { kind: 'golferSearch', target: 'primary' } }}
    />
  ),
};

/**
 * Guest details for one seat. Offers a CRM search first and a manual form second, because
 * most guests in a foursome are already in the system.
 */
export const GuestDetail: Story = {
  render: () => (
    <Screen initialState={withWalkInOrder({ modal: { kind: 'guestDetail', guestIndex: 2 } })} />
  ),
};

/** Creating a CRM record from the counter. */
export const NewCustomer: Story = {
  render: () => (
    <Screen initialState={{ bookings: DEMO_BOOKINGS, modal: { kind: 'newCustomer' } }} />
  ),
};

/** The walk-in fast path — name the golfer, then ring their rate. */
export const WalkIn: Story = {
  render: () => <Screen initialState={{ bookings: DEMO_BOOKINGS, modal: { kind: 'walkIn' } }} />,
};

/** Refund, applied to a specific player found by searching the day. */
export const RefundPanel: Story = {
  render: () => (
    <Screen initialState={onTeeSheet({ modal: { kind: 'actionPanel', action: 'refund' } })} />
  ),
};

/** Rain check, same pattern. */
export const RainCheckPanel: Story = {
  render: () => (
    <Screen initialState={onTeeSheet({ modal: { kind: 'actionPanel', action: 'raincheck' } })} />
  ),
};
