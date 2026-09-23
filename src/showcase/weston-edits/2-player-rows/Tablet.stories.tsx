import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';
import { venue } from '../../../pos/data/venues';
import { buildTeeTimeCart, money, orderTotals, seatCharges } from '../../../pos/logic/cart';
import { bookingRowKey, rateCardFee } from '../../../pos/logic/rates';
import { bookingHoles, setPlayerHoles } from '../../../pos/logic/reservation';
import { Screen } from '../../pos/screen-helpers';
import { adjustedParty, fullParty, mixedGroup, noShowParty, openParty, sheetWithPanel } from '../tablet-scenarios';

/**
 * Weston Edits / 2 · Player Rows / Tablet
 *
 * The Players tab: one row per player, and the only place the golf is adjusted.
 *
 * Weston listed what has to be changeable before a tee time is rung up — *"change the players,
 * the amount of players, the tee fee, or change from 9 to 18 holes per player"* — and ruled out
 * the mechanism Birdie uses for it today: *"modifiers are used for food and beverage."* So
 * nothing here goes through a modifier. Holes, fee and transport are **per seat**, and the order
 * the register builds is assembled from exactly these rows.
 *
 * The one rule that governs the whole section: **a seat is priced by its own player, not by the
 * booking.** A member sitting in a guest's foursome plays on the membership row; a guest in a
 * member's group pays rack. And a seat only *has* a player when a record is linked to it, or
 * when the seat is the booker and the booking's phone matches one — **never by name**. "Kim, D."
 * is a string until somebody links it.
 *
 * ## The component
 *
 * `src/pos/components/PlayerRows.tsx` exports two things: `PlayerRows` (the tab body — party
 * stepper, group actions, the list, Add player) and `PlayerRow` (one seat).
 *
 * | Region | What is in it |
 * |---|---|
 * | **Who** | Avatar on the seat's accent, member dot, name, `BOOKER`, `IdMeBadge` (3), **Link** when nobody is in the seat. The whole strip is one button — it opens the customer record (4) |
 * | **Order** | **Add** / **In order** — one seat onto the order for a group splitting the bill (14) |
 * | **State** | `PaidPill` (PAID · UNPAID · NO SHOW), the no-show toggle, and ✕ remove (never on the booker) |
 * | **What they play** | `Segmented` 9 / 18, `FeeField`, the `tune` button that expands the rate editor in place (11), the cart-key glyph (16), `Segmented` transport |
 * | **What they're sold on** | `SeatMeta` — the rate's *name* and price, the transport row's name and price, a discount with its reason, the punch card, the customer id, rewards, rounds (12) |
 * | **Where they are** | `RoundRail`, the five-step check-in rail |
 *
 * The pricing behind it is not in this file: `logic/seat-pricing.ts` (`seatPrice`, `seatRecord`,
 * `seatCanSwitchHoles`), `logic/rates.ts` (`rateCardFee`) and `logic/reservation.ts` (every
 * `setPlayer*`, `resizeParty`, `removePlayer`, `maxPlayers`, `playerIsAdjusted`).
 *
 * ## What a row reads
 *
 * Per-seat overrides live on `PlayerState` (`src/pos/types.ts`). **Absent means the booking's
 * own value** — which is why two hundred authored bookings still price exactly as they did
 * before any of this existed.
 *
 * | Field | Default when absent | What it does |
 * |---|---|---|
 * | `holes` | `booking.holes` | 9 or 18 for this seat |
 * | `fee` | the rate's price | A typed-over green fee. A reset appears the moment it differs |
 * | `transport` | `booking.cart` | walk · riding cart · push cart |
 * | `rateId` | `autoRate` from the player's record | The **named** rate the seat is sold on (11) |
 * | `transportRateId`, `transportFee` | the default row for the mode | The transport row and its price (11) |
 * | `discountId`, `discountManual` | none | A preset, carrying its reason onto the row and the register line |
 * | `punch` | none | `{ customerId, cardName }` — a prepaid **round**; the ride is still billed (17) |
 * | `cartKey` | none | The cart signed out to this seat (16) |
 * | `paid`, `noShow`, `step` | — | `paid` and `noShow` make the seat read-only |
 *
 * Two story-driven switches change the row without a second code path: `state.weston.rowDensity`
 * (`comfortable` default / `dense`) and `state.weston.rateCatalog` (`standard` / `heavy`). Both
 * are on the Storybook toolbar.
 *
 * ## Specs
 *
 * | | |
 * |---|---|
 * | Row | `radius.md` (12px), padding 10px 12px, 3px left border in `playerAccents[i % 5]` — #17a34a · #2563eb · #d97706 · #7c3aed · #dc2626 |
 * | Fill | `md3.surfaceContainer` (#eef1ee); **adjusted** → `reservationPanel.adjusted` (#fffbeb on #fde68a, reset control #92400e) |
 * | No-show | `opacity: .62`, and the golf controls, meta line and rail all step aside |
 * | Avatar | 26px circle, initials at 10.5/800 |
 * | `Segmented` | 28px tall, 34px minimum per option, 1.5px `md3.outlineVariant`; the selected option fills `md3.onSurface` |
 * | `FeeField` | 84 × 28. Commits on **blur or Enter** — typing "4" on the way to "45" must not reprice the order |
 * | `PaidPill` | `radius.xl` pill, 9.5/800, fills from `payBadges` |
 * | Add player | Full-width, 1.5px dashed, and it says how many seats are open beside the tee time |
 * | Stepper | Two 28px circles, ceiling `maxPlayers(booking, course, day)` — a party cannot straddle the booking beside it |
 * | Density | Comfortable = a line each for the rate and the ride; dense = one 10.5px line, ellipsised |
 *
 * **Measured, because it was asserted wrongly first:** the players list is **823px comfortable
 * and 734px dense** against **618px** of visible panel at 640 — the stepper and the three group
 * actions take the top before a seat is drawn. Dense buys back about half a seat, not a scroll.
 * Fitting a foursome outright is the **820** panel's job (10), not the row's.
 *
 * ## Scope
 *
 * Weston edition, 18-hole club, counter terminal. A nine-hole course shows **9** only; the
 * toggle appears when the course has 18 holes or the booking was booked for 18. All of these
 * stories squeeze the sheet — the scrim is scoped to 10.
 *
 * ## The stories
 *
 * | Story | What it is for |
 * |---|---|
 * | **As Booked** | An untouched party: every row reads the booking's own holes, rate and transport. Nothing is tinted |
 * | **Player Switched To 18** | Seat 2 on 18, priced from the rate card, row tinted, footer total following |
 * | **Switch 18 By Click** | The same switch driven through the UI. Asserts the radio flips *and* the fee changes |
 * | **Rate Card Fee On Switch** | Asserts the switched seat reads **exactly** `rateCardFee(b, h)` — the card's price for that hole count in this tee time's band — and that the booker, untouched, still reads the booking's rate. Not a ratio of the booking's price |
 * | **Rate Card Override On Switch** | The same with a price override on the row (an "Aeration special" at $44 from the time label's menu): the override is the green fee, so the switched seat defaults to it |
 * | **Adjusted Fees** | Every kind of edit at once — a linked member, a switch to 18 on a different transport, a typed-in $25 with its reset |
 * | **Mixed Member Guest Group** | The section's rule, measured. Seat 2 is a member at **$0.00** inside a guest booking; the footer is checked against `buildTeeTimeCart`; **tax is per seat by the seat's class**, so the member's $0 seat carries none; and the member switched to 18 stays on the membership row while a guest reads rack |
 * | **Player Count At Max** | A party filling every slot it can: **+** disabled, Add player gone |
 * | **Add Player** | The stepper adding an unnamed, unpaid seat on the booking's defaults |
 * | **No Show** | Rows dimmed, golf controls withdrawn, the toggle as the undo, and a footer that says nothing is due |
 *
 * ## Still open
 *
 * - **Row density** is a variant, not a decision: reading a long rate name back to a golfer
 *   against seeing more seats at once. The toolbar switches it; 12 shows both against a row that
 *   has something to say.
 * - **Transport style** likewise — the walk/ride/push icons, or the transport rate it actually
 *   bills. A walker paying an $8.58 trail fee is not expressible as a toggle.
 * - **Remove has no confirm on the tablet** (the phone confirms in a sheet). It is one ✕ beside
 *   a no-show toggle, and a mis-tap costs the seat's edits.
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

// ─── Round 4: the language of the row ───────────────────────────────────────

/**
 * **"Change golfer", not "Link".**
 *
 * Round 4 spent a while on three words and landed on the third. `Link` meant nothing —
 * *"I don't understand this link thing"* — and `Edit` was worse, because both Weston and Justin
 * read it as editing the profile rather than replacing the person:
 *
 * > *"Maybe instead of link, it's like edit — there's like an edit golfer, some sort of
 * > something where it's a deliberate action to just, hey, I'm changing this person in slot 1 to
 * > somebody completely new."*
 * > *"The thing I would interpret edit as is you're editing the existing customer details."*
 * > *"Yeah, I did think about that too… could we call it change golfer?"*
 *
 * So the row now carries two separate affordances, which was the other half of the agreement —
 * *"I agree with clicking on the name, it should open"*:
 *
 * | Tap | Goes to |
 * |---|---|
 * | The **name** | That person's record — history, gift cards, notes |
 * | **Change golfer** | Customer search, to put somebody else in this position |
 *
 * It replaces an unlink-then-search two-step Weston pushed back on: *"seems like a lot of steps
 * to click unlink and then go back… then it's a guest, then I'm clicking on guest, and then I'm
 * searching."* One tap.
 */
