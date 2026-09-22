import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactElement } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { bookingName } from '../../../pos/data/customers';
import { money } from '../../../pos/logic/cart';
import { playerFee, playerHoles } from '../../../pos/logic/reservation';
import { seatPrice } from '../../../pos/logic/seat-pricing';
import type { Booking } from '../../../pos/types';
import { MobileStory, mobileMeta } from '../../pos-mobile/mobile-helpers';
import {
  at18,
  cardDonor,
  cardOf,
  ownCardApplied,
  punchHolder,
  punchParty,
  punchedWalkerAndRider,
  withBookings,
} from '../mobile-scenarios';

/**
 * Weston Edits / 17 · Punch Cards / Mobile
 *
 * **A punch card holds prepaid rounds.** That sentence is the whole design, and getting it wrong
 * is what the old prototype did: its transport list carried a row called *Free Punch Cart*,
 * which spent a punch to pay for a **ride**. Those are different goods. A walker and a rider
 * would hand over the same punch and get very different value for it, and the course would have
 * sold a round's worth of credit for a cart.
 *
 * So the punch lives with the round, not the ride:
 *
 * | | |
 * |---|---|
 * | **What a punch settles** | The green fee, in full, whatever it was priced at |
 * | **What is still billed** | Transport — the riding cart, the push cart, even the walking trail fee — and everything else on the order |
 * | **Whose card** | Not necessarily the player's. `PlayerState.punch` carries `customerId`, so one customer can cover another's round |
 * | **When it is spent** | At **check-in**, not when it is applied |
 * | **Where it lives** | The fourth section of the phone's rate editor, under green fee, transport and discount — the order money gets decided in |
 *
 * The last two are worth dwelling on. **The punch comes off the card at check-in** because an
 * applied punch on a reservation nobody showed up for has not been used: pricing a reservation
 * stays a pure read of the booking, and a card is only decremented when a round actually
 * happens. The editor says so in as many words under the applied card, so nobody has to guess
 * whether cancelling the reservation costs the golfer a round.
 *
 * And a punch is **not a discount**. Applying one clears any discount on the seat, because "50%
 * off a fee that has already been paid by a punch" is not a thing anyone means. The seat keeps
 * the round's gross so it can still show what was covered.
 *
 * **Same model, one phone difference.** Everything above is the terminal's, unchanged — the same
 * `applyPunchCard`, the same `seatPrice`, the same section order. What differs is that the whole
 * editor is a full-screen dialog (11 · Rate Selector), so the punch section gets the width it
 * wants: the cards are full tiles reading "10-Round Punch Card · 6 of 10 left", and the search
 * for somebody else's card is a real text field rather than a squeezed inline one.
 *
 * **A gap to know about.** The terminal prints the card's **name** on the player row, so a $0.00
 * seat explains itself at a glance. The phone's caption line does not carry `SeatPrice.reason`,
 * so a punched seat reads as a bare zero until the editor is opened — see 12 · Player Row
 * Detail, where the same gap shows up for discounts. The data is on the seat; the line just
 * doesn't print it.
 *
 * **A note on the fixtures.** Every punch-card holder in `ALL_GOLFERS` is a member, and members
 * price at $0 — so a punch on one of their seats settles nothing anyone can see, and proves
 * nothing. The holders below are picked out of the wider roster by predicate (`punchHolder`,
 * `cardDonor` in `mobile-scenarios.ts`): no membership, no rate-bearing customer type, so the
 * seat prices at rack and the punch has a real green fee to cover.
 */
