import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
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
 * - **Recorded, not wired.** Terminal, checkout and staff changes are saved and shown here; checkout,
 *   receipts and sign-in keep the prototype's fixed behaviour, and each section says so. The tee
 *   sheet's section is the exception: it was always live, and still is.
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
    await expect(c.getByText(/still charges 8% tax/)).toBeTruthy();
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
