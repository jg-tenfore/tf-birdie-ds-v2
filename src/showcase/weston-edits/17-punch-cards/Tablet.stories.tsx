import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { bookingName } from '../../../pos/data/customers';
import { usablePunchCards } from '../../../pos/data/rate-catalog';
import { customerForId } from '../../../pos/data/roster';
import { money } from '../../../pos/logic/cart';
import { applyPunchCard, playerFee, playerName, setPlayerTransport } from '../../../pos/logic/reservation';
import { seatPrice } from '../../../pos/logic/seat-pricing';
import { Screen } from '../../pos/screen-helpers';
import { cardOf, golfer, ownCardApplied, punchHolder, punchParty, sheetWithPanel } from '../tablet-scenarios';

/**
 * Weston Edits / 17 · Punch Cards / Tablet
 *
 * **A punch card holds prepaid rounds.** That sentence is the whole design, and getting it wrong
 * is what the old prototype did: its transport list carried a row called *Free Punch Cart*, which
 * spent a punch to pay for a **ride**. Those are different goods. A walker and a rider would hand
 * over the same punch and get very different value for it, and the course would have sold a
 * round's worth of credit for a cart.
 *
 * So the punch lives with the round, not the ride:
 *
 * | | |
 * |---|---|
 * | **What a punch settles** | The green fee, in full, whatever it was priced at |
 * | **What is still billed** | Transport — the riding cart, the push cart, even the walking trail fee — and everything else on the order |
 * | **Whose card** | Not necessarily the player's. `PlayerState.punch` carries `customerId`, so a member can cover a guest's round |
 * | **When it is spent** | At **check-in**, not when it is applied |
 * | **Where it lives** | The fourth row of the in-place rate editor, under green fee, transport and discount — the order money gets decided in |
 *
 * There is deliberately **no punch-card transport row** in `TRANSPORT_RATES`. That absence is the
 * fix, and it is worth stating as a rule rather than leaving as an omission.
 *
 * ## The component
 *
 * `PunchRow`, a local component inside `src/pos/components/RateExpand.tsx`, rendered as the
 * editor's fourth section under the label **PUNCH CARD**.
 *
 * | | |
 * |---|---|
 * | Nothing applied | a tile per card the seat's own record still has rounds on (`usablePunchCards`), reading `{card.name}` over `{remaining} of {total} left`, then **Use a customer's card** |
 * | Searching | an inline `Search a card holder` field over `searchRoster(query, 4)`, **filtered to holders with rounds left** — searching is not the place to discover somebody's card is empty. Each result reads `{name}` over `{remaining} left` |
 * | Applied | one selected tile, `{card.name}` over `applied · tap to remove`, and a note beneath |
 * | The note | "The punch comes off the card at check-in, not now." plus " Another customer's card." when `punch.customerId` is not the seat's own record |
 *
 * | State | Where | Default | What it does |
 * |---|---|---|---|
 * | `PlayerState.punch` | the booking | absent | `{ customerId, cardName }` — who is paying and with which card |
 * | `query` · `searching` | local to `PunchRow` | `''` · `false` | The roster search. Not on the store, because it is about finding a card, not about the booking |
 *
 * The write is `applyPunchCard(b, i, customerId, cardName)`; removal is `clearPunchCard`.
 *
 * ## What a punch does to the price
 *
 * In `seatPrice` (`src/pos/logic/seat-pricing.ts`):
 *
 * - `greenFee` is **0** when `usesPunch`, however the round was priced;
 * - `gross` is kept, so the row and the footer can still show what was covered and the strike-
 *   through has something to strike;
 * - `transportFee` is untouched;
 * - `reason` becomes the card's name, which is what the player row prints instead of a bare zero;
 * - `total` is therefore exactly the transport.
 *
 * Two consequences the counter can feel. **A punch is not a discount** — `applyPunchCard` clears
 * any discount on the seat, because "50% off a fee that has already been paid by a punch" is not a
 * thing anyone means. And **removing a punch reprices, it does not restore**: the green fee goes
 * back to whatever the seat's rate says now, not to a remembered number.
 *
 * **The punch comes off the card at check-in, not when it is applied.** Pricing a reservation
 * stays a pure read of the booking, and a card is only decremented when a round actually happens —
 * so a party that never turns up keeps its rounds. The editor says so in as many words, because
 * otherwise the counter has to ask somebody.
 *
 * ## Specs
 *
 * | | |
 * |---|---|
 * | Tile | the editor's standard tile — min-width 92, `radius.sm`, 11.5px/700 over a 10.5px amount |
 * | Applied tile | `md3.primary` border on `md3.primaryContainer`, `aria-pressed="true"` |
 * | The note | 10.5px `md3.onSurfaceVariant` |
 * | Search | inline `InputBase`, full width, `aria-label="Search a card holder"`, **4** results |
 * | This fixture | seat 2 holds a **10-Round Punch Card, 6 of 10 left**; the riding cart beside it stays at **$26.82** |
 * | Walking, punched | green fee $0.00, transport **$8.58** — the trail fee a walk/ride boolean cannot express |
 *
 * ## Scope
 *
 * Weston edition only, inside the in-place rate editor on the reservation panel's **Players** tab,
 * on an editable seat. A punched seat reads back on the row through **12 · Player Row Detail**
 * (the card's name in place of the reason) and through the order line, because both come from the
 * same `seatPrice`.
 *
 * The transport catalog this section defines itself against is in **11 · Rate Selector**; the
 * eligibility model behind both is in **18 · Rate Catalog**.
 *
 * None of the four Storybook toolbar globals change this section.
 *
 * ## The stories
 *
 * | Story | Seat | What it is for |
 * |---|---|---|
 * | **Their Own Card** | 2 of `punchParty` | The common case. Applies the card and checks the tee fee drops to **$0.00**, the green-fee line carries the **card's name**, and the riding cart is **still $26.82**. That last number is the point of the whole section |
 * | **On The Row** | 2 of `ownCardApplied` | The applied state at rest: $0.00 with the card named beside it, transport untouched, and the fee field outlined as *adjusted* with a reset — a punched seat is an edited seat, and the row never pretends the round was free |
 * | **Another Customer's Card** | 3 of `punchParty` | An unlinked guest paying rack, covered by a member's card. Searches the roster, takes the card, and checks the panel says in small type that it was **another customer's card** — six months later that note is the only answer to "why did that guest not pay" |
 * | **Spent At Check-In** | 2 of `ownCardApplied` | One line that settles a question the counter would otherwise have to ask somebody |
 * | **Removing It Reprices Back** | 2 of `ownCardApplied` | Pressing the applied tile again. Asserts the fee lands exactly on the **rate's** price, not on a remembered one |
 * | **Rounds Not Rides** | 2 and 3, built in the render | The case that made the point: one punched walker, one punched rider on a member's card. Both green fees settled; the rider's cart still billed and the walker's trail fee too. Under *Free Punch Cart* those two would have spent the same punch for different goods — and the walker could not have spent one at all |
 *
 * ## Still open
 *
 * - **Nothing decrements a card.** "Spent at check-in" is the rule and the note says so, but
 *   check-in does not actually write it: `usablePunchCards` reads the roster, and the roster is
 *   never reduced. A real build needs that write, plus the reversal when a check-in is undone.
 * - **The first card wins.** A customer holding two cards is offered both from their own record,
 *   but the roster search applies `usablePunchCards(c)[0]` without asking which.
 * - **No rounds-remaining feedback after applying.** The tile stops showing the count once the
 *   card is applied, so "six of ten left" — the thing being read back to the golfer — disappears at
 *   the moment it is used.
 * - **Nothing stops the same card paying two seats.** A member covering three guests would spend
 *   three punches, which is probably right; there is no check that they have three.
 */
