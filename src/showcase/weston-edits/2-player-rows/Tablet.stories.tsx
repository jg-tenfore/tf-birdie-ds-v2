import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { venue } from '../../../pos/data/venues';
import { buildTeeTimeCart, money, orderTotals, seatCharges } from '../../../pos/logic/cart';
import { bookingRowKey, rateCardFee } from '../../../pos/logic/rates';
import { bookingHoles, setPlayerHoles } from '../../../pos/logic/reservation';
import { Screen } from '../../pos/screen-helpers';
import { adjustedParty, fullParty, mixedGroup, noShowParty, openParty, sheetWithPanel } from '../tablet-scenarios';

/**
 * Weston Edits / 2 · Player Rows / Tablet
 *
 * The Players tab: one row per player. Weston listed what the golf needs before it is rung
 * up — "change the players, the amount of players, the tee fee, or change from 9 to 18 holes
 * per player" — and that "modifiers are used for food and beverage", so golf shouldn't be
 * adjusted through them. Each row therefore carries:
 *
 * - name, member dot, **ID.me** badge, and a link to the player's customer record;
 * - **9 / 18** (an 18-hole course sells both; a nine-hole course shows 9 only);
 * - the **tee fee**, per player on that **player's** rate class — a member plays on the
 *   membership row even in a guest's group, a guest on rack even in a member's — defaulting
 *   to the booking's own rate for the holes it was booked for and to the **rate card** for
 *   anything else (the band's price, or the row's price override), editable, with a reset;
 * - **transport** — walk, riding cart, push cart — per player, in one place;
 * - the check-in step, paid state, no-show and remove (not the booker).
 *
 * Above the rows: the player-count stepper, bounded by the open slots beside the tee time
 * (`maxPlayers`), and "Everyone rides / walks" and "Check in all". A row tints amber when it
 * differs from the booking. Paid and no-show seats are read-only.
 */
const meta = {
  title: 'Weston Edits/2 · Player Rows/Tablet',
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'counterTerminal', isRotated: false } },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** An untouched party: every row reads the booking's own holes, rate and transport. */
export const AsBooked: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(openParty())} />,
};

/**
 * Player 2 switched to 18 holes. Their fee moves to the rate card's 18-hole price for this
 * tee time's band and the row tints as adjusted; the footer total follows.
 */
export const PlayerSwitchedTo18: Story = {
  render: () => {
    const b = openParty();
    return <Screen edition="weston" initialState={sheetWithPanel({ ...b, ...setPlayerHoles(b, 1, 18) })} />;
  },
};

/** The same switch, driven by clicking the 18 on player 3's row. */
export const Switch18ByClick: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(openParty())} />,
  play: async ({ canvasElement }) => {
    const row = within(canvasElement.querySelector<HTMLElement>('[data-player-row="2"]')!);
    const fee = row.getByLabelText(/tee fee/) as HTMLInputElement;
    const before = fee.value;
    await userEvent.click(row.getByRole('radio', { name: '18' }));
    await expect(row.getByRole('radio', { name: '18' })).toHaveAttribute('aria-checked', 'true');
    await expect((row.getByLabelText(/tee fee/) as HTMLInputElement).value).not.toBe(before);
  },
};

/** The other hole count for a booking — what a switch moves a player to. */
const otherHoles = (b: ReturnType<typeof openParty>): 9 | 18 => (bookingHoles(b) === 18 ? 9 : 18);

/**
 * **Rate-card fee on switch.** Switching a player between 9 and 18 sets their default fee
 * from the published rate card — the course's price for that hole count in this tee time's
 * band (early / peak / twilight), on the booking's rate class (the rack rate for a
 * reservation, the membership row for a member) — not a ratio of the booking's own rate.
 * The players left alone keep the booking's rate. The play test switches player 2 and
 * checks the fee is exactly the card's price; the field's reset returns to it after an
 * override.
 */
export const RateCardFeeOnSwitch: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(openParty())} />,
  play: async ({ canvasElement }) => {
    const b = openParty();
    const h = otherHoles(b);
    const row = within(canvasElement.querySelector<HTMLElement>('[data-player-row="1"]')!);
    await userEvent.click(row.getByRole('radio', { name: String(h) }));
    await expect((row.getByLabelText(/tee fee/) as HTMLInputElement).value).toBe(rateCardFee(b, h).toFixed(2));
    const booker = within(canvasElement.querySelector<HTMLElement>('[data-player-row="0"]')!);
    await expect((booker.getByLabelText(/tee fee/) as HTMLInputElement).value).toBe(b.price.toFixed(2));
  },
};

