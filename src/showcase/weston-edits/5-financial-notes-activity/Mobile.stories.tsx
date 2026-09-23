import type { Meta, StoryObj } from '@storybook/react-vite';
import { MobileStory, mobileMeta } from '../../pos-mobile/mobile-helpers';
import { adjustedParty, at18, compedParty, partlyPaidNamed, withBookings } from '../mobile-scenarios';

/**
 * Weston Edits / 5 · Financial, Notes & Activity / Mobile
 *
 * The rest of the reservation on the phone, as tabs on the pushed booking screen. The phone
 * has no dialog to move these out of — they were already tabs — so the edit here is what
 * **Financial** says. It reads the reservation *as adjusted*, priced by the same function the
 * register uses, so the tab, the pinned **Check in & pay** button and the order total are one
 * number rather than three.
 *
 * ## The component
 *
 * `src/pos/mobile/screens/tee/BookingDetailScreen.tsx` — route `bookingDetail`, presentation
 * **push** (`PRESENTATION` in `src/pos/mobile/navigation.tsx`): a full-screen page with a back
 * arrow, covering the navigation bar. Four tabs, from `WESTON_TABS` in the same file — the
 * Customer tab went in round 3, because a customer is not a property of a tee time.
 *
 * | Piece | Where | What drives it |
 * |---|---|---|
 * | `FinancialTab` | same file | `weston` from `useWestonEdits()` picks `ReservationMoney` over the base headline |
 * | `ReservationMoney` | same file | `reservationCharge(b, state)` → `orderMoney(buildTeeTimeCart(…))` → `orderTotals` |
 * | `NotesTab` · `ActivityTab` | same file | `tags`, `groupNote ?? note`, `playerNotes`; `activityLog` + `financialActions`, else a seed |
 * | The tab itself | `route.tab` (`BookingTab`, default `players`) | Switching **replaces** the route rather than pushing, so Back leaves the booking, not the tab |
 *
 * ## Specs
 *
 * | | |
 * |---|---|
 * | Frame | 402 × 797 (`mobile.frame` in `src/theme/tokens.ts`) |
 * | Presentation | `push` — back arrow, no navigation bar, its own stack on the Tee Sheet destination |
 * | Headline | **Due at check-in** when the total is > 0, **Nothing due** at 0; `md3.error` or `payBadges.paid.text` |
 * | Breakdown rows | Tee fees & transport (`subtotal`) · Discounts (only when negative, in error red) · Tax. Hidden entirely at $0 |
 * | Right of the headline | **Booking rate** — `b.price`, the booking's own rate, for reading back |
 * | Per-player row | 48px floor (`minHeight: 48`), a 28px avatar, name, then `{holes} holes · {transport}` and `· adjusted` when `playerIsAdjusted` |
 * | Per-player amount | `No-show` · `Paid` · `money(playerFee)` · **No charge** at $0 |
 * | Refund / rain check | Full-width buttons that push `bookingAction` (presentation **dialog**) — not row icons |
 * | Notes save | Tags apply on tap; the two text fields commit together, and the button only enables when `dirty` |
 *
 * ## Scope
 *
 * Weston edition, phone. The base phone keeps the flat **Outstanding / Rate per player**
 * headline and no per-player holes-and-transport caption; Notes and Activity are identical in
 * both editions and are shown here because they share the tab row.
 *
 * ## The stories
 *
 * | Story | Booking | Tab | What it is for |
 * |---|---|---|---|
 * | **Financial** | `adjustedParty()` — a verified veteran on seat 2, the last seat switched to the other round length, the booker moved onto a ride | Financial | The whole shape: due at check-in, the fee / transport / tax split, and each player's holes and transport under their name |
 * | **FinancialWithComp** | `compedParty()` — the booker's fee typed to $0 | Financial | A seat reading **No charge**, with the amount due down by it |
 * | **FinancialPartlyPaid** | `partlyPaidNamed()` — first two seats paid online | Financial | Paid seats read **Paid** and only the rest are due |
 * | **Notes** | `adjustedParty()` | Notes | Tags, the group note, per-player notes |
 * | **Activity** | `partlyPaidNamed()` | Activity | The seeded trail on a part-paid booking |
 *
 * ## Where the phone differs from the tablet, and why
 *
 * The tablet's Financial headline is the **fees** (`reservationDue`); the phone's is the whole
 * **order total**, transport and tax included, with the split spelled out beneath it. That is
 * deliberate: on the phone the Check in & pay button is pinned two inches below the headline
 * with the same number on it, so a headline that excluded tax would read as a contradiction on
 * one screen. On the tablet the footer carries its own `fees · carts · tax` line, so the tab
 * above it does not need to.
 *
 * Refund and rain check are **screens** here, not row icons. They move money, so they get a
 * full-screen dialog where the operator picks players and reads the amount back before
 * confirming — a 15px icon at the end of a 402px row is not where that decision belongs.
 *
 * ## Still open
 *
 * **The per-player amount is gross.** Like the tablet's, it prints `playerFee`, so a seat
 * comped by a *discount preset* or settled by a *punch card* still shows its rate while the
 * headline above has already netted it out. **FinancialWithComp** shows the one comp path that
 * does read $0 — a typed-over fee — which is why it looks right; the round-3 paths do not.
 *
 * **No payment is taken here.** `paymentRecord` is printed when a booking has one, but nothing
 * on this tab creates one; that is the register's job, reached through Check in & pay.
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
