import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { CART_FLEET } from '../../../pos/data/carts';
import type { Booking } from '../../../pos/types';
import { MobileStory, mobileMeta } from '../../pos-mobile/mobile-helpers';
import { CARTS_OUT, at18, cartKeyParty, cartsAlreadyOut, cartsFree, openParty, withBookings } from '../mobile-scenarios';

/**
 * Weston Edits / 16 · Cart Signout / Mobile
 *
 * The old prototype put **Cart signout** on every player row and a key glyph on the booking once
 * a cart was out. It is a small feature with a real constraint behind it: the course owns a fixed
 * number of carts, two players cannot both be given cart 14, and the person handing over a key
 * needs to know what is already gone before reaching for one.
 *
 * **And this is arguably a phone job more than a counter one.** Keys are handed out at the cart
 * barn, not at the desk — the device in your hand while you are standing beside the fleet is the
 * phone. So the feature is at least as important here as on the terminal, even though it reaches
 * it by a different route.
 *
 * ## The screen
 *
 * `CartSignoutScreen` (`src/pos/mobile/screens/tee/CartSignoutScreen.tsx`), route
 * `{ name: 'cartSignout', bookingId, seat }`, presented as a **push**
 * (`PRESENTATION.cartSignout = 'push'` in `navigation.tsx`) — picking a cart is a drill-down into
 * the fleet, not an edit you abandon halfway, so it gets a back arrow rather than a ✕ / Save pair.
 *
 * It reads and writes exactly what the terminal's modal does: `CART_FLEET`, `availableCarts`,
 * `cartHolder` from `src/pos/data/carts.ts`, and `signOutCart` / `returnCart` from
 * `logic/reservation.ts`, dispatched as `patchBooking`. There is no phone-side fleet state.
 *
 * | | |
 * |---|---|
 * | Header | the player's name, then `{free} of 35 available` — plus `· holding cart {n}` when the seat has one |
 * | Fleet | every number, wrapped across the phone's width |
 * | Return | a full-width **Return cart {n}**, shown only when the seat holds one |
 * | Out now | the day's signed-out carts, as `Cart {n} · {player} · {time}` |
 *
 * **Availability is derived, never stored.** A cart is out because a seat on the day's sheet is
 * holding its number (`PlayerState.cartKey`); the picker reads the day's bookings and subtracts.
 * That decides how the whole feature behaves: returning a cart is just **clearing that seat**, a
 * past tee time still holds its keys (a cart does not come back because its tee time passed), and
 * moving or deleting a booking takes its keys with it, for free.
 *
 * **Signing out a cart implies riding.** `signOutCart` moves the seat to `transport: 'cart'`;
 * `returnCart` leaves them riding, because handing the key back is not a decision to walk.
 *
 * ## Where it deliberately differs from the tablet
 *
 * | | Tablet | Phone | Why |
 * |---|---|---|---|
 * | Where it starts | a key glyph on the player row | the **⋮ sheet** — `Cart signout · Hand over a key`, or `Cart {n} · Change or return it` once one is out | at 402 the row's control strip is already **9 \| 18**, fee, transport, the per-seat cart chip and ⋮. A sixth control would shrink the five that get used every hour |
 * | Presentation | a 520px modal over the terminal | a pushed screen | a modal at 402 is a full screen with extra chrome |
 * | Number target | 46 × 40 | **56 × 48** | `mobile.touchTarget` is 48, and a 35-cart grid is no reason to go under it |
 * | Who has a taken cart | a hover tooltip | the **accessible label** — `Cart 14, out with {player}` — plus the list below | a phone has no hover |
 * | "Out now" list | first **4**, under a "hover to see who has it" line | first **6**, under its own heading | the list is doing the tooltip's job, so it has to carry more |
 * | Confirming | the modal stays open | it **pops** back to the reservation, with a toast | a drill-down that has done its one job should not need dismissing |
 *
 * The consequence is worth naming, because it makes **12 · Player Row Detail** load-bearing: with
 * no glyph on the row, the seat's **caption line** (`… · cart 22`) is the only place the number
 * shows without opening anything. That line is how staff answer "what cart do I have".
 *
 * ## Specs
 *
 * | | |
 * |---|---|
 * | Frame | 402 × 797 (`mobile.frame` in `src/theme/tokens.ts`) |
 * | Fleet | **35 carts**, 1–12 and 14–36 — the numbers **skip 13**, the way most fleets do |
 * | Number target | 56 × 48, `radius.md`, 16px/800 |
 * | Taken | `md3.surfaceContainer` fill, `md3.outline` text, `line-through`, `disabled` |
 * | This seat's own | `md3.primary` border on `md3.primaryContainer`, **enabled** |
 * | Return button | full width, `min-height: 48`, outlined |
 * | Accessible names | `Sign out cart {n}` · `Cart {n}, out with {player}` · `Cart {n}, signed out to {name}` · `Return cart {n}` |
 * | Toast | `Cart {n} → {name}` on signout, `Cart {n} returned` on return |
 * | Out-now cap | 6 — the point where a list stops being a glance |
 *
 * ## Scope
 *
 * Weston edition only, from a player row's ⋮ on the reservation's **Players** tab. The item is
 * offered only on an **editable** seat: handing a cart to somebody who has already paid and gone
 * out is not a thing this screen should make easy.
 *
 * None of the four Storybook toolbar globals change this screen.
 *
 * ## The stories
 *
 * Every story runs on a day where the morning's first two groups already hold **cart 14** and
 * **cart 7** (`cartsAlreadyOut`), so the picker has something real to subtract.
 *
 * | Story | State | What it is for |
 * |---|---|---|
 * | **From The Row Menu** | reservation, ⋮ open on the booker | The route in, and the secondary line doing work — `Hand over a key` before, `Change or return it` after, so the sheet says what the item will do before it is tapped |
 * | **The Key Picker** | picker on seat 1 | The fleet as the cart barn sees it. Asserts **33 of 35 available**, that 14 is disabled, that its label names the group holding it, that nothing held is offered, and that `CART_FLEET` skips 13 |
 * | **What Is Out Now** | same | The list under the grid — the only way to read the fleet on a device with no hover, without tapping thirty-five numbers one at a time |
 * | **Signing One Out** | same | Taps cart 3, then looks for it **on the reservation's caption line**: the number has to be readable from the party without opening anything, because the next question at the barn is always "which one is mine" |
 * | **The Key On The Seat** | picker on a seat holding 22 | 22 shows **selected**, not struck through — it is theirs, not taken — the subtitle says `32 of 35 available · holding cart 22`, and the footer offers **Return cart 22** |
 * | **Returning It** | same | Returns it and checks the caption has dropped the number. Note what it does *not* check: the transport. `returnCart` leaves the player riding, which is right |
 *
 * ## Still open
 *
 * - **The fleet is one pool.** No cart types, no out-of-service flag, no maintenance.
 * - **Nothing ever ends a round.** Keys come back only by someone pressing Return; there is no
 *   "round finished" mark to release them, which `signedOutCarts` already anticipates in its own
 *   comment.
 * - **The ⋮ is two taps deep.** At the barn, with a key ring in the other hand, the cart signout
 *   is behind a row menu. It is the right trade for the row's width today, but if the phone turns
 *   out to be *the* cart-barn device it probably deserves its own entry point.
 * - **No scanning.** Numbers are typed by eye and tapped. A cart with a tag on it is the obvious
 *   next step and is not modelled.
 */
