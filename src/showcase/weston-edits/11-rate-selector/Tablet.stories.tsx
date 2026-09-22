import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { playerName } from '../../../pos/logic/reservation';
import { DEFAULT_WESTON_OPTIONS } from '../../../pos/state/pos-store';
import { Screen } from '../../pos/screen-helpers';
import { adjustedParty, openParty, sheetWithPanel } from '../tablet-scenarios';
import type { Booking } from '../../../pos/types';

/**
 * Weston Edits / 11 · Rate Selector / Tablet
 *
 * Round 3's biggest change: a player's fee stops being a number somebody types and becomes a
 * **rate somebody chooses**.
 *
 * Weston was clear that the counter does not want a price box — and equally clear that the list
 * it wants instead is not the whole price book. What opens on the row is "every rate that you
 * could possibly have for this specific tee time on this specific date": the catalog narrowed
 * by the slot itself — its band (early / peak / twilight), its day of the week, its hole count.
 * A Saturday-only rate is not offered on a Thursday, and an 18-only rate is not offered on a
 * nine.
 *
 * Within that list the system pre-picks what the player is **owed** from their own record —
 * "it'll automatically give you what you're supposed to get" — and everything else stays one
 * tap away, dimmed. That is deliberate: the counter's job includes saying "you're getting the
 * member rate today" to someone who technically isn't, and a system that hides the rate cannot
 * be told to do it.
 *
 * Why tiles and not a dropdown, in his words: "they're quick, you can just click them — you're
 * not opening a dropdown, scrolling to find it, and then finding it with your finger." The
 * price sits on the tile because the price is the thing being chosen.
 *
 * It opens **in place** on the row — his suggestion, "maybe you click and this expands, instead
 * of taking over a full screen" — so the rest of the group never leaves the screen while one
 * player's money is being decided. Four rows in the order money gets decided: the green fee,
 * the ride, a discount, and the option to put the round on a punch card.
 *
 * The pieces live in `RateExpand.tsx`, the catalog and its eligibility rules in
 * `data/rate-catalog.ts`, and what a seat resolves to in `logic/seat-pricing.ts`.
 */
const meta = {
  title: 'Weston Edits/11 · Rate Selector/Tablet',
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'counterTerminal', isRotated: false } },
} satisfies Meta;

export default meta;
type Story = StoryObj;

// ─── Play-test helpers ──────────────────────────────────────────────────────

/** One player's row in the panel. */
const row = (canvasElement: HTMLElement, i: number) =>
  canvasElement.querySelector<HTMLElement>(`[data-player-row="${i}"]`)!;

/** Click seat `i`'s rates button and hand back the editor that opened under it. */
async function openRates(canvasElement: HTMLElement, b: Booking, i: number): Promise<HTMLElement> {
  await userEvent.click(within(row(canvasElement, i)).getByRole('button', { name: `${playerName(b, i)} rates` }));
  return waitFor(() => {
    const el = canvasElement.querySelector<HTMLElement>(`[data-rate-expand="${i}"]`);
    if (!el) throw new Error('the rate editor has not opened');
    return el;
  });
}

/** Every tile in the editor, as its own text — "Weekday Resident$21.00". */
const tiles = (expand: HTMLElement) => [...expand.querySelectorAll('button')].map((el) => (el.textContent ?? '').trim());

/** Is there a tile for this rate? Matched on the front of the label, so the price can move. */
const hasTile = (expand: HTMLElement, label: string) => tiles(expand).some((t) => t.startsWith(label));

/** Where a tile sits in the editor, for asserting that eligible rates come first. */
const tileIndex = (expand: HTMLElement, label: string) => tiles(expand).findIndex((t) => t.startsWith(label));

/** A seat's tee fee field, which is what the grid is ultimately setting. */
const feeOf = (canvasElement: HTMLElement, i: number) =>
  (within(row(canvasElement, i)).getByLabelText(/tee fee/) as HTMLInputElement).value;

// ─── Opening it ─────────────────────────────────────────────────────────────

/**
 * **It opens on the row.** The tuner beside a player's fee expands the editor underneath that
 * seat — the other players stay exactly where they were, so the operator can see what the rest
 * of the group is paying while changing one of them. Weston's objection to the old full-screen
 * editor was that "it's just a little jarring — you have to click to go back"; there is nothing
 * to go back from here.
 *
 * The play test clicks the booker's rates button and waits for the tile grid.
 */
export const OpensOnTheRow: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(openParty())} />,
  play: async ({ canvasElement }) => {
    const b = openParty();
    const expand = await openRates(canvasElement, b, 0);
    // The grid the counter is choosing from: the green fee tiles, then the ride.
    await expect(hasTile(expand, 'Weekday Non Resident')).toBe(true);
    await expect(hasTile(expand, 'Riding Cart')).toBe(true);
    await expect(within(row(canvasElement, 0)).getByRole('button', { name: `${playerName(b, 0)} rates` })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  },
};

