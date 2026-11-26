import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { CURRENT_EDITION } from '../../../../pos/edition';
import { money, orderTotals } from '../../../../pos/logic/cart';
import { buckPricing, clubPricingDefaults } from '../../../../pos/logic/pricing';
import { withEdition } from '../../../edition-decorator';
import { Screen, atVenue } from '../../../pos/screen-helpers';
import { counterOrder, counterRound, dialog, done, find, item, payOnReader, q } from './checkout-kit';

/**
 * Pro Shop — **tax and service charges per line** (Nov 26, "checkout that's right").
 *
 * The register charged one sales-tax rate on everything that was not a tee-sheet round. It now charges
 * Buck's taxes **per line** (Buck › Taxes & Fees › Tax Rates): a green fee at the tee-fee rate, a cart
 * at transportation, food at open food, a beer at open liquor **plus its Tax Rate 2** — and a line of
 * no kind (a shirt, a sleeve) at the default type, the terminal's sales tax. A product can carry its
 * own type (lessons are sold exempt). A tee time from the sheet keeps the tax its reservation was booked with.
 *
 * Buck's **service charges** are added, each its own line on the order, checkout and the receipt: the
 * F&B Service Charge on a table's tab, the Event Service Charge on an event's bill, and the Credit Card
 * Surcharge on a card when Buck sets one (0% at this club). The archive keeps its one rate.
 */
const meta = {
  title: 'Prototypes/Tablet/Pro Shop/Tax and service charges',
  id: 'prototypes-tablet-pro-shop-tax-and-service-charges',
  parameters: { layout: 'fullscreen' },
  decorators: [withEdition('current-tablet')],
} satisfies Meta;

export default meta;
type Story = StoryObj;

const T = CURRENT_EDITION.tablet;
const mixed = [counterRound(1), item('Beer Domestic', 5, 2), item('Titleist Pro V1 Sleeve', 16)];

/**
 * **Per-line tax on a mixed order.** A round with its cart, two beers and a sleeve: the round, the
 * cart and the sleeve pay Sales Tax 8%; the beers pay it too, and Buck's Alcohol Tax 6.7% on top. The
 * rail, checkout and the receipt print both, and the card charges their sum.
 */
export const PerLineTaxOnAMixedOrder: Story = {
  render: () => <Screen edition={T} initialState={counterOrder(mixed)} />,
  play: async ({ canvasElement }) => {
    const t = orderTotals(mixed, buckPricing());
    await waitFor(() => expect(q('[data-rail-tax-line="alcohol"]')!.textContent).toBe(`Alcohol Tax 6.7%${money(0.67)}`));
    await expect(q('[data-rail-tax-line="sales"]')!.textContent).toBe(`Sales Tax 8%${money(8.4)}`);
    await userEvent.click(within(canvasElement).getByRole('button', { name: `Pay ${money(t.total)}` }));
    await dialog();
    await expect(q('[data-tax-line="alcohol"]')).not.toBeNull();
    await payOnReader();
    const receipt = await find('[data-receipt]');
    await expect(receipt.querySelector('[data-receipt-tax="alcohol"]')!.textContent).toContain('$0.67');
    await expect(receipt.querySelector('[data-receipt-tax="sales"]')!.textContent).toContain('$8.40');
    await expect(within(receipt).getAllByText(money(t.total)).length).toBeGreaterThan(0);
    await done();
  },
};

/**
 * **Table service carries the F&B Service Charge.** Paying Table 10's tab from the floor loads it on the
 * register with Buck's 18% on its food and drink — on the rail, at checkout and on the receipt, untaxed.
 */
export const TableServiceAddsTheFnbCharge: Story = {
  render: () => <Screen edition={T} initialState={atVenue('eighteen', { view: 'tables', leftPanelCollapsed: true })} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(canvasElement.querySelector<HTMLElement>('[data-floor-element="d-10"]')!);
    await userEvent.click(await within(canvasElement).findByRole('button', { name: /^Pay \$/ }));
    const line = await find('[data-rail-service-charge="fnb"]');
    await expect(line.textContent).toMatch(/^F&B Service Charge 18%\$[\d,.]+$/);
    await userEvent.click(within(canvasElement).getByRole('button', { name: /^Pay \$/ }));
    await dialog();
    await expect(q('[data-service-charge="fnb"]')).not.toBeNull();
  },
};

/** **A counter order has none.** The same burgers and beers rung at the counter carry no service charge. */
export const TheCounterHasNoServiceCharge: Story = {
  render: () => <Screen edition={T} initialState={counterOrder([item('Hamburger', 8, 2), item('Beer Domestic', 5, 2)], undefined, { modal: { kind: 'checkout' } })} />,
  play: async () => {
    await dialog();
    await expect(q('[data-service-charge]')).toBeNull();
    await expect(q('[data-tax-line="alcohol"]')).not.toBeNull();
  },
};

/** **An event's bill carries the Event Service Charge.** Billing the Member-Guest's organiser adds Buck's 20%. */
export const AnEventBillCarriesTheEventCharge: Story = {
  render: () => <Screen edition={T} initialState={atVenue('eighteen', { view: 'events', leftPanelCollapsed: true, selectedEventId: 'EV-301' })} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(await within(canvasElement).findByRole('button', { name: /Bill the organiser/ }));
    const line = await find('[data-rail-service-charge="event"]');
    await expect(line.textContent).toMatch(/^Event Service Charge 20%\$[\d,.]+$/);
  },
};

/**
 * **A card surcharge, when Buck sets one.** This club's Credit Card Surcharge is 0%, so nothing is
 * added; with Buck pushing 3%, the reader charges it on top, says so, and the receipt prints it.
 */
export const ACardSurchargeWhenBuckSetsOne: Story = {
  render: () => {
    const club = clubPricingDefaults();
    club.serviceCharges.card = 3;
    return <Screen edition={T} initialState={counterOrder([item('Golf Glove Mens', 18)], undefined, { modal: { kind: 'checkout' }, clubPricing: club })} />;
  },
  play: async () => {
    // $18 + 8% = $19.44, and 3% of that on the card.
    await payOnReader();
    await expect(q('[data-card-surcharge]')!.dataset.cardSurcharge).toBe('0.58');
    await expect(q('[data-receipt]')!.textContent).toContain('Credit Card Surcharge$0.58');
    await done();
  },
};

/** **The archive keeps one rate.** The same mixed order in the archived base edition: one Tax line, 8% on all of it. */
export const TheArchiveKeepsOneRate: Story = {
  render: () => <Screen edition="base" initialState={counterOrder(mixed, undefined, { modal: { kind: 'checkout' } })} />,
  play: async () => {
    const d = await dialog();
    await expect(q('[data-tax-line]')).toBeNull();
    await expect(d.getByText(money(orderTotals(mixed, 0.08).tax))).toBeTruthy();
  },
};
