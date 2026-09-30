import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { settingsDefaults, type CheckoutSettings, type TerminalHardware } from '../../../pos/state/settings';
import type { CartItem } from '../../../pos/types';
import { Screen, atVenue } from '../../pos/screen-helpers';

/**
 * V1 → V2 Migration / 18 · Settings / Tablet
 *
 * **The terminal, checkout and receipts, staff and PINs — and the tee sheet's settings.**
 *
 * ## What v1 did
 *
 * Nothing. v1's Settings tile opened a stub — "Terminal and hardware configuration." — and Weston
 * Edits pointed the tile at the tee sheet's display settings, the only configuration there was.
 *
 * ## What this does
 *
 * - **Four sections**, the list on the left and the open one on the right: Terminal & hardware,
 *   Checkout & receipts, Staff & PINs, Tee sheet.
 * - **Each section saves as a whole** — Save and Discard under it, and who saved it last — because a
 *   half-typed tax rate is not a setting anyone meant.
 * - **Staff & PINs is managers only.** Anyone else reads the list, with PINs hidden. The reducer
 *   refuses a staff change from anyone but a manager, so the rule does not rest on a hidden button.
 * - **Wired.** Once saved, checkout charges the tax rate, offers the tenders switched on and the tip
 *   presets, and shows the receipt text on the reader's done step as "Receipts after a sale" says;
 *   new gift cards start from the default; the register header shows the register's name; and the
 *   PIN pad, Time Clock and server pickers read the staff list. The hardware stays simulated.
 */
const meta = {
  title: 'V1 → V2 Migration/18 · Settings/Tablet',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const at = (extra = {}) => atVenue('eighteen', { view: 'settings', leftPanelCollapsed: true, ...extra });
const page = (el: HTMLElement) => within(el.ownerDocument.body);

/** **Terminal & hardware.** Each device has a test; Save stays off until something changes. */
export const TerminalAndHardware: Story = {
  render: () => <Screen edition="v1v2" initialState={at()} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('button', { name: 'Save' })).toBeDisabled();
    const printer = canvasElement.querySelector<HTMLElement>('[data-device="receiptPrinter"]')!;
    await userEvent.click(within(printer).getByRole('button', { name: 'Test' }));
    await page(canvasElement).findByText('Test slip sent to Epson TM-m30III · Front counter');
    const name = c.getByDisplayValue('Register 1');
    await userEvent.clear(name);
    await userEvent.type(name, 'Pro Shop Register');
    await expect(canvasElement.querySelector('[data-settings-dirty]')).not.toBeNull();
    await userEvent.click(c.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(canvasElement.querySelector('[data-settings-saved]')!.textContent).toContain('Avery R.'));
  },
};

/** **Discard puts it back.** A change not saved is a change not made. */
export const DiscardPutsItBack: Story = {
  render: () => <Screen edition="v1v2" initialState={at()} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const name = c.getByDisplayValue('Register 1');
    await userEvent.type(name, ' (bar)');
    await userEvent.click(c.getByRole('button', { name: 'Discard changes' }));
    await expect(c.getByDisplayValue('Register 1')).toBeTruthy();
    await expect(c.getByRole('button', { name: 'Save' })).toBeDisabled();
  },
};

/**
 * **Checkout & receipts.** Tax, tips, tenders and receipt text save together — and a draft that would
 * leave checkout with no way to take money says so rather than saving.
 */
export const CheckoutAndReceipts: Story = {
  render: () => <Screen edition="v1v2" initialState={at({ settingsSection: 'checkout' })} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText(/Checkout reads these as soon as they are saved/)).toBeTruthy();
    await userEvent.click(c.getByRole('switch', { name: 'Card' }));
    await userEvent.click(c.getByRole('switch', { name: 'Cash' }));
    await expect(canvasElement.querySelector('[data-settings-problem]')!.textContent).toMatch(/Card or Cash/);
    await expect(c.getByRole('button', { name: 'Save' })).toBeDisabled();
    await userEvent.click(c.getByRole('switch', { name: 'Cash' }));
    const tax = c.getByDisplayValue('8');
    await userEvent.clear(tax);
    await userEvent.type(tax, '6.5');
    await userEvent.click(c.getByRole('button', { name: 'Save' }));
    await page(canvasElement).findByText('Checkout & receipts saved');
  },
};

