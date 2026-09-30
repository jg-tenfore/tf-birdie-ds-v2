import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';
import { SEED_TABS } from '../../../pos/data/restaurant-seed';
import type { PosState } from '../../../pos/state/pos-store';
import { Screen, atVenue } from '../../pos/screen-helpers';

/**
 * V1 → V2 Migration / 6 · Tabs / Tablet
 *
 * **Every open tab, and the seat-by-seat check a tab opens into — now with a kitchen.**
 *
 * ## What v1 did
 *
 * Two screens (`tf-birdie-ds-v1/app/src/screens/tabs.tsx`, from `references/072926/6-tabs/`).
 * The **list** was every held ticket in store order: the tab's name large on the left, and the
 * server, order number and time as a small block far to the right, each row led by the same logo.
 * The **editor** was a seat-banded check under a pipe breadcrumb (`Table Detached 58829 | Order ID
 * 4180595 | Avery Robertson`), a menu that swapped out for an item pane on every add, and a ⋮ on
 * every line offering Fire, Move, Split, Edit, Discount and Delete. Its modifier pane
 * (`tab-item-detail.tsx`) drew every option as a radio and toggled it like a checkbox.
 *
 * ## What was wrong with it
 *
 * - **Nothing to scan.** No sort, no grouping, no status: no way to see which table had asked for
 *   its check, or had food the kitchen never got, without opening each one.
 * - **The tab could not be edited as a tab** — not renamed, not re-served, not resized.
 * - **No real kitchen step.** "Fire" was one plate at a time, behind a menu, and a fired plate
 *   could still be deleted without the kitchen hearing.
 * - **Modifiers lied about themselves**: RARE and WELL DONE could both sit on one steak, nothing
 *   was required, and an allergy was one more grey option.
 *
 * ## What this does
 *
 * - **The list** has a column for each thing a server scans for — table, name, guests, server, time
 *   open, status, total — sorts on any of them, groups by server or room, and searches. Status says
 *   *Check requested*, *N not sent*, *Nothing ordered* or *All sent*.
 * - **The editor's header is the tab**: name in place, table, a guest stepper (it will not drop
 *   below a seat that has a plate), server, and *Check requested*.
 * - **Seat bands**, empty ones and *Shared* included. v1's one good idea is kept: **tapping a band
 *   makes it the seat that receives the next item**; nothing collapses.
 * - **One menu browser**, shared with Quick Order, beside the check and never replacing it.
 * - **Modifiers say what they are**: a single choice is a radio group and a tap replaces; a set is
 *   checkboxes and a tap toggles. Required groups block the dish until answered. Allergies are red.
 * - **Send to kitchen** fires every unsent dish as one ticket. **Sent is locked**: a sent dish has
 *   no Edit or Remove, only **Void**, behind a confirm, and it stays on the check struck through.
 * - **Pay** hands the tab to the register — or, if the register has someone else's order, says so.
 */