const meta = {
  title: 'Weston Edits/17 · Punch Cards/Tablet',
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'counterTerminal', isRotated: false } },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Seat `i`'s row, scoped for queries. */
const row = (canvasElement: HTMLElement, i: number) =>
  within(canvasElement.querySelector<HTMLElement>(`[data-player-row="${i}"]`)!);

/** Open the in-place rate editor on seat `i` — the punch card is its fourth row. */
const openRates = async (canvasElement: HTMLElement, i: number, name: string) => {
  await userEvent.click(row(canvasElement, i).getByRole('button', { name: `${name} rates` }));
  await waitFor(() => expect(canvasElement.querySelector(`[data-rate-expand="${i}"]`)).toBeTruthy());
};

/** A member who still has rounds on a card — the one covering somebody else's green fee. */
const memberDonor = () => customerForId(golfer('Farnsworth').id)!;

/** What the seat's tee fee reads. */
const fee = (canvasElement: HTMLElement, i: number, name: string) =>
  (row(canvasElement, i).getByLabelText(`${name} tee fee`) as HTMLInputElement).value;

/**
 * **The player's own card.** Seat 2 is a linked customer carrying a 10-round card with six left
 * on it, so the editor offers it by name and count — the counter reads "six of ten left" back
 * to the golfer without opening their record.
 *
 * The play test opens the rate editor on that row, presses the card, and checks what the row
 * says afterwards: the tee fee drops to **$0.00**, the green-fee line carries the **card's
 * name** as its reason rather than a bare zero, and the riding cart is **still $26.82**. That
 * last number is the point of the whole section.
 */