export const ChangeGolfer: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(adjustedParty())} />,
  play: async ({ canvasElement }) => {
    const row = canvasElement.querySelector<HTMLElement>('[data-player-row="1"]')!;
    await userEvent.click(within(row).getByRole('button', { name: /Change golfer in position 2/ }));
    // Straight to search, not to a profile and not to an unlink confirm.
    const dialog = within(await screen.findByRole('dialog'));
    await expect(dialog.getByText(/Add golfer · position 2/)).toBeTruthy();
    await expect(dialog.getByPlaceholderText('Search customers')).toBeTruthy();
  },
};

/**
 * **A note announces itself; it doesn't print itself.**
 *
 * Weston on player notes: *"I don't even know if we need to show the note… maybe it just alerts,
 * right? It shows you that there's a note and you click on it and it could take you to here."*
 * And on why the Notes tab alone is not enough: *"I like them in a separate tab, because you can
 * have more space and write out the full note — but they just go hidden if no one clicks on that
 * tab."*
 *
 * So the row gets a 40dp note glyph when there is one, carrying the note as its tooltip, and
 * tapping it switches to the Notes tab where the note can actually be read and edited. The tab
 * itself grows a dot when there is a **group** note, for the same reason.
 */
export const PlayerNoteAlert: Story = {
  render: () => (
    <Screen
      edition="weston"
      initialState={sheetWithPanel({
        ...adjustedParty(),
        playerNotes: { 1: 'Needs an accessible cart — knee replacement in March.' },
        groupNote: 'Corporate outing, bill to the account.',
      })}
    />
  ),
  play: async ({ canvasElement }) => {
    const row = canvasElement.querySelector<HTMLElement>('[data-player-row="1"]')!;
    const alert = within(row).getByRole('button', { name: /^Note about/ });
    await userEvent.click(alert);
    // It takes you to where the note is written, rather than printing it on the row.
    await waitFor(() =>
      expect(
        within(canvasElement).getByPlaceholderText('Anything the starter or counter should know…'),
      ).toBeTruthy(),
    );
    // And the group note it was carrying is the one the Notes tab opens on.
    await expect(
      within(canvasElement).getByDisplayValue('Corporate outing, bill to the account.'),
    ).toBeTruthy();
  },
};

/**
 * **Touch targets.** Weston, looking at the row on a tablet: *"I feel like these would probably
 * need to be bigger… don't you think, for a touchscreen? Let's make this as big as we can, just
 * because we need to plan for those."*
 *
 * Add, the no-show toggle, remove, the rate tuner, Change golfer and the note alert are all
 * **40dp** now. The play test measures them rather than trusting the styles, because a target
 * that shrinks under a flex parent still looks right in a screenshot.
 */
export const TouchTargets: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(adjustedParty())} />,
  play: async ({ canvasElement }) => {
    const row = canvasElement.querySelector<HTMLElement>('[data-player-row="1"]')!;
    const names = [/Change golfer in position 2/, /^Add .* to the order$/];
    for (const name of names) {
      const el = within(row).getByRole('button', { name });
      await expect(el.getBoundingClientRect().height).toBeGreaterThanOrEqual(40);
    }
  },
};