/** **Staff & PINs, as a manager.** Add someone; a PIN another person already signs in with is refused. */
export const StaffAsAManager: Story = {
  render: () => <Screen edition="v1v2" initialState={at({ settingsSection: 'staff' })} />,
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-staff-row="s-2"] [data-pin]')!.textContent).toBe('2222');
    await userEvent.click(within(canvasElement).getByRole('button', { name: /Add staff/ }));
    const d = within(await page(canvasElement).findByRole('dialog'));
    await userEvent.type(d.getByPlaceholderText('First and last name'), 'Sam Ortiz');
    await userEvent.type(d.getByPlaceholderText('0000'), '2222');
    await expect(d.getByText('Jordan Ellis already signs in with 2222.')).toBeTruthy();
    await expect(d.getByRole('button', { name: 'Add' })).toBeDisabled();
    await userEvent.clear(d.getByPlaceholderText('0000'));
    await userEvent.type(d.getByPlaceholderText('0000'), '7777');
    await userEvent.click(d.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(canvasElement.querySelector('[data-staff-row="s-7"]')!.textContent).toContain('Sam Ortiz'));
  },
};

/** **Deactivating someone** greys them out; nobody can deactivate themselves. */
export const DeactivatingSomeone: Story = {
  render: () => <Screen edition="v1v2" initialState={at({ settingsSection: 'staff' })} />,
  play: async ({ canvasElement }) => {
    const self = canvasElement.querySelector<HTMLElement>('[data-staff-row="s-1"]')!;
    await expect(within(self).queryByRole('button', { name: 'Deactivate' })).toBeNull();
    const diego = canvasElement.querySelector<HTMLElement>('[data-staff-row="s-6"]')!;
    await userEvent.click(within(diego).getByRole('button', { name: 'Deactivate' }));
    await waitFor(() => expect(diego.textContent).toContain('Deactivated'));
    await expect(within(diego).getByRole('button', { name: 'Reactivate' })).toBeTruthy();
  },
};

/** **Anyone else reads it.** Signed in as a server, the list is there, the PINs are hidden, and nothing can be changed. */
export const StaffReadOnlyForEveryoneElse: Story = {
  render: () => <Screen edition="v1v2" initialState={at({ settingsSection: 'staff', operatorId: 's-2' })} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(canvasElement.querySelector('[data-staff-read-only]')).not.toBeNull();
    await expect(c.queryByRole('button', { name: /Add staff/ })).toBeNull();
    await expect(c.queryByRole('button', { name: 'Edit' })).toBeNull();
    await expect(canvasElement.querySelector('[data-staff-row="s-1"] [data-pin]')!.getAttribute('data-pin')).toBe('hidden');
    // …but the terminal settings are theirs to change.
    await userEvent.click(canvasElement.querySelector<HTMLElement>('[data-settings-section="hardware"]')!);
    await expect(c.getByDisplayValue('Register 1')).toBeTruthy();
  },
};

/** **The tee sheet's settings, live.** The same controls as its tune button; a change applies at once. */
export const TheTeeSheetSection: Story = {
  render: () => <Screen edition="v1v2" initialState={at({ settingsSection: 'teesheet' })} />,
  play: async ({ canvasElement }) => {
    const panel = within(canvasElement.querySelector<HTMLElement>('[data-settings-panel="teesheet"]')!);
    await userEvent.click(panel.getByText('10 min'));
    await page(canvasElement).findByText('10-minute intervals');
  },
};

/** **Weston Edits keeps its tile.** Settings there still opens the tee sheet's settings panel. */
export const WestonKeepsThePanel: Story = {
  render: () => <Screen edition="weston" initialState={atVenue('eighteen', { view: 'tee', navOpen: true })} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement.querySelector<HTMLElement>('[data-nav-overlay]')!).getByText('Settings', { exact: true }));
    await waitFor(() => expect(canvasElement.querySelector('[data-settings]')).toBeNull());
    await expect(page(canvasElement).getByText('Tee sheet settings')).toBeTruthy();
  },
};

// ─── Wired: what the rest of the terminal does with it ─────────────────────

const box: CartItem[] = [{ name: 'Titleist Pro V1 Box', price: 54, qty: 1 }];
const withSettings = (checkout: Partial<CheckoutSettings> = {}, hardware: Partial<TerminalHardware> = {}) => {
  const d = settingsDefaults().terminalSettings;
  return { terminalSettings: { checkout: { ...d.checkout, ...checkout }, hardware: { ...d.hardware, ...hardware } } };
};
const register = (extra = {}) => atVenue('eighteen', { view: 'pos', leftPanelCollapsed: false, cart: box, ...extra });

