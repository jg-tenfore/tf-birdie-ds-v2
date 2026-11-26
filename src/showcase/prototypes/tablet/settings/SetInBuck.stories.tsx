import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { CURRENT_EDITION } from '../../../../pos/edition';
import { withEdition } from '../../../edition-decorator';
import { THIS_TABLET } from '../../../../pos/data/buck-club';
import { settingsDefaults, type CheckoutSettings } from '../../../../pos/state/settings';
import type { PosState } from '../../../../pos/state/pos-store';
import { Screen, atVenue } from '../../../pos/screen-helpers';

/**
 * Settings — **who owns what**: the counter's settings, and the ones TF Buck sets (Nov 26).
 *
 * Buck is the back office that configures Birdie. Its Course Settings screen has a section called
 * **Birdie** — defaults, Point of Sale Options, receipt text — and its Taxes & Fees, Payments,
 * Transportation Types, Printers and Tablets sections decide what the register charges, which
 * tenders checkout offers and where a ticket prints. Birdie's Settings now shows those **read-only,
 * under Buck's own section and group names**, each marked *Set in Buck* and saying where in Buck it
 * is changed.
 *
 * What stays **editable here**: the device, its card reader, Clover, the tee sheet's display, the
 * register's name and which of the club's printers it uses, the tip suggestions and gift-card default
 * (*Not in Buck* yet), and staff & PINs — managers only.
 *
 * Still wired: a tax rate, a tender or a receipt tag Buck changes is what checkout charges, offers
 * and prints. A Buck option this prototype does not act on says **Shown only**.
 */
const meta = {
  title: 'Prototypes/Tablet/Settings/Set in Buck',
  parameters: { layout: 'fullscreen' },
  decorators: [withEdition('current-tablet')],
} satisfies Meta;

export default meta;
type Story = StoryObj;

const at = (extra: Partial<PosState> = {}) => atVenue('eighteen', { view: 'settings', leftPanelCollapsed: true, ...extra });
const page = (el: HTMLElement) => within(el.ownerDocument.body);
const panel = (el: HTMLElement, key: string) => el.querySelector<HTMLElement>(`[data-settings-panel="${key}"]`)!;
const row = (el: HTMLElement, label: string) => el.querySelector<HTMLElement>(`[data-read-row="${label}"]`)!;

/** Checkout settings as if Buck had pushed different values. */
const fromBuck = (checkout: Partial<CheckoutSettings>): Partial<PosState> => {
  const d = settingsDefaults().terminalSettings;
  return { terminalSettings: { ...d, checkout: { ...d.checkout, ...checkout } } };
};

/**
 * **Buck › Birdie, read-only.** The section of Buck written for this app: Defaults, the eleven Point
 * of Sale Options in Buck's words, and Receipt Text. Nothing in it is an input, every group says
 * where in Buck it changes, and an option the prototype does not act on says "Shown only".
 */
export const BuckBirdieSection: Story = {
  render: () => <Screen edition={CURRENT_EDITION.tablet} initialState={at({ settingsSection: 'birdie' })} />,
  play: async ({ canvasElement }) => {
    const p = panel(canvasElement, 'birdie');
    await expect(p.hasAttribute('data-read-only')).toBe(true);
    await expect(within(p).getByText('Set in Buck')).toBeTruthy();
    await expect(p.querySelector('[data-buck-where]')!.textContent).toContain('Buck › Course Settings › Birdie');
    await expect(p.querySelectorAll('input, textarea, [role="switch"]').length).toBe(0);
    await expect(row(p, 'Default Event Tee Fee').textContent).toContain('Rack Prime');
    await expect(row(p, 'Blind Checkout').textContent).toContain('Shown only');
    await expect(row(p, 'Tip Suggestions on F&B Receipts').textContent).not.toContain('Shown only');
    await expect(row(p, 'Pro Shop Receipt Tag').textContent).toContain('Thank you for playing!');
  },
};

/**
 * **Taxes & Fees.** Buck names a tax for each kind of line; Birdie charges one sales-tax rate, so each
 * row reads the rate checkout charges. Service charges are Buck's and not added at the counter yet.
 */
export const TaxesAndFees: Story = {
  render: () => <Screen edition={CURRENT_EDITION.tablet} initialState={at({ settingsSection: 'taxes' })} />,
  play: async ({ canvasElement }) => {
    const p = panel(canvasElement, 'taxes');
    for (const label of ['General Tee Fee Tax Rate', 'Transportation Tax Rate', 'Open Food Tax Rate', 'Open Liquor Tax Rate']) {
      await expect(row(p, label).textContent).toContain('Sales Tax (8.00%)');
    }
    await expect(row(p, 'F&B Service Charge').textContent).toContain('Shown only');
  },
};

/**
 * **A rate Buck changes is the rate checkout charges.** With Buck's sales tax at 8.25%, Taxes & Fees
 * reads it — and the register, opened from the same state, charges it: $54.00 is $58.46.
 */
export const ABuckTaxChange: Story = {
  render: () => <Screen edition={CURRENT_EDITION.tablet} initialState={at({ settingsSection: 'taxes', ...fromBuck({ taxRate: 0.0825 }) })} />,
  play: async ({ canvasElement }) => {
    await expect(row(panel(canvasElement, 'taxes'), 'Open Food Tax Rate').textContent).toContain('Sales Tax (8.25%)');
  },
};