const meta = {
  title: 'V1 → V2 Migration/6 · Tabs/Tablet',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const at = (extra: Partial<PosState> = {}) => atVenue('eighteen', { view: 'tabs', leftPanelCollapsed: true, ...extra });
const onTab = (tabId: string, extra: Partial<PosState> = {}) => at({ activeTabId: tabId, ...extra });

const q = <T extends HTMLElement = HTMLElement>(root: ParentNode, sel: string) => root.querySelector<T>(sel);
const qa = (root: ParentNode, sel: string) => [...root.querySelectorAll<HTMLElement>(sel)];
const band = (root: ParentNode, seat: number | 'shared') => q(root, `[data-seat-band="${seat}"]`)!;
const money = (s: string | null | undefined) => Number((s ?? '').replace(/[^0-9.]/g, ''));

/**
 * **The list, and what it surfaces.** Lunch at noon: six open tabs. The eight-top at Table 10 has
 * asked for its check and is open longest, so it leads; Table 5's dessert and wine have not gone
 * to the kitchen; P2 has just sat and ordered nothing; the men's league tab has no table.
 */
export const TheList: Story = {
  render: () => <Screen edition="v1v2" initialState={at()} />,
  play: async ({ canvasElement }) => {
    const rows = qa(canvasElement, '[data-tab-row]');
    await expect(rows).toHaveLength(6);
    await expect(rows[0].getAttribute('data-tab-row')).toBe('T-1003');
    await expect(q(canvasElement, '[data-tab-row="T-1003"] [data-check-requested]')).not.toBeNull();
    await expect(q(canvasElement, '[data-tab-row="T-1002"] [data-unsent]')!.getAttribute('data-unsent')).toBe('2');
    await expect(q(canvasElement, '[data-tab-row="T-1004"] [data-nothing-ordered]')).not.toBeNull();
    await expect(q(canvasElement, '[data-tab-row="T-1001"] [data-all-sent]')).not.toBeNull();
    const t1003 = within(q(canvasElement, '[data-tab-row="T-1003"]')!);
    await expect(t1003.getByText('Table 10')).toBeTruthy();
    await expect(t1003.getByText('50 min')).toBeTruthy();
    await expect(t1003.getByText('Jordan Ellis')).toBeTruthy();
    await expect(within(q(canvasElement, '[data-tab-row="T-1006"]')!).getByText('No table')).toBeTruthy();
    await expect(q(canvasElement, '[data-tab-summary]')!.textContent).toBe('6 open · 1 check requested · 1 with food not sent');
  },
};

/**
 * **Sort and group.** Total sorts biggest first, and again reverses it. Grouping by server keeps
 * the sort — the server with the biggest check comes first. The search box narrows to a name, a
 * table or a server.
 */
export const SortGroupAndSearch: Story = {
  render: () => <Screen edition="v1v2" initialState={at()} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const totals = () => qa(canvasElement, '[data-tab-row]').map((r) => money(q(r, '[data-tab-row-total]')?.textContent));

    await userEvent.click(canvas.getByRole('button', { name: 'Sort by Total' }));
    const desc = totals();
    await expect(desc).toEqual([...desc].sort((a, b) => b - a));
    await userEvent.click(canvas.getByRole('button', { name: 'Sort by Total' }));
    await expect(totals()).toEqual([...desc].reverse());

    await userEvent.click(q(canvasElement, '[data-group-by="server"]')!);
    await expect(qa(canvasElement, '[data-tab-group]').map((g) => g.getAttribute('data-tab-group')).sort()).toEqual([
      'Jordan Ellis',
      'Marcus Webb',
      'Priya Nair',
    ]);

    await userEvent.type(canvas.getByRole('textbox', { name: 'Search tabs' }), 'farns');
    await expect(qa(canvasElement, '[data-tab-row]').map((r) => r.getAttribute('data-tab-row'))).toEqual(['T-1003']);
  },
};

/**
 * **Opening a tab.** Tapping Table 5's row opens its editor: the header is the tab, the seats are
 * banded, and **Tabs** goes back to the list.
 */
export const OpeningATab: Story = {
  render: () => <Screen edition="v1v2" initialState={at()} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(q(canvasElement, '[data-tab-row="T-1002"]')!);
    await waitFor(() => expect(q(canvasElement, '[data-tab-editor="T-1002"]')).not.toBeNull());
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('textbox', { name: 'Tab name' })).toHaveValue('Table 5');
    await expect(q(canvasElement, '[data-tab-table]')!.textContent).toMatch(/^Table 5 · /);
    await expect(q(canvasElement, '[data-tab-guests]')!.getAttribute('data-tab-guests')).toBe('2');
    // Two seats and the shared plate (the calamari).
    await expect(qa(canvasElement, '[data-seat-band]')).toHaveLength(3);
    await userEvent.click(canvas.getByRole('button', { name: 'All tabs' }));
    await waitFor(() => expect(qa(canvasElement, '[data-tab-row]')).toHaveLength(6));
  },
};

/**
 * **A link opens the tab** (`#/tabs?tab=T-1003`). Eight seats and the shared beers — every seat
 * banded, including ones with nothing yet. Every seat has a plate, so the guest stepper will not
 * go below eight: that would move a plate to "shared" without anyone choosing to.
 */
