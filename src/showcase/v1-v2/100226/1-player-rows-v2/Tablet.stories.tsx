import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';
import { venueBookings } from '../../../../pos/data/venues';
import { Screen } from '../../../pos/screen-helpers';
import { king, panelOn } from '../../100126/scenarios';

/**
 * V1 → V2 Migration / 100226 / 1 · Player rows v2 — **built** (approved Oct 3)
 *
 * **Weston, on 100126's compact rows:** *"this solves the problem, but I feel like we're losing a lot
 * of data."* The counter conversation is *"Walking or riding? 9 or 18? You're paying for yourself?
 * Yes."* — then **Add, Add, Pay**. *"This is going to be the most used thing in all of our apps… it
 * just has to be fast."*
 *
 * What is built (V1 → V2 edition only; see `PlayerRowsV2.tsx`):
 *
 * - **Every player open, on two lines** — no expand-all, no collapse-all. Line 1 is who: the full
 *   name (never cut), membership and customer type (+N for the rest), where they are in the round,
 *   paid or not. Line 2 is the sale: 9 / 18, Walk / Ride / Push, the rate and the transport with what
 *   each costs, the seat's total, **Add** and **⋯**.
 * - **Add** puts that player straight onto the register's order. The rail opens on the left and
 *   stays live beside the panel (the scrim starts at its edge), and the row reads *On order ✓*.
 * - **The footer totals what is on the order**, before tax — tax and fees are the order's job — and
 *   **Pay** goes straight to checkout with exactly those players. With nobody added yet it totals
 *   the party and offers **Check in & pay all**.
 * - **⋯ is only for changing something**: Change golfer, the tee fee, a cart key, No-show, Take off
 *   the order, Remove, and the rate editor in place.
 * - Everything is touch-sized, and King, D.'s whole foursome fits without scrolling.
 *
 * These stories render the live app.
 */
const meta = {
  title: 'V1 → V2 Migration/100226/1 · Player rows v2',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const panelOf = (el: HTMLElement) =>
  waitFor(() => {
    const p = el.querySelector<HTMLElement>('[data-reservation-panel]');
    if (!p?.querySelector('[data-player-rows-v2]')) throw new Error('no panel yet');
    return p;
  });

/** King, D.'s foursome on May 22, as it opens. */
export const Original: Story = {
  name: 'King, D.’s foursome',
  render: () => <Screen edition="v1v2" initialState={panelOn(king())} />,
  play: async ({ canvasElement }) => {
    const panel = await panelOf(canvasElement);
    const rows = panel.querySelectorAll<HTMLElement>('[data-player-row]');
    await expect(rows.length).toBe(4);
    // Full names, rates and transport on every row without opening anything.
    const names = [...panel.querySelectorAll('[data-player-name]')].map((n) => n.textContent);
    await expect(names).toEqual(['King, D.', 'Guest 2', 'Brennan, K.', 'Guest 4']);
    await expect(within(panel).getAllByText('Riding Cart').length).toBe(3);
    // All four fit: the 4th row ends above the footer.
    const footerTop = panel.querySelector<HTMLElement>('[data-order-summary]')!.getBoundingClientRect().top;
    await expect(rows[3].getBoundingClientRect().bottom).toBeLessThanOrEqual(footerTop);
    // Every target on a row is touch-sized.
    const scale = panel.getBoundingClientRect().height / panel.offsetHeight;
    for (const btn of rows[2].querySelectorAll<HTMLElement>('[aria-pressed], [aria-label^="Add "], [aria-label^="More for"]')) {
      await expect(btn.getBoundingClientRect().height / scale).toBeGreaterThanOrEqual(36);
    }
    await expect(panel.querySelector('[data-order-summary]')!.textContent).toMatch(/^Nothing on the order yet/);
    await expect(within(panel).getByRole('button', { name: 'Check in & pay all' })).toBeTruthy();
  },
};

/** Add, Add, Pay: two players onto the rail beside the panel, then straight to checkout. */
export const AddAddPay: Story = {
  name: 'Add, Add, Pay',
  render: () => <Screen edition="v1v2" initialState={panelOn(king())} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const panel = await panelOf(canvasElement);
    const p = within(panel);
    await expect(canvasElement.querySelector('[aria-label="Clear order"]')).toBeNull();
    await userEvent.click(p.getByRole('button', { name: 'Add King, D.' }));
    await userEvent.click(p.getByRole('button', { name: 'Add Guest 2' }));
    await expect(p.getByRole('button', { name: 'King, D. is on the order' })).toBeTruthy();
    await expect(p.getByRole('button', { name: 'Guest 2 is on the order' })).toBeTruthy();
    await expect(panel.querySelector('[data-order-summary]')!.textContent).toMatch(/^2 on the order · tax and fees are on the order · 2 still to add/);
    // The rail opened beside the panel, outside the scrim, holding the same subtotal.
    await waitFor(() => expect(canvasElement.querySelector('[aria-label="Clear order"]')).not.toBeNull());
    const scrim = canvasElement.querySelector<HTMLElement>('[data-reservation-scrim]')!;
    await expect(scrim.getBoundingClientRect().left).toBeGreaterThan(canvasElement.querySelector<HTMLElement>('[aria-label="Clear order"]')!.getBoundingClientRect().left);
    const beforeTax = panel.querySelector('[data-before-tax]')!.textContent!.match(/\$[\d,.]+/)![0];
    await expect(c.getByText('Subtotal').parentElement!.textContent).toContain(beforeTax);
    // Pay: checkout, with just the two of them.
    await userEvent.click(p.getByRole('button', { name: 'Pay' }));
    // Checkout is a dialog over the register, portalled to the body.
    const dialog = await screen.findByRole('dialog', {}, { timeout: 5000 });
    await expect(within(dialog).getByText('King, D. · Riding Cart')).toBeTruthy();
    await expect(within(dialog).getByText('Guest 2 · Riding Cart')).toBeTruthy();
    await expect(within(dialog).queryByText(/Brennan, K\./)).toBeNull();
  },
};

