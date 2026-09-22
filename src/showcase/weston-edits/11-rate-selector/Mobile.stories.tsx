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
 * The model is identical to the terminal's, because it has to be — the same catalog, the same
 * narrowing by the slot ("every rate that you could possibly have for this specific tee time on
 * this specific date"), the same pre-pick of what the player's own record entitles them to, and
 * the same refusal to hide the rest. What changes is only how it opens.
 *
 * **Why a full-screen dialog and not the terminal's in-place expand.** Weston's suggestion was
 * "maybe you click and this expands, instead of taking over a full screen", and on a 640px
 * panel that works: the rest of the group is still beside the open row. At 402 it does not.
 * Four rows of tiles under an open player row pushes every other player off screen, so you lose
 * the group *and* have to scroll to get it back — strictly worse than the thing he was
 * objecting to. So the phone gives the tiles the whole screen and puts the group one tap away:
 * ✕ discards, **Save** commits, which is this build's pattern for editing one thing
 * (`PRESENTATION.seatRate = 'dialog'` in `navigation.tsx`). The reservation stays mounted
 * underneath the whole time.
 *
 * Same four rows, in the same order money gets decided — the green fee, the ride, a discount,
 * and the option to put the round on a punch card (17 · Punch Cards) — with a footer that shows
 * the green fee, the ride and the total this seat now owes. The footer matters as much as the
 * tiles: every control up there changes a number, and the number is on screen while it changes.
 *
 * Tiles rather than a dropdown for Weston's reason — "they're quick, you can just click them —
 * you're not opening a dropdown, scrolling to find it, and then finding it with your finger" —
 * and at phone density they are 48px tall and two to a row, so a fat thumb can hit one.
 *
 * The pieces live in `mobile/screens/tee/SeatRateScreen.tsx`, the catalog and its eligibility
 * rules in `data/rate-catalog.ts`, and what a seat resolves to in `logic/seat-pricing.ts`.
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