export const ADeepLinkOpensIt: Story = {
  render: () => <Screen edition="v1v2" initialState={onTab('T-1003')} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(q(canvasElement, '[data-tab-editor="T-1003"]')).not.toBeNull();
    await expect(qa(canvasElement, '[data-seat-band]')).toHaveLength(9);
    await expect(canvas.getByRole('button', { name: 'One fewer guest' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Check requested' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(canvas.getByRole('button', { name: 'One more guest' }));
    await waitFor(() => expect(qa(canvasElement, '[data-seat-band]')).toHaveLength(10));
    await expect(within(band(canvasElement, 9)).getByText('Nothing yet')).toBeTruthy();
  },
};

/**
 * **The active seat receives the item.** P2 has just sat. Tapping Seat 3's band makes it the seat
 * items go to — the menu says so — and a béarnaise (no options) lands on Seat 3 at once.
 */
export const TheActiveSeatReceivesTheItem: Story = {
  render: () => <Screen edition="v1v2" initialState={onTab('T-1004')} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(q(canvasElement, '[data-adding-to]')!.textContent).toBe('Adding to Seat 1');
    await userEvent.click(canvas.getByRole('button', { name: 'Seat 3' }));
    await expect(q(canvasElement, '[data-adding-to]')!.textContent).toBe('Adding to Seat 3');
    await expect(canvas.getByRole('button', { name: 'Seat 3, adding here' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(q(canvasElement, '[data-menu-category="Sauces"]')!);
    await userEvent.click(q(canvasElement, '[data-menu-item="nineteenth-bearnaise"]')!);
    await waitFor(() => expect(within(band(canvasElement, 3)).getByText('Béarnaise')).toBeTruthy());
    await expect(qa(band(canvasElement, 1), '[data-dish-line]')).toHaveLength(0);
    await expect(q(band(canvasElement, 3), '[data-dish-line]')!.getAttribute('data-dish-state')).toBe('unsent');
  },
};

const burgerOnP2 = onTab('T-1004', {
  modal: { kind: 'dish', target: { tabId: 'T-1004' }, menuItemId: 'counter-clubhouse-cheeseburger', seat: 1 },
});

/**
 * **A single choice, and a set.** A burger has one temperature: tapping Medium after Rare
 * *replaces* it — the group is a radio group, drawn with round marks. Add-ons are a set: Bacon
 * and Avocado both stay, drawn with square marks. The price follows: $13 + $2 + $2.
 */
export const ASingleChoiceAndASet: Story = {
  render: () => <Screen edition="v1v2" initialState={burgerOnP2} />,
  play: async () => {
    const dialog = within(await screen.findByRole('dialog'));
    const temperature = dialog.getByRole('radiogroup', { name: 'Temperature' });
    const t = within(temperature);
    await userEvent.click(t.getByRole('radio', { name: 'Rare' }));
    await userEvent.click(t.getByRole('radio', { name: 'Medium' }));
    await expect(t.getByRole('radio', { name: 'Rare' })).toHaveAttribute('aria-checked', 'false');
    await expect(t.getByRole('radio', { name: 'Medium' })).toHaveAttribute('aria-checked', 'true');
    await expect(t.getAllByRole('radio').filter((r) => r.getAttribute('aria-checked') === 'true')).toHaveLength(1);

    const addons = within(dialog.getByRole('group', { name: 'Add-ons' }));
    await userEvent.click(addons.getByRole('checkbox', { name: /Bacon/ }));
    await userEvent.click(addons.getByRole('checkbox', { name: /Avocado/ }));
    await expect(addons.getByRole('checkbox', { name: /Bacon/ })).toHaveAttribute('aria-checked', 'true');
    await expect(addons.getByRole('checkbox', { name: /Avocado/ })).toHaveAttribute('aria-checked', 'true');
    await expect(document.querySelector('[data-dish-price]')!.textContent).toBe('$17.00');
  },
};

/**
 * **A required group blocks the dish.** No temperature, no side: *Add* is disabled and the footer
 * says what is missing. Answer both and the burger goes onto Seat 1, its choices in menu order.
 */
export const ARequiredGroupBlocks: Story = {
  render: () => <Screen edition="v1v2" initialState={burgerOnP2} />,
  play: async ({ canvasElement }) => {
    const dialog = within(await screen.findByRole('dialog'));
    const add = dialog.getByRole('button', { name: 'Add to Seat 1' });
    await expect(add).toBeDisabled();
    await expect(dialog.getByText('Choose temperature and side')).toBeTruthy();
    await userEvent.click(dialog.getByRole('radio', { name: 'Medium' }));
    await expect(dialog.getByText('Choose side')).toBeTruthy();
    await expect(add).toBeDisabled();
    await userEvent.click(dialog.getByRole('radio', { name: 'Fries' }));
    await expect(add).toBeEnabled();
    await userEvent.click(add);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const line = q(band(canvasElement, 1), '[data-dish-line]')!;
    await expect(within(line).getByText('Clubhouse Cheeseburger')).toBeTruthy();
    await expect(q(line, '[data-dish-modifiers]')!.textContent).toBe('Medium · Fries');
  },
};

/**
 * **An allergy is unmistakable.** Table 5's shared calamari carries a red *Allergy · Shellfish*
 * flag, apart from its other modifiers. In the dialog the allergy group is red-edged, and a chosen
 * allergy fills solid red — here a peanut allergy on a steak for P2's second seat.
 */
export const AnAllergyIsFlagged: Story = {
  render: () => (
    <Screen
      edition="v1v2"
      initialState={onTab('T-1004', {
        modal: { kind: 'dish', target: { tabId: 'T-1004' }, menuItemId: 'nineteenth-filet-mignon-8oz', seat: 2 },
      })}
    />
  ),
  play: async ({ canvasElement }) => {
    const dialogEl = await screen.findByRole('dialog');
    const dialog = within(dialogEl);
    await expect(dialogEl.querySelector('[data-modifier-group="allergies"]')!.getAttribute('data-alert')).toBe('true');
    await userEvent.click(dialog.getByRole('radio', { name: 'Medium rare' }));
    const peanut = dialog.getByRole('checkbox', { name: 'Peanut' });
    await userEvent.click(peanut);
    await expect(getComputedStyle(peanut).backgroundColor).toBe('rgb(186, 26, 26)');
    await userEvent.click(dialog.getByRole('button', { name: 'Add to Seat 2' }));
    await waitFor(() => expect(q(band(canvasElement, 2), '[data-allergy="Peanut"]')).not.toBeNull());
    await expect(q(band(canvasElement, 2), '[data-dish-modifiers]')!.textContent).toBe('Medium rare');
  },
};

/** …and the seeded one, on the list's half-sent table. */
export const TheSeededAllergy: Story = {
  render: () => <Screen edition="v1v2" initialState={onTab('T-1002')} />,
  play: async ({ canvasElement }) => {
    const flag = q(band(canvasElement, 'shared'), '[data-allergy="Shellfish"]')!;
    await expect(flag.textContent).toBe('Allergy · Shellfish');
    await expect(getComputedStyle(flag).backgroundColor).toBe('rgb(186, 26, 26)');
  },
};

/**
 * **Send to kitchen, and the lock.** Table 5 has two dishes unsent — the button says so. Send
 * fires them; the button has nothing left to send; every line now says when it went, and the
 * dessert that could be edited or removed a moment ago offers only **Void**.
 */
export const SendToKitchenLocksWhatWent: Story = {
  render: () => <Screen edition="v1v2" initialState={onTab('T-1002')} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Remove Butter Cake' })).toBeTruthy();
    await expect(canvas.getByRole('button', { name: 'Edit Butter Cake' })).toBeTruthy();
    await expect(canvas.queryByRole('button', { name: 'Void Butter Cake' })).toBeNull();
    const send = canvas.getByRole('button', { name: 'Send 2 to kitchen' });
    await userEvent.click(send);
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Nothing to send' })).toBeDisabled());
    await expect(qa(canvasElement, '[data-dish-line]').map((l) => l.getAttribute('data-dish-state'))).toEqual(['sent', 'sent', 'sent', 'sent']);
    await expect(canvas.queryByRole('button', { name: 'Remove Butter Cake' })).toBeNull();
    await expect(canvas.queryByRole('button', { name: 'Edit Butter Cake' })).toBeNull();
    await expect(canvas.getByRole('button', { name: 'Void Butter Cake' })).toBeTruthy();
    await expect(within(q(canvasElement, '[data-dish-line]:has([aria-label="Void Butter Cake"])')!).getByText('Sent 12:00 PM')).toBeTruthy();
  },
};

/**
 * **Voiding a sent dish.** The kitchen has Table 1's burger, so the only thing to do with it is
 * void it — behind a confirm that says why. It stays on the check, struck through at $0, and the
 * total drops by what it cost.
 */
export const VoidingASentDish: Story = {
  render: () => <Screen edition="v1v2" initialState={onTab('T-1001')} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const before = money(q(canvasElement, '[data-tab-total]')!.textContent);
    await userEvent.click(canvas.getByRole('button', { name: 'Void Clubhouse Cheeseburger' }));
    const dialog = within(await screen.findByRole('dialog'));
    await expect(dialog.getByText(/cannot be changed or removed/)).toBeTruthy();
    await userEvent.click(dialog.getByRole('button', { name: 'Void dish' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const line = q(band(canvasElement, 1), '[data-dish-line]')!;
    await expect(line.getAttribute('data-dish-state')).toBe('voided');
    await expect(canvas.queryByRole('button', { name: 'Void Clubhouse Cheeseburger' })).toBeNull();
    await expect(money(q(canvasElement, '[data-tab-total]')!.textContent)).toBeLessThan(before);
  },
};

/**
 * **Unsent lines change freely.** Nothing has happened to them yet, so Remove needs no confirm, and
 * Edit reopens the dish dialog on the line — here, a second glass of the cabernet.
 */
export const EditingAndRemovingAnUnsentDish: Story = {
  render: () => <Screen edition="v1v2" initialState={onTab('T-1002')} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Remove Butter Cake' }));
    await waitFor(() => expect(canvas.queryByText('Butter Cake')).toBeNull());
    await expect(screen.queryByRole('dialog')).toBeNull();

    await userEvent.click(canvas.getByRole('button', { name: 'Edit Josh Cabernet Sauvignon' }));
    const dialog = within(await screen.findByRole('dialog'));
    await userEvent.click(dialog.getByRole('button', { name: 'One more' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await expect(within(band(canvasElement, 1)).getByText('2×')).toBeTruthy();
  },
};

/**
 * **Two menus, one catalog.** A tab opens on the 19th Hole menu; the Counter menu is one tap away,
 * with its own categories, and a beer from it lands on the tab like anything else.
 */
export const SwitchingMenus: Story = {
  render: () => <Screen edition="v1v2" initialState={onTab('T-1004')} />,
  play: async ({ canvasElement }) => {
    await expect(q(canvasElement, '[data-menu-browser]')!.getAttribute('data-menu-browser')).toBe('nineteenth');
    await expect(q(canvasElement, '[data-menu-category="Starters"]')).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(q(canvasElement, '[data-menu-switch="counter"]')!);
    await expect(q(canvasElement, '[data-menu-browser]')!.getAttribute('data-menu-browser')).toBe('counter');
    await expect(q(canvasElement, '[data-menu-category="Grill"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(q(canvasElement, '[data-menu-category="Starters"]')).toBeNull();
    await userEvent.click(q(canvasElement, '[data-menu-category="Beer"]')!);
    await userEvent.click(q(canvasElement, '[data-menu-item="counter-miller-lite"]')!);
    await waitFor(() => expect(within(band(canvasElement, 1)).getByText('Miller Lite')).toBeTruthy());
  },
};

/**
 * **Pay hands the tab to the register.** Table 10's check goes onto the rail exactly as it is —
 * seats and all — and the register takes the payment. On the rail the lines are the tab's, so they
 * are read-only there: no Remove, no Void.
 */
export const PayHandsOverToTheRegister: Story = {
  render: () => <Screen edition="v1v2" initialState={onTab('T-1003')} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const total = q(canvasElement, '[data-tab-total]')!.textContent!;
    await userEvent.click(canvas.getByRole('button', { name: `Pay ${total}` }));
    await waitFor(() => expect(q(canvasElement, '[data-restaurant-view="TabsView"]')).toBeNull());
    const rail = qa(canvasElement, '[data-rail-dish-line]');
    await expect(rail).toHaveLength(9);
    await expect(rail.flatMap((r) => qa(r, 'button'))).toHaveLength(0);
    await expect(within(rail[5]).getByText('Allergy · Gluten')).toBeTruthy();
    await waitFor(() => expect(canvas.getByRole('button', { name: `Pay ${total}` })).toBeTruthy());
  },
};

/**
 * **…unless the register is busy.** Someone's golf balls are on the rail. Paying Table 10 now would
 * mix two parties' orders, so Pay is disabled and says why, with a way to the register.
 */
export const PayWaitsForTheRegister: Story = {
  render: () => <Screen edition="v1v2" initialState={onTab('T-1003', { cart: [{ name: 'Pro V1 · dozen', price: 54.99, qty: 1 }] })} />,
  play: async ({ canvasElement }) => {
    const pay = q<HTMLButtonElement>(canvasElement, '[data-pay-tab]')!;
    await expect(pay).toBeDisabled();
    await expect(q(canvasElement, '[data-pay-refused]')!.textContent).toMatch(/another order on it/);
    await expect(within(canvasElement).getByRole('button', { name: 'Go to register' })).toBeTruthy();
  },
};

/**
 * **A bar tab.** *New bar tab* opens a tab with no table and one guest, straight into the editor,
 * where it is named in place. Back on the list it reads as the bartender typed it.
 */
export const ANewBarTab: Story = {
  render: () => <Screen edition="v1v2" initialState={at()} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(q(canvasElement, '[data-new-bar-tab]')!);
    await waitFor(() => expect(q(canvasElement, '[data-tab-editor="T-1007"]')).not.toBeNull());
    const name = canvas.getByRole('textbox', { name: 'Tab name' });
    await expect(name).toHaveValue('Tab 1007');
    await expect(q(canvasElement, '[data-tab-table]')!.textContent).toBe('No table');
    await expect(q(canvasElement, '[data-tab-guests]')!.getAttribute('data-tab-guests')).toBe('1');
    await userEvent.clear(name);
    await userEvent.type(name, 'Bar · Scott{Enter}');
    await userEvent.click(canvas.getByRole('button', { name: 'All tabs' }));
    const row = await waitFor(() => {
      const r = q(canvasElement, '[data-tab-row="T-1007"]');
      if (!r) throw new Error('no row');
      return r;
    });
    await expect(within(row).getByText('Bar · Scott')).toBeTruthy();
    await expect(within(row).getAllByText('No table').length).toBeGreaterThan(0);
  },
};

/**
 * **Moving, splitting and discounting a plate — even after it is sent.** Table 1's food is all in the
 * kitchen. v1 kept Move, Split and Discount in each line's ⋮ menu beside Fire; the first cut of this
 * wave dropped them along with v1's everything-behind-⋮ convention. They are back as one **Adjust**
 * control, open on sent plates too, because none of them touches the food: moving a fired plate from
 * seat 4 to seat 2 changes who pays, not what the cook makes.
 *
 * The play test splits Table 1's two Miller Lites so seat 2 has one, then comps the other.
 */
export const AdjustingASentPlate: Story = {
  render: () => <Screen edition="v1v2" initialState={onTab('T-1001')} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const beers = await waitFor(() => {
      const el = qa(canvasElement, '[data-dish-line]').find((x) => x.textContent?.includes('Miller Lite'));
      if (!el) throw new Error('Table 1 not drawn yet');
      return el;
    });
    await expect(beers.getAttribute('data-dish-state')).toBe('sent');
    await userEvent.click(within(beers).getByRole('button', { name: 'Adjust Miller Lite' }));
    const panel = within(
      await waitFor(() => {
        const el = q(beers, '[data-dish-adjust]');
        if (!el) throw new Error('adjust panel not open yet');
        return el;
      }),
    );

    // Split one to seat 2 — two lines of one, both still sent.
    await userEvent.click(panel.getAllByRole('button', { name: 'Seat 2' }).at(-1)!);
    await waitFor(() => expect(qa(canvasElement, '[data-dish-line]').filter((el) => el.textContent?.includes('Miller Lite'))).toHaveLength(2));
    const both = qa(canvasElement, '[data-dish-line]').filter((el) => el.textContent?.includes('Miller Lite'));
    for (const el of both) await expect(el.getAttribute('data-dish-state')).toBe('sent');
    await expect(within(band(canvasElement, 2)).getByText('Miller Lite')).toBeTruthy();

    // Comp the one left on seat 4 — its Adjust panel is still open from the split.
    const left = both.find((el) => band(canvasElement, 4).contains(el))!;
    const leftPanel = q(left, '[data-dish-adjust]');
    if (!leftPanel) throw new Error('the seat-4 line should still have its Adjust panel open after the split');
    await userEvent.click(within(leftPanel).getByRole('button', { name: 'Comp' }));
    await waitFor(() => expect(left.textContent).toContain('$0.00'));
    await expect(canvas.queryByText(/Voided/)).toBeNull();
  },
};

/** **A voided plate has nothing to adjust.** No Adjust on it — it is already off the bill. */
export const AVoidedPlateHasNothingToAdjust: Story = {
  render: () => {
    // From the seed itself: `atVenue` returns a partial state, which carries no tabs.
    const tabs = SEED_TABS.map((t) =>
      t.id !== 'T-1001' ? t : { ...t, lines: t.lines.map((l, i) => (i === 0 ? { ...l, price: 0, dish: { ...l.dish!, voided: true } } : l)) },
    );
    return <Screen edition="v1v2" initialState={{ ...onTab('T-1001'), tabs }} />;
  },
  play: async ({ canvasElement }) => {
    const voided = await waitFor(() => {
      const el = q(canvasElement, '[data-dish-state="voided"]');
      if (!el) throw new Error('no voided line yet');
      return el;
    });
    await expect(within(voided).queryByRole('button', { name: /^Adjust/ })).toBeNull();
  },
};
