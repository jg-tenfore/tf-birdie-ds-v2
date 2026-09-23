import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { venue } from '../../../pos/data/venues';
import { buildTeeTimeCart, money, orderTotals, seatCharges } from '../../../pos/logic/cart';
import { rateCardFee } from '../../../pos/logic/rates';
import { bookingHoles, playerFee } from '../../../pos/logic/reservation';
import { MobileStory, mobileMeta } from '../../pos-mobile/mobile-helpers';
import { adjustedParty, at18, growableParty, mixedGroup, openParty, partlyPaidNamed, withBookings } from '../mobile-scenarios';

/**
 * Weston Edits / 2 · Player Rows / Mobile
 *
 * The same three per-player decisions Weston asked for — *"change the players, the amount of
 * players, the tee fee, or change from 9 to 18 holes per player"* — on a 402px screen, where a
 * tablet row's seven controls in a line do not fit.
 *
 * The answer here is a **two-storey card**. The top half is who the player is and where they are
 * in the round, and the whole of it is one button that pushes Player Detail. The bottom half is
 * the three controls. Splitting it that way is the point: on the phone a tap on a control must
 * never also be navigation, and a tap meant as navigation must never land on a toggle.
 *
 * Everything that needs more room than 402px leaves the row — the rate grid to a full-screen
 * dialog, the round rail and contact to Player Detail, group edits and the ⋮ menu to bottom
 * sheets. The pricing rules are identical to the terminal's, because they are the same
 * functions: a seat is priced by **its own player's** class, and a player is resolved by a
 * linked record or the booker's phone, never by the name on the seat.
 *
 * ## The component
 *
 * `src/pos/mobile/screens/tee/ReservationPlayers.tsx` — `ReservationPlayersTab` (the tab body)
 * and `PlayerRow` (one card), rendered by `BookingDetailScreen` in this edition only.
 *
 * | Part | Presentation | What it holds |
 * |---|---|---|
 * | Row, top half | `ButtonBase` → pushes `playerDetail` | Avatar, member dot, name, `Booker`, `IdMeBadge`, round status, pay badge, › |
 * | Row, bottom half | in place | `HolesToggle` 9 \| 18, the **fee** chip, the **transport** chip, the per-seat cart chip (14), ⋮ |
 * | Row caption | in place | The rate's name and price, a discount's reason and what it came down from, the punch, the transport row, `ID <n>`, the cart key (12) |
 * | Fee chip | pushes `seatRate` (**dialog**) | The rate editor — tiles, not a number pad (11) |
 * | Transport chip | `BottomSheet` | `TransportList`, a radio list of walk / riding cart / push cart |
 * | ⋮ | `BottomSheet` | `RowActions` — customer profile or link (4), swap customer, cart signout (16), reset to the booking, remove |
 * | **Everyone** | `BottomSheet` | `GroupActions` — everyone rides / walks / push, everyone 18 or 9, check everyone in, reset everyone |
 * | Party size | in place | A stepper bounded by `useReservationLimits` — what the tee-sheet row can seat together |
 * | Player Detail | pushed screen | `ReservationSection` (`PlayerReservation.tsx`) — the same controls full width, plus `FeeSheet` and Remove |
 *
 * ## What a row reads
 *
 * The same `PlayerState` overrides as the terminal (`src/pos/types.ts`) — `holes`, `fee`,
 * `transport`, `rateId`, `transportRateId`, `transportFee`, `discountId`, `punch`, `cartKey`,
 * `paid`, `noShow`, `step`. Absent means the booking's own value.
 *
 * | Row state | Comes from | Effect |
 * |---|---|---|
 * | `adjusted` | `playerIsAdjusted(b, i)` | Card border switches to `md3.primary` |
 * | `strong` on a chip | `fee`/`rateId` or `transport` set | Chip fills `md3.primaryContainer` — the phone's "this differs from the booking" |
 * | `locked` | `!isEditableSeat(p)` or the booking is no-show / refunded | Controls disabled at `opacity: .5`, with **"Paid — refund on the Financial tab to change this player"** under the row |
 * | `canGrow` / `canShrink` | `max` from the tee-sheet row; last seat still open | The stepper's **+** and **−** |
 *
 * ## Specs
 *
 * | | |
 * |---|---|
 * | Frame | 402 × 797 (`mobile.frame`) |
 * | Card | `radius.md` (12px), 1px border — `md3.outlineVariant`, or `md3.primary` when adjusted — on `mobile.surfaceContainerLow` (#f2f5f2) |
 * | Avatar | 40px, `playerAccents[i % 5]` |
 * | `HolesToggle` | 36dp tall, 44dp minimum per option, pill ends (18px), selected fills `mobile.secondaryContainer` (#d0e8d9) |
 * | `ControlChip` | 36dp tall, `radius.sm` (8px), 14px label, `aria-pressed` on the order chip so a fill is not its only state cue |
 * | ⋮ | `MuiIconButton` medium — **48 × 48**, the `mobile.touchTarget` floor |
 * | Sheet and list rows | 56dp (`mobile.listItem.one`); the party stepper's row is 72dp (`.two`) |
 * | Sheet motion | 400ms `cubic-bezier(0.05, 0.7, 0.1, 1)` in, 200ms out (`mobile.motion`) |
 * | `seatRate` dialog | Rises 12%, 400ms; ✕ discards, Save commits |
 *
 * The two chips sit at **36dp**, under the 48dp floor. That is deliberate: three controls, a
 * cart chip and a ⋮ have to share 402px minus a 40px avatar, and 48dp chips wrap the row onto a
 * second line. The tap targets that carry consequence — the ⋮, the sheet rows, the stepper — are
 * all at 48dp or above.
 *
 * ## Where it deliberately differs from the tablet
 *
 * - **The name does not open the customer record here.** The whole top half of the row is the
 *   drill-down to Player Detail, so the record is on the ⋮ instead (4). On the terminal the name
 *   is its own button and opens the record directly.
 * - **The fee chip opens the rate editor as a full-screen dialog**, not an expander on the row.
 *   Four rows of tiles under an open row at 402px push the rest of the group off the screen
 *   entirely — you would lose the group *and* have to scroll. The terminal expands in place,
 *   which was Weston's own suggestion there.
 * - **Removing a player confirms**, in a bottom sheet. The terminal removes on one ✕.
 * - **Group actions are behind "Everyone"**, not three chips above the list — there is no room
 *   for a permanent row of them, and they are used once per booking, not once per seat.
 * - **No density switch.** The phone prints one caption line per seat, always.
 *
 * ## The stories
 *
 * | Story | What it is for |
 * |---|---|
 * | **Player Rows** | An adjusted party — two verified members linked on, a guest switched to the other length at the card's fee, per-player transport. Values differing from the booking are filled in primary. The render other stories reuse |
 * | **Rate Card Fee On Switch** | Flips seat 2's 9 \| 18 and asserts the fee chip reads `rateCardFee(b, h)` exactly, while the booker keeps the booking's own rate |
 * | **Mixed Member Guest Group** | The per-seat rule on the phone: seat 2 is a member at **$0.00** inside a guest booking; every chip is checked against `playerFee`; the button's amount against `buildTeeTimeCart`; and tax is summed per seat, so the member's $0 seat carries none |
 * | **Tee Fee Sheet** | Taps the fee. It opens the **rate editor** (11), not a number pad — Weston's third round: staff "do want to select what's available". The export name is older than the behaviour |
 * | **Transport Sheet** | Walk / riding cart / push cart for one player, as a radio sheet |
 * | **Row Actions** | The ⋮: customer profile, swap, cart signout, reset, remove. The booker can be swapped but not removed |
 * | **Remove Player** | The confirm, in the sheet — no centred dialog on the phone |
 * | **Group Actions** | **Everyone**: the group edits, applied to the players still open. Paid seats are skipped and it says so |
 * | **Add Player** | A party of two with room beside it; **+** adds a seat and re-seats the booking on the row if it has to |
 * | **Paid Players Locked** | A partly paid party: settled rows locked with the reason, open rows keeping every control |
 * | **Player Detail** | The pushed screen's Reservation section — holes and transport full width, the tee fee with its default spelled out, swap, remove |
 * | **Swap Customer** | The People picker opened for one seat; picking somebody runs `assignPlayer` and returns |
 *
 * ## Still open
 *
 * - **36dp chips.** Nobody has used this at a cart barn in the rain yet. If the row has to go to
 *   48dp it wraps to two lines, which is a layout decision rather than a tweak.
 * - **Transport style** is a toolbar variant here too — icons, or the transport rate that is
 *   actually billed.
 * - The phone has **no dense mode**; if the caption line proves too long to read at a glance, the
 *   fix is what it says, not how tightly it is packed.
 */