/** **…and on the register.** The same 8.25%, on the Pay button. */
export const ABuckTaxChangeAtTheRegister: Story = {
  render: () => (
    <Screen
      edition={CURRENT_EDITION.tablet}
      initialState={atVenue('eighteen', { view: 'pos', leftPanelCollapsed: false, cart: [{ name: 'Titleist Pro V1 Box', price: 54, qty: 1 }], ...fromBuck({ taxRate: 0.0825 }) })}
    />
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: 'Pay $58.46' })).toBeTruthy();
  },
};

/**
 * **Payments: every tender is a Buck payment type.** Card is Buck's *Credit*, a house account is a
 * *Customer Charge*. With Check off in Buck, the row reads Off — and checkout does not offer it.
 */
export const PaymentsAreTenders: Story = {
  render: () => {
    const d = settingsDefaults().terminalSettings.checkout;
    return <Screen edition={CURRENT_EDITION.tablet} initialState={at({ settingsSection: 'payments', ...fromBuck({ tenders: { ...d.tenders, check: false } }) })} />;
  },
  play: async ({ canvasElement }) => {
    const p = panel(canvasElement, 'payments');
    await expect(p.querySelector('[data-payment-type="card"]')!.textContent).toContain('Credit');
    await expect(p.querySelector('[data-payment-type="house"]')!.textContent).toContain('Customer Charge');
    await expect(p.querySelector('[data-payment-type="check"]')!.textContent).toContain('Off');
    await expect(p.querySelector('[data-payment-type="cash"]')!.textContent).toContain('On');
  },
};

/** **Transportation Types**, with the transport rows the register prices for each. */
export const TransportationTypes: Story = {
  render: () => <Screen edition={CURRENT_EDITION.tablet} initialState={at({ settingsSection: 'transport' })} />,
  play: async ({ canvasElement }) => {
    const p = panel(canvasElement, 'transport');
    await expect(p.querySelector('[data-transport-type="Cart"]')!.textContent).toContain('Riding Cart $26.82');
    await expect(p.querySelector('[data-transport-type="Push Cart"]')!.textContent).toContain('No');
  },
};

/**
 * **The register picks among the club's printers.** Buck lists the printers and what each is for;
 * the counter chooses which one this register sends receipts to — only from those Buck marks as a
 * *Pro Shop Printer*. Saved, Printers & Tablets marks it as this register's.
 */
export const RegisterPicksTheClubsPrinter: Story = {
  render: () => <Screen edition={CURRENT_EDITION.tablet} initialState={at({ settingsSection: 'hardware' })} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const select = within(canvasElement.querySelector<HTMLElement>('[data-device="receiptPrinter"]')!).getByRole('combobox');
    await expect([...select.querySelectorAll('option')].map((o) => o.textContent)).toEqual(['Pro Shop Counter', 'Starter Booth', 'None']);
    await userEvent.selectOptions(select, 'Starter Booth');
    await userEvent.click(c.getByRole('button', { name: 'Save' }));
    await page(canvasElement).findByText('Register & printers saved');
    await userEvent.click(canvasElement.querySelector<HTMLElement>('[data-settings-section="printers"]')!);
    await waitFor(() => expect(canvasElement.querySelector('[data-printer="Starter Booth"]')!.textContent).toContain('Receipts'));
    await expect(canvasElement.querySelector('[data-printer="Pro Shop Counter"]')!.textContent).not.toContain('Receipts');
  },
};

/** **Printers & Tablets.** The club's printers by Buck's uses, and this tablet's row in Buck's list. */
export const PrintersAndTablets: Story = {
  render: () => <Screen edition={CURRENT_EDITION.tablet} initialState={at({ settingsSection: 'printers' })} />,
  play: async ({ canvasElement }) => {
    const p = panel(canvasElement, 'printers');
    await expect(p.querySelector('[data-printer="Kitchen Hot Line"]')!.textContent).toContain('Kitchen');
    await expect(p.querySelector(`[data-tablet="${THIS_TABLET.id}"]`)!.textContent).toContain('This tablet');
  },
};

/** **Main Info.** The receipt header is built from Buck's course name and phone; credits expire on Buck's clock. */
export const MainInfo: Story = {
  render: () => <Screen edition={CURRENT_EDITION.tablet} initialState={at({ settingsSection: 'maininfo' })} />,
  play: async ({ canvasElement }) => {
    const p = panel(canvasElement, 'maininfo');
    await expect(row(p, 'Rain Check Expiration').textContent).toContain('365 days');
    await expect(row(p, 'Receipt header').textContent).toContain('The Dunes of Delgado');
  },
};

/**
 * **Device info names this tablet as Buck does.** Support asks for the Buck tablet number first, so it
 * sits beside the register's name.
 */
export const DeviceInfoShowsTheBuckTablet: Story = {
  render: () => <Screen edition={CURRENT_EDITION.tablet} initialState={at()} />,
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-device-info="Buck tablet"]')!.textContent).toContain(THIS_TABLET.id);
  },
};