const meta = {
  title: 'Weston Edits/17 · Punch Cards/Mobile',
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

// ─── Play-test helpers ──────────────────────────────────────────────────────

/** One tile, matched on the front of its label. Role queries skip the screen underneath. */
const tile = (c: ReturnType<typeof within>, label: string): HTMLElement =>
  (c.getAllByRole('button') as HTMLElement[]).find((el) => (el.textContent ?? '').trim().startsWith(label))!;

/** What the editor's app bar says this seat now owes — holes and the running total. */
const owes = (b: Booking, seat: number) =>
  `${playerHoles(b, seat)} holes · ${money(seatPrice(b, seat, playerFee(b, seat)).total)}`;

const rateEditor = (b: Booking, seat: number): ReactElement => (
  <MobileStory
    edition="weston"
    initialState={at18(withBookings(b))}
    tab="tee"
    stack={[
      { name: 'bookingDetail', bookingId: b.id },
      { name: 'seatRate', bookingId: b.id, seat },
    ]}
  />
);

const reservation = (b: Booking): ReactElement => (
  <MobileStory
    edition="weston"
    initialState={at18(withBookings(b))}
    tab="tee"
    stack={[{ name: 'bookingDetail', bookingId: b.id }]}
  />
);

// ─── The player's own card ──────────────────────────────────────────────────

/**
 * **The player's own card.** Seat 2 is a linked customer carrying a 10-round card with six left
 * on it, so the editor offers it by name and count — the counter reads "six of ten left" back to
 * the golfer without opening their record.
 *
 * The play test presses the card and checks the one number that matters: the seat's total drops
 * by exactly the green fee and **not by the cart**. The app bar is the assertion target on
 * purpose — it is the running total, in view the whole time the tiles are being pressed, which
 * is the argument for having it there at all.
 */
export const TheirOwnCard: Story = {
  render: () => rateEditor(punchParty(), 1),
  play: async ({ canvasElement }) => {
    const before = punchParty();
    const after = ownCardApplied();
    const card = cardOf(punchHolder());
    const c = within(canvasElement);

    await expect(await c.findByText(owes(before, 1))).toBeTruthy();
    await userEvent.click(tile(c, card.name));

    await waitFor(() => expect(c.getByText(owes(after, 1))).toBeTruthy());
    // The round is settled and the ride is not — the difference is the green fee, exactly.
    const p = seatPrice(after, 1, playerFee(after, 1));
    await expect(p.greenFee).toBe(0);
    await expect(p.total).toBe(p.transportFee);
    await expect(p.transportFee).toBeGreaterThan(0);
  },
};

/**
 * **The applied card, at rest.** The punch section now holds one tile — the card, selected,
 * reading `applied · tap to remove` — and the footer prints the card's name beside the $0.00 it
 * produced, so the zero is explained where it happened.
 */
export const Applied: Story = {
  render: () => rateEditor(ownCardApplied(), 1),
  play: async ({ canvasElement }) => {
    const card = cardOf(punchHolder());
    const c = within(canvasElement);
    await expect(await c.findByText('Punch card')).toBeTruthy();
    await expect(tile(c, card.name)).toHaveAttribute('aria-pressed', 'true');
    await expect(tile(c, card.name).textContent).toContain('applied · tap to remove');
  },
};

/**
 * **Spent at check-in, not now.** The note under an applied card. It is one line and it settles a
 * question the counter would otherwise have to ask somebody: applying a punch to a reservation
 * costs the golfer nothing until the round actually starts, so a party that never turns up keeps
 * its rounds.
 */
export const SpentAtCheckIn: Story = {
  render: () => rateEditor(ownCardApplied(), 1),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(await c.findByText(/comes off the card at check-in, not now/)).toBeTruthy();
  },
};

/**
 * **Taking it back off reprices the seat.** The applied card is its own tile, and pressing it
 * again removes the punch — the green fee goes back to whatever the seat's rate says, not to
 * some remembered number.
 *
 * This is why the seat keeps the round's gross while a punch is on it: removing one is an undo,
 * not a re-pricing decision. The play test checks the total lands back exactly where it started.
 */
export const RemovingItRepricesBack: Story = {
  render: () => rateEditor(ownCardApplied(), 1),
  play: async ({ canvasElement }) => {
    const card = cardOf(punchHolder());
    const c = within(canvasElement);
    await expect(await c.findByText(owes(ownCardApplied(), 1))).toBeTruthy();
    await userEvent.click(tile(c, card.name));
    await waitFor(() => expect(c.getByText(owes(punchParty(), 1))).toBeTruthy());
  },
};

// ─── Somebody else's card ───────────────────────────────────────────────────

