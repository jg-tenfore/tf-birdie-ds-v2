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
 * **A punch card holds prepaid rounds.** That sentence is the whole design, and getting it
 * wrong is what the old prototype did: its transport list carried a row called *Free Punch
 * Cart*, which spent a punch to pay for a **ride**. Those are different goods. A walker and a
 * rider would hand over the same punch and get very different value for it, and the course
 * would have sold a round's worth of credit for a cart.
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
 * The last two are worth dwelling on. **The punch comes off the card at check-in** because an
 * applied punch on a reservation nobody showed up for has not been used: pricing a reservation
 * stays a pure read of the booking, and a card is only decremented when a round actually
 * happens. The panel says so in as many words under the applied card, so nobody has to guess
 * whether cancelling the reservation costs the golfer a round.
 *
 * And a punch is **not a discount**. Applying one clears any discount on the seat, because
 * "50% off a fee that has already been paid by a punch" is not a thing anyone means. The row
 * keeps the round's gross so it can still show what was covered.
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
