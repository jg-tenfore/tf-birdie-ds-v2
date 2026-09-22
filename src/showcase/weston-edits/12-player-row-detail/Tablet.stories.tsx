import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { money } from '../../../pos/logic/cart';
import { playerName } from '../../../pos/logic/reservation';
import { DEFAULT_WESTON_OPTIONS } from '../../../pos/state/pos-store';
import { Screen } from '../../pos/screen-helpers';
import {
  annotatedFoursome,
  cartKeyParty,
  discountedParty,
  punchCard,
  punchedParty,
  sheetWithPanel,
} from '../tablet-scenarios';

/**
 * Weston Edits / 12 · Player Row Detail / Tablet
 *
 * What a player row says underneath the name.
 *
 * Weston's note on the old screen was about exactly this line: "we want to display that
 * there… we displayed those for a reason." A row that prints a dollar amount and nothing else
 * cannot answer the only question anybody ever asks at the counter — *why is he paying that*.
 * So every seat carries the reason on its face: the **name of the rate** it is sold on, the
 * **name of the transport row** (which can cost money even when the player walks), the reason
 * behind a discount with the price it came down from, the punch card that settled the round,
 * and the cart key the player is holding.
 *
 * It is also what makes the register trustworthy. The same seat pricing (`logic/seat-pricing.ts`)
 * builds this line and the order line, so a golfer who is read back "$19, senior resident rate,
 * riding" at the counter sees the same words on the receipt.
 *
 * **Two densities**, as agreed on the call:
 *
 * | | What it does | Costs |
 * |---|---|---|
 * | **Comfortable** (default) | rate and ride get a line each, with a dotted leader to the price | 185px for the seat below, which carries a cart key |
 * | **Dense** | V1's one-liner, `rate : price · ride : price · ID · rounds · cart` | 150px for the same seat, and a long rate name ellipsises |
 *
 * Comfortable is the default because a truncated rate name is a row that has stopped answering
 * the question the line exists for. Dense stays because on a busy Saturday, seeing more seats at
 * once beats reading any one of them. `rowDensity` on the Weston options picks it.
 *
 * One correction worth recording, because it was assumed the other way round before it was
 * measured: **dense does not get a foursome into the 640 panel without scrolling.** In the panel
 * below, the players list stands 823px tall comfortable and 734px dense against 618px of visible
 * panel — the party stepper and the three group actions take the top of it before a single seat
 * is drawn. Dense saves about 90px across a foursome, roughly half a seat; it does not save the
 * scroll. Fitting four seats outright is a job for the 820 panel (see 10 · Panel Size), not for
 * the row.
 */
const meta = {
  title: 'Weston Edits/12 · Player Row Detail/Tablet',
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'counterTerminal', isRotated: false } },
} satisfies Meta;

export default meta;
type Story = StoryObj;

// ─── Play-test helpers ──────────────────────────────────────────────────────

const row = (canvasElement: HTMLElement, i: number) =>
  canvasElement.querySelector<HTMLElement>(`[data-player-row="${i}"]`)!;

/** True when the text in this element is being cut off by its own box. */
const isTruncated = (el: HTMLElement) => el.scrollWidth > el.clientWidth + 1;

// ─── Density ────────────────────────────────────────────────────────────────

/**
 * **Comfortable — the default.** A crowded foursome, one annotation per seat: the booker
 * holding cart 14, seat 2 moved by hand onto Weekday Senior Resident, seat 3 at half price,
 * seat 4's round on a punch card.
 *
 * Each seat gets two lines and a dotted leader: the rate and what it charges, then the ride and
 * what it charges. Nothing is abbreviated, so "Weekday Senior Resident" reads as "Weekday
 * Senior Resident" and not as "Weekday Senior Resi…". That is the whole argument for the
 * default — the line is there to be read back to a golfer, and a truncated one can't be.
 *
 * The play test checks that the long rate name on seat 2 is rendered whole, and that the ride
 * is a line of its own rather than a continuation of it.
 */
export const Comfortable: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(annotatedFoursome())} />,
  play: async ({ canvasElement }) => {
    const seat = within(row(canvasElement, 1));
    const name = seat.getByText('Weekday Senior Resident');
    await expect(isTruncated(name as HTMLElement)).toBe(false);
    // Its own line, with its own price — not folded in behind the green fee.
    await expect(seat.getByText('Riding Cart')).toBeTruthy();
  },
};

/**
 * **Dense — V1's one-liner.** The same foursome with `rowDensity: 'dense'`: rate, ride, and
 * whatever else the seat carries, packed onto a single ellipsised line per player.
 *
 * The trade is visible in both directions at once. The booker's row drops from 185px to 150px
 * and the foursome from 823px to 734px, so more of the fourth player comes up onto the screen —
 * and a long rate name now shares one ellipsised line with the ride, so it is the first thing to
 * go when the row runs out of width.
 *
 * The play test checks that the rate and the ride really are one line on seat 2, and that all
 * four seats are rendered.
 */
