import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactElement } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { price as ratePrice } from '../../../pos/data/rate-catalog';
import { money } from '../../../pos/logic/cart';
import { playerHoles } from '../../../pos/logic/reservation';
import { seatRateGrid } from '../../../pos/logic/seat-pricing';
import { DEFAULT_WESTON_OPTIONS } from '../../../pos/state/pos-store';
import type { PosState } from '../../../pos/state/pos-store';
import type { Booking } from '../../../pos/types';
import { MobileStory, mobileMeta } from '../../pos-mobile/mobile-helpers';
import { adjustedParty, at18, openParty, withBookings } from '../mobile-scenarios';

/**
 * Weston Edits / 11 · Rate Selector / Mobile
 *
 * Round 3's biggest change, on the phone: a player's fee stops being a number somebody types
 * and becomes a **rate somebody chooses**.
 *
 * The model is the terminal's, unchanged, because it has to be — the same catalog narrowed by
 * the slot (*"every rate that you could possibly have for this specific tee time on this
 * specific date"*), the same pre-pick of what the player's own record entitles them to, the same
 * refusal to hide the rest. What changes is how it opens, and what the tiles are sized for.
 *
 * ## The screen
 *
 * `SeatRateScreen` (`src/pos/mobile/screens/tee/SeatRateScreen.tsx`), route
 * `{ name: 'seatRate', bookingId, seat }`, presented as a **full-screen dialog**
 * (`PRESENTATION.seatRate = 'dialog'` in `src/pos/mobile/navigation.tsx`): it rises from the
 * bottom over the reservation, ✕ discards, **Save** commits. The reservation stays mounted
 * underneath the whole time, so closing it costs nothing.
 *
 * **Why a dialog and not the terminal's in-place expand.** Weston's suggestion was *"maybe you
 * click and this expands, instead of taking over a full screen"*, and on a 640px panel that
 * works — the rest of the group is still beside the open row. At 402 it does not. Four sections
 * of tiles under an open player row pushes every other player off screen, so you lose the group
 * *and* have to scroll to get it back: strictly worse than the thing he was objecting to. So the
 * phone gives the tiles the whole screen and puts the group one tap away.
 *
 * It writes exactly the same `PlayerState` fields as `RateExpand` — `rateId`, `transportRateId`,
 * `discountId` / `discountManual`, `punch`, clearing `fee` and `transportFee` as it goes —
 * through the same `patchBooking` dispatch and the same `logic/reservation.ts` helpers. There is
 * no phone-side pricing.
 *
 * | Part | What it holds | Default |
 * |---|---|---|
 * | App bar title | the player's name, and under it `{holes} holes · {total}` | recomputed from `seatPrice` on every tap |
 * | Green fee | `What they qualify for` (or `What this tee time sells` for an unlinked seat), then `Other rates · staff override` | `autoRate` for whoever is in the seat |
 * | Transport | all six `TRANSPORT_RATES`, ineligible ones dimmed | the default row for the booking's mode |
 * | Discount | the four preset tiles | none — the typed **Amount…** is terminal-only |
 * | Punch card | the seat's own cards, then **Use a customer's card** | none (17 · Punch Cards) |
 * | Footer | rate name · transport name · **Total**, with the reason beside the green fee | — |
 *
 * ## Where it deliberately differs from the tablet
 *
 * | | Tablet | Phone | Why |
 * |---|---|---|---|
 * | Presentation | in-place expand on the row | full-screen dialog | four sections of tiles do not fit beside a 402px row |
 * | Heavy catalog | eligible shown, the rest behind **Show** | everything, in one scroll | the screen is already the affordance; a Show control would put a tap between the operator and the override, which is what the section is *for* |
 * | Filter box | present past 12 rates | none | same reason — and a keyboard on a phone covers half the grid it is filtering |
 * | Tile size | min-width 92, ~26px tall | **min-height 48**, min-width 108, `flex: 1 1 46%` — two to a row | MD3's touch floor; a fat thumb has to hit one |
 * | Running total | footer, at the bottom of the editor | **app bar**, pinned | on a scrolling screen the footer leaves the viewport; the number has to stay in view while the tiles are pressed |
 * | Manual discount | **Amount…**, typed inline | not offered | a number pad inside a dialog inside a push is a stack too deep to be worth it yet — see Still open |
 *
 * ## Specs
 *
 * | | |
 * |---|---|
 * | Frame | 402 × 797 (`mobile.frame` in `src/theme/tokens.ts`) |
 * | Touch floor | `mobile.touchTarget` = 48. Every tile meets it; nothing on this screen goes under |
 * | Tile | `min-height: 48`, `min-width: 108`, `flex: 1 1 46%`, `radius.md`, 13px/700 over an 11.5px amount |
 * | Selected | `md3.primary` border on `md3.primaryContainer`, `aria-pressed="true"` |
 * | Override tile | `opacity: .55`, still pressable — never `disabled` |
 * | Entry | `mobile.motion.sheet` 400ms on `mobile.motion.emphasized`; exit 200ms |
 * | Transport catalog | Riding Cart $26.82 · Cart Plus $32 · Member Cart $0 · **Walking $8.58** · Walking, member $0 · Push Cart $6 |
 * | This slot | Thursday twilight nine — 10 standard rates, **24 of 26** heavy, 8 eligible for an unlinked guest |
 *
 * ## Scope
 *
 * Weston edition only, reached from the **fee chip** on a player row in
 * `ReservationPlayers.tsx`. The chip keeps reading as the *fee* rather than the rate name on
 * purpose: the rate's name is already on the caption line directly below it (12 · Player Row
 * Detail), and putting it on the chip too would make the chip longer, harder to read back to a
 * golfer and harder to hit. A locked seat — paid or no-show — has no chip.
 *
 * The **Rates** toolbar global reaches this screen; the heavy-catalog story pins its own value.
 * **Panel width** and **Row density** do not — neither has a phone equivalent.
 *
 * The eligibility model itself is written up once in **18 · Rate Catalog**.
 *
 * ## The stories
 *
 * | Story | Scenario | What it is for |
 * |---|---|---|
 * | **Opens From The Fee Chip** | `openParty` reservation | The route in. Taps seat 2's chip, waits for the green-fee grid, checks there is a **Save** |
 * | **The Whole Editor** | `openParty`, seat 1 | All five sections at rest. Asserts the unlinked-seat hint reads *What this tee time sells* |
 * | **Eligible First Then The Rest** | `adjustedParty`, seat 2 (a member) | That the membership rows sort first, the pre-pick is `aria-pressed`, and the override tile is dimmed rather than disabled |
 * | **The Heavy Catalog Just Scrolls** | `rateCatalog: 'heavy'` | The phone's deliberate divergence. Asserts there is **no** Show button and **no** filter box |
 * | **Transport Tiles** | `openParty`, seat 1 | Walking at $8.58, the booked riding row already pressed, the member cart dimmed and present |
 * | **Save Fees To All** | `openParty`, seat 1 | Group action, then **Save**, then reads every fee chip back on the reservation — priced from the catalog so the assertion cannot drift |
 * | **Reset Puts It Back** | `openParty`, seat 1 | Asserts on which tile is *pressed*, not on a number: the seat is back on its rate, not merely back at a matching price |
 *
 * ## Still open
 *
 * - **No typed discount.** The terminal's **Amount…** tile has no phone equivalent, so an
 *   odd-amount comp cannot be done from the phone at all. It needs a number pad, and a number
 *   pad inside a dialog needs a decision about what ✕ means at that depth.
 * - **Sixty rates would need the filter.** The phone skips the overflow treatment because 24
 *   tiles scroll fine. If a course turns up with sixty, this screen takes the terminal's Show +
 *   filter rather than inventing a third treatment.
 * - **Save is a no-op.** Every tile has already written to the booking, so ✕ and **Save** do the
 *   same thing — there is nothing to discard. That is honest about the data model and slightly
 *   dishonest about the button; a true cancel would mean staging the edit.
 */
