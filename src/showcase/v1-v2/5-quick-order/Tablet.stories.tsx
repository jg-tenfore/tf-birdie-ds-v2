import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';
import { menuItem } from '../../../pos/data/menu';
import { dishLine } from '../../../pos/logic/restaurant';
import type { PosState } from '../../../pos/state/pos-store';
import { Screen, atVenue } from '../../pos/screen-helpers';
import { createInitialState, reducer } from '../../../pos/state/pos-store';

/**
 * V1 → V2 Migration / 5 · Quick Order / Tablet
 *
 * **The counter: food and drink rung onto the register's own order, and sent to the kitchen.**
 *
 * ## What v1 did
 *
 * `tf-birdie-ds-v1/app/src/screens/quick-order.tsx`, from `references/072926/5-quickorder/`. Menu
 * sets (All · Dinner · 19th Hole Menu) over photographed category tiles. Tapping a category
 * **replaced the whole browsing surface** with a tall card naming it over a list of its products;
 * BACK, greyed out until then, was the only way out. Options had no place at all — a burger rang
 * up with no temperature — and nothing went to the kitchen.
 *
 * ## What was wrong with it
 *
 * - **Where you were kept disappearing.** Every category was a new screen, so moving from Burgers
 *   to Drinks was BACK then a tile, and the menu sets vanished whenever you were in one.
 * - **No kitchen step**, and no way to say medium-well, no onion or a gluten allergy.
 * - The photography was not ours to publish (Del Frisco's, via Uber Eats).
 *
 * ## What this does
 *
 * - **The order rail stays on the left** — it *is* the order, and its Pay is how the counter is
 *   paid. Dish lines on it show their modifiers, allergies in red, and whether they have gone.
 * - **The same menu browser as Tabs**: menu, categories and items stay on screen together; a
 *   category changes only the items. Tiles are text.
 * - **The same dish dialog as Tabs**, without the seat: single choices are radios, sets are
 *   checkboxes, required groups block, allergies are red.
 * - **Send to kitchen** in the toolbar fires what is unsent as one "Counter" ticket. What went is
 *   locked on the rail: Void, behind a confirm, instead of Remove.
 */