const meta = {
  title: 'Weston Edits/2 · Player Rows/Mobile',
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const adjusted = () => {
  const b = adjustedParty();
  return { b, state: at18(withBookings(b)) };
};

/**
 * Player rows on an adjusted party: the verified customers linked on (both members, so on
 * the member rate), one guest switched to the other round length at the rate card's fee,
 * per-player transport, ID.me badges. A value that differs from the booking is filled in
 * primary so the edits are visible at a glance.
 */
export const PlayerRows: Story = {
  render: () => {
    const { b, state } = adjusted();
    return <MobileStory edition="weston" initialState={state} tab="tee" stack={[{ name: 'bookingDetail', bookingId: b.id }]} />;
  },
};

/**
 * **Rate-card fee on switch.** Tapping the other length on player 2's 9 | 18 sets their
 * fee from the published rate card — that hole count's price in this tee time's band, on the
 * booking's rate class — the same lookup the terminal uses. The play test flips it and
 * checks the fee chip reads the card's price; the booker keeps the booking's own rate.
 */
export const RateCardFeeOnSwitch: Story = {
  render: () => (
    <MobileStory edition="weston" initialState={at18()} tab="tee" stack={[{ name: 'bookingDetail', bookingId: openParty().id }]} />
  ),
  play: async ({ canvasElement }) => {
    const b = openParty();
    const h = bookingHoles(b) === 18 ? 9 : 18;
    const c = within(canvasElement);
    const toggles = await c.findAllByRole('group', { name: 'Holes' });
    await userEvent.click(within(toggles[1]).getByRole('button', { name: String(h) }));
    await waitFor(() => expect(c.getAllByLabelText(`Tee fee ${money(rateCardFee(b, h))}`).length).toBeGreaterThan(0));
    await expect(c.getAllByLabelText(`Tee fee ${money(b.price)}`).length).toBeGreaterThan(0);
  },
};

/**
 * **A mixed member/guest group.** The rate class is per player: in this guest booking seat
 * 2 is a member (Chen, Emily) and her fee chip reads the member rate, $0.00; the booker, the
 * guest customer on seat 3 (Martinez, Robert) and the unnamed guests pay the booking's rate.
 * The member switched to the other length stays on the membership row. **Check in & pay**
 * — the order the register will load — charges the guests only. The play test checks each
 * seat's chip, the button's amount against `buildTeeTimeCart`, and the member's switch.
 */
export const MixedMemberGuestGroup: Story = {
  render: () => {
    const b = mixedGroup();
    return <MobileStory edition="weston" initialState={at18(withBookings(b))} tab="tee" stack={[{ name: 'bookingDetail', bookingId: b.id }]} />;
  },
  play: async ({ canvasElement }) => {
    const b = mixedGroup();
    const c = within(canvasElement);
    const chips = await c.findAllByLabelText(/^Tee fee \$/);
    await expect(chips.map((x) => x.getAttribute('aria-label'))).toEqual(b.playerStates.map((_, i) => `Tee fee ${money(playerFee(b, i))}`));
    await expect(chips[1].getAttribute('aria-label')).toBe(`Tee fee ${money(0)}`);
    const { total, golfTax } = orderTotals(buildTeeTimeCart(b, venue('eighteen').courses));
    await expect(c.getByRole('button', { name: `Check in & pay · ${money(total)}` })).toBeTruthy();
    // Tax is per seat, by the seat's class: the member's $0 seat carries none.
    await expect(seatCharges(b, 1).tax).toBe(0);
    await expect(golfTax).toBe(b.playerStates.reduce((s, _, i) => s + seatCharges(b, i).tax, 0));
    const toggles = await c.findAllByRole('group', { name: 'Holes' });
    await userEvent.click(within(toggles[1]).getByRole('button', { name: String(bookingHoles(b) === 18 ? 9 : 18) }));
    await waitFor(() => expect(c.getAllByLabelText(/^Tee fee \$/)[1].getAttribute('aria-label')).toBe(`Tee fee ${money(0)}`));
  },
};

/**
 * Tapping the fee opens the **rate editor** (11 · Rate Selector), not a number pad.
 *
 * Weston's third round moved this: staff "do want to select what's available", so the thing
 * being chosen is the rate, and the amount follows from it. Typing a number over the top is
 * still possible inside the editor — it is just no longer the first thing offered.
 */
export const TeeFeeSheet: Story = {
  render: PlayerRows.render,
  play: async ({ canvasElement }) => {
    const fees = await within(canvasElement).findAllByLabelText(/^Tee fee \$/);
    await userEvent.click(fees[1]);
  },
};

/** Transport for one player — walk, riding cart or push cart — as a radio sheet. */
export const TransportSheet: Story = {
  render: PlayerRows.render,
  play: async ({ canvasElement }) => {
    const t = await within(canvasElement).findAllByLabelText(/^Transport /);
    await userEvent.click(t[1]);
  },
};

/**
 * A player's ⋮: open their customer profile, swap the customer, reset to the booking, or
 * remove them from the tee time. The booker can be swapped but not removed.
 */
export const RowActions: Story = {
  render: PlayerRows.render,
  play: async ({ canvasElement }) => {
    const more = await within(canvasElement).findAllByLabelText(/^More for /);
    await userEvent.click(more[1]);
  },
};

/** Removing a player confirms in the sheet — no centred dialog on the phone. */
export const RemovePlayer: Story = {
  render: PlayerRows.render,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click((await c.findAllByLabelText(/^More for /))[1]);
    await userEvent.click(await c.findByText('Remove from tee time'));
  },
};