const meta = {
  title: 'Weston Edits/11 · Rate Selector/Mobile',
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

// ─── Play-test helpers ──────────────────────────────────────────────────────

/**
 * Every button on the screen on top of the stack.
 *
 * The phone keeps lower screens mounted so their scroll and local state survive, and marks them
 * `aria-hidden` — which is exactly what a role query filters on. So going through roles rather
 * than the DOM keeps a query on the editor from picking up the reservation underneath it.
 */
const buttons = (c: ReturnType<typeof within>): HTMLElement[] => c.getAllByRole('button');

/** Every tile as its own text — "Weekday Resident$21.00". */
const tiles = (c: ReturnType<typeof within>): string[] => buttons(c).map((el) => (el.textContent ?? '').trim());

/** One tile, matched on the front of its label so the price can move. */
const tile = (c: ReturnType<typeof within>, label: string): HTMLElement =>
  buttons(c).find((el) => (el.textContent ?? '').trim().startsWith(label))!;

/** Where a tile sits, for asserting that eligible rates come first. */
const tileIndex = (c: ReturnType<typeof within>, label: string): number =>
  tiles(c).findIndex((t) => t.startsWith(label));

/** What a named rate charges this seat — read from the catalog, never hard-coded. */
const feeFor = (b: Booking, seat: number, rate: string) => {
  const holes = playerHoles(b, seat);
  return ratePrice(seatRateGrid(b, holes).find((r) => r.name === rate)!, holes);
};

// ─── Renderers ──────────────────────────────────────────────────────────────

/** The reservation with one seat's rate editor open over it. */
const rateEditor = (b: Booking, seat: number, extra: Partial<PosState> = {}): ReactElement => (
  <MobileStory
    edition="weston"
    initialState={at18(withBookings(b), extra)}
    tab="tee"
    stack={[
      { name: 'bookingDetail', bookingId: b.id },
      { name: 'seatRate', bookingId: b.id, seat },
    ]}
  />
);

const heavy = { weston: { ...DEFAULT_WESTON_OPTIONS, rateCatalog: 'heavy' as const } };

// ─── Getting there ──────────────────────────────────────────────────────────

/**
 * **The fee chip opens it.** On the phone the fee is a chip on the player row, and tapping it
 * used to open a number pad — type an amount, Save. Weston's third round moved it: staff "do
 * want to select what's available", so the thing being chosen is the rate and the amount
 * follows from it.
 *
 * The chip keeps reading as the fee rather than the rate name, deliberately. The rate's *name*
 * is already on the meta line directly below (12 · Player Row Detail); putting it on the chip
 * too would only make the chip longer, harder to read back to a golfer and harder to hit.
 *
 * The play test taps seat 2's fee chip and waits for the green-fee grid to rise.
 */
export const OpensFromTheFeeChip: Story = {
  render: () => (
    <MobileStory
      edition="weston"
      initialState={at18()}
      tab="tee"
      stack={[{ name: 'bookingDetail', bookingId: openParty().id }]}
    />
  ),
  play: async ({ canvasElement }) => {
    const b = openParty();
    const c = within(canvasElement);
    await userEvent.click((await c.findAllByLabelText(/^Tee fee \$/))[1]);
    await c.findByText(`Green fee · ${playerHoles(b, 1)} holes`);
    // A dialog, so it commits or discards — there is no half-edited state to leave behind.
    await expect(c.getByRole('button', { name: 'Save' })).toBeTruthy();
  },
};

/**
 * **The whole editor, for reading.** The booker of an untouched party, with nothing tapped.
 * Top to bottom: the green fee tiles with the system's pick outlined, the transport catalog,
 * the discount presets, the punch-card row, **Reset** / **Save fees to all**, and the footer
 * totting up what this seat now owes.
 *
 * This seat is an unlinked guest, so the hint over the first grid reads "What this tee time
 * sells" rather than "What they qualify for" — the list is narrowed by the *slot*, and who is
 * sitting in it only decides the ordering and the pre-pick.
 */
export const TheWholeEditor: Story = {
  render: () => rateEditor(openParty(), 0),
  play: async ({ canvasElement }) => {
    const b = openParty();
    const c = within(canvasElement);
    await c.findByText(`Green fee · ${playerHoles(b, 0)} holes`);
    await expect(c.getByText('What this tee time sells')).toBeTruthy();
    // The four rows, in the order money gets decided…
    await expect(c.getByText('Transport')).toBeTruthy();
    await expect(c.getByText('Discount')).toBeTruthy();
    await expect(c.getByText('Punch card')).toBeTruthy();
    // …and the number every one of them changes.
    await expect(c.getByText('Total')).toBeTruthy();
  },
};

// ─── Eligible vs. the rest ──────────────────────────────────────────────────

/**
 * **Eligible first; the rest still there, dimmed.**
 *
 * Seat 2 is linked to a full-golf member. The rates his record actually entitles him to come
 * first under "What they qualify for" — the membership rows and the public rack rate he is
 * always allowed to buy — and the system has already put him on the best of them. Everything
 * else on the card follows under **Other rates · staff override**: greyed back, and still a
 * tile, because a rate the counter cannot reach is a phone call to a manager.
 *
 * The rule is one function (`isEligible`), shared by green fees and transport, so "qualifies"
 * cannot come to mean two different things in two places.
 *
 * The play test checks that an eligible tile precedes an ineligible one, that the system's pick
 * is the one pressed, and that the override tile is dimmed rather than disabled.
 */
export const EligibleFirstThenTheRest: Story = {
  render: () => rateEditor(adjustedParty(), 1),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await c.findByText('What they qualify for');
    await expect(c.getByText('Other rates · staff override')).toBeTruthy();
    // Eligible for a member: the membership rows and the public rack rate.
    await expect(tileIndex(c, 'Membership 7 Days')).toBeGreaterThanOrEqual(0);
    await expect(tile(c, 'Membership 7 Days')).toHaveAttribute('aria-pressed', 'true');
    // Not his rate, but still offered — and still pressable.
    await expect(tileIndex(c, 'Membership 7 Days')).toBeLessThan(tileIndex(c, 'Weekday Junior'));
    await expect(tile(c, 'Weekday Junior')).not.toBeDisabled();
  },
};

