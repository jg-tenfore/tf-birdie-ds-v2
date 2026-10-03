import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { APP_IDENTITY } from '../../../pos/data/nav';
import { settingsDefaults, type CheckoutSettings, type TerminalHardware } from '../../../pos/state/settings';
import type { CartItem } from '../../../pos/types';
import { Screen, atVenue } from '../../pos/screen-helpers';

/**
 * V1 → V2 Migration / 18 · Settings / Tablet
 *
 * **Birdie's own settings first — device info, the card reader, Clover, the tee sheet — then the
 * V1 → V2 proposals: the terminal, checkout and receipts, staff and PINs.**
 *
 * ## What v1 did
 *
 * Nothing. v1's Settings tile opened a stub — "Terminal and hardware configuration." — and Weston
 * Edits pointed the tile at the tee sheet's display settings, the only configuration there was.
 *
 * ## What this does
 *
 * - **Led by Birdie's real sections** (approved on the Oct 1 call). Weston: *"We have device info. We
 *   have connecting to a reader. Then we have Clover settings that I don't think we really use much
 *   anymore… This is a good layout. We would just add those settings here."* So the list opens on
 *   **Device info**, then **Card reader**, **Clover** (flagged *Rarely used*) and **Tee sheet**.
 * - **Then "Proposed — not in Birdie today"**: Terminal & hardware, Checkout & receipts, Staff &
 *   PINs, each marked *Proposed*. They still work, exactly as before.
 * - **One card reader.** Card reader's Connect and Disconnect save the same `hardware.cardReader`
 *   Terminal & hardware lists, so the two sections never disagree.
 * - **Each proposed section saves as a whole** — Save and Discard under it, and who saved it last —
 *   because a half-typed tax rate is not a setting anyone meant.
 * - **Staff & PINs is managers only.** Anyone else reads the list, with PINs hidden. The reducer
 *   refuses a staff change from anyone but a manager, so the rule does not rest on a hidden button.
 * - **Wired.** Once saved, checkout charges the tax rate, offers the tenders switched on and the tip
 *   presets, and shows the receipt text on the reader's done step as "Receipts after a sale" says;
 *   new gift cards start from the default; the register header shows the register's name; and the
 *   PIN pad, Time Clock and server pickers read the staff list. The hardware stays simulated, and
 *   Clover's switches are the screen's own.
 */
const meta = {
  title: 'V1 → V2 Migration/18 · Settings/Tablet',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const at = (extra = {}) => atVenue('eighteen', { view: 'settings', leftPanelCollapsed: true, ...extra });
const page = (el: HTMLElement) => within(el.ownerDocument.body);

/**
 * **Device info, where Settings opens.** The facility, account, app and device; the register and its
 * reader; when it last synced. Birdie's sections lead the list, the proposals sit under their own
 * heading, and "Copy for support" says it copied.
 */
export const DeviceInfo: Story = {
  render: () => <Screen edition="v1v2" initialState={at()} />,
  play: async ({ canvasElement }) => {
    const panel = canvasElement.querySelector<HTMLElement>('[data-settings-panel="device"]')!;
    await expect(panel.textContent).toContain(APP_IDENTITY.version);
    await expect(panel.textContent).toContain(APP_IDENTITY.facility);
    await expect(panel.querySelector('[data-device-info="Register"]')!.textContent).toContain('Register 1');
    await expect(panel.querySelector('[data-device-info="Card reader"]')!.textContent).toContain('Stripe Reader S700 · 0184');
    await expect(panel.querySelector('[data-device-info="Last synced"]')!.textContent).toContain('Thu, May 21');
    const order = [...canvasElement.querySelectorAll('[data-settings-section]')].map((b) => b.getAttribute('data-settings-section'));
    await expect(order).toEqual(['device', 'reader', 'clover', 'teesheet', 'hardware', 'checkout', 'staff']);
    await expect(canvasElement.querySelector('[data-settings-section="device"]')!.getAttribute('aria-current')).toBe('page');
    await expect(canvasElement.querySelector('[data-settings-proposed-heading]')!.textContent).toBe('Proposed — not in Birdie today');
    await expect(canvasElement.querySelectorAll('[data-proposed] [data-chip="Proposed"]').length).toBe(3);
    await userEvent.click(within(panel).getByRole('button', { name: 'Copy for support' }));
    await page(canvasElement).findByText('Device info copied for support');
  },
};

/**
 * **Card reader: disconnect, then connect another.** The reader is Terminal & hardware's card reader,
 * so connecting the BBPOS here is what Terminal & hardware — and Device info — then show.
 */
export const CardReader: Story = {
  render: () => <Screen edition="v1v2" initialState={at({ settingsSection: 'reader' })} />,
  play: async ({ canvasElement }) => {
    const panel = () => within(canvasElement.querySelector<HTMLElement>('[data-settings-panel="reader"]')!);
    const status = () => canvasElement.querySelector<HTMLElement>('[data-reader-status]')!;
    await expect(status().getAttribute('data-reader-status')).toBe('connected');
    await expect(status().textContent).toContain('Connected · battery 82% · firmware 2.14');
    await userEvent.click(panel().getByRole('button', { name: 'Disconnect' }));
    await waitFor(() => expect(status().getAttribute('data-reader-status')).toBe('none'));
    await page(canvasElement).findByText('Disconnected Stripe Reader S700 · 0184');
    const bbpos = canvasElement.querySelector<HTMLElement>('[data-nearby-reader="BBPOS WisePOS E · 2231"]')!;
    await userEvent.click(within(bbpos).getByRole('button', { name: 'Connect' }));
    await waitFor(() => expect(status().textContent).toContain('BBPOS WisePOS E · 2231'));
    await expect(status().textContent).toContain('firmware 1.9.3');
    await expect(within(bbpos).getByText('Connected')).toBeTruthy();
    await userEvent.click(canvasElement.querySelector<HTMLElement>('[data-settings-section="hardware"]')!);
    await expect(canvasElement.querySelector('[data-device="cardReader"]')!.textContent).toContain('BBPOS WisePOS E · 2231');
    await userEvent.click(canvasElement.querySelector<HTMLElement>('[data-settings-section="device"]')!);
    await expect(canvasElement.querySelector('[data-device-info="Card reader"]')!.textContent).toContain('BBPOS WisePOS E · 2231');
  },
};

/** **Clover, flagged "Rarely used".** Kept until we decide to drop it; its switches flip and say so. */
export const Clover: Story = {
  render: () => <Screen edition="v1v2" initialState={at({ settingsSection: 'clover' })} />,
  play: async ({ canvasElement }) => {
    const panel = within(canvasElement.querySelector<HTMLElement>('[data-settings-panel="clover"]')!);
    await expect(panel.getByText('Rarely used')).toBeTruthy();
    const tips = panel.getByRole('switch', { name: 'Send tips to Clover' });
    await expect(tips).not.toBeChecked();
    await userEvent.click(tips);
    await expect(tips).toBeChecked();
    await page(canvasElement).findByText('Send tips to Clover: on');
  },
};

/** **Terminal & hardware** (proposed). Each device has a test; Save stays off until something changes. */
export const TerminalAndHardware: Story = {
  render: () => <Screen edition="v1v2" initialState={at({ settingsSection: 'hardware' })} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(canvasElement.querySelector('[data-settings-panel="hardware"] [data-chip="Proposed"]')).not.toBeNull();
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
  render: () => <Screen edition="v1v2" initialState={at({ settingsSection: 'hardware' })} />,
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
