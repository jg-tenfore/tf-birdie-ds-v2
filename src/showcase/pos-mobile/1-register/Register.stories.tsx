import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';
import type { PosState } from '../../../pos/state/pos-store';
import {
  DEMO_BOOKINGS,
  MobileStory,
  memberBooking,
  mobileMeta,
  paidFoursome,
  withLoadedBooking,
  withRetailOrder,
  withWalkInOrder,
} from '../mobile-helpers';

/**
 * Mobile Screens / 1 · Register & Order
 *
 * The core translation from the terminal: there, the order is a panel that never leaves
 * the screen; here it's a screen of its own. Everything else in the Register destination
 * exists to keep it one tap away — the View order bar under the register and every
 * category, and the badge on the Register tab from anywhere else in the app.
 *
 * The hierarchy is three levels deep and no deeper:
 *
 *   Register (root) → Category → (tap adds, stays put)
 *                   → Order → Player
 *                           → Tee time / Checkout …
 *
 * Every level below the root is a pushed page with a back arrow; nothing opens a centred
 * dialog. Short contextual picks (verify a member, apply a modifier to players, confirm
 * clearing the order) are bottom sheets that keep you where you were.
 */
const meta = {
  title: 'Mobile Screens/1 · Register & Order',
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** A round with no tee time yet — a nine-hole walk-in for two, one seat named. */
const nineHoleNoTime = (extra: Partial<PosState> = {}): Partial<PosState> => ({
  bookings: DEMO_BOOKINGS,
  flowMode: 'walkin',
  cart: [
    {
      name: 'Guest Rate 9 Holes',
      unitPrice: 35,
      price: 70,
      qty: 2,
      isCheckIn: true,
      players: [
        { name: 'Chen, Emily', transport: 'walking', modifierTags: [] },
        { name: 'Guest 2', transport: 'walking', modifierTags: [] },
      ],
    },
  ],
  ...extra,
});

// ─── Register root ──────────────────────────────────────────────────────────

/**
 * The register at rest — the destination root, so no back arrow and the navigation bar
 * is showing. The two ways an order starts on the terminal (walk-in, reserve) lead the
 * screen; each pushes the Check In category with that flow set.
 */
export const EmptyRegister: Story = {
  render: () => <MobileStory initialState={{ bookings: DEMO_BOOKINGS }} tab="register" />,
};

/**
 * Search results replace the category grid in place — the MD3 search pattern — rather
 * than pushing a search screen, so clearing the field is the way back. Tapping a result
 * adds it without leaving.
 */
export const SearchItems: Story = {
  render: () => <MobileStory initialState={withRetailOrder()} tab="register" />,
  play: async ({ canvasElement }) => {
    await userEvent.type(await within(canvasElement).findByLabelText('Search items'), 'sleeve');
  },
};

/**
 * An order in progress. The start cards give way to the View order bar, pinned above the
 * navigation bar with the line count and running total; the Register tab carries the
 * same count as a badge, so the order is visible from every destination.
 */
export const OrderInProgress: Story = {
  render: () => <MobileStory initialState={withWalkInOrder()} tab="register" />,
};

// ─── Category ───────────────────────────────────────────────────────────────

/**
 * A retail category, pushed from the register (back returns there). Goods with photos
 * get a two-column card grid; items already on the order carry a count. Tapping adds
 * and confirms with a snackbar — the operator stays here to keep ringing.
 */
export const CategoryItems: Story = {
  render: () => (
    <MobileStory initialState={withRetailOrder()} tab="register" stack={[{ name: 'category', category: 'GOLF BALLS' }]} />
  ),
};

/**
 * Check In, reached from the Walk-in start card. Rates have nothing to photograph, so
 * they're an MD3 list. Member rates say they need verifying — tapping one opens a bottom
 * sheet of eligible members rather than a dialog.
 */
export const CheckInRates: Story = {
  render: () => (
    <MobileStory
      initialState={{ bookings: DEMO_BOOKINGS, flowMode: 'walkin' }}
      tab="register"
      stack={[{ name: 'category', category: 'CHECK IN' }]}
    />
  ),
};

/**
 * Member-rate verification as a bottom sheet over the category. A short pick from a
 * list is exactly what MD3 reserves sheets for; picking a member adds the rate and
 * attaches them as the customer, and the sheet closes back onto the list.
 */
export const MemberRateSheet: Story = {
  render: () => (
    <MobileStory
      initialState={{ bookings: DEMO_BOOKINGS, flowMode: 'walkin' }}
      tab="register"
      stack={[{ name: 'category', category: 'CHECK IN' }]}
    />
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(await within(canvasElement).findByText('Seasonal Member 18 Holes'));
  },
};

/**
 * The hole-count lock. An 18-hole round is on the order, so nine-hole rates are
 * disabled with the reason in their supporting text — mixing hole counts on one tee
 * time is impossible rather than merely discouraged.
 */
export const RateTilesLocked: Story = {
  render: () => (
    <MobileStory initialState={withWalkInOrder()} tab="register" stack={[{ name: 'category', category: 'CHECK IN' }]} />
  ),
};

/**
 * Modifiers with no round on the order: every item is disabled and the banner says why.
 * The register root dims this category's card for the same reason.
 */
export const ModifiersNeedARound: Story = {
  render: () => (
    <MobileStory
      initialState={{ bookings: DEMO_BOOKINGS }}
      tab="register"
      stack={[{ name: 'category', category: 'MODIFIERS' }]}
    />
  ),
};

/**
 * Applying a modifier from the catalog: a bottom sheet listing the round's players,
 * each a toggle. On the terminal this opened the full modifier dialog on player 1; a
 * sheet lets the operator apply one discount to three players in three taps.
 */
export const ModifierToPlayersSheet: Story = {
  render: () => (
    <MobileStory initialState={withWalkInOrder()} tab="register" stack={[{ name: 'category', category: 'MODIFIERS' }]} />
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(await within(canvasElement).findByText('Staff Rate'));
  },
};

// ─── Order ──────────────────────────────────────────────────────────────────

/**
 * A walk-in mid-build: three players on an 18-hole rate, a tee time, two named seats and
 * one guest seat, plus a retail line. Pushed from the View order bar; back returns to
 * wherever the operator was browsing. Each player's supporting line says why their seat
 * costs what it does — tap one to change it.
 */
export const OrderWalkIn: Story = {
  render: () => <MobileStory initialState={withWalkInOrder()} tab="register" stack={[{ name: 'order' }]} />,
};

/**
 * A tee-sheet booking loaded into the register — how the Tee Sheet hands over
 * (`loadBooking` then `openIn('register', order)`). The booking card replaces the
 * customer row; "View booking" jumps back to the Tee Sheet destination rather than
 * stacking a booking on top of an order. Back from here lands on the register root.
 */
export const OrderLoadedTeeTime: Story = {
  render: () => (
    <MobileStory initialState={withLoadedBooking(paidFoursome())} tab="register" stack={[{ name: 'order' }]} />
  ),
};

/** A member check-in: the green fee resolves to zero, the cart fee still applies. */
export const OrderMemberCheckIn: Story = {
  render: () => (
    <MobileStory initialState={withLoadedBooking(memberBooking())} tab="register" stack={[{ name: 'order' }]} />
  ),
};

/** Retail only: no round, so no tee time or players — lines with steppers, and Charge. */
export const OrderRetail: Story = {
  render: () => <MobileStory initialState={withRetailOrder()} tab="register" stack={[{ name: 'order' }]} />,
};

/**
 * The order with nothing on it — reachable if the operator clears lines one by one. No
 * pinned action (there's nothing to charge); the one button goes back to the catalog.
 */
export const OrderEmpty: Story = {
  render: () => <MobileStory initialState={{ bookings: DEMO_BOOKINGS }} tab="register" stack={[{ name: 'order' }]} />,
};

/**
 * A round with no tee time. The missing time is a tonal row at the top of the order and
 * the pinned action becomes Choose tee time — the terminal's "Select tee time" Pay
 * button, in the same place a thumb expects Charge.
 */
export const OrderNeedsTeeTime: Story = {
  render: () => <MobileStory initialState={nineHoleNoTime()} tab="register" stack={[{ name: 'order' }]} />,
};

/**
 * A reservation. The operator has a real choice here — hold the time and settle at the
 * counter, or take payment now — so both actions sit side by side in the bottom bar.
 * Each pushes the reserve confirmation with that choice preselected.
 */
export const OrderReservation: Story = {
  render: () => (
    <MobileStory initialState={withWalkInOrder({ flowMode: 'reserve' })} tab="register" stack={[{ name: 'order' }]} />
  ),
};

/**
 * The overflow menu: the terminal's order-settings cog, trimmed to what applies on a
 * phone. Clear order is destructive, so it confirms in a bottom sheet before popping the
 * whole stack back to the register root.
 */
export const OrderOverflowMenu: Story = {
  render: () => <MobileStory initialState={withWalkInOrder()} tab="register" stack={[{ name: 'order' }]} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(await within(canvasElement).findByLabelText('Order options'));
  },
};

// ─── Player ─────────────────────────────────────────────────────────────────

/**
 * One player, pushed from their row on the order; back returns to the order. Changes
 * apply immediately, so there's nothing to save. Transport is a segmented button (one),
 * rates are radios (at most one), discounts are checkboxes (they stack) — the pricing
 * precedence, expressed as controls. The chip row switches seats without going back.
 * "Attach a golfer" pushes the People picker for this seat.
 */
export const PlayerModifiers: Story = {
  render: () => (
    <MobileStory
      initialState={withWalkInOrder()}
      tab="register"
      stack={[{ name: 'order' }, { name: 'playerModifiers', itemIdx: 0, playerIdx: 1 }]}
    />
  ),
};

/** An unnamed seat — the Golfer row invites attaching someone from People. */
export const PlayerUnnamedSeat: Story = {
  render: () => (
    <MobileStory
      initialState={withWalkInOrder()}
      tab="register"
      stack={[{ name: 'order' }, { name: 'playerModifiers', itemIdx: 0, playerIdx: 2 }]}
    />
  ),
};