const meta = {
  title: 'Weston Edits/16 · Cart Signout/Mobile',
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** The afternoon party on a day where two carts are already out with the morning's first two. */
const dayWithCartsOut = (b: Booking) => at18(withBookings(b, ...cartsAlreadyOut(b)));

/** The reservation, with the key picker pushed over it for one seat. */
const picker = (b: Booking, seat = 0) => (
  <MobileStory
    edition="weston"
    initialState={dayWithCartsOut(b)}
    tab="tee"
    stack={[
      { name: 'bookingDetail', bookingId: b.id },
      { name: 'cartSignout', bookingId: b.id, seat },
    ]}
  />
);

/** The caption under each player's controls, in seat order — where the number shows. */
const metaLine = async (c: ReturnType<typeof within>, seat: number) =>
  (await c.findAllByText(/ : \$/))[seat];

// ─── Getting there ──────────────────────────────────────────────────────────

/**
 * **It lives in the ⋮.** The booker's row menu: their customer record, swap the customer,
 * **Cart signout**, reset to the booking, and — for anyone but the booker — remove.
 *
 * The secondary line is doing work: `Hand over a key` when the seat has none, `Change or return
 * it` once it does, so the sheet says what the item will do before it is tapped. It is offered
 * only on an editable seat, because handing a cart to somebody who has already paid and gone out
 * is not a thing this screen should make easy.
 */
export const FromTheRowMenu: Story = {
  render: () => (
    <MobileStory
      edition="weston"
      initialState={dayWithCartsOut(openParty())}
      tab="tee"
      stack={[{ name: 'bookingDetail', bookingId: openParty().id }]}
    />
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click((await c.findAllByLabelText(/^More for /))[0]);
    await expect(await c.findByText('Cart signout')).toBeTruthy();
    await expect(c.getByText('Hand over a key')).toBeTruthy();
  },
};

// ─── The fleet ──────────────────────────────────────────────────────────────

/**
 * **The fleet, as the cart barn sees it.** Thirty-five numbers wrapped across the phone's width,
 * two of them struck through because the morning's first two groups have them, and a subtitle
 * counting what is left.
 *
 * Big numbers on big targets rather than a dropdown of "Cart 01 — available": this is a decision
 * made one-handed while holding a key ring, and it should take one look and one tap.
 *
 * The play test checks the count, that cart 14 is disabled, and that its accessible label names
 * the group holding it rather than just saying "unavailable" — because who has it is the second
 * half of the question.
 */
export const TheKeyPicker: Story = {
  render: () => picker(openParty()),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(await c.findByText(cartsFree())).toBeTruthy();
    const taken = c.getByRole('button', { name: new RegExp(`^Cart ${CARTS_OUT.early}, out with `) });
    await expect(taken).toBeDisabled();
    await expect(c.getByRole('button', { name: 'Sign out cart 1' })).toBeEnabled();
    // Nothing offered is held by anybody — the grid is the day's bookings, subtracted.
    await expect(c.queryByRole('button', { name: `Sign out cart ${CARTS_OUT.early}` })).toBeNull();
    await expect(CART_FLEET.includes(13)).toBe(false);
  },
};

