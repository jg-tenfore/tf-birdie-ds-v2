import type { Meta, StoryObj } from '@storybook/react-vite';
import { MobileStory, mobileMeta } from '../../pos-mobile/mobile-helpers';
import { adjustedParty, at18, growableParty, withBookings } from '../mobile-scenarios';

/**
 * Weston Edits / 1 · Reservation Panel / Mobile
 *
 * The phone's equivalent of the tablet's slide-over — and the place the tablet's central
 * question doesn't arise. There is no panel on a phone, because the reservation **is** the
 * screen: no width to choose, no sheet to squeeze, nothing to dim. Section 10 has no mobile
 * half for exactly that reason.
 *
 * The phone was already golf-first — tapping a booking pushed its detail rather than loading an
 * order — so what changed in the Weston edition is what that screen *is*. It is now the
 * reservation, where the golf is worked before anything goes to the register, and Back returns
 * to the same place on the tee sheet. That is the phone's way of *"not losing the context of
 * where you're working on the tee sheet"*.
 *
 * ## The component
 *
 * `BookingDetailScreen` (`src/pos/mobile/screens/tee/BookingDetailScreen.tsx`). One screen, both
 * editions: it branches on `useWestonEdits()` rather than forking, so the base prototype and
 * this one cannot drift apart.
 *
 * | Part | Base edition | Weston edition |
 * |---|---|---|
 * | Tabs | `TABS` — Players · Financial · Notes · Activity | `WESTON_TABS` — the same four. Identical lists, kept separate because the bodies differ |
 * | Players body | `PlayersTab` (same file) — a list that pushes Player Detail | `ReservationPlayersTab` (`ReservationPlayers.tsx`) — rows with holes, fee and transport on them. See 2 |
 * | Bottom bar | Check in / Register / Check in & pay, by pay state | `ReservationActions` — one pinned **Check in & pay · $total** |
 * | App bar | Name, time · course, ⋮ | The same, plus the **‹ n of m ›** stepper. See 15 |
 * | Check in & pay | Opens the order | Checks everyone in (no-shows aside), then `nav.openIn('register', { name: 'order' })` |
 *
 * ## Presentation
 *
 * `bookingDetail` is a **push** (`PRESENTATION` in `src/pos/mobile/navigation.tsx`) — a
 * full-screen page sliding in from the right with a back arrow, MD3's drill-down. Not a dialog:
 * a dialog is for something you create and can abandon, and a reservation is a thing that
 * already exists.
 *
 * Two consequences worth stating, because they are the phone's answer to "don't lose the sheet":
 *
 * - **The screen underneath stays mounted.** The router renders the whole back stack, so the tee
 *   sheet keeps its scroll position and Back lands exactly where you left it.
 * - **Tabs are not history.** Switching a tab does `nav.replace({ ...route, tab })`, not a push,
 *   so Back leaves the booking rather than stepping backwards through four tabs.
 *
 * Each destination keeps its own stack, so leaving a half-worked reservation to look at the
 * order and coming back lands on the reservation.
 *
 * ## Specs
 *
 * | | |
 * |---|---|
 * | Frame | 402 × 797 (`mobile.frame` in `theme/tokens.ts`), story viewport `mobile402` |
 * | Chrome | 28px status bar, 64px top app bar, 80px navigation bar — the nav bar is **covered** by a push, so the reservation owns the full height |
 * | Enter | `translateX(30%)` + fade, 300ms `cubic-bezier(0.05, 0.7, 0.1, 1)` (`mobile.motion.push` / `emphasized`) |
 * | Exit | `translateX(30%)` out, 200ms `cubic-bezier(0.3, 0, 0.8, 0.15)` — MD3 exits are shorter, so the screen underneath is usable almost at once |
 * | Touch floor | 48dp (`mobile.touchTarget`); `MuiIconButton` medium is 48 × 48 in `mobile-theme.ts` |
 * | List rows | 56 / 72 / 88 (`mobile.listItem`) |
 * | Tabs | `variant="fullWidth"`, 48px, 13px labels in this edition (four labels at 402px) |
 * | Surface | `md3.surface` behind, `mobile.surfaceContainerLow` (#f2f5f2) for the player cards |
 *
 * ## Where it deliberately differs from the tablet
 *
 * - **No slide-over, no squeeze, no scrim.** A 402px screen has nothing to keep in view beside
 *   a panel. The back stack is the context, not a visible sheet.
 * - **No modal comparison.** MD3 puts full-screen dialogs where a phone would otherwise use a
 *   centred one, so the choice the tablet is still weighing has no phone equivalent.
 * - **Destructive confirms are bottom sheets**, not centred dialogs — delete the booking, remove
 *   a player.
 * - **Check in & pay changes destination**, jumping to the Register tab's order screen. On the
 *   tablet the register is already on screen.
 *
 * ## The stories
 *
 * | Story | What it is for |
 * |---|---|
 * | **Reservation** | The reservation for an unpaid party at the 18-hole club — the reference shot. Header facts, four tabs, per-player rows, pinned Check in & pay |
 * | **From The Tee Sheet** | The app live on the tee sheet. Tap any booking: it opens the reservation, not an order |
 * | **Adjusted Reservation** | After some massaging — two seats linked to ID.me-verified members, one seat switched between 9 and 18 at the rate card's fee, the booker moved onto a riding cart. The header's party line reads the mix |
 * | **Before Weston Edits** | The same booking in the base edition, for comparison: a group-level transport control and no per-player holes or fees. This is what Weston reviewed |
 *
 * ## Still open
 *
 * - Nothing about the phone's presentation is waiting on Weston — the open questions in this
 *   section (slide-over vs modal, panel width) are tablet-only.
 * - **Doc drift, not behaviour:** the **Reservation** story's own blurb below still lists five
 *   tabs. Corrected: the screen renders four (`WESTON_TABS`), and the blurb now says so.
 */
