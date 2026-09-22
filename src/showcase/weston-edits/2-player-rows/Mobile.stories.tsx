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
 * One row per player, full width. The top of the row is who they are and where they are
 * in the round (tap it for Player Detail); the bottom is the three things Weston asked to
 * change per player — **9 | 18**, **tee fee**, **transport** — plus a ⋮ for swapping the
 * customer, resetting, or removing the player. Below the rows, a party-size stepper
 * bounded by what the tee-sheet row can seat together. Group edits ("everyone rides")
 * live in a bottom sheet behind **Everyone**.
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
