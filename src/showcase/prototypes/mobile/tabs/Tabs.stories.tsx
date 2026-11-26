import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { withEdition } from '../../../edition-decorator';
import { MobileStory, mobileMeta } from '../../../pos-mobile/mobile-helpers';
import { asServer } from '../restaurant-scenarios';

/**
 * Prototypes / Mobile / Tabs / Tabs on the handheld (V1 → V2, Nov 26)
 *
 * A server's tabs, from the list to the payment: `TabsScreen`, `TabScreen`, `MenuScreen` and
 * `DishScreen` in `src/pos/mobile/screens/restaurant/`, on the store and rules the tablet's Tabs
 * use (`state/restaurant.ts`, `logic/restaurant.ts`, `logic/dish-choice.ts`). Nothing about a tab
 * is decided twice: a dish rung here is the dish the tablet shows, and the other way round.
 *
 * ## The pieces
 *
 * | Screen | What it is | The tablet's |
 * |---|---|---|
 * | **Tabs** | open tabs, the one that needs someone first: *Check requested*, then *n not sent*, then *Nothing ordered*; **Mine** narrows to the signed-in server | `TabList` (a sortable table) |
 * | **The tab** | seat bands — every seat, empty ones too, and *Shared* — each line a button; **Send n** and **Pay** pinned; ⋮ for guests, server, check requested, move | `TabEditor`, check half |
 * | **The menu** | Buck's menu running now (`menu-schedule.ts`), others under the menu button; categories in one row; **search across both menus**; 1:1 photos, two to a row; the **seat row** so a whole table is taken in one pass | `MenuBrowser`, the editor's other half |
 * | **The dish** | every group on one page: **Choose one** (radio) or **Choose any** (checkbox), *Required* until answered, allergies in red; quantity, seat, note, live price | `DishDialog` |
 * | **A line's sheet** | not sent: **Edit**, **Remove**; sent: locked, **Void** behind a confirm; either: **Move**, **Split**, **Discount** (Buck's types for the line's category; approval types locked to a manager) | `DishLine` + `DishAdjust` |
 *
 * **Pay** loads the tab onto the register (`payTab`) and pushes the phone's own checkout, tip and
 * reader. Approval closes the tab and frees its table; the receipt's **Back to tabs** returns to
 * the list. Backing out of checkout instead puts the tab back untouched.
 *
 * ## Where the handheld differs, and why
 *
 * - **Check and menu take turns.** At 360dp they can't sit side by side; *Add items* pushes the
 *   menu, and the menu's *Review tab* comes back. The seat row on the menu is what keeps a table's
 *   order to one trip.
 * - **Actions live in a sheet, not on the line.** A 360dp line has no room for three 48dp buttons
 *   beside its price; the whole line is the button instead.
 * - **The tip is kept apart.** The phone's card flow already asked for a tip; it now records it
 *   apart from the sale, as the tablet does, so Orders & Tips can show and adjust it.
 */
const meta = {
  title: 'Prototypes/Mobile/Tabs/Tabs on the handheld',
  id: 'prototypes-mobile-tabs-tabs-on-the-handheld',
  decorators: [withEdition('current-mobile')],
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const q = (root: ParentNode, sel: string) => root.querySelector<HTMLElement>(sel);

/** **Every open tab**, Farnsworth's check request first, then the tables with food not sent. */
export const OpenTabs: Story = {
  render: () => <MobileStory initialState={asServer()} tab="tabs" />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const rows = await waitFor(() => {
      const r = [...canvasElement.querySelectorAll<HTMLElement>('[data-tab-row]')].map((e) => e.dataset.tabRow);
      expect(r.length).toBe(6);
      return r;
    });
    await expect(rows[0]).toBe('T-1003');
    await expect(c.getByText('Check requested')).toBeTruthy();
  },
};

/** **Mine**: Jordan's two tables, nothing else. */
export const JustMine: Story = {
  render: () => <MobileStory initialState={asServer()} tab="tabs" />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByRole('button', { name: /^Mine/ }));
    await waitFor(() => expect(canvasElement.querySelectorAll('[data-tab-row]').length).toBe(2));
  },
};

/**
 * **A tab, seat by seat.** Table 5 is half sent: the filet and the calamari went at 11:51 (locked),
 * the butter cake and a glass of cabernet have not — amber, and counted on **Send 2**.
 */
export const ATabBySeat: Story = {
  render: () => <MobileStory initialState={asServer()} tab="tabs" stack={[{ name: 'tab', tabId: 'T-1002' }]} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(await c.findByRole('button', { name: 'Send 2' })).toBeEnabled();
    await expect(canvasElement.querySelectorAll('[data-dish-state="sent"]').length).toBe(2);
    await expect(canvasElement.querySelectorAll('[data-dish-state="unsent"]').length).toBe(2);
    await expect(c.getByText('Allergy · Shellfish')).toBeTruthy();
  },
};

