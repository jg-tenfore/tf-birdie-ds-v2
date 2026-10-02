import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { venueBookings } from '../../../../pos/data/venues';
import { Screen, atVenue } from '../../../pos/screen-helpers';

/**
 * V1 → V2 Migration / 100226 / Built into the app / Tablet
 *
 * **What Weston approved on Oct 2, now in the V1 → V2 prototype itself** — not mocks. Each story
 * opens the live screen where the change is and checks it.
 *
 * - **2 · Status chip** — the five-stop round rail is one chip on the player's name line.
 * - **3 · Membership** — membership and customer type beside the name; the first membership is cut
 *   at 24 characters, then **+N** for the rest (tap for the full list). Full names, never cut.
 * - **4 · Contact once** — the booker's phone and email in the header.
 * - **5 · Financial** — a paid player's order number, **Print receipt** and **See order**.
 * - **6 · Empty rail** — tucked away while the order is empty; opens when the first line arrives.
 * - **7 · Menu by role** — the menu shows what the signed-in role uses.
 * - **12 · Course header** — the ⋮ menu opens under its own button; ⓘ is a callout.
 */
const meta = {
  title: 'V1 → V2 Migration/100226/Built into the app/Tablet',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const MAY22 = new Date(2026, 4, 22);
const panel = (id: string, tab: 'players' | 'financial' = 'players') =>
  atVenue('eighteen', { currentDate: MAY22, reservationPanel: { bookingId: id, tab, playerIndex: 0 } });

/** 2 + 3 + 4 · King, D.'s foursome: a status chip per player, membership chips, the group contact. */
export const PlayersAndContact: Story = {
  render: () => <Screen edition="v1v2" initialState={panel('p15_p1')} />,
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelectorAll('[data-player-row] [data-round-status]').length).toBe(4));
    await expect(canvasElement.querySelector('[data-group-contact]')!.textContent).toMatch(/@/);
    // Moving a player along from the chip.
    const chip = canvasElement.querySelector<HTMLElement>('[data-player-row="0"] [data-round-status]')!;
    await userEvent.click(chip);
    await userEvent.click(await within(canvasElement.ownerDocument.body).findByRole('menuitem', { name: 'Checked In' }));
    await waitFor(() => expect(canvasElement.querySelector('[data-player-row="0"] [data-round-status]')!.getAttribute('data-round-status')).toBe('0'));
  },
};

/** 3 · Three memberships: the first, cut at 24 characters, then +N; tap it for the full list. */
export const LongAndSeveralMemberships: Story = {
  render: () => <Screen edition="v1v2" initialState={panel('p42_p1')} />,
  play: async ({ canvasElement }) => {
    const chips = await waitFor(() => canvasElement.querySelector<HTMLElement>('[data-player-row="0"] [data-membership-chips]')!);
    const more = chips.querySelector<HTMLElement>('[data-membership-more]')!;
    await expect(Number(more.getAttribute('data-membership-more'))).toBeGreaterThanOrEqual(2);
    await userEvent.click(more);
    const list = await waitFor(() => canvasElement.querySelector<HTMLElement>('[data-membership-list]')!);
    await expect(list.textContent).toContain('12-Month Member-only Simulator Membership');
    await expect(list.textContent).toContain('Family Fitness Membership (3 Persons)');
  },
};

/** 5 · Harrison's four are paid: each shows the order number, Print receipt and See order. */
export const FinancialOrderPerPlayer: Story = {
  render: () => <Screen edition="v1v2" initialState={panel(venueBookings('eighteen').find((b) => b.date === '2026-05-22' && b.name.startsWith('Harrison'))!.id, 'financial')} />,
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelectorAll('[data-seat-order]').length).toBe(4));
    await userEvent.click(within(canvasElement.querySelector<HTMLElement>('[data-seat-order="0"]')!).getByRole('button', { name: /See order/ }));
    await waitFor(() => expect(canvasElement.querySelector('[data-order-lookup]')).not.toBeNull());
    await expect(canvasElement.querySelector('[data-back-to-reservation]')).not.toBeNull();
  },
};

/** 6 · The empty register keeps the rail tucked away; the first item opens it. */
export const RailFollowsTheOrder: Story = {
  render: () => <Screen edition="v1v2" initialState={atVenue('eighteen', { view: 'pos', leftPanelCollapsed: false, cart: [], currentCategory: 'GOLF BALLS' })} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await waitFor(() => expect(c.getByRole('button', { name: 'Expand the order rail' })).toBeTruthy());
    await userEvent.click((await c.findAllByText('Titleist Pro V1 Box')).at(-1)!);
    await waitFor(() => expect(c.getByRole('button', { name: /^Pay \$/ })).toBeTruthy());
  },
};

/** 7 · Signed in as Marcus, a bartender: the Restaurant and the shared tools, no Pro Shop group. */
export const MenuForABartender: Story = {
  render: () => <Screen edition="v1v2" initialState={atVenue('eighteen', { view: 'tee', navOpen: true, operatorId: 's-4' })} />,
  play: async ({ canvasElement }) => {
    const nav = await waitFor(() => canvasElement.querySelector<HTMLElement>('[data-nav-overlay]')!);
    await expect(nav.textContent).toContain('Bartender');
    await expect(within(nav).queryByText('Tee Sheet')).toBeNull();
    await expect(within(nav).getByText('Tabs')).toBeTruthy();
  },
};

/** 12 · ⓘ opens the course at a glance under the button; ⋮ opens under its own button. */
export const CourseHeader: Story = {
  render: () => <Screen edition="v1v2" initialState={atVenue('eighteen', { currentDate: MAY22 })} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByRole('button', { name: 'Championship · Front 9 info' }));
    const callout = await waitFor(() => canvasElement.querySelector<HTMLElement>('[data-course-info]')!);
    await expect(callout.querySelector('[data-course-facts]')!.textContent).toMatch(/golfers/);
    await expect(callout.querySelector('[data-course-rates]')).not.toBeNull();
    // Its scrim closes it.
    await userEvent.click(callout.previousElementSibling as HTMLElement);
    await waitFor(() => expect(canvasElement.querySelector('[data-course-info]')).toBeNull());
    const menuBtn = canvasElement.querySelector<HTMLElement>('[data-menu-popover] > button')!;
    await userEvent.click(menuBtn);
    const menu = menuBtn.parentElement!.lastElementChild as HTMLElement;
    await expect(Math.abs(menu.getBoundingClientRect().right - menuBtn.getBoundingClientRect().right)).toBeLessThan(3);
  },
};
