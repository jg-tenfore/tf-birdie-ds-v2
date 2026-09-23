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
 * Weston's note on the old screen was about exactly this line: *"we want to display that
 * there… we displayed those for a reason."* A row that prints a dollar amount and nothing else
 * cannot answer the only question anybody ever asks at the counter — *why is he paying that*.
 *
 * On the phone that line carries more weight than it does at the counter, because the phone has
 * fewer places to put anything. There is no key glyph on the row and no rate editor open beside
 * the group: **the caption is the only thing on screen that says what a seat is sold on and what
 * cart it is holding.**
 *
 * ## The component
 *
 * Not a component — a `Typography variant="caption"` at the foot of `PlayerRow` in
 * `src/pos/mobile/screens/tee/ReservationPlayers.tsx`, built from the same `seatPrice` the
 * terminal uses. One line, joined with ` · `, parts absent rather than blank:
 *
 * | Part | Source | Shown when |
 * |---|---|---|
 * | `{rate.name} : {greenFee}` | `sp.rate`, `sp.greenFee` | a rate resolves — which is always, on a real card |
 * | the reason | `sp.reason` | punched (the **card's name**) or discounted (`50% off · was $26.00`) |
 * | `{transport.name} : {transportFee}` | `sp.transport` | always — a walker's trail fee included |
 * | `ID {record.id}` | `seatRecord(b, i)` | the seat resolves to a customer by **linked record or the booker's phone, never a name** |
 * | `cart {n}` | `PlayerState.cartKey` | a key is signed out (16 · Cart Signout) |
 *
 * The controls above it are the other half of the row, and they are what the caption is written
 * around: **9 | 18**, the **fee chip** (which opens 11 · Rate Selector), the **transport chip**,
 * the **cart chip** (14 · Per-seat Cart) and **⋮**. Five controls is what fits; a sixth would
 * shrink the five that get used every hour.
 *
 * ## Where it deliberately differs from the tablet
 *
 * **There is no density switch, and there should not be one.** The terminal offers *comfortable*
 * (rate and ride on a line each, dotted leader) and *dense* (V1's one-liner), picked by
 * `rowDensity` on the Weston options. The phone prints the one-liner, always:
 *
 * - `rowDensity` is read in `components/PlayerRows.tsx` and nowhere else. It is terminal-only in
 *   the code, not merely unused here.
 * - The terminal's argument for *comfortable* is that a long rate name gets **ellipsised** on one
 *   line, and a truncated rate name is a row that has stopped answering the question the line
 *   exists for. The phone's caption is not `noWrap`: it **wraps to a second line** and keeps every
 *   character. The failure mode *comfortable* was invented to avoid does not occur here.
 * - The terminal's argument for *dense* — more seats on screen at once — is worth much less on a
 *   phone that scrolls one column with a thumb than on a panel with a fixed 618px of height.
 *
 * Two smaller differences:
 *
 * | | Tablet | Phone |
 * |---|---|---|
 * | Rewards balance · rounds played | on the `bits` line | **not printed** — the record is one tap away on the name |
 * | The cart number | on the key glyph *and* the line | **only on the line** — the key lives in the ⋮ sheet |
 *
 * The phone's line does carry `SeatPrice.reason`, so a $13.00 or $0.00 seat explains itself
 * without opening anything — the same rule the terminal's *comfortable* density follows, and one
 * the terminal's *dense* density actually breaks.
 *
 * ## Specs
 *
 * | | |
 * |---|---|
 * | Frame | 402 × 797 (`mobile.frame`) |
 * | Caption | MUI `variant="caption"`, `md3.onSurfaceVariant`, `px: 1.5`, no `noWrap` — it wraps |
 * | Row controls | 36px chips and a 48px ⋮; the row card sits on `mobile.surfaceContainerLow` |
 * | Adjusted row | 1px `md3.primary` border instead of `md3.outlineVariant` |
 * | Locked seat | a second caption — "Paid — refund on the Financial tab to change this player" |
 * | This fixture | rack $26 · Weekday Senior Resident $19 · 50% off $13 · punched $0 · Riding Cart $26.82 · cart 14 |
 *
 * ## Scope
 *
 * Weston edition only, on the reservation's **Players** tab
 * (`ReservationPlayersTab`), on every seat. It is reached at
 * `{ name: 'bookingDetail', bookingId }`, a **push** (`PRESENTATION.bookingDetail`).
 *
 * None of the four Storybook toolbar globals change this screen: **Panel width** and **Row
 * density** are terminal-only, **Transport** styling is read by the terminal's row, and **Rates**
 * only reaches the editor behind the fee chip.
 *
 * ## The stories
 *
 * All six render `annotatedParty` — a four-seat party with one annotation each, so a single
 * screenshot carries every case the line has to handle.
 *
 * | Story | Seat | What it is for |
 * |---|---|---|
 * | **The Meta Line** | all four | One line per seat, the booker's ending in `cart 14`, seat 2 naming its rate rather than printing a price alone |
 * | **Long Names Wrap Rather Than Truncate** | 2 | `Weekday Senior Resident` — the longest name the standard card sells — at 402px. Asserts the element is not clipping its own content |
 * | **A Discounted Seat** | 3 | Half of the rack rate it is still sold on, and the ride untouched beside it |
 * | **Where The Reason Lives** | 3 | The rate editor over the same seat: the discount tile lit, and the reason printed again in the footer beside the price it produced |
 * | **On A Punch Card** | 4 | The round settled at $0.00 and the **ride still charged** — a punch buys the round, not the cart (17 · Punch Cards) |
 * | **A Cart Signed Out** | 1 | That the line is the sole answer to "what cart do I have", and that it cannot read `cart 14` and `Walking` at once |
 *
 * ## Still open
 *
 * - **The per-story notes below are one revision behind.** Several of them describe the caption
 *   as leaving `SeatPrice.reason` out; it prints it now. The assertions are correct — they only
 *   ever asserted what the row genuinely shows — but the prose needs a pass.
 * - **The reason can push the line to three lines.** `Weekday Non Resident : $13.00 · 50% off ·
 *   was $26.00 · Riding Cart : $26.82 · ID … · cart 14` is a lot for 402px. Wrapping is better
 *   than truncating, but a seat carrying every annotation at once has not been designed for.
 * - **No rewards or rounds.** The terminal prints them; the phone does not, on the grounds that
 *   the record is one tap away. Nobody has checked that against the cart-barn job, where the
 *   record is several taps away.
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
