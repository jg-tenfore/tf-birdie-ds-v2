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
 * it wants instead is not the whole price book: *"this is not showing you every rate that you
 * have in the system, it's showing you every rate that you could possibly have for this specific
 * tee time on this specific date."* Within that list the system pre-picks what the player is
 * owed from their own record — *"it'll automatically give you what you're supposed to get"* —
 * and everything else stays one tap away, dimmed. That is deliberate: the counter's job includes
 * saying "you're getting the member rate today" to someone who technically isn't, and a system
 * that hides the rate cannot be told to do it.
 *
 * Tiles rather than a dropdown, in his words: *"they're quick, you can just click them — you're
 * not opening a dropdown, scrolling to find it, and then finding it with your finger."* The
 * price sits on the tile because the price is the thing being chosen.
 *
 * It opens **in place** on the row — his suggestion, *"maybe you click and this expands, instead
 * of taking over a full screen"* — so the rest of the group never leaves the screen while one
 * player's money is being decided.
 *
 * ## The component
 *
 * `RateExpand` (`src/pos/components/RateExpand.tsx`), rendered by `PlayerRows` under the seat
 * whose ⚙ tuner is pressed, in a box marked `data-rate-expand="{seat}"`. Four sections in the
 * order money gets decided — **green fee → transport → discount → punch card** — then a footer
 * carrying Reset, Save fees to all, and the three running totals.
 *
 * Nothing it decides lives on the component. Every tile dispatches `patchBooking` and the editor
 * re-reads the booking, which is why the row's meta line, the footer, the order rail and the
 * register cannot disagree about what a seat costs. What it writes, all on `PlayerState`
 * (`src/pos/types.ts`):
 *
 * | Field | Set by | Default | What it does |
 * |---|---|---|---|
 * | `rateId` | a green-fee tile | absent — the seat reads `autoRate` | The rate the seat is sold on. Pressing the tile the system had already picked clears it rather than pinning it |
 * | `fee` | the row's tee-fee box | absent | A typed-over green fee. **Choosing a tile clears it** — the two cannot both be the price |
 * | `transportRateId` | a transport tile | absent — the default row for the booking's mode | The transport row. It carries its own `mode`, so picking *Walking* also moves the seat's walk/ride/push state |
 * | `transportFee` | typed | absent | A typed-over transport price, cleared the same way |
 * | `discountId` · `discountManual` | a discount tile · **Amount…** | absent | The preset, and the amount when it is the typed one |
 * | `punch` | the punch row (17 · Punch Cards) | absent | `{ customerId, cardName }` — settles the green fee, leaves the ride billed |
 *
 * Two pieces of local state, deliberately not on the store: `filter` (the search box) and
 * `showAll` (the overflow toggle). They are about reading the grid, not about the booking, and
 * they should not survive closing the editor.
 *
 * ## Eligible, and what that does *not* mean
 *
 * The grid is narrowed by the **slot** — band, day of week, hole count (`ratesForTeeTime`). Who
 * is sitting in the seat only decides the **ordering and the pre-pick**: `isEligible` sorts and
 * groups, it never removes a tile. A rate matches on **any** of the `customerTypes` or
 * `memberships` it lists, not all of them — requiring all meant a customer carrying plain
 * `Resident` failed the Weekday Resident row, which lists two spellings of the same thing.
 *
 * A seat resolves to a customer by **linked record or the booker's phone, never by name**
 * (`seatRecord`). A name that looks like a customer is a suggestion elsewhere; it prices nothing.
 *
 * The full model — the eligibility fields, the standard and heavy cards, how `autoRate` picks —
 * is written up once in **18 · Rate Catalog**, rather than repeated here.
 *
 * ## Specs
 *
 * | | |
 * |---|---|
 * | Tile | min-width 92px, 9×5px padding, `radius.sm`, 11.5px/700 label over a 10.5px amount |
 * | Selected tile | `md3.primary` 1.5px border on `md3.primaryContainer`, `aria-pressed="true"` |
 * | Ineligible tile | `opacity: .55`, `title="Not this player's rate — staff override"`, **not disabled** |
 * | Overflow kicks in | `grid.length > 12`. Below that there is no filter box and no Show/Hide |
 * | Filter box | 130px, `aria-label="Filter rates"`, matches on rate name across both sections |
 * | This slot | Thursday 4:00 PM twilight nine — **10** standard rates, **24 of 26** heavy ones |
 * | Eligible here | 1 of 10 standard for an unlinked guest (the open rack row); 8 of 24 heavy |
 * | Transport catalog | Riding Cart $26.82 · Cart Plus $32 · Member Cart $0 · **Walking $8.58** · Walking, member $0 · Push Cart $6 |
 * | Discount presets | Comp · 50% off · 25% off · Employee, plus **Amount…** (typed, reason "Manual discount") |
 * | Footer | Green fee (struck through when discounted or punched) · Transport · Total |
 *
 * ## Scope
 *
 * Weston edition only, on the reservation panel's **Players** tab, on an editable seat — a paid
 * or no-show seat has no tuner, because changing settled money is a refund (Financial tab), not
 * an edit. The phone reaches the same model through a full-screen dialog; see the **Mobile**
 * half of this section.
 *
 * Two of the four Storybook toolbar globals land here: **Rates** swaps in the heavy catalog and
 * **Panel width** decides how many tiles fit a row. The heavy-catalog stories below pin
 * `rateCatalog` themselves, so the toolbar cannot collapse the comparison into one screenshot.
 *
 * ## The stories
 *
 * | Story | Scenario | What it is for |
 * |---|---|---|
 * | **Opens On The Row** | `openParty`, seat 1 | That the tuner expands under the seat rather than taking the screen. Asserts the grid and `aria-expanded` |
 * | **The Whole Editor** | `openParty`, seat 1 | All four rows at rest, for reading |
 * | **Eligible First Then The Rest** | `adjustedParty`, seat 2 — Kim, David, a member | That the member's rows sort above `Weekday Junior`, and that the override tile carries the warning instead of being disabled |
 * | **Heavy Catalog** | `rateCatalog: 'heavy'` | 24 tiles: eight eligible shown, sixteen behind **Show**, filter box in the header |
 * | **Show All Rates** | heavy | The override path — one tap, not a manager screen. Checks the control becomes **Hide** |
 * | **Filtering The Heavy Catalog** | heavy | Typing `senior` over both sections at once |
 * | **Transport Tiles** | `openParty` | That walking costs $8.58 and the member cart is dimmed, not hidden |
 * | **Save Fees To All** | `openParty` | One decision across the party; checks all three tee-fee fields land on $21.00 |
 * | **Reset Puts It Back** | `openParty` | That an accidental tap is one tap to undo |
 *
 * ## Still open
 *
 * - **Twelve is a guess.** The grid changes shape past twelve rows because twelve is roughly
 *   where a 640px panel stops holding the tiles in three rows. It has not been measured against
 *   a real club's card, and at 820 the threshold would be higher.
 * - **The heavy catalog is story-only.** It is built from the naming the old prototype used, not
 *   from a customer's price book. The real question — how many rates a course actually sells,
 *   and how many a player qualifies for — is still open.
 * - **Save fees to all copies the rate and nothing else.** Not the transport row, not the
 *   discount, not a punch. That is almost certainly right (a group rarely shares a discount
 *   reason) but it has not been put to Weston.
 * - **Amount… has no tile state.** The typed discount commits on blur and then reads as
 *   "Amount…" again; the reason shows on the row and in the footer, not on the tile.
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