/**
 * **What is already out, in words.** Under the grid, every cart on the day with the seat holding
 * it and the tee time it went out on.
 *
 * The terminal can put this in a tooltip on the struck-through number; a phone has no hover, so
 * the list is the only way to read the fleet without tapping thirty-five numbers one at a time.
 * It caps at six, which is the point where a list stops being a glance.
 */
export const WhatIsOutNow: Story = {
  render: () => picker(openParty()),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(await c.findByText('Out now')).toBeTruthy();
    await expect(c.getByText(new RegExp(`^Cart ${CARTS_OUT.early} · `))).toBeTruthy();
    await expect(c.getByText(new RegExp(`^Cart ${CARTS_OUT.later} · `))).toBeTruthy();
  },
};

/**
 * **Handing over a key.** Tap a free number and it is done: the picker pops, a toast confirms
 * the hand-over, and the number lands on the seat.
 *
 * The play test signs out cart 3 and then looks for it **on the reservation's caption line**,
 * which is the whole point of the round trip — the number has to be readable from the party
 * without opening anything, because the next question at the barn is always "which one is mine".
 */
export const SigningOneOut: Story = {
  render: () => picker(openParty()),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByRole('button', { name: 'Sign out cart 3' }));
    await waitFor(async () => expect((await metaLine(c, 0)).textContent).toMatch(/cart 3$/));
  },
};

/**
 * **The seat that already has one.** The picker opened on a seat holding cart 22 shows that
 * number **selected** rather than struck through — it is not "taken" from this player's point of
 * view, it is theirs — the subtitle says so in words, and the footer offers **Return cart 22**.
 *
 * Three carts are out on the day now: the morning's two and this one, and the count says 32.
 */
export const TheKeyOnTheSeat: Story = {
  render: () => picker(cartKeyParty()),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    // The subtitle counts the fleet and says, in the same breath, what this seat already has.
    await expect(await c.findByText(`${cartsFree(1)} · holding cart 22`)).toBeTruthy();
    await expect(c.getByRole('button', { name: /^Cart 22, signed out to / })).toBeEnabled();
    await expect(c.getByRole('button', { name: 'Return cart 22' })).toBeTruthy();
  },
};

/**
 * **Bringing it back.** Returning clears the seat, and because availability is derived that is
 * the entire operation — there is no fleet record to update and nothing that can disagree with
 * the tee sheet afterwards.
 *
 * The play test returns the cart and checks the seat's caption line has dropped the number.
 * Note what it does *not* check: the transport. `signOutCart` put the player on a ride and
 * `returnCart` leaves them there, which is right — handing the key back does not mean they have
 * decided to walk.
 */
export const ReturningIt: Story = {
  render: () => picker(cartKeyParty()),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByRole('button', { name: 'Return cart 22' }));
    await waitFor(async () => expect((await metaLine(c, 0)).textContent).not.toMatch(/cart 22/));
  },
};