/** **The menu, open on a seat** — the dining room's menu running at noon, photographed. */
export const TheMenu: Story = {
  render: () => (
    <MobileStory
      initialState={asServer()}
      tab="tabs"
      stack={[
        { name: 'tab', tabId: 'T-1004' },
        { name: 'menu', tabId: 'T-1004', seat: 1 },
      ]}
    />
  ),
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelectorAll('[data-menu-item][data-has-photo]').length).toBeGreaterThan(0));
    await expect(q(canvasElement, '[data-menu-button]')!.dataset.menuButton).toBe('lunch');
  },
};

/**
 * **The dish dialog.** A filet for seat 1: *Temp* is **Choose one** and required, *Enhancements*
 * and *Allergies* are **Choose any**, the allergies edged in red; the add button waits, and says
 * what it is waiting for.
 */
export const TheDishDialog: Story = {
  render: () => (
    <MobileStory
      initialState={asServer()}
      tab="tabs"
      stack={[
        { name: 'tab', tabId: 'T-1004' },
        { name: 'menu', tabId: 'T-1004', seat: 1 },
        { name: 'dish', target: { tabId: 'T-1004' }, menuItemId: 'nineteenth-filet-mignon-8oz', seat: 1 },
      ]}
    />
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(await c.findByRole('button', { name: 'Add to Seat 1' })).toBeDisabled();
    await expect(q(canvasElement, '[data-modifier-group="allergies"]')!.dataset.alert).toBe('true');
  },
};

/**
 * **Add an item with modifiers.** P2 has just sat. On seat 1, a filet: it can't be added until its
 * **Temp** is chosen — *Choose one*, required — and two **Enhancements** go on as *Choose any*. The
 * line lands on seat 1 with its choices, not sent.
 */
export const AddAnItemWithModifiers: Story = {
  render: () => <MobileStory initialState={asServer()} tab="tabs" stack={[{ name: 'tab', tabId: 'T-1004' }]} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByRole('button', { name: 'Add items' }));
    await userEvent.click(await c.findByRole('button', { name: 'Steaks' }));
    await userEvent.click(await waitFor(() => q(canvasElement, '[data-menu-item="nineteenth-filet-mignon-8oz"]')!));
    // The dish dialog: required, and it says so.
    const add = await c.findByRole('button', { name: 'Add to Seat 1' });
    await expect(add).toBeDisabled();
    await expect(c.getByText('Choose temp')).toBeTruthy();
    await expect(q(canvasElement, '[data-modifier-group="temperature"] [data-select-hint]')!.textContent).toBe('Choose one');
    await expect(q(canvasElement, '[data-modifier-group="steak-addons"] [data-select-hint]')!.textContent).toBe('Choose any');
    await userEvent.click(c.getByRole('radio', { name: /Medium rare/ }));
    await userEvent.click(c.getByRole('checkbox', { name: /Truffle butter/ }));
    await userEvent.click(c.getByRole('checkbox', { name: /Grilled shrimp/ }));
    await expect(add).toBeEnabled();
    await userEvent.click(add);
    // Back on the menu, the tile counts it; then the tab has it on seat 1, unsent.
    await userEvent.click(await c.findByRole('button', { name: /^Review tab/ }));
    const line = await waitFor(() => q(canvasElement, '[data-seat-band="1"] [data-dish-line]')!);
    await expect(line.dataset.dishState).toBe('unsent');
    await expect(within(line).getByText('Medium rare · Truffle butter +$5.00 · Grilled shrimp +$12.00')).toBeTruthy();
  },
};

/** **Send to kitchen.** Table 5's two unsent plates go as one ticket; every line is now locked. */
export const SendToKitchen: Story = {
  render: () => <MobileStory initialState={asServer()} tab="tabs" stack={[{ name: 'tab', tabId: 'T-1002' }]} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByRole('button', { name: 'Send 2' }));
    await expect(await c.findByRole('button', { name: 'All sent' })).toBeDisabled();
    await expect(canvasElement.querySelectorAll('[data-dish-state="unsent"]').length).toBe(0);
    await expect(canvasElement.querySelectorAll('[data-dish-state="sent"]').length).toBe(4);
  },
};

/**
 * **A sent line can't be edited.** The filet went at 11:51: its sheet says it is locked and why,
 * offers **Void** — behind a confirm — and no Edit or Remove. Voided, it stays on the tab struck
 * through at $0, so the ticket and the bill both show what was cancelled.
 */
export const ASentLineIsLocked: Story = {
  render: () => <MobileStory initialState={asServer()} tab="tabs" stack={[{ name: 'tab', tabId: 'T-1002' }]} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByRole('button', { name: /^Filet Mignon 8 oz, sent/ }));
    await expect(await c.findByText(/so it can’t be changed/)).toBeTruthy();
    await expect(c.queryByRole('button', { name: 'Edit' })).toBeNull();
    await expect(c.queryByRole('button', { name: 'Remove' })).toBeNull();
    await userEvent.click(c.getByRole('button', { name: 'Void dish' }));
    await userEvent.click(await c.findByRole('button', { name: /^Void (dish|Filet)/ }));
    await waitFor(() => expect(canvasElement.querySelectorAll('[data-dish-state="voided"]').length).toBe(1));
  },
};