/**
 * The same switch on a row with a **price override** (set from the time label's menu): the
 * override is the green fee for that row, so the switched player defaults to it.
 */
export const RateCardOverrideOnSwitch: Story = {
  render: () => {
    const b = openParty();
    return <Screen edition="weston" initialState={sheetWithPanel(b, 'players', { timePrices: { [bookingRowKey(b)]: { label: 'Aeration special', fee: 44 } } })} />;
  },
  play: async ({ canvasElement }) => {
    const row = within(canvasElement.querySelector<HTMLElement>('[data-player-row="1"]')!);
    await userEvent.click(row.getByRole('radio', { name: String(otherHoles(openParty())) }));
    await expect((row.getByLabelText(/tee fee/) as HTMLInputElement).value).toBe('44.00');
  },
};

/**
 * Adjusted every way at once: player 2 linked to a real customer (a member, so on the
 * member rate), player 3 on 18 at the rate card's price and on a different transport, the
 * booker on a typed-in $25 (with a reset back to the rate).
 */
export const AdjustedFees: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(adjustedParty())} />,
};

/**
 * **A mixed member/guest group.** The rate class is per player, not per booking: in this
 * guest booking, seat 2 is a member (Johnson, Sarah) and pays the member rate, $0.00; the
 * booker and seat 3 (a guest customer record, Martinez, Robert) pay the booking's rate. The
 * member switched to 18 stays on the membership row; a guest switched reads the card's rack
 * price. The footer — and the register, which builds the same order — charges the guests
 * only. The play test checks each seat's fee, the footer against `buildTeeTimeCart`, and
 * the member's switch.
 */
export const MixedMemberGuestGroup: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(mixedGroup())} />,
  play: async ({ canvasElement }) => {
    const b = mixedGroup();
    const row = (i: number) => within(canvasElement.querySelector<HTMLElement>(`[data-player-row="${i}"]`)!);
    const fee = (i: number) => (row(i).getByLabelText(/tee fee/) as HTMLInputElement).value;
    await expect(fee(0)).toBe(b.price.toFixed(2));
    await expect(fee(1)).toBe('0.00');
    await expect(fee(2)).toBe(b.price.toFixed(2));
    const { total, golfTax } = orderTotals(buildTeeTimeCart(b, venue('eighteen').courses));
    await expect(within(canvasElement).getByText(`${money(total)} due`)).toBeTruthy();
    // Tax is per seat, by the seat's class: the member's $0 seat carries none.
    await expect(seatCharges(b, 1).tax).toBe(0);
    const seatTax = b.playerStates.reduce((s, _, i) => s + seatCharges(b, i).tax, 0);
    await expect(golfTax).toBe(seatTax);
    await expect(within(canvasElement).getByText(new RegExp(`tax ${money(seatTax).replace('$', '\\$')}`))).toBeTruthy();
    await userEvent.click(row(1).getByRole('radio', { name: '18' }));
    await expect(fee(1)).toBe('0.00');
    await userEvent.click(row(2).getByRole('radio', { name: '18' }));
    await expect(fee(2)).toBe(rateCardFee(b, 18).toFixed(2));
  },
};

/**
 * A party that already fills every slot it can: the stepper's + is disabled and "Add player"
 * is gone — a party can't straddle the booking beside it.
 */
export const PlayerCountAtMax: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(fullParty())} />,
};

/** Adding a player with the stepper: a new unnamed, unpaid seat on the booking's defaults. */
export const AddPlayer: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(openParty())} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const before = canvasElement.querySelectorAll('[data-player-row]').length;
    await userEvent.click(canvas.getByRole('button', { name: 'Add a player' }));
    await expect(canvasElement.querySelectorAll('[data-player-row]').length).toBe(before + 1);
  },
};

/**
 * A no-show party: rows dim, the golf controls step aside, and the no-show toggle is how to
 * undo it. They charge nothing — the footer says so.
 */
export const NoShow: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(noShowParty())} />,
};
