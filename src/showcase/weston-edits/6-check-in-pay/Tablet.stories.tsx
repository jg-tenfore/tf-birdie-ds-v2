import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { buildTeeTimeCart, money, orderTotals } from '../../../pos/logic/cart';
import { venue } from '../../../pos/data/venues';
import { Screen, atVenue } from '../../pos/screen-helpers';
import {
  adjustedParty,
  noShowParty,
  paidTwilight,
  registerWith,
  sheetWithPanel,
} from '../tablet-scenarios';

/**
 * Weston Edits / 6 · Check In & Pay / Tablet
 *
 * "You're still massaging the reservation before you submit it to the cart and then check
 * it out." **Check in & pay** is that submit: the panel's primary action. It checks in the
 * players who haven't been, loads the reservation — exactly as adjusted — into the register
 * (`loadBooking`), and closes the panel. Its label carries the amount, and it is the same
 * number the register's Pay button will show, because both are built from the same cart.
 *
 * Secondary actions: Move, Delete, Close. A booking already on the order reads **Update
 * order** (retail on the order stays; only the golf is rebuilt). A fully paid booking reads
 * **Open in register** and charges nothing, rather than asking to pay again.
 *
 * It checks **everyone** in — every player not marked no-show — whatever step they were at.
 *
 * **Walk-ins go through a reservation too.** The register's **Walk-in** (and a CHECK IN
 * rate rung with nothing on the order) no longer starts a register-first order: it puts a
 * walk-in (`W-` code, one player) on the sheet at the **next open tee time** after the demo
 * "now", on the right course for the rate's holes, and opens it here — players, holes, fees
 * and transport are set in the panel, **Walk-in · next open tee time · Change** picks
 * another time, and Check in & pay brings it to the order like any booking. The base
 * edition's fast walk-in is unchanged.
 */
const meta = {
  title: 'Weston Edits/6 · Check In & Pay/Tablet',
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'counterTerminal', isRotated: false } },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const expected = () => money(orderTotals(buildTeeTimeCart(adjustedParty(), venue('eighteen').courses)).total);

/**
 * The footer on an adjusted party: fees, carts and tax spelled out, the total, and **Check in
 * & pay · $x**. The play test presses it and checks the register's Pay button asks for the
 * same amount.
 */
export const CheckInAndPay: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(adjustedParty())} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const total = expected();
    await userEvent.click(await canvas.findByRole('button', { name: `Check in & pay · ${total}` }));
    await waitFor(() => expect(canvas.getByRole('button', { name: `Pay ${total}` })).toBeTruthy());
    await expect(canvas.queryByRole('complementary')).toBeNull();
  },
};

/** Where Check in & pay lands: the register, the golf summarised, the same total to pay. */
export const InTheRegister: Story = {
  render: () => <Screen edition="weston" initialState={registerWith(adjustedParty())} />,
};

/**
 * Reopened from the register ("Edit reservation"): the booking is already on the order, so
 * the action reads **Update order** — it rebuilds the golf and keeps anything else rung up.
 */
export const UpdateOrder: Story = {
  render: () => {
    const b = adjustedParty();
    return (
      <Screen
        edition="weston"
        initialState={registerWith(b, { reservationPanel: { bookingId: b.id, tab: 'players', playerIndex: 0 } })}
      />
    );
  },
};

/**
 * A fully paid booking (Morris, G., from the Loom): **Paid in full**, and the action is
 * **Open in register** — no second charge.
 */
export const PaidBooking: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(paidTwilight())} />,
};

/** A no-show party: nothing due and no one to check in, so the action is disabled. */
export const NoShowParty: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(noShowParty())} />,
};

/**
 * **Walk-in → reservation → order.** From an empty register, **Walk-in** lands a walk-in at
 * the next open tee time and opens its reservation in the panel over today's sheet. The play
 * test presses Walk-in, checks the panel is the new walk-in (unnamed, `W-0001`), presses its
 * **Check in & pay**, and checks the register shows the golf summary — no "+ modifier" or
 * "Guest Details" — with Pay asking the panel's amount.
 */
export const WalkInThroughReservation: Story = {
  render: () => <Screen edition="weston" initialState={atVenue('eighteen', { view: 'pos', leftPanelCollapsed: false })} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByText('Walk-in'));
    const panel = await canvas.findByRole('complementary', { name: 'Reservation · Walk-in' });
    await expect(within(panel).getByText(/W-0001/)).toBeTruthy();
    await expect(within(panel).getByRole('button', { name: 'Change walk-in tee time' })).toBeTruthy();
    const pay = within(panel).getByRole('button', { name: /^Check in & pay · / });
    const amount = pay.textContent!.replace('Check in & pay · ', '');
    await userEvent.click(pay);
    await waitFor(() => expect(canvas.getByRole('button', { name: `Pay ${amount}` })).toBeTruthy());
    await expect(canvas.getByRole('button', { name: /Edit reservation/ })).toBeTruthy();
    await expect(canvas.queryByText('+ modifier')).toBeNull();
    await expect(canvas.queryByText('Guest Details')).toBeNull();
  },
};

/**
 * A walk-in rung from a **CHECK IN rate**: Guest Rate 9 Holes with nothing on the order goes
 * to the sheet as a nine-hole walk-in at that rate, at the next open tee time on either nine.
 */
export const WalkInFromRate: Story = {
  render: () => (
    <Screen edition="weston" initialState={atVenue('eighteen', { view: 'pos', leftPanelCollapsed: false, currentCategory: 'CHECK IN' })} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByText('Guest Rate 9 Holes'));
    const panel = await canvas.findByRole('complementary', { name: 'Reservation · Walk-in' });
    await expect(within(panel).getAllByText(/9 holes/).length).toBeGreaterThan(0);
  },
};

/**
 * The walk-in's tee time, changed in the panel: **Change** lists the next open times that
 * fit the party, on the courses the round can start on. Picking one moves the walk-in (and
 * re-prices a rate-card price for the new band).
 */
export const WalkInChangeTime: Story = {
  render: WalkInThroughReservation.render,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByText('Walk-in'));
    const panel = await canvas.findByRole('complementary', { name: 'Reservation · Walk-in' });
    await userEvent.click(within(panel).getByRole('button', { name: 'Change walk-in tee time' }));
    await within(document.body).findAllByRole('menuitem');
  },
};
