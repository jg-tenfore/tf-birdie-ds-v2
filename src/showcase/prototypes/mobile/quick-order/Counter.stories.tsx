import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { menuItem, modifierGroup, type AppliedModifier } from '../../../../pos/data/menu';
import { SEED_TABS } from '../../../../pos/data/restaurant-seed';
import { dishLine } from '../../../../pos/logic/restaurant';
import { withEdition } from '../../../edition-decorator';
import { MobileStory, mobileMeta } from '../../../pos-mobile/mobile-helpers';
import { asServer } from '../restaurant-scenarios';

/**
 * Prototypes / Mobile / Quick Order / Counter on the handheld (V1 → V2, Nov 26)
 *
 * The counter: `QuickOrderScreen` and `CounterOrderScreen` (`src/pos/mobile/screens/restaurant/`),
 * selling off the menus onto the register's own order (`'cart'`), as the tablet's `QuickOrderView`
 * does — the same menu screen a tab uses, without seats.
 *
 * - **Opens on the counter's menu running now** (`openingMenu('counter', demoNow())` — the
 *   *19th Hole Menu* at noon); every other Buck menu is under the menu button with when it runs,
 *   and one that isn't running says so above its items.
 * - **Search looks across both menus**: a Caesar salad can be rung at the counter.
 * - **An item with a required choice opens the dish dialog; anything else is added at once**,
 *   exactly the tablet's rule. The tile counts what is already on the order.
 * - **Review order** is the tablet's rail, as a page: the dishes with their state, **Send n** to fire
 *   them as one ticket labelled *Counter*, and **Charge**, which is the phone's checkout.
 * - **While a tab is on the register being paid**, the counter waits — the store refuses counter
 *   dishes then, because they would be paid with the tab and never written onto it — and says so.
 */
const meta = {
  title: 'Prototypes/Mobile/Quick Order/Counter on the handheld',
  id: 'prototypes-mobile-quick-order-counter-on-the-handheld',
  decorators: [withEdition('current-mobile')],
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const q = (root: ParentNode, sel: string) => root.querySelector<HTMLElement>(sel);

/** A modifier as a line stores it. */
const mod = (groupId: string, name: string): AppliedModifier => {
  const g = modifierGroup(groupId)!;
  const o = g.options.find((x) => x.name === name)!;
  return { groupId, optionId: o.id, name: o.name, price: o.price ?? 0, alert: g.alert };
};

/** A counter order mid-build: a burger with its choices and a nut allergy, two cokes. Nothing sent. */
const counterOrder = () => [
  dishLine(
    menuItem('counter-bacon-bbq-burger')!,
    [mod('temperature', 'Medium well'), mod('side', 'Onion rings'), mod('allergies', 'Tree nut')],
    {
      lineId: 'L-9001',
    },
  ),
  dishLine(menuItem('counter-coca-cola')!, [], { lineId: 'L-9002', qty: 2 }),
];

/** **The counter**, on the menu running at noon, grill first. */
export const TheCounter: Story = {
  render: () => <MobileStory initialState={asServer()} tab="quick" />,
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(q(canvasElement, '[data-menu-button]')!.dataset.menuButton).toBe('nineteenth-hole-menu'));
    await expect(canvasElement.querySelectorAll('[data-menu-item][data-has-photo]').length).toBeGreaterThan(0);
  },
};

/**
 * **Ring a burger.** Temp and Sides are required; the burger can't be added until both are chosen.
 * Then a soda, which has no choices and goes straight on. Review: two lines, **Send 2**, and Send
 * locks them as a ticket the kitchen calls *Counter*.
 */
export const RingABurger: Story = {
  render: () => <MobileStory initialState={asServer()} tab="quick" />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByRole('button', { name: 'Burgers' }));
    await userEvent.click(await waitFor(() => q(canvasElement, '[data-menu-item="counter-clubhouse-cheeseburger"]')!));
    const add = await c.findByRole('button', { name: 'Add to order' });
    await expect(c.getByText('Choose temp and sides')).toBeTruthy();
    await userEvent.click(c.getByRole('radio', { name: /^Medium$/ }));
    await userEvent.click(c.getByRole('radio', { name: /^Fries/ }));
    await userEvent.click(add);
    await userEvent.click(await c.findByRole('button', { name: 'Drinks' }));
    await userEvent.click(await waitFor(() => q(canvasElement, '[data-menu-item="counter-coca-cola"]')!));
    await userEvent.click(await c.findByRole('button', { name: /^Review order · 2/ }));
    await userEvent.click(await c.findByRole('button', { name: 'Send 2' }));
    await waitFor(() => expect(canvasElement.querySelectorAll('[data-dish-state="sent"]').length).toBe(2));
    await expect(c.getByRole('button', { name: /^Charge \$/ })).toBeEnabled();
  },
};

/**
 * **Review order** — the tablet's rail, as a page: each dish with its choices and its allergy flag,
 * not yet sent; **Send 2** and **Charge**.
 */
export const ReviewTheOrder: Story = {
  render: () => <MobileStory initialState={asServer({ cart: counterOrder() })} tab="quick" stack={[{ name: 'counterOrder' }]} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(await c.findByRole('button', { name: 'Send 2' })).toBeEnabled();
    await expect(c.getByText('Allergy · Tree nut')).toBeTruthy();
  },
};

/** **Search both menus.** "caesar" finds the 19th Hole's salad from the counter. */
export const SearchBothMenus: Story = {
  render: () => <MobileStory initialState={asServer()} tab="quick" />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByRole('button', { name: 'Search the menus' }));
    await userEvent.type(await c.findByLabelText('Search both menus'), 'caesar');
    await waitFor(() => expect(q(canvasElement, '[data-menu-item="nineteenth-caesar-salad"]')).not.toBeNull());
  },
};

/**
 * **A menu that isn't running.** Dinner starts at 5:00 PM: chosen from the menus sheet at noon, it
 * says so above its items, which still ring at their usual price.
 */
export const AMenuThatIsNotRunning: Story = {
  render: () => <MobileStory initialState={asServer()} tab="quick" />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await waitFor(() => q(canvasElement, '[data-menu-button]')!));
    await userEvent.click(await waitFor(() => q(canvasElement, '[data-menu-option="dinner"]')!));
    await waitFor(() => expect(q(canvasElement, '[data-menu-off-hours]')).not.toBeNull());
    await expect(c.getByText(/Dinner isn’t running now/)).toBeTruthy();
  },
};

/**
 * **The counter waits while a tab is being paid.** Farnsworth's tab is on the register: the menu
 * says why it can't sell, rather than letting a tap do nothing.
 */
export const WhileATabIsBeingPaid: Story = {
  render: () => {
    const tab = SEED_TABS.find((t) => t.id === 'T-1003')!;
    return <MobileStory initialState={asServer({ cart: tab.lines, payingTabId: tab.id })} tab="quick" />;
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(await c.findByText(/is on the register, being paid/)).toBeTruthy();
  },
};
