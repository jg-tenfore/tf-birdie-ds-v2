import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { money } from '../../../pos/logic/cart';
import { playerFee, playerHoles } from '../../../pos/logic/reservation';
import { seatPrice } from '../../../pos/logic/seat-pricing';
import { MobileStory, mobileMeta } from '../../pos-mobile/mobile-helpers';
import { CARTS_OUT, annotatedParty, at18, cardOf, punchHolder, withBookings } from '../mobile-scenarios';

/**
 * Weston Edits / 12 · Player Row Detail / Mobile
 *
 * What a player row says underneath the name, at 402px.
 *
 * Weston's note on the old screen was about exactly this line: "we want to display that
 * there… we displayed those for a reason." A row that prints a dollar amount and nothing else
 * cannot answer the only question anybody ever asks at the counter — *why is he paying that*.
 * So every seat carries the reason on its face: the **name of the rate** it is sold on, the
 * **name of the transport row** (which can cost money even when the player walks), the linked
 * customer's id, and the cart key the player is holding.
 *
 * It is also what makes the register trustworthy. The same seat pricing
 * (`logic/seat-pricing.ts`) builds this line and the order line, so a golfer read back "$19,
 * senior resident rate, riding" at the cart barn sees the same words on the receipt.
 *
 * **The density choice does not cross over, and there is nothing to choose.** On the terminal
 * this section is a trade between two treatments — *comfortable*, which gives the rate and the
 * ride a line each with a dotted leader, and *dense*, V1's one-liner — and `rowDensity` on the
 * Weston options picks between them. The phone has no such switch, and should not:
 *
 * - `rowDensity` is read in one place, `components/PlayerRows.tsx`, which is terminal-only.
 * - The terminal's argument for *comfortable* is that a long rate name gets ellipsised on one
 *   line, and a truncated rate name is a row that has stopped answering the question the line
 *   exists for. The phone's caption is not `noWrap`: when it runs out of width it **wraps to a
 *   second line** rather than cutting the name off. So the failure mode *comfortable* was
 *   invented to avoid does not occur here, and the packing that causes it costs nothing.
 * - The terminal's argument for *dense* — more seats on screen at once — is worth much less on
 *   a phone that scrolls one column with a thumb than on a panel with a fixed 618px of height.
 *
 * So the phone prints the one-liner, always, and lets it wrap. Everything a line cannot fit is
 * one tap away in two directions: the **name** opens the customer's record (4 · Customer
 * Profile), the **fee chip** opens the rate editor (11 · Rate Selector).
 *
 * **One thing the phone's line does not carry, and the terminal's does.** `SeatPrice.reason` —
 * the *why* behind a cheap seat: "50% off", or the name of the punch card that settled the
 * round. The terminal prints it on the row beside the price it came down from; the phone's
 * one-liner leaves it out, so a discounted or punched seat reads as a smaller number with no
 * explanation until the rate editor is opened. That is a gap rather than a decision, and the
 * stories below show both halves of it: what the row says, and where the reason currently
 * lives.
 */
const meta = {
  title: 'Weston Edits/12 · Player Row Detail/Mobile',
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

// ─── Play-test helpers ──────────────────────────────────────────────────────

/** The caption under each player's controls, in seat order. */
const metaLines = (c: ReturnType<typeof within>) => c.getAllByText(/ : \$/);

/** True when the text in this element is being cut off by its own box. */
const isTruncated = (el: HTMLElement) => el.scrollWidth > el.clientWidth + 1;

const reservation = () => {
  const b = annotatedParty();
  return (
    <MobileStory
      edition="weston"
      initialState={at18(withBookings(b))}
      tab="tee"
      stack={[{ name: 'bookingDetail', bookingId: b.id }]}
    />
  );
};

// ─── The line ───────────────────────────────────────────────────────────────

/**
 * **One line per seat, and everything it has to say.** The open party with one annotation per
 * player: the booker holding a cart key, seat 2 moved by hand onto a long-named rate, seat 3 at
 * half price, seat 4's round on a punch card.
 *
 * Read top to bottom the line is always the same shape — `rate : price · ride : price · ID ·
 * cart n` — with the parts that don't apply simply absent rather than blank. A seat nobody has
 * touched still prints it, because "Weekday Non Resident : $26.00 · Riding Cart : $26.82" is
 * the answer to the counter question even when nothing was adjusted.
 *
 * The play test checks there is one line per seat, that the booker's carries the cart number,
 * and that the seat put on a rate by hand names that rate rather than a price alone.
 */
export const TheMetaLine: Story = {
  render: reservation,
  play: async ({ canvasElement }) => {
    const b = annotatedParty();
    const c = within(canvasElement);
    const lines = await c.findAllByText(/ : \$/);
    await expect(lines.length).toBe(b.players);
    await expect(lines[0].textContent).toMatch(new RegExp(`cart ${CARTS_OUT.early}$`));
    await expect(lines[1].textContent).toMatch(/^Weekday Senior Resident : \$/);
  },
};

/**
 * **A long rate name wraps; it does not get cut off.** Seat 2 is on Weekday Senior Resident —
 * the longest name the standard card sells, picked for exactly that reason — and at 402px it
 * shares its line with a riding cart and a price each.
 *
 * This is the whole reason the phone does not need the terminal's *comfortable* density. The
 * caption is a plain `variant="caption"` block with no `noWrap`, so when the text runs past the
 * row it takes a second line and keeps every character. The terminal's dense one-liner
 * ellipsises instead, which is what made a second treatment worth building there.
 *
 * The play test asserts the element is not clipping its own content, and that the rate's name
 * is present in full rather than as a stem.
 */
export const LongNamesWrapRatherThanTruncate: Story = {
  render: reservation,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const line = (await c.findAllByText(/ : \$/))[1];
    await expect(line.textContent).toContain('Weekday Senior Resident');
    await expect(isTruncated(line as HTMLElement)).toBe(false);
  },
};

