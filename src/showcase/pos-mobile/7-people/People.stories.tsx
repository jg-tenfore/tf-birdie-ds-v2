import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';
import type { Golfer } from '../../../pos/types';
import { DEMO_BOOKINGS, MobileStory, mobileMeta, withWalkInOrder } from '../mobile-helpers';

/**
 * Mobile Screens / 7 · People
 *
 * The CRM as a destination of its own. The shape is the Android contacts app: search and
 * filter chips at the top, an alphabetical list, tap a person to drill in. Creating a
 * record is a full-screen dialog; picking a golfer for an order is the same list pushed
 * in picker mode.
 *
 * Lists keep the POS's surname-first names ("Thompson, Michael") because they're sorted
 * and sectioned by surname and match the tee sheet; the detail header uses the natural
 * order.
 */
const meta = {
  title: 'Mobile Screens/7 · People',
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const people = { bookings: DEMO_BOOKINGS };

/**
 * The People root. No back arrow — it's a destination, so the navigation bar is the way
 * out. The extended FAB opens "New customer" as a full-screen dialog.
 */
export const PeopleList: Story = {
  render: () => <MobileStory initialState={people} tab="people" />,
};

/**
 * Filtered to members with a chip. Filters are local to the list and survive a trip into
 * a golfer and back, because the root stays mounted under the pushed detail page.
 */
export const MembersOnly: Story = {
  render: () => <MobileStory initialState={people} tab="people" />,
  play: async ({ canvasElement }) => {
    await userEvent.click(await within(canvasElement).findByText('Members'));
  },
};

/**
 * A member, pushed from the list. Back returns to the list with its search intact.
 * "Start order" and "Book tee time" jump to the Register and Tee Sheet destinations
 * rather than stacking a register on top of a contact — the golfer rides along as the
 * order's customer, and People keeps its own stack.
 */
export const GolferDetailMember: Story = {
  render: () => <MobileStory initialState={people} tab="people" stack={[{ name: 'golferDetail', golferId: 'G001' }]} />,
};

/** A guest: no tier, no join date — the same page with the membership slots honestly empty. */
export const GolferDetailGuest: Story = {
  render: () => <MobileStory initialState={people} tab="people" stack={[{ name: 'golferDetail', golferId: 'G008' }]} />,
};

/**
 * The picker, opened from an order seat. A push rather than a dialog: picking is one tap
 * with nothing to abandon, so the back arrow is the exit and there's no Save. Tapping a
 * golfer names seat 2 and pops back to the order. "Add new customer" opens the dialog on
 * top; saving it attaches the new person and closes both.
 */
export const GolferPicker: Story = {
  render: () => (
    <MobileStory
      initialState={withWalkInOrder()}
      tab="register"
      stack={[{ name: 'order' }, { name: 'golferPicker', target: { itemIdx: 0, playerIdx: 1 } }]}
    />
  ),
};

/**
 * New customer, from the People FAB. A full-screen dialog: ✕ discards and returns to the
 * list, Save is disabled until there's a name. Member-only fields appear when "Member"
 * is chosen.
 */
export const NewCustomer: Story = {
  render: () => <MobileStory initialState={people} tab="people" stack={[{ name: 'newCustomer' }]} />,
};

/**
 * New customer opened from the picker. The confirm reads "Save & add": the record is
 * attached to the seat the picker was opened for, and both screens close back to the order.
 */
export const NewCustomerFromPicker: Story = {
  render: () => (
    <MobileStory
      initialState={withWalkInOrder()}
      tab="register"
      stack={[
        { name: 'order' },
        { name: 'golferPicker', target: { itemIdx: 0, playerIdx: 2 } },
        { name: 'newCustomer' },
      ]}
    />
  ),
};

/** A customer created earlier this session (as New Customer's Save would leave them). */
const sessionCustomer: Golfer = {
  id: 'N001',
  name: 'Abbott, Nora',
  phone: '(555) 610-4471',
  email: 'nora.abbott@email.com',
  type: 'Member',
  memberType: 'seasonal',
  hcp: 16,
  joined: '2026-05',
  notes: 'Created at the counter today.',
};

/**
 * Someone created earlier this session — what New customer's Save leaves behind. They go
 * into `addedGolfers`, and every list, search and lookup reads the session roster
 * (`golferRoster`), so they're in the People list (and the count) like anyone else, on the
 * phone and at the counter. Ids are deterministic (`N001`, `N002`, …), never a clock.
 */
export const CustomerAddedThisSession: Story = {
  render: () => <MobileStory initialState={{ ...people, addedGolfers: [sessionCustomer] }} tab="people" />,
};

/** The same customer's detail page — found by id in the session roster, not the demo data. */
export const CustomerAddedThisSessionDetail: Story = {
  render: () => (
    <MobileStory
      initialState={{ ...people, addedGolfers: [sessionCustomer] }}
      tab="people"
      stack={[{ name: 'golferDetail', golferId: sessionCustomer.id }]}
    />
  ),
};