const meta = {
  title: 'Weston Edits/1 · Reservation Panel/Mobile',
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/**
 * The reservation for an unpaid party at the 18-hole club. Header facts on top (time,
 * course, pay state, party), then Players · Financial · Notes · Activity — four tabs since
 * round 3 moved the customer record out from under the reservation. Each
 * player row carries holes, tee fee and transport; the pinned action is **Check in & pay**
 * with the amount the register will charge. Weston: "it takes you to the details of the
 * golf first".
 */
export const Reservation: Story = {
  render: () => (
    <MobileStory
      edition="weston"
      initialState={at18()}
      tab="tee"
      stack={[{ name: 'bookingDetail', bookingId: growableParty().id }]}
    />
  ),
};

/**
 * The app, live, on the 18-hole tee sheet. Tap any booking: it opens the reservation, not
 * an order. Nothing reaches the register until **Check in & pay**.
 */
export const FromTheTeeSheet: Story = {
  render: () => <MobileStory edition="weston" initialState={at18()} tab="tee" />,
};

/**
 * A reservation after some massaging: two players picked from People (both ID.me
 * verified), one switched between 9 and 18 holes at the derived fee, the booker on a riding cart.
 * The header's party line now reads **9/18H · Mixed transport**, and adjusted rows are
 * outlined in primary — "you're still massaging the reservation before you submit it".
 */
export const AdjustedReservation: Story = {
  render: () => {
    const b = adjustedParty();
    return <MobileStory edition="weston" initialState={at18(withBookings(b))} tab="tee" stack={[{ name: 'bookingDetail', bookingId: b.id }]} />;
  },
};

/**
 * For comparison: the same booking in the base edition — four tabs, a group-level
 * transport control, and no per-player holes or fees. This is what Weston reviewed.
 */
export const BeforeWestonEdits: Story = {
  render: () => (
    <MobileStory edition="base" initialState={at18()} tab="tee" stack={[{ name: 'bookingDetail', bookingId: growableParty().id }]} />
  ),
};