/** ⋯ is only for changes — and it takes a player back off the order; the empty rail tucks away. */
export const ChangesUnderTheDots: Story = {
  name: '⋯ for changes',
  render: () => <Screen edition="v1v2" initialState={panelOn(king())} />,
  play: async ({ canvasElement }) => {
    const panel = await panelOf(canvasElement);
    const p = within(panel);
    await userEvent.click(p.getByRole('button', { name: 'Add Brennan, K.' }));
    await waitFor(() => expect(canvasElement.querySelector('[aria-label="Clear order"]')).not.toBeNull());
    await userEvent.click(p.getByRole('button', { name: 'More for Brennan, K.' }));
    const more = panel.querySelector<HTMLElement>('[data-row-more="2"]')!;
    for (const name of ['Change golfer', 'No-show', 'Take off the order', 'Remove']) await expect(within(more).getByRole('button', { name: new RegExp(name) })).toBeTruthy();
    await expect(within(more).getByLabelText('Brennan, K. tee fee')).toBeTruthy();
    await userEvent.click(within(more).getByRole('button', { name: /Take off the order/ }));
    await expect(panel.querySelectorAll('[data-on-order]').length).toBe(0);
    await waitFor(() => expect(canvasElement.querySelector('[aria-label="Clear order"]')).toBeNull());
    await expect(panel.querySelector('[data-order-summary]')!.textContent).toMatch(/^Nothing on the order yet/);
  },
};

/**
 * Strand, E. — May 22, 12:36 PM — holds three memberships and a customer type: the first is cut at
 * 24 characters, **+N** stands for the rest, and a tap lists them all. The name itself is never cut.
 */
export const SeveralMemberships: Story = {
  name: 'Several memberships',
  render: () => <Screen edition="v1v2" initialState={panelOn(venueBookings('eighteen').find((x) => x.id === 'p42_p1')!)} />,
  play: async ({ canvasElement }) => {
    const panel = await panelOf(canvasElement);
    const row = panel.querySelector<HTMLElement>('[data-player-row="0"]')!;
    const more = row.querySelector<HTMLElement>('[data-membership-more]')!;
    await userEvent.click(more);
    const list = row.querySelector<HTMLElement>('[data-membership-list]')!;
    await expect(within(list).getByText('Couple Premium Membership')).toBeTruthy();
    await expect(within(list).getByText('12-Month Member-only Simulator Membership')).toBeTruthy();
    const name = row.querySelector<HTMLElement>('[data-player-name]')!;
    await expect(name.scrollWidth).toBeLessThanOrEqual(name.clientWidth);
  },
};