/**
 * **Already open, for reading.** The same editor on the booker of an untouched party, with
 * nothing clicked. Top to bottom: the green fee tiles with the system's pick outlined, the
 * transport catalog, the discount presets, the punch-card row, and a footer that shows the
 * green fee, the ride and the total this seat now owes.
 *
 * The footer matters as much as the tiles. Every one of these controls changes a number, and
 * the number it changes is on screen while it changes.
 */
export const TheWholeEditor: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(openParty())} />,
  play: async ({ canvasElement }) => {
    await openRates(canvasElement, openParty(), 0);
  },
};

// ─── Eligible vs. the rest ──────────────────────────────────────────────────

/**
 * **Eligible first; the rest still there, dimmed.**
 *
 * Seat 2 is linked to David Kim, a full-golf member. The three rates his record actually
 * entitles him to come first — the membership rows and the public rack rate he is always
 * allowed to buy — and the system has already put him on the best of them. The other seven
 * rows of the card are still tiles: greyed back, and titled "Not this player's rate — staff
 * override", because a rate the counter cannot reach is a phone call to a manager.
 *
 * The rule is one function (`isEligible`), shared by green fees and transport, so "qualifies"
 * cannot come to mean two different things in two places.
 *
 * The play test checks that an eligible tile precedes an ineligible one, and that the
 * ineligible tile carries the override warning rather than being disabled.
 */
export const EligibleFirstThenTheRest: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(adjustedParty())} />,
  play: async ({ canvasElement }) => {
    const expand = await openRates(canvasElement, adjustedParty(), 1);
    // Eligible for a member: the membership rows and the public rack rate.
    await expect(hasTile(expand, 'Membership 7 Days')).toBe(true);
    // Not his rate, but still offered.
    await expect(hasTile(expand, 'Weekday Junior')).toBe(true);
    await expect(tileIndex(expand, 'Membership 7 Days')).toBeLessThan(tileIndex(expand, 'Weekday Junior'));
    const override = [...expand.querySelectorAll('button')].find((el) =>
      (el.textContent ?? '').startsWith('Weekday Junior'),
    )!;
    await expect(override.getAttribute('title')).toMatch(/staff override/);
    await expect(override).not.toBeDisabled();
  },
};

// ─── A course with a lot of rates ───────────────────────────────────────────

/**
 * **The heavy catalog.** Weston's caveat about the grid was that "there's some that have a lot,
 * so we've got to figure out how we handle all of that as well". This is that course: a
 * 26-row card, of which 24 are sellable on this Thursday twilight nine (a weekend-only rate and
 * an 18-only rate are already gone, filtered by the slot rather than by the operator).
 *
 * Past twelve rows the grid changes shape on its own. The handful the player qualifies for is
 * labelled and shown — eight, here, for an unlinked guest — and the other sixteen collapse
 * behind **Show**, with a filter box in the section header. Nothing is removed; the common case
 * is simply what you land on.
 *
 * Story-only: `rateCatalog: 'heavy'` on the Weston options. No prototype ships this catalog —
 * it exists so the overflow treatment has something real to work against.
 */
export const HeavyCatalog: Story = {
  render: () => (
    <Screen
      edition="weston"
      initialState={sheetWithPanel(openParty(), 'players', {
        weston: { ...DEFAULT_WESTON_OPTIONS, rateCatalog: 'heavy' },
      })}
    />
  ),
  play: async ({ canvasElement }) => {
    const expand = await openRates(canvasElement, openParty(), 0);
    // The filter only appears on a heavy card — ten tiles don't need one.
    await expect(within(expand).getByLabelText('Filter rates')).toBeTruthy();
    // Eligible for an unlinked guest: the open rates. Shown.
    await expect(hasTile(expand, 'Rack Prime')).toBe(true);
    // Everything else is behind Show.
    await expect(hasTile(expand, 'Resident Senior')).toBe(false);
    await expect(within(expand).getByRole('button', { name: 'Show' })).toBeTruthy();
  },
};

/**
 * **Show all rates.** One tap opens the other sixteen. This is the override path — a resident
 * who left their card at home, a league player being put on the league rate — and it is one
 * tap deep rather than hidden behind a manager screen.
 *
 * The play test opens it and checks a rate that was collapsed is now on screen, and that the
 * control has become **Hide**.
 */
export const ShowAllRates: Story = {
  render: () => (
    <Screen
      edition="weston"
      initialState={sheetWithPanel(openParty(), 'players', {
        weston: { ...DEFAULT_WESTON_OPTIONS, rateCatalog: 'heavy' },
      })}
    />
  ),
  play: async ({ canvasElement }) => {
    const expand = await openRates(canvasElement, openParty(), 0);
    await userEvent.click(within(expand).getByRole('button', { name: 'Show' }));
    await waitFor(() => expect(hasTile(expand, 'Resident Senior')).toBe(true));
    await expect(within(expand).getByRole('button', { name: 'Hide' })).toBeTruthy();
  },
};