// ─── A course with a lot of rates ───────────────────────────────────────────

/**
 * **The heavy catalog just scrolls.** Weston's caveat about the grid was that "there's some
 * that have a lot, so we've got to figure out how we handle all of that as well". This is that
 * course: a 26-row card, of which 24 are sellable on this Thursday nine.
 *
 * The terminal, whose grid is squeezed into a 640px panel under an open row, deals with the
 * overflow by collapsing everything past the eligible handful behind **Show** and putting a
 * filter box in the section header. **The phone does neither, on purpose.** It already has the
 * whole screen, a thumb already scrolls it, and a Show control would put a tap between the
 * operator and the one thing the section is for — the override. Eight tiles the guest qualifies
 * for come first, the other sixteen follow, and the flick to reach them is the same gesture
 * you were already making.
 *
 * Worth saying plainly rather than leaving as an omission: if a course turns up with sixty
 * rates, this is the screen that would need the filter, and the phone would take the
 * terminal's treatment rather than invent a third one.
 *
 * Story-only: `rateCatalog: 'heavy'` on the Weston options. No prototype ships this catalog.
 */
export const TheHeavyCatalogJustScrolls: Story = {
  render: () => rateEditor(openParty(), 0, heavy),
  play: async ({ canvasElement }) => {
    const b = openParty();
    const c = within(canvasElement);
    await c.findByText(`Green fee · ${playerHoles(b, 0)} holes`);
    // Eligible for an unlinked guest: the open rates, shown first.
    await expect(tile(c, 'Rack Prime')).toBeTruthy();
    // And a rate they do not qualify for — present, not collapsed away.
    await expect(tile(c, 'Resident Senior')).toBeTruthy();
    await expect(tileIndex(c, 'Rack Prime')).toBeLessThan(tileIndex(c, 'Resident Senior'));
    // No overflow control and no filter: the screen is the affordance.
    await expect(c.queryByRole('button', { name: 'Show' })).toBeNull();
    await expect(c.queryByLabelText('Filter rates')).toBeNull();
  },
};