// ─── What a row has to explain ──────────────────────────────────────────────

/**
 * **A discounted seat.** Seat 3 is out at half price: the rate it is still sold on, and the
 * lower number it now charges.
 *
 * What is missing is the *reason*. The terminal's row reads `Weekday Non Resident … 50% off ·
 * was $26.00 … $13.00`; the phone's line stops at the price. Weston's case for the reason was
 * the comp — "you're the son of a staff guest, let me comp you" — which has to be one tap and
 * has to leave a reason behind, because a $0 seat with no explanation is the line an owner asks
 * about at the end of the month. The data is there (`SeatPrice.reason`, already computed for
 * this row); the phone's caption simply doesn't print it.
 *
 * The play test asserts only what the row genuinely shows — the discounted green fee, and the
 * ride untouched beside it.
 */
export const ADiscountedSeat: Story = {
  render: reservation,
  play: async ({ canvasElement }) => {
    const b = annotatedParty();
    const p = seatPrice(b, 2, playerFee(b, 2));
    const c = within(canvasElement);
    const line = (await c.findAllByText(/ : \$/))[2];
    // Half of the rack rate it is still sold on…
    await expect(p.greenFee).toBe(p.gross / 2);
    await expect(line.textContent).toContain(`: ${money(p.greenFee)}`);
    // …and the ride, which a discount on the round never touched.
    await expect(line.textContent).toContain(`${p.transport.name} : ${money(p.transportFee)}`);
  },
};

/**
 * **Where the reason lives, for now.** The same seat with its rate editor open: the discount
 * tile is lit, and the footer prints the reason beside the green fee it produced. So the
 * explanation exists and is one tap from the row — it is just not *on* the row the way it is on
 * the terminal.
 *
 * Shown rather than described because it is the honest answer to "can the counter find out why
 * this seat is $13": yes, in one tap, and that is worth knowing before deciding whether the
 * line needs the reason too.
 */
export const WhereTheReasonLives: Story = {
  render: reservation,
  play: async ({ canvasElement }) => {
    const b = annotatedParty();
    const c = within(canvasElement);
    await userEvent.click((await c.findAllByLabelText(/^Tee fee \$/))[2]);
    await c.findByText(`Green fee · ${playerHoles(b, 2)} holes`);
    const chosen = c.getAllByRole('button').find((el) => (el.textContent ?? '').trim() === '50% off')!;
    await expect(chosen).toHaveAttribute('aria-pressed', 'true');
    // Twice over: the preset tile, and the reason note in the footer beside the new price.
    await expect(c.getAllByText('50% off').length).toBeGreaterThanOrEqual(2);
  },
};

/**
 * **A round on a punch card.** Seat 4's green fee has been settled from a card — and not the
 * player's own: the seat is an unlinked guest, and the card belongs to a customer covering the
 * round, which the old prototype supported for a reason ("use other customer's punchcards") and
 * a normal Saturday requires.
 *
 * The row gets one of the two things right. The **ride is still charged** — a punch buys the
 * round, not the cart, which is why transport never became a punch-card row of its own (17 ·
 * Punch Cards). But the card's **name** is not printed, so the seat reads as a bare $0.00; the
 * terminal names the card on the row, and the phone leaves it to the editor. Same gap as the
 * discount above, same cause.
 *
 * The punch comes off the card at check-in, not when it is applied here, so a reservation
 * nobody showed up for has not spent one.
 *
 * The play test checks the round is settled and the ride is not.
 */
export const OnAPunchCard: Story = {
  render: reservation,
  play: async ({ canvasElement }) => {
    const b = annotatedParty();
    const p = seatPrice(b, 3, playerFee(b, 3));
    const c = within(canvasElement);
    const line = (await c.findAllByText(/ : \$/))[3];
    // The round is settled…
    await expect(p.usesPunch).toBe(true);
    await expect(line.textContent).toContain(`: ${money(0)}`);
    // …and the ride is not.
    await expect(line.textContent).toContain(`${p.transport.name} : ${money(p.transportFee)}`);
    await expect(p.transportFee).toBeGreaterThan(0);
    // The card that did it is on the seat, and named in the editor — just not on this line.
    await expect(p.punch?.cardName).toBe(cardOf(punchHolder()).name);
  },
};

/**
 * **A cart key signed out.** The booker is holding cart 14, and the line picks it up as `cart
 * 14` beside whatever else the seat carries.
 *
 * The terminal also turns the key glyph on the row brand-coloured and prints the number on it.
 * The phone has no key glyph on the row — at 402 the row's control strip is already holes, fee,
 * transport, add-to-order and ⋮ — so the key lives in the ⋮ sheet (16 · Cart Signout) and the
 * caption is the only place the number shows. That makes this line load-bearing rather than
 * decorative: it is the sole answer to "what cart does he have".
 *
 * Signing a key out implies riding, so the transport follows the key rather than leaving a row
 * that contradicts itself.
 */
export const ACartSignedOut: Story = {
  render: reservation,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const line = (await c.findAllByText(/ : \$/))[0];
    await expect(line.textContent).toContain(`cart ${CARTS_OUT.early}`);
    // The key implies a ride, so the line cannot say "cart 14" and "Walking" at once.
    await expect(line.textContent).toMatch(/Cart : \$/);
    await expect(metaLines(c).length).toBeGreaterThan(0);
  },
};