const meta = {
  title: 'V1 → V2 Migration/5 · Quick Order/Tablet',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const at = (extra: Partial<PosState> = {}) => atVenue('eighteen', { view: 'quickorder', leftPanelCollapsed: false, ...extra });

const q = <T extends HTMLElement = HTMLElement>(root: ParentNode, sel: string) => root.querySelector<T>(sel);
const qa = (root: ParentNode, sel: string) => [...root.querySelectorAll<HTMLElement>(sel)];

/** A counter order with two dishes not yet sent: a chili dog (no onion) and a Snickers. */
const counterOrder = () => [
  dishLine(menuItem('counter-chili-dog')!, [{ groupId: 'hold', optionId: 'hold:no-onion', name: 'No onion', price: 0 }], { lineId: 'L-9001' }),
  dishLine(menuItem('counter-snickers')!, [], { lineId: 'L-9002' }),
];

/**
 * **Selling onto the rail.** A Coke from Drinks lands on the order at once — it has no options —
 * and the rail says it has not gone to the kitchen. The menu and its categories are still there;
 * nothing was replaced to get to it.
 */
export const SellingOntoTheRail: Story = {
  render: () => <Screen edition="v1v2" initialState={at()} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(q(canvasElement, '[data-restaurant-view="QuickOrderView"]')).not.toBeNull();
    await userEvent.click(q(canvasElement, '[data-menu-category="Drinks"]')!);
    await userEvent.click(q(canvasElement, '[data-menu-item="counter-coca-cola"]')!);
    const line = await waitFor(() => {
      const l = q(canvasElement, '[data-rail-dish-line]');
      if (!l) throw new Error('nothing on the rail');
      return l;
    });
    await expect(within(line).getByText('Coca-Cola')).toBeTruthy();
    await expect(within(line).getByText('Not sent')).toBeTruthy();
    await expect(q(canvasElement, '[data-menu-category="Drinks"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(q(canvasElement, '[data-menu-switch="counter"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(canvas.getByRole('button', { name: /^Pay \$3\.\d\d$/ })).toBeEnabled();
  },
};

/**
 * **A dish with choices, at the counter.** A Turn Burger opens the dish dialog — no seat here, the
 * counter has none — and needs a temperature and a side before it can go on. Onion rings add $2;
 * a gluten allergy goes on the rail as a red flag.
 */
export const ADishWithChoices: Story = {
  render: () => <Screen edition="v1v2" initialState={at()} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(q(canvasElement, '[data-menu-category="Burgers"]')!);
    await userEvent.click(q(canvasElement, '[data-menu-item="counter-turn-burger"]')!);
    const dialogEl = await screen.findByRole('dialog');
    const dialog = within(dialogEl);
    await expect(dialog.queryByRole('group', { name: 'Seat' })).toBeNull();
    const add = dialog.getByRole('button', { name: 'Add to order' });
    await expect(add).toBeDisabled();
    await userEvent.click(dialog.getByRole('radio', { name: 'Medium well' }));
    await userEvent.click(dialog.getByRole('radio', { name: /Onion rings/ }));
    await userEvent.click(dialog.getByRole('checkbox', { name: 'Gluten' }));
    await expect(dialogEl.querySelector('[data-dish-price]')!.textContent).toBe('$14.00');
    await userEvent.click(add);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const line = q(canvasElement, '[data-rail-dish-line]')!;
    await expect(q(line, '[data-allergy="Gluten"]')).not.toBeNull();
    await expect(q(line, '[data-dish-modifiers]')!.textContent).toBe('Medium well · Onion rings +$2.00');
  },
};

/**
 * **Sending from the counter.** Two dishes are unsent, and the toolbar says so. Send fires them;
 * the rail marks both sent, and they can no longer be removed — only voided, behind a confirm.
 */
export const SendingFromTheCounter: Story = {
  render: () => <Screen edition="v1v2" initialState={at({ cart: counterOrder() })} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Remove Chili Dog' })).toBeTruthy();
    await userEvent.click(canvas.getByRole('button', { name: 'Send 2 to kitchen' }));
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Nothing to send' })).toBeDisabled());
    await expect(qa(canvasElement, '[data-rail-dish-line] [data-dish-line]').map((l) => l.getAttribute('data-dish-state'))).toEqual([
      'sent',
      'sent',
    ]);
    await expect(canvas.queryByRole('button', { name: 'Remove Chili Dog' })).toBeNull();
    await expect(canvas.queryByRole('button', { name: 'Edit Chili Dog' })).toBeNull();

    await userEvent.click(canvas.getByRole('button', { name: 'Void Chili Dog' }));
    const dialog = within(await screen.findByRole('dialog'));
    await userEvent.click(dialog.getByRole('button', { name: 'Void dish' }));
    await waitFor(() => expect(q(canvasElement, '[data-dish-line="L-9001"]')!.getAttribute('data-dish-state')).toBe('voided'));
    // The Snickers is all that is left to charge.
    await expect(canvas.getByRole('button', { name: /^Pay \$3\.\d\d$/ })).toBeTruthy();
  },
};

/**
 * **Unsent at the counter changes freely.** Remove is one tap; nothing was sent, so there is
 * nothing to confirm. Send then has one dish fewer to fire.
 */
export const RemovingBeforeSending: Story = {
  render: () => <Screen edition="v1v2" initialState={at({ cart: counterOrder() })} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Remove Snickers' }));
    await waitFor(() => expect(qa(canvasElement, '[data-rail-dish-line]')).toHaveLength(1));
    await expect(screen.queryByRole('dialog')).toBeNull();
    await expect(canvas.getByRole('button', { name: 'Send 1 to kitchen' })).toBeEnabled();
  },
};

/**
 * **The dining-room menu at the counter.** Any order can sell from either menu: creamed spinach to
 * go, off the 19th Hole menu, onto the counter order. Its only options are optional (allergies), so
 * it goes straight on — the dialog opens only for a choice the kitchen cannot cook without.
 */
export const TheOtherMenu: Story = {
  render: () => <Screen edition="v1v2" initialState={at()} />,
  play: async ({ canvasElement }) => {
    await expect(q(canvasElement, '[data-menu-category="Grill"]')).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(q(canvasElement, '[data-menu-switch="nineteenth"]')!);
    await expect(q(canvasElement, '[data-menu-category="Starters"]')).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(q(canvasElement, '[data-menu-category="Sides"]')!);
    await userEvent.click(q(canvasElement, '[data-menu-item="nineteenth-creamed-spinach"]')!);
    // Nothing required, so no dialog: it is on the order straight away.
    await waitFor(() => expect(within(q(canvasElement, '[data-rail-dish-line]')!).getByText('Creamed Spinach')).toBeTruthy());
    await expect(screen.queryByRole('dialog')).toBeNull();
  },
};

/**
 * **The counter waits while a tab is being paid.** Table 1's tab is on the register. Its lines there
 * are copies of the tab's, so a counter dish added now would be charged to the tab without ever being
 * written onto it, and would reach the kitchen labelled "Counter". The store refuses it; the screen
 * says so, instead of letting a tap on a burger do nothing.
 */
export const WaitsWhileATabIsBeingPaid: Story = {
  render: () => {
    const paying = reducer(createInitialState(atVenue('eighteen', { view: 'quickorder', leftPanelCollapsed: false })), {
      type: 'payTab',
      tabId: 'T-1001',
    });
    return <Screen edition="v1v2" initialState={{ ...paying, view: 'quickorder' }} />;
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-quick-order-busy]')).not.toBeNull();
    await expect(canvasElement.querySelector('[data-quick-order-busy]')!.textContent).toContain('Table 1');
  },
};