/** **The tax rate prices the register.** At 6.5%, a $54.00 box is $57.51, on the Pay button and in checkout. */
export const TheTaxRatePricesTheRegister: Story = {
  render: () => <Screen edition="v1v2" initialState={register(withSettings({ taxRate: 0.065 }))} />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: 'Pay $57.51' })).toBeTruthy();
  },
};

/** **A tender switched off leaves checkout.** Check is off in Settings, so checkout does not offer it. */
export const ATenderSwitchedOff: Story = {
  render: () => {
    const d = settingsDefaults().terminalSettings.checkout;
    return <Screen edition="v1v2" initialState={register({ ...withSettings({ tenders: { ...d.tenders, check: false } }), modal: { kind: 'checkout' } })} />;
  },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.ownerDocument.querySelector('[data-tender="tenderHouseAccount"]')).not.toBeNull());
    await expect(canvasElement.ownerDocument.querySelector('[data-tender="tenderCheck"]')).toBeNull();
  },
};

/** **The tip presets are Settings'.** 20, 22 and 25 here; one tap stages the tip. */
export const TheTipPresets: Story = {
  render: () => <Screen edition="v1v2" initialState={register({ ...withSettings({ tipPresets: [20, 22, 25] }), modal: { kind: 'checkout' } })} />,
  play: async ({ canvasElement }) => {
    const d = within(await page(canvasElement).findByRole('dialog'));
    await userEvent.click(d.getByRole('button', { name: 'Tip' }));
    await expect(canvasElement.ownerDocument.querySelectorAll('[data-checkout-tip-preset]').length).toBe(3);
    await userEvent.click(canvasElement.ownerDocument.querySelector<HTMLElement>('[data-checkout-tip-preset="25"]')!);
    await expect(d.getByText(/tip is staged/)).toBeTruthy();
  },
};

/**
 * **The receipt shows on the done step**, with Settings' header and footer. "Never print" takes the
 * Print receipt button away.
 */
export const TheReceiptOnTheDoneStep: Story = {
  render: () => (
    <Screen
      edition="v1v2"
      initialState={register({
        ...withSettings({ receiptHeader: 'The Dunes of Delgado\n19th Hole Grill', receiptFooter: 'See you on the first tee.' }, { printReceipts: 'never', name: 'Grill Register' }),
        modal: { kind: 'paymentReader', method: 'cash' },
      })}
    />
  ),
  play: async ({ canvasElement }) => {
    const d = within(await page(canvasElement).findByRole('dialog'));
    await userEvent.click(d.getByRole('button', { name: 'Cash received' }));
    const receipt = await waitFor(() => {
      const r = canvasElement.ownerDocument.querySelector<HTMLElement>('[data-receipt]');
      if (!r) throw new Error('no receipt yet');
      return r;
    });
    await expect(receipt.querySelector('[data-receipt-header]')!.textContent).toContain('19th Hole Grill');
    await expect(receipt.querySelector('[data-receipt-footer]')!.textContent).toBe('See you on the first tee.');
    await expect(receipt.textContent).toContain('Grill Register');
    await expect(d.queryByRole('button', { name: 'Print receipt' })).toBeNull();
  },
};

/** **The register header shows its name.** */
export const TheRegisterIsNamed: Story = {
  render: () => <Screen edition="v1v2" initialState={register(withSettings({}, { name: 'Pro Shop Register' }))} />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Championship · Pro Shop Register')).toBeTruthy();
  },
};

/** **Someone added in Settings signs in.** Sam's PIN is 7777; the PIN pad lists them, and it lets them in. */
export const ANewStaffMemberSignsIn: Story = {
  render: () => {
    const roster = [...settingsDefaults().staffRoster, { id: 's-7', name: 'Sam Ortiz', short: 'Sam O.', role: 'server' as const, pin: '7777', active: true }];
    return <Screen edition="v1v2" initialState={atVenue('eighteen', { view: 'tee', signedIn: false, staffRoster: roster })} />;
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-sign-in]')!.textContent).toContain('Sam Ortiz');
    for (const k of '7777') await userEvent.click(canvasElement.querySelector<HTMLElement>(`[data-pin-key="${k}"]`)!);
    await waitFor(() => expect(canvasElement.querySelector('[data-sign-in]')).toBeNull());
  },
};