export const Dense: Story = {
  render: () => (
    <Screen
      edition="weston"
      initialState={sheetWithPanel(annotatedFoursome(), 'players', {
        weston: { ...DEFAULT_WESTON_OPTIONS, rowDensity: 'dense' },
      })}
    />
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('[data-player-row]').length).toBe(4);
    // One line, both prices on it — the V1 packing.
    const line = within(row(canvasElement, 1)).getByText(/^Weekday Senior Resident : .+ · Riding Cart : /);
    await expect(line).toBeTruthy();
  },
};

// ─── What a row has to explain ──────────────────────────────────────────────

/**
 * **A discount, with its reason and what it came down from.** Seat 2 is out at half price.
 * The row reads `Weekday Non Resident … 50% off · was $26.00 … $13.00`: the rate it is still
 * sold on, why it is cheaper, the price before, and the price now.
 *
 * Weston's case for this was the comp — "you're the son of a staff guest, let me comp you" —
 * which has to be one tap and has to leave a reason behind, because a $0 seat with no
 * explanation is the line an owner asks about at the end of the month. Every preset carries
 * a reason for exactly that purpose, and the typed-in amount carries "Manual discount".
 *
 * The rate editor shows the same thing in its footer, where the original price is struck
 * through beside the new one. The play test reads the row, then opens the editor and checks
 * the struck price is the gross.
 */
export const ADiscountedSeat: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(discountedParty())} />,
  play: async ({ canvasElement }) => {
    const b = discountedParty();
    const seat = within(row(canvasElement, 1));
    await expect(seat.getByText(`50% off · was ${money(b.price)}`)).toBeTruthy();
    await expect(seat.getByText(money(b.price / 2))).toBeTruthy();

    await userEvent.click(seat.getByRole('button', { name: `${playerName(b, 1)} rates` }));
    const expand = await waitFor(() => {
      const el = canvasElement.querySelector<HTMLElement>('[data-rate-expand="1"]');
      if (!el) throw new Error('the rate editor has not opened');
      return el;
    });
    const struck = [...expand.querySelectorAll('span')].filter((el) =>
      getComputedStyle(el).textDecorationLine.includes('line-through'),
    );
    await expect(struck.length).toBeGreaterThan(0);
    await expect(struck[0].textContent).toBe(money(b.price));
  },
};

/**
 * **A round on a punch card.** Seat 3's green fee has been settled from a punch card — and not
 * the player's own: the seat is an unlinked guest, and the card belongs to a member covering
 * the round, which the old prototype supported for a reason ("use other customer's punchcards")
 * and a normal Saturday requires.
 *
 * Two things the row has to get right. The card's **name** is printed, so the zero is
 * explained. And the ride is **still charged** — a punch buys the round, not the cart, which is
 * why transport never became a punch-card row of its own: a walker and a rider would otherwise
 * have spent the same punch for different value.
 *
 * The punch itself comes off the card at check-in, not when it is applied here, so a
 * reservation nobody showed up for has not spent one.
 *
 * The play test checks the card name, the $0 green fee and the unchanged ride.
 */
export const OnAPunchCard: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(punchedParty())} />,
  play: async ({ canvasElement }) => {
    const seat = within(row(canvasElement, 2));
    await expect(seat.getByText(punchCard().name)).toBeTruthy();
    // The round is settled…
    await expect(seat.getByText('$0.00')).toBeTruthy();
    // …and the ride is not.
    await expect(seat.getByText('Riding Cart')).toBeTruthy();
    await expect(seat.getByText('$26.82')).toBeTruthy();
  },
};

/**
 * **A cart key signed out.** The booker is holding cart 14. The key glyph on the row turns
 * brand-coloured and prints the number, and the meta line picks it up as `cart 14` beside
 * whatever else the seat carries.
 *
 * Signing a key out implies riding, so the transport follows the key rather than leaving a row
 * that contradicts itself — a player holding cart 14 who still reads as walking is a row nobody
 * can act on. Tapping the key again reassigns or returns it.
 *
 * The play test checks both places the number appears: the key button and the meta line.
 */
export const ACartSignedOut: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(cartKeyParty())} />,
  play: async ({ canvasElement }) => {
    const b = cartKeyParty();
    const seat = within(row(canvasElement, 0));
    const key = seat.getByRole('button', { name: `${playerName(b, 0)} cart signout` });
    await expect(key.textContent).toContain('14');
    await expect(seat.getByText(/cart 14/)).toBeTruthy();
  },
};
