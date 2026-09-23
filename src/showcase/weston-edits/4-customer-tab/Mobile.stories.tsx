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
 * So the reservation drops to **four tabs — Players · Financial · Notes · Activity** — and the
 * record becomes its own screen, a full-screen dialog over the reservation. ✕ returns to the
 * reservation exactly as you left it.
 *
 * The problem it solves, in his words: *"they're like, hey, is your email jonah.hamlet@hotmail?
 * No, actually it's at Gmail. If I want to fix that, currently I go all the way to customer
 * lookup."*
 *
 * ## The component
 *
 * `CustomerRecordScreen` (`src/pos/mobile/screens/tee/CustomerRecordScreen.tsx`) picks one of two
 * bodies, both inside a `MobileScreen` with a `DialogTopBar`:
 *
 * | Body | When | Top bar |
 * |---|---|---|
 * | `Record` | `liveCustomer(route.customerId)` resolves | ✕ · name · **Save** |
 * | `AssignSeat` | it does not | ✕ · "Who is in seat 2?" · **New** |
 *
 * Sections, in order: Contact (email with six one-tap domain chips, phone, notes) · Membership
 * & types · Account · Punch cards · Gift cards · Rain checks · Tee time history (first 8, then
 * "n earlier rounds"). Contact and customer types edit in place and **Save** commits them to
 * `state.customerEdits`, the same session overlay the terminal writes — so an edit made on the
 * phone changes what the seat pays, on either device.
 *
 * ## The route
 *
 * `src/pos/mobile/navigation.tsx`:
 *
 * | Field | Type | What it does |
 * |---|---|---|
 * | `customerId` | `string \| null` | The record, or `null` for an empty chair |
 * | `bookingId` | `string?` | Which reservation `assignPlayer` writes back to |
 * | `seat` | `number?` | Which chair. Titles the assign view; without it the screen is just "Find a customer", reachable from anywhere |
 *
 * There is deliberately **no `assigning` flag** here, unlike the terminal's `CustomerModalState`.
 * The phone does not need one: a seat that resolves to nobody *is* the assign case, whether it
 * is an empty chair or a chair with an unlinked name typed into it. Same outcome, one field
 * fewer to keep in step.
 *
 * ## Presentation
 *
 * `customerRecord: 'dialog'` in `PRESENTATION`. MD3 replaces centred dialogs with full-screen
 * ones on phones, and the shape fits what this is: something you open, change and either commit
 * or abandon. A push would have been wrong — it is not a level deeper into the reservation, it
 * is a different object.
 *
 * ## Specs
 *
 * | | |
 * |---|---|
 * | Frame | 402 × 797 (`mobile.frame`) |
 * | Enter | Rises `translateY(12%)` + fade, **400ms** `cubic-bezier(0.05, 0.7, 0.1, 1)` (`mobile.motion.sheet` / `emphasized`) |
 * | Exit | Drops back, 200ms `cubic-bezier(0.3, 0, 0.8, 0.15)` |
 * | Top bar | `DialogTopBar` — ✕ left, one confirming text action right. No back arrow |
 * | Search | Two characters minimum; name, phone, email or id; **8 results** (the terminal shows 6) |
 * | Result rows | `ListItemButton` at 56dp (`mobile.listItem.one`), name over phone · email |
 * | Chips | `radius` 999, 12.5/700, 1.25 × 0.75 padding |
 * | Stat tiles | 92px minimum, value turns `md3.error` on a balance owed or a no-show count |
 * | Reservation underneath | Stays mounted, so ✕ returns to the same tab and scroll position |
 *
 * ## Where it deliberately differs from the tablet
 *
 * - **It does not open from the name.** On a phone the whole top half of a player row is the
 *   drill-down to Player Detail, so the record lives on the row's **⋮ → Customer profile** (or
 *   **Link a customer** on an empty seat). Giving the name its own tap target inside a row that
 *   is already one big button would be two overlapping hit areas at 402px. On the terminal the
 *   name *is* the button.
 * - **Full-screen dialog, not a 720px centred modal.** There is no "over everything" on a phone
 *   — there is only the screen.
 * - **Save is in the top bar**, not a footer pair. ✕ is Cancel.
 * - **New customer pushes another dialog** (`newCustomer`) rather than opening a modal on top.
 * - **No card-on-file tile.** The terminal's Account row shows `•••• 4242` when there is one;
 *   the phone's five tiles do not.
 *
 * ## The stories
 *
 * | Story | What it is for |
 * |---|---|
 * | **Booker Record** | A record, deliberately on `bookerWithRecord` — a booking whose booker actually resolves, by the booking's phone. Most do not, and picking any party at random would have shown the assign screen instead. Asserts Contact, Account and Tee time history |
 * | **Linked Guest** | Seat 2's record, not the booker's |
 * | **Assign A Seat** | An empty chair: the same route in assign mode, *"Who is in seat 2?"* |
 * | **Name Is Not An Identification** | A seat named "Kim, D." but unlinked. Still assign mode — a name is not an identification, and the seat pays the booking's rate until someone links it |
 * | **Four Tabs** | The reservation underneath. Asserts **Players** is there and that **Customer** is gone — not hidden, gone |
 *
 * ## Still open
 *
 * - **No ID.me badge on the record** (3), on either device.
 * - **`seatSuggestion` is unused here.** A seat named "Kim, D." could be offered Kim, David with
 *   a Link action; instead assign mode opens on an empty search box.
 * - **The ⋮ is the only way in.** If the record turns out to be something staff reach for
 *   constantly, it may need a second entry point on Player Detail — whose "Customer profile" row
 *   currently goes to `golferDetail` in the People tab, a different screen entirely.
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