// ─── Transport ──────────────────────────────────────────────────────────────

/**
 * **Transport is a catalog, not a switch.** The second row of tiles is the reason the walk /
 * ride chip on the player row now picks a *rate* rather than a mode: a course sells several
 * carts at different prices, a member cart at nothing — and it charges a **trail fee for
 * walking**. A walker paying $8.58 cannot be expressed by a boolean, and pretending otherwise
 * loses real money on every walk-up.
 *
 * Eligibility works exactly as it does above: the member cart is dimmed for a guest and still
 * one tap away. The transport chip on the row keeps working — it selects each mode's default
 * row — so nothing here slows down the common case.
 */
export const TransportTiles: Story = {
  render: () => rateEditor(openParty(), 0),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await c.findByText('Transport');
    // The walking row, and not the member-only "Walking, member" beside it.
    const walking = tiles(c).find((t) => t.startsWith('Walking') && !t.startsWith('Walking,'));
    await expect(walking).toMatch(/\$8\.58/);
    // This party booked carts, so the default riding row is the one already selected.
    await expect(tile(c, 'Riding Cart')).toHaveAttribute('aria-pressed', 'true');
    // Sold to members only, so it is dimmed for this guest — but it is there.
    await expect(tile(c, 'Member Cart')).toBeTruthy();
  },
};