/**
 * **Everyone**: the group quick actions — everyone rides / walks / push cart, everyone
 * plays 18 or 9, check everyone in, reset everyone. Applies to the players still open.
 */
export const GroupActions: Story = {
  render: PlayerRows.render,
  play: async ({ canvasElement }) => {
    await userEvent.click(await within(canvasElement).findByRole('button', { name: 'Everyone' }));
  },
};

/**
 * A party of two with room beside it: the stepper's **+** adds a seat (and re-seats the
 * booking on the row if it has to). Weston: "change the players, the amount of players".
 */
export const AddPlayer: Story = {
  render: () => (
    <MobileStory edition="weston" initialState={at18()} tab="tee" stack={[{ name: 'bookingDetail', bookingId: growableParty().id }]} />
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(await within(canvasElement).findByLabelText('Add player'));
  },
};

/**
 * A partly paid party. Paid rows are locked — their money has moved — with the reason on
 * the row; the open players keep every control.
 */
export const PaidPlayersLocked: Story = {
  render: () => {
    const b = partlyPaidNamed();
    return <MobileStory edition="weston" initialState={at18(withBookings(b))} tab="tee" stack={[{ name: 'bookingDetail', bookingId: b.id }]} />;
  },
};

/**
 * Player Detail in the Weston edition gains a Reservation section: holes and transport as
 * full-width segmented buttons, the tee fee with its default spelled out, swap customer,
 * and remove — above the round rail and payment toggles it always had.
 */
export const PlayerDetail: Story = {
  render: () => {
    const { b, state } = adjusted();
    return (
      <MobileStory
        edition="weston"
        initialState={state}
        tab="tee"
        stack={[
          { name: 'bookingDetail', bookingId: b.id },
          { name: 'playerDetail', bookingId: b.id, playerIndex: Math.min(2, b.players - 1) },
        ]}
      />
    );
  },
};

/**
 * Swapping a customer: the People picker opened for one seat of the reservation. Picking
 * someone replaces the player on that seat (`assignPlayer`) and returns to the reservation.
 */
export const SwapCustomer: Story = {
  render: () => {
    const { b, state } = adjusted();
    return (
      <MobileStory
        edition="weston"
        initialState={state}
        tab="tee"
        stack={[
          { name: 'bookingDetail', bookingId: b.id },
          { name: 'golferPicker', target: { bookingId: b.id, playerIndex: 1 } },
        ]}
      />
    );
  },
};