export const TheirOwnCard: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(punchParty())} />,
  play: async ({ canvasElement }) => {
    const b = punchParty();
    const name = playerName(b, 1);
    const card = cardOf(punchHolder());
    const before = seatPrice(b, 1, playerFee(b, 1));

    await openRates(canvasElement, 1, name);
    await expect(fee(canvasElement, 1, name)).toBe(before.greenFee.toFixed(2));
    await userEvent.click(
      row(canvasElement, 1).getByRole('button', { name: new RegExp(`${card.name}.*${card.remaining} of ${card.total} left`) }),
    );

    await waitFor(() => expect(fee(canvasElement, 1, name)).toBe('0.00'));
    // The row says *why* it is zero, and the ride is still on the bill.
    await expect(row(canvasElement, 1).getAllByText(card.name).length).toBeGreaterThan(0);
    await expect(row(canvasElement, 1).getAllByText(money(before.transportFee)).length).toBeGreaterThan(0);
  },
};

/**
 * The applied state at rest. The green-fee line reads **$0.00** with the card's name beside it,
 * the transport line is untouched, and the tee fee field is outlined as adjusted with a reset
 * beside it — a punched seat is an edited seat, and the row never pretends the round was free.
 */
export const OnTheRow: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(ownCardApplied())} />,
};

/**
 * **Somebody else's card.** The old prototype had a "use other customer's punchcards" action
 * and it existed for a reason: a member covering a guest's round is a normal Saturday. Seat 3
 * here is an unlinked guest paying rack, so there is a real green fee for the member's card to
 * cover.
 *
 * The play test opens the editor on that seat, presses **Use a customer's card**, searches the
 * roster for the member, and takes their card. Afterwards the seat is at $0.00 and the panel
 * says, in small type, that it was **another customer's card** — because six months later the
 * only way to answer "why did that guest not pay" is for the reservation to have recorded
 * whose card it was.
 */
export const AnotherCustomersCard: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(punchParty())} />,
  play: async ({ canvasElement }) => {
    const b = punchParty();
    const name = playerName(b, 2);
    const donor = memberDonor();

    await openRates(canvasElement, 2, name);
    const seat = row(canvasElement, 2);
    await userEvent.click(seat.getByRole('button', { name: /Use a customer.s card/ }));
    await userEvent.type(await seat.findByLabelText('Search a card holder'), 'Farnsworth');
    await userEvent.click(
      await seat.findByRole('button', {
        name: new RegExp(`${bookingName(donor)}.*${usablePunchCards(donor)[0].remaining} left`),
      }),
    );

    await waitFor(() => expect(fee(canvasElement, 2, name)).toBe('0.00'));
    await expect(seat.getByText(/Another customer.s card/)).toBeTruthy();
  },
};

/**
 * **Spent at check-in, not now.** The note under an applied card, in the editor. It is one line
 * and it settles a question the counter would otherwise have to ask somebody: applying a punch
 * to a reservation costs the golfer nothing until the round actually starts, so a party that
 * never turns up keeps its rounds.
 */
export const SpentAtCheckIn: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(ownCardApplied())} />,
  play: async ({ canvasElement }) => {
    const b = ownCardApplied();
    await openRates(canvasElement, 1, playerName(b, 1));
    await expect(row(canvasElement, 1).getByText(/comes off the card at check-in, not now/)).toBeTruthy();
  },
};

/**
 * **Taking it back off reprices the seat.** The applied card is its own tile, and pressing it
 * again removes the punch — the green fee goes back to whatever the seat's rate says, not to
 * some remembered number. The play test checks it lands exactly on the rate's price.
 *
 * This is why the row keeps the round's gross while a punch is on it: removing one is an undo,
 * not a re-pricing decision.
 */
export const RemovingItRepricesBack: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(ownCardApplied())} />,
  play: async ({ canvasElement }) => {
    const b = ownCardApplied();
    const name = playerName(b, 1);
    const rack = playerFee(punchParty(), 1);

    await openRates(canvasElement, 1, name);
    await expect(fee(canvasElement, 1, name)).toBe('0.00');
    await userEvent.click(row(canvasElement, 1).getByRole('button', { name: /applied · tap to remove/ }));
    await waitFor(() => expect(fee(canvasElement, 1, name)).toBe(rack.toFixed(2)));
  },
};

/**
 * **Rounds, not rides — the case that made the point.** Two seats, each with one punch spent.
 * Seat 2's holder is walking; seat 3's round is on a member's card and they are riding. Both
 * green fees are settled by a punch; the rider's cart is still billed and the walker's is not.
 *
 * Under the old *Free Punch Cart* those two would have spent the same punch for different
 * goods — and the walker, who has no cart to be given, could not have spent one at all.
 */
export const RoundsNotRides: Story = {
  render: () => {
    const base = punchParty();
    const donor = memberDonor();
    const walking = { ...base, ...setPlayerTransport(base, 1, 'walking') };
    const punched = { ...walking, ...applyPunchCard(walking, 1, punchHolder().id, cardOf(punchHolder()).name) };
    const riding = { ...punched, ...setPlayerTransport(punched, 2, 'cart') };
    const both = { ...riding, ...applyPunchCard(riding, 2, donor.id, cardOf(donor).name) };
    return <Screen edition="weston" initialState={sheetWithPanel(both)} />;
  },
};