// ─── Group actions ──────────────────────────────────────────────────────────

/**
 * **Save fees to all.** Unlinked guests walk up and they are all residents. Putting the first
 * one on the resident rate and tapping **Save fees to all** moves everyone who hasn't already
 * paid onto the same rate — one decision, once, rather than the same taps for every seat.
 *
 * It skips settled seats on purpose: a paid player's money is done, and changing it is a refund
 * (Financial tab), not an edit.
 *
 * The play test puts the booker on Weekday Resident, saves to all, closes the dialog with
 * **Save**, and checks every seat's fee chip back on the reservation now reads that rate's
 * price — read from the catalog, so the assertion cannot drift if the card is repriced.
 */
export const SaveFeesToAll: Story = {
  render: () => rateEditor(openParty(), 0),
  play: async ({ canvasElement }) => {
    const b = openParty();
    const c = within(canvasElement);
    const fee = money(feeFor(b, 0, 'Weekday Resident'));

    await userEvent.click(tile(c, 'Weekday Resident'));
    await waitFor(() => expect(tile(c, 'Weekday Resident')).toHaveAttribute('aria-pressed', 'true'));
    await userEvent.click(c.getByRole('button', { name: 'Save fees to all' }));
    await userEvent.click(c.getByRole('button', { name: 'Save' }));

    await waitFor(async () => {
      const chips = await c.findAllByLabelText(/^Tee fee \$/);
      expect(chips.map((el) => el.getAttribute('aria-label'))).toEqual(b.playerStates.map(() => `Tee fee ${fee}`));
    });
  },
};

/**
 * **Reset.** Every override needs a way back. Reset drops the seat's chosen rate *and* any
 * typed-in price and returns it to what the system would pick for whoever is sitting there — so
 * an accidental tap is one tap to undo, and the counter never has to remember what the rate
 * used to be.
 *
 * The play test overrides the booker onto the resident rate, resets, and checks the pre-pick is
 * selected again and the override is not. It asserts on which tile is *pressed* rather than on
 * a number, because that is the claim: the seat is back on the rate it was on, not merely back
 * at a price that happens to match.
 */
export const ResetPutsItBack: Story = {
  render: () => rateEditor(openParty(), 0),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await waitFor(() => expect(tile(c, 'Weekday Non Resident')).toHaveAttribute('aria-pressed', 'true'));

    await userEvent.click(tile(c, 'Weekday Resident'));
    await waitFor(() => expect(tile(c, 'Weekday Resident')).toHaveAttribute('aria-pressed', 'true'));

    await userEvent.click(c.getByRole('button', { name: 'Reset' }));
    await waitFor(() => expect(tile(c, 'Weekday Non Resident')).toHaveAttribute('aria-pressed', 'true'));
    await expect(tile(c, 'Weekday Resident')).toHaveAttribute('aria-pressed', 'false');
  },
};