/** **An unsent line edits in place**: its sheet offers Edit and Remove, one tap each. */
export const AnUnsentLineEdits: Story = {
  render: () => <MobileStory initialState={asServer()} tab="tabs" stack={[{ name: 'tab', tabId: 'T-1002' }]} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByRole('button', { name: /^Butter Cake, not sent/ }));
    await expect(await c.findByRole('button', { name: 'Edit' })).toBeTruthy();
    await userEvent.click(c.getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(c.queryByRole('button', { name: /^Butter Cake/ })).toBeNull());
  },
};

/**
 * **Move, split and discount a sent plate.** Seat 4's two Miller Lites: one is split onto seat 3 —
 * the seat decides who pays, not what was poured, so the kitchen lock doesn't stop it — and Buck's
 * *Shift Drink* (100% on alcohol) comps it.
 */
export const SplitAndDiscount: Story = {
  render: () => <MobileStory initialState={asServer()} tab="tabs" stack={[{ name: 'tab', tabId: 'T-1001' }]} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByRole('button', { name: /^2 Miller Lite, sent/ }));
    const sheet = await waitFor(() => q(canvasElement, '[data-line-sheet]')!);
    await userEvent.click(
      within(sheet)
        .getAllByRole('button', { name: /Seat 3/ })
        .at(-1)!,
    );
    await waitFor(() => expect(q(canvasElement, '[data-seat-band="3"]')!.textContent).toContain('Miller Lite'));
    const seat3 = q(canvasElement, '[data-seat-band="3"]')!;
    await userEvent.click(within(seat3).getByRole('button', { name: /^Miller Lite, sent/ }));
    await userEvent.click(await c.findByRole('button', { name: /^Shift Drink/ }));
    await waitFor(() => expect(q(canvasElement, '[data-seat-band="3"] [data-dish-discount]')).not.toBeNull());
  },
};

/**
 * **Pay a tab.** Farnsworth asked for the check. Pay loads the tab and opens the phone's checkout,
 * named for the tab; cash, exact; the receipt goes **Back to tabs**, where the tab is gone — and
 * on the floor, Table 10 is free.
 */
export const PayATab: Story = {
  render: () => <MobileStory initialState={asServer()} tab="tabs" stack={[{ name: 'tab', tabId: 'T-1003' }]} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByRole('button', { name: /^Pay \$/ }));
    await expect(await c.findByText('Tab · Table 10 · Farnsworth')).toBeTruthy();
    await userEvent.click(c.getByText('Cash'));
    await userEvent.click(await c.findByRole('button', { name: 'Exact' }));
    await userEvent.click(c.getByRole('button', { name: /^Cash received/ }));
    await userEvent.click(await c.findByRole('button', { name: 'Back to tabs' }));
    await waitFor(() => expect(q(canvasElement, '[data-tab-row="T-1003"]')).toBeNull());
    await expect(canvasElement.querySelectorAll('[data-tab-row]').length).toBe(5);
  },
};

/** **Backing out of checkout** leaves the tab as it was, and the register empty. */
export const BackingOutOfCheckout: Story = {
  render: () => <MobileStory initialState={asServer()} tab="tabs" stack={[{ name: 'tab', tabId: 'T-1003' }]} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByRole('button', { name: /^Pay \$/ }));
    await userEvent.click(await c.findByRole('button', { name: 'Back' }));
    await expect(await c.findByRole('button', { name: /^Pay \$/ })).toBeEnabled();
  },
};

/**
 * **The register holds someone else's order**: Pay is refused, and the tab says why rather than
 * the tap doing nothing.
 */
export const PayRefusedWhileTheRegisterIsBusy: Story = {
  render: () => (
    <MobileStory
      initialState={asServer({ cart: [{ name: 'Range Bucket', price: 12, qty: 1 }] })}
      tab="tabs"
      stack={[{ name: 'tab', tabId: 'T-1003' }]}
    />
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(await c.findByRole('button', { name: /^Pay \$/ })).toBeDisabled();
    await expect(c.getByText(/The register has another order on it/)).toBeTruthy();
  },
};

/** **The tab's ⋮**: guests, server, check requested and move — the tab, not its food. */
export const TabOptions: Story = {
  render: () => <MobileStory initialState={asServer()} tab="tabs" stack={[{ name: 'tab', tabId: 'T-1001' }]} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByRole('button', { name: 'Tab options' }));
    await userEvent.click(await c.findByLabelText('Check requested'));
    await waitFor(() => expect(q(canvasElement, '[data-check-requested]')).not.toBeNull());
  },
};

/** **A new tab with no table** — a bar tab, or a group's running tab. */
export const NewTab: Story = {
  render: () => <MobileStory initialState={asServer()} tab="tabs" stack={[{ name: 'openTab' }]} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(await c.findByLabelText('Tab name'), 'Bar · Scott');
    await userEvent.click(c.getByRole('button', { name: 'Open' }));
    await expect(await c.findByRole('heading', { name: 'Bar · Scott' })).toBeTruthy();
    await expect(c.getByText(/^No table/)).toBeTruthy();
  },
};