/**
 * **Somebody else's card.** The old prototype had a "use other customer's punchcards" action and
 * it existed for a reason: one golfer covering another's round is a normal Saturday. Seat 3 here
 * is an unlinked guest paying rack, so there is a real green fee for the card to cover.
 *
 * The play test opens the editor on that seat, presses **Use a customer's card**, searches the
 * roster, and takes the card. The search only ever offers customers who actually hold one with
 * rounds left — searching is not the place to discover that somebody's card is empty.
 *
 * Afterwards the seat is at $0.00 and the reservation records **whose** card it was
 * (`PlayerState.punch.customerId`), because six months later the only way to answer "why did
 * that guest not pay" is for the booking to have written it down.
 */
export const AnotherCustomersCard: Story = {
  render: () => rateEditor(punchParty(), 2),
  play: async ({ canvasElement }) => {
    const b = punchParty();
    const donor = cardDonor();
    const surname = bookingName(donor).split(',')[0];
    const c = within(canvasElement);

    await expect(await c.findByText(owes(b, 2))).toBeTruthy();
    await userEvent.click(tile(c, 'Use a customer'));
    await userEvent.type(await c.findByPlaceholderText(/Search a card holder/), surname);
    await userEvent.click(await waitFor(() => tile(c, bookingName(donor))));

    // The seat owes its ride and nothing else — the round is on the other customer's card.
    const p = seatPrice(b, 2, playerFee(b, 2));
    await waitFor(() => expect(c.getByText(`${playerHoles(b, 2)} holes · ${money(p.transportFee)}`)).toBeTruthy());
  },
};

// ─── The case that made the point ───────────────────────────────────────────

/**
 * **Rounds, not rides.** Two seats, each with one punch spent. Seat 2's holder is walking and
 * spent their own card; seat 3's round is on another customer's card and they are riding.
 *
 * Both green fees read $0.00. Neither ride does: the rider owes $26.82 for the cart, and the
 * walker still owes $8.58, because this course charges a **trail fee** — which is exactly why
 * transport had to become a priced catalog rather than a boolean (11 · Rate Selector).
 *
 * Under the old *Free Punch Cart* those two seats would have spent the same punch for different
 * goods, and the walker — who has no cart to be given — could not have spent one at all.
 *
 * The play test reads both caption lines and checks each one: the round settled, the transport
 * charged, and the two transport prices different from each other.
 */
export const RoundsNotRides: Story = {
  render: () => reservation(punchedWalkerAndRider()),
  play: async ({ canvasElement }) => {
    const b = punchedWalkerAndRider();
    const c = within(canvasElement);
    const lines = await c.findAllByText(/ : \$/);

    for (const seat of [1, 2]) {
      const p = seatPrice(b, seat, playerFee(b, seat));
      await expect(p.usesPunch).toBe(true);
      await expect(lines[seat].textContent).toContain(`: ${money(0)}`);
      await expect(lines[seat].textContent).toContain(`${p.transport.name} : ${money(p.transportFee)}`);
      await expect(p.transportFee).toBeGreaterThan(0);
    }
    // One walks, one rides — and they are billed differently for it.
    await expect(seatPrice(b, 1, playerFee(b, 1)).transportFee).not.toBe(
      seatPrice(b, 2, playerFee(b, 2)).transportFee,
    );
  },
};

/**
 * **On the row.** The same punched seat back on the reservation: green fee $0.00, the ride
 * untouched, the customer's id — and *not* the card's name, which the terminal prints here and
 * the phone's one-liner leaves out. Until that is closed, the card is named in the editor and
 * nowhere else.
 */
export const OnTheRow: Story = {
  render: () => reservation(ownCardApplied()),
  play: async ({ canvasElement }) => {
    const b = ownCardApplied();
    const p = seatPrice(b, 1, playerFee(b, 1));
    const c = within(canvasElement);
    const line = (await c.findAllByText(/ : \$/))[1];
    await expect(line.textContent).toContain(`: ${money(0)}`);
    await expect(line.textContent).toContain(`${p.transport.name} : ${money(p.transportFee)}`);
    // The card that settled it is on the seat, and named one tap away in the editor.
    await expect(p.punch?.cardName).toBe(cardOf(punchHolder()).name);
  },
};
