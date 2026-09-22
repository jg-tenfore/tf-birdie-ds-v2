import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { money, orderTotals } from '../../../pos/logic/cart';
import { MobileStory, mobileMeta } from '../../pos-mobile/mobile-helpers';
import { adjustedParty, loadedOrder, partlyPaidNamed } from '../mobile-scenarios';

/**
 * Weston Edits / 7 · Register Golf Summary / Mobile
 *
 * On the phone's order screen, golf from a reservation becomes a **read-only summary** —
 * players, holes, fee, transport — with **Edit reservation**. The per-player modifier push
 * and the player stepper are gone from golf lines: "modifiers are used for food and
 * beverage", and the golf was settled on the reservation. F&B and retail keep their
 * steppers.
 *
 * **Edit reservation** jumps to the reservation on the **Tee Sheet** destination
 * (`nav.openIn('tee', …)`) rather than pushing it over the order: the reservation's home is
 * the tee sheet, each destination keeps its own stack, and the order stays on the Register
 * destination (badge and all). When the order is next opened, its golf lines re-sync from
 * the reservation, keeping everything else on the order.
 */
const meta = {
  title: 'Weston Edits/7 · Register Golf Summary/Mobile',
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/**
 * The order after Check in & pay, with a drink and a sleeve of balls added: the golf as a
 * summary card, the goods below with their steppers, and the total the reservation promised
 * plus the goods.
 */
export const GolfSummary: Story = {
  render: () => <MobileStory edition="weston" initialState={loadedOrder(adjustedParty(), { extras: true })} tab="register" stack={[{ name: 'order' }]} />,
};

/** **Edit reservation**: back on the Tee Sheet destination, on this booking's reservation. */
export const EditReservation: Story = {
  render: GolfSummary.render,
  play: async ({ canvasElement }) => {
    await userEvent.click(await within(canvasElement).findByRole('button', { name: 'Edit reservation' }));
  },
};

/** Paid seats stay on the summary so the whole party is visible, struck through and not charged. */
export const PaidSeats: Story = {
  render: () => <MobileStory edition="weston" initialState={loadedOrder(partlyPaidNamed())} tab="register" stack={[{ name: 'order' }]} />,
};

/**
 * For comparison, the base edition: golf lines as tappable player rows that push
 * per-player modifiers, and a player stepper on the round — the order-first flow Weston
 * flagged.
 */
export const BeforeWestonEdits: Story = {
  render: () => <MobileStory edition="base" initialState={loadedOrder(adjustedParty(), { extras: true })} tab="register" stack={[{ name: 'order' }]} />,
};

/**
 * **Retail on a tee-time order is taxed** — the phone reads the same `orderTotals` as the
 * terminal: the golf by its booking's tax line, the drink and the sleeve at the sales-tax
 * rate. The play test checks the order's Tax and Total rows against it.
 */
export const RetailIsTaxed: Story = {
  render: GolfSummary.render,
  play: async ({ canvasElement }) => {
    const t = orderTotals(loadedOrder(adjustedParty(), { extras: true }).cart ?? []);
    await expect(t.salesTax).toBeGreaterThan(0);
    const c = within(canvasElement);
    await expect((await c.findByText('Tax')).nextElementSibling?.textContent).toBe(money(t.tax));
    await expect(c.getByText('Total').nextElementSibling?.textContent).toBe(money(t.total));
  },
};