/**
 * **Filtering.** On a 24-tile grid, typing beats hunting. The filter runs over both sections at
 * once, so "senior" leaves the senior rates and nothing else — and because it is a filter on an
 * already-narrowed list, what it searches is still only what this tee time can sell.
 *
 * The play test opens the full grid, types `senior`, and checks the rack rate has gone while
 * the two senior rows remain.
 */
export const FilteringTheHeavyCatalog: Story = {
  render: () => (
    <Screen
      edition="weston"
      initialState={sheetWithPanel(openParty(), 'players', {
        weston: { ...DEFAULT_WESTON_OPTIONS, rateCatalog: 'heavy' },
      })}
    />
  ),
  play: async ({ canvasElement }) => {
    const expand = await openRates(canvasElement, openParty(), 0);
    await userEvent.click(within(expand).getByRole('button', { name: 'Show' }));
    await userEvent.type(within(expand).getByLabelText('Filter rates'), 'senior');
    await waitFor(() => expect(hasTile(expand, 'Rack Prime')).toBe(false));
    await expect(hasTile(expand, 'Resident Senior')).toBe(true);
    await expect(hasTile(expand, 'Non Resident Senior')).toBe(true);
  },
};

// ─── Transport ──────────────────────────────────────────────────────────────

/**
 * **Transport is a catalog, not a switch.** The second row of tiles is the reason the walk /
 * ride toggle on the player row now picks a *rate* rather than a mode: a course sells several
 * carts at different prices, a member cart at nothing — and it charges a **trail fee for
 * walking**. A walker paying $8.58 cannot be expressed by a boolean, and pretending otherwise
 * loses real money on every walk-up.
 *
 * Eligibility works exactly as it does above: the member cart is dimmed for a guest and still
 * one tap away. The icon toggle on the row keeps working — it selects each mode's default row —
 * so nothing here slows down the common case.
 *
 * The play test checks the walking tile is present with its fee.
 */
export const TransportTiles: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(openParty())} />,
  play: async ({ canvasElement }) => {
    const expand = await openRates(canvasElement, openParty(), 0);
    const walking = tiles(expand).find((t) => t.startsWith('Walking') && !t.startsWith('Walking,'));
    await expect(walking).toMatch(/\$8\.58/);
    await expect(hasTile(expand, 'Riding Cart')).toBe(true);
    // Sold to members only, so it is dimmed for this guest — but it is there.
    await expect(hasTile(expand, 'Member Cart')).toBe(true);
  },
};

// ─── Group actions ──────────────────────────────────────────────────────────

/**
 * **Save fees to all.** Three unlinked guests walk up and all three are residents. Putting the
 * first one on the resident rate and tapping "Save fees to all" moves everyone who hasn't
 * already paid onto the same rate — one decision, once, rather than the same three taps three
 * times.
 *
 * It skips settled seats on purpose: a paid player's money is done, and changing it is a refund
 * (Financial tab), not an edit.
 *
 * The play test puts the booker on Weekday Resident, saves to all, and checks every seat's tee
 * fee field now reads that rate's price.
 */
export const SaveFeesToAll: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(openParty())} />,
  play: async ({ canvasElement }) => {
    const b = openParty();
    const expand = await openRates(canvasElement, b, 0);
    await userEvent.click(within(expand).getByRole('button', { name: /^Weekday Resident/ }));
    await waitFor(() => expect(feeOf(canvasElement, 0)).toBe('21.00'));
    await userEvent.click(within(expand).getByRole('button', { name: 'Save fees to all' }));
    await waitFor(() => {
      for (let i = 0; i < b.players; i++) expect(feeOf(canvasElement, i)).toBe('21.00');
    });
  },
};

/**
 * **Reset.** Every override needs a way back. Reset drops the seat's chosen rate *and* any
 * typed-in price and returns it to what the system would pick for whoever is sitting there —
 * so an accidental tap is one tap to undo, and the counter never has to remember what the
 * rate used to be.
 *
 * The play test overrides the booker onto the resident rate, then resets, and checks the fee
 * returns to the rack rate this tee time sells at.
 */
export const ResetPutsItBack: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(openParty())} />,
  play: async ({ canvasElement }) => {
    const b = openParty();
    const expand = await openRates(canvasElement, b, 0);
    const before = feeOf(canvasElement, 0);
    await userEvent.click(within(expand).getByRole('button', { name: /^Weekday Resident/ }));
    await waitFor(() => expect(feeOf(canvasElement, 0)).not.toBe(before));
    await userEvent.click(within(expand).getByRole('button', { name: 'Reset' }));
    await waitFor(() => expect(feeOf(canvasElement, 0)).toBe(before));
  },
};
