import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { CURRENT_EDITION } from '../../../../pos/edition';
import { withEdition } from '../../../edition-decorator';
import type { PosState } from '../../../../pos/state/pos-store';
import { Screen, atVenue } from '../../../pos/screen-helpers';

/**
 * Tabs — **Buck's menus, modifier groups and discount types** at the table (Nov 26).
 *
 * The dish dialog's modifier groups use Buck's names and button colours where Buck has the group —
 * *Temp*, *Sides*, *Cheeses*, *Sandwich Toppings*, *Side Sauces*, *Allergies* — with Birdie's
 * single-choice / set / required rules on top.
 *
 * A table's tab opens on the dining room's running menu — *Lunch* at noon, *Dinner* after five — with
 * the counter's 19th Hole Menu one tap away. A plate's **Adjust › Discount** offers Buck's discount
 * types (Buck › Products › Discount Types) instead of bare percentages, and only the ones that apply
 * to that line: a beer can take *Shift Drink*, a steak *Senior*. The name lands on the line, so a
 * $0 plate always says why. A type Buck flags for approval needs a manager.
 */
const meta = {
  title: 'Prototypes/Tablet/Tabs/Menus, modifiers and discounts',
  parameters: { layout: 'fullscreen' },
  decorators: [withEdition('current-tablet')],
} satisfies Meta;

export default meta;
type Story = StoryObj;

const onTab = (tabId: string, extra: Partial<PosState> = {}) =>
  atVenue('eighteen', { view: 'tabs', leftPanelCollapsed: true, activeTabId: tabId, ...extra });
const q = (root: ParentNode, sel: string) => root.querySelector<HTMLElement>(sel);
const lineWith = (root: ParentNode, text: string) => [...root.querySelectorAll<HTMLElement>('[data-dish-line]')].find((x) => x.textContent?.includes(text));

/** **A table opens on Lunch** at noon, with the 19th Hole Menu beside it. */
export const ATableOpensOnLunch: Story = {
  render: () => <Screen edition={CURRENT_EDITION.tablet} initialState={onTab('T-1004')} />,
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(q(canvasElement, '[data-menu="lunch"]')).toHaveAttribute('aria-pressed', 'true'));
    await expect(q(canvasElement, '[data-menu="nineteenth-hole-menu"]')).not.toBeNull();
    await expect(q(canvasElement, '[data-menu-category="Chops & Seafood"]')).toBeNull();
  },
};

/**
 * **A beer takes Shift Drink; the line says so.** Table 1's Miller Lites offer the alcohol types —
 * never Senior or Food Only — and Shift Drink comps them with its name on the line.
 */
export const ABeerTakesShiftDrink: Story = {
  render: () => <Screen edition={CURRENT_EDITION.tablet} initialState={onTab('T-1001')} />,
  play: async ({ canvasElement }) => {
    const beers = await waitFor(() => {
      const el = lineWith(canvasElement, 'Miller Lite');
      if (!el) throw new Error('Table 1 not drawn yet');
      return el;
    });
    await userEvent.click(within(beers).getByRole('button', { name: 'Adjust Miller Lite' }));
    const adjust = within(await waitFor(() => q(beers, '[data-dish-adjust]')!));
    await expect(adjust.queryByRole('button', { name: /Senior/ })).toBeNull();
    await expect(adjust.queryByRole('button', { name: /Food Only/ })).toBeNull();
    await userEvent.click(adjust.getByRole('button', { name: 'Shift Drink · 100%' }));
    await waitFor(() => expect(q(beers, '[data-dish-discount]')!.textContent).toBe('Shift Drink · comped'));
    await expect(beers.textContent).toContain('$0.00');
  },
};

/**
 * **Approval types need a manager.** Signed in as a server, Manager's Discount and Military show a
 * lock; tapping one says why and changes nothing.
 */
export const ApprovalNeedsAManager: Story = {
  render: () => <Screen edition={CURRENT_EDITION.tablet} initialState={onTab('T-1001', { operatorId: 's-2' })} />,
  play: async ({ canvasElement }) => {
    const beers = await waitFor(() => {
      const el = lineWith(canvasElement, 'Miller Lite');
      if (!el) throw new Error('Table 1 not drawn yet');
      return el;
    });
    await userEvent.click(within(beers).getByRole('button', { name: 'Adjust Miller Lite' }));
    const adjust = within(await waitFor(() => q(beers, '[data-dish-adjust]')!));
    const locked = adjust.getByRole('button', { name: "Manager's Discount · 20%, needs a manager" });
    await userEvent.click(locked);
    await within(canvasElement.ownerDocument.body).findByText("Manager's Discount needs a manager — sign in as one to apply it");
    await expect(q(beers, '[data-dish-discount]')).toBeNull();
  },
};

/**
 * **Modifier groups by Buck's names.** A cheeseburger asks for its *Temp* and *Sides* (required),
 * offers Buck's *Cheeses* in Buck's red mark, and Sides carries Buck's Apple slices.
 */
export const BucksModifierGroups: Story = {
  render: () => (
    <Screen
      edition={CURRENT_EDITION.tablet}
      initialState={onTab('T-1004', { modal: { kind: 'dish', target: { tabId: 'T-1004' }, menuItemId: 'counter-clubhouse-cheeseburger', seat: 1 } })}
    />
  ),
  play: async ({ canvasElement }) => {
    const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog');
    const d = within(dialog);
    await expect(d.getByRole('radiogroup', { name: 'Temp' })).toBeTruthy();
    await expect(d.getByText('Choose temp and sides')).toBeTruthy();
    await expect(q(dialog, '[data-modifier-group="cheeses"] [data-group-color="error"]')).not.toBeNull();
    await expect(within(d.getByRole('radiogroup', { name: 'Sides' })).getByRole('radio', { name: /Apple slices/ })).toBeTruthy();
  },
};
