import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';
import { SEED_EVENTS, SEED_EVENT_BOOKINGS, eventGolf, eventSpend } from '../../../pos/data/events';
import { money, orderTotals } from '../../../pos/logic/cart';
import type { CartItem } from '../../../pos/types';
import { Screen, atVenue } from '../../pos/screen-helpers';

/**
 * V1 → V2 Migration / 15 · Events / Tablet
 *
 * **An outing's golf and its spend, as one thing, billed to the organiser once.**
 *
 * ## What v1 did
 *
 * `tf-birdie-ds-v1/app/src/screens/events.tsx`, from `references/072926/15-events/`: a list of ids
 * and names, and behind each an expense ledger beside the whole category catalogue, with one button
 * — ADD PAYMENT. The outing's tee times were a league on the tee sheet, unconnected to it.
 *
 * ## What was wrong with it
 *
 * **No action bar** on the list: the overflow menu was the only way to do anything but open an
 * event. Inside one, the event's name replaced the screen's, the ledger's total was not on screen,
 * and the golf — most of an outing's bill — was not in the event at all. Somebody added the tee
 * sheet and the ledger together by hand at the end of the day.
 *
 * ## What this does
 *
 * - **One event holds both.** Its golf is **derived from its tee times** — the Member-Guest's 72
 *   players are real bookings on May 30's sheet — and its ledger holds everything charged to it.
 * - **Charge to event** is a checkout tender: the tournament lunch rung at the counter lands on the
 *   event's ledger line by line, tax included. Billed events are not offered.
 * - **Bill the organiser** puts golf and spend on the register as one order; paying it marks the
 *   event billed, and a billed event takes nothing more.
 * - **Actions where you can see them**: New event on the toolbar; Edit and Bill in a bar under the
 *   open event.
 */
const meta = {
  title: 'V1 → V2 Migration/15 · Events/Tablet',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const at = (extra = {}) => atVenue('eighteen', { view: 'events', leftPanelCollapsed: true, ...extra });
const ev = (id: string) => SEED_EVENTS.find((e) => e.id === id)!;
const detail = (el: HTMLElement) => el.querySelector<HTMLElement>('[data-event-detail]')!;
const LUNCH: CartItem[] = [
  { name: 'Hot Dog', price: 6, qty: 4 },
  { name: 'Soda', price: 3, qty: 4 },
];

/** **The events**, open first, then upcoming, then billed — not v1's sort by name. */
export const TheEvents: Story = {
  render: () => <Screen edition="v1v2" initialState={at()} />,
  play: async ({ canvasElement }) => {
    const ids = [...canvasElement.querySelectorAll('[data-event-row]')].map((r) => r.getAttribute('data-event-row'));
    await expect(ids).toEqual(['EV-302', 'EV-301', 'EV-300']);
  },
};

/**
 * **Golf, from the tee times.** The Member-Guest's 72 players are 18 real bookings on the sheet,
 * priced at the event's green fee. Nobody typed $6,120 in; move a tee time and it moves.
 */
export const GolfFromTheTeeTimes: Story = {
  render: () => <Screen edition="v1v2" initialState={at({ selectedEventId: 'EV-301' })} />,
  play: async ({ canvasElement }) => {
    const golf = eventGolf(ev('EV-301'), SEED_EVENT_BOOKINGS);
    await expect(golf.players).toBe(72);
    await waitFor(() => expect(detail(canvasElement).querySelector('[data-event-players]')!.getAttribute('data-event-players')).toBe('72'));
    await expect(detail(canvasElement).querySelector('[data-event-golf]')!.textContent).toContain(money(golf.amount));
    await expect(detail(canvasElement).querySelector('[data-event-bill]')!.textContent).toBe(money(golf.amount + eventSpend(ev('EV-301'))));
  },
};

/** **See it on the tee sheet.** One tap to May 30, where the outing holds the first tee. */
export const SeeItOnTheTeeSheet: Story = {
  render: () => <Screen edition="v1v2" initialState={at({ selectedEventId: 'EV-301' })} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(await waitFor(() => canvasElement.querySelector<HTMLElement>('[data-see-on-sheet]')!));
    const first = SEED_EVENT_BOOKINGS.find((b) => b.groupId === 'grp-member-guest')!;
    await waitFor(() => expect(canvasElement.querySelector(`[data-booking-id="${first.id}"]`)).not.toBeNull());
    await expect(canvasElement.querySelector('[data-events]')).toBeNull();
  },
};

/**
 * **Add a charge, and take it off.** Prizes paid out of the event's budget: on the ledger, in the
 * total, and removable — because it was added by hand, not rung on an order.
 */
export const AddAndRemoveACharge: Story = {
  render: () => <Screen edition="v1v2" initialState={at({ selectedEventId: 'EV-302' })} />,
  play: async ({ canvasElement }) => {
    const d = within(detail(canvasElement));
    await userEvent.type(d.getByPlaceholderText('What it was — prizes, insurance, carts'), 'Closest-to-the-pin prizes');
    const qty = d.getByPlaceholderText('1');
    await userEvent.clear(qty);
    await userEvent.type(qty, '2');
    await userEvent.type(d.getByPlaceholderText('0.00'), '100');
    await userEvent.click(canvasElement.querySelector<HTMLElement>('[data-add-charge-button]')!);
    await waitFor(() => expect(canvasElement.querySelectorAll('[data-event-charge]').length).toBe(1));
    await expect(canvasElement.querySelector('[data-event-spend]')!.textContent).toBe('$100.00');
    await userEvent.click(d.getByRole('button', { name: 'Remove Closest-to-the-pin prizes' }));
    await waitFor(() => expect(canvasElement.querySelectorAll('[data-event-charge]').length).toBe(0));
    await expect(canvasElement.querySelector('[data-event-spend]')!.textContent).toBe('$0.00');
  },
};

/**
 * **Charge to event, at checkout.** The tender offers the events still taking charges — the
 * Rotary's is billed and is not listed.
 */
export const ChargeToEventAtCheckout: Story = {
  render: () => <Screen edition="v1v2" initialState={atVenue('eighteen', { view: 'pos', leftPanelCollapsed: false, cart: LUNCH, modal: { kind: 'checkout' } })} />,
  play: async () => {
    const checkout = await screen.findByRole('dialog');
    await userEvent.click(checkout.querySelector<HTMLElement>('[data-tender="tenderEvent"]')!);
    const dialog = await waitFor(() => {
      const d = document.querySelector<HTMLElement>('[data-tender-event]')?.closest<HTMLElement>('[role="dialog"]');
      if (!d) throw new Error('no event tender yet');
      return d;
    });
    await expect(dialog.querySelector('[data-tender-event="EV-300"]')).toBeNull();
    await expect(dialog.querySelector('[data-tender-event="EV-301"]')).not.toBeNull();
    // Today's league is open, so it is picked already.
    await expect(dialog.querySelector('[data-tender-event="EV-302"]')!.getAttribute('aria-pressed')).toBe('true');
    const total = orderTotals(LUNCH).total;
    await userEvent.click(within(dialog).getByRole('button', { name: `Charge ${money(total)} to Thursday Men's League` }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await expect(await within(document.body).findByText(`Charged ${money(total)} to Thursday Men's League`)).toBeTruthy();
  },
};

/**
 * **…and it lands on the ledger**, line by line with its tax, under the order it came from — which
 * opens in Order Lookup. The Member-Guest's lunch, charged with its bill already on screen.
 */
export const TheChargeLandsOnTheLedger: Story = {
  render: () => <Screen edition="v1v2" initialState={at({ selectedEventId: 'EV-301', cart: LUNCH, modal: { kind: 'tenderEvent' } })} />,
  play: async ({ canvasElement }) => {
    const before = ev('EV-301').ledger.length;
    const dialog = within(await screen.findByRole('dialog'));
    await userEvent.click(document.querySelector<HTMLElement>('[data-tender-event="EV-301"]')!);
    await userEvent.click(dialog.getByRole('button', { name: /^Charge .* to Member-Guest Invitational$/ }));
    await waitFor(() => expect(canvasElement.querySelectorAll('[data-event-charge]').length).toBe(before + LUNCH.length));
    await expect(canvasElement.querySelector('[data-event-spend]')!.textContent).toBe(money(eventSpend(ev('EV-301')) + orderTotals(LUNCH).total));
    const link = within(detail(canvasElement)).getAllByRole('button', { name: /in Order Lookup$/ })[0];
    await userEvent.click(link);
    await waitFor(() => expect(canvasElement.querySelector('[data-order-detail]')!.textContent).toContain('Event · Member-Guest Invitational'));
  },
};

/**
 * **Bill the organiser.** Golf and spend go onto the register as one order, rail open. Paying it
 * marks the event billed — back in Events it reads Billed, and takes no more charges.
 */
export const BillTheOrganiser: Story = {
  render: () => <Screen edition="v1v2" initialState={at({ selectedEventId: 'EV-301' })} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await waitFor(() => canvasElement.querySelector<HTMLElement>('[data-bill-event]')!));
    await expect(await canvas.findByText('Golf · Member-Guest Invitational · 72 players')).toBeTruthy();
    await expect(canvas.getByText('Charges · Member-Guest Invitational')).toBeTruthy();
    await expect(canvasElement.querySelector('[data-events]')).toBeNull();

    await userEvent.click(canvas.getByRole('button', { name: /^Pay \$/ }));
    const checkout = within(await screen.findByRole('dialog'));
    await userEvent.click(checkout.getByText('card'));
    await userEvent.click(await screen.findByRole('button', { name: 'Simulate tap' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Done' }, { timeout: 3000 }));

    // The paid order stays on the rail until it is cleared; then the rail's menu opens the nav.
    await userEvent.click(canvas.getByRole('button', { name: 'Clear order' }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Clear order' }));
    await userEvent.click(await canvas.findByRole('button', { name: 'Open navigation' }));
    await userEvent.click(await waitFor(() => canvasElement.querySelector<HTMLElement>('[data-nav-key="events"]')!));
    await waitFor(() => expect(detail(canvasElement).textContent).toContain('Nothing more can be charged'));
    await expect(canvasElement.querySelector('[data-bill-event]')).toBeNull();
    await expect(canvasElement.querySelector('[data-event-row="EV-301"]')!.textContent).toContain('Billed');
  },
};

/** **A billed event takes nothing more**: no charge form, nothing to remove, nothing to bill. */
export const ABilledEventTakesNoCharges: Story = {
  render: () => <Screen edition="v1v2" initialState={at({ selectedEventId: 'EV-300' })} />,
  play: async ({ canvasElement }) => {
    const d = detail(canvasElement);
    await expect(d.querySelector('[data-add-charge]')).toBeNull();
    await expect(d.querySelector('[data-bill-event]')).toBeNull();
    await expect(within(d).queryAllByRole('button', { name: /^Remove / })).toHaveLength(0);
    await expect(d.querySelectorAll('[data-event-charge]').length).toBe(ev('EV-300').ledger.length);
  },
};

/**
 * **A new event, its golf from the sheet.** Pick the outing already on the tee sheet and its players
 * are on the bill from the first moment.
 */
export const ANewEvent: Story = {
  render: () => <Screen edition="v1v2" initialState={at()} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'New event' }));
    const dialog = await screen.findByRole('dialog');
    const d = within(dialog);
    // Nothing saves without a name, a date and an organiser — and it says which is missing.
    await userEvent.click(d.getByRole('button', { name: 'Create event' }));
    await expect(dialog.querySelector('[data-event-form-error]')!.textContent).toContain('a name');
    await userEvent.type(d.getByPlaceholderText('Member-Guest Invitational'), 'Club Championship');
    await userEvent.type(d.getByPlaceholderText('Last, First'), 'Delgado, Ana');
    await userEvent.type(d.getByPlaceholderText('72'), '72');
    await userEvent.type(d.getByPlaceholderText('0.00'), '60');
    await userEvent.selectOptions(dialog.querySelector('select')!, 'grp-member-guest');
    await userEvent.click(d.getByRole('button', { name: 'Create event' }));
    await waitFor(() => expect(canvasElement.querySelector('[data-event-row="EV-303"]')).not.toBeNull());
    await expect(detail(canvasElement).textContent).toContain('Club Championship');
    await expect(detail(canvasElement).querySelector('[data-event-golf]')!.textContent).toContain(money(72 * 60));
  },
};

/** **Editing an event**, from the bar under it rather than an overflow menu. */
export const EditAnEvent: Story = {
  render: () => <Screen edition="v1v2" initialState={at({ selectedEventId: 'EV-302' })} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(detail(canvasElement)).getByRole('button', { name: 'Edit' }));
    const d = within(await screen.findByRole('dialog'));
    const players = d.getByPlaceholderText('72');
    await userEvent.clear(players);
    await userEvent.type(players, '16');
    await userEvent.click(d.getByRole('button', { name: 'Save event' }));
    await waitFor(() => expect(detail(canvasElement).querySelector('[data-fact="Expected"]')!.textContent).toContain('16 players'));
  },
};

/**
 * **Weston's edition has none of it**: no Charge to event at checkout, and no outing on May 30's
 * tee sheet — the events and their bookings are V1 → V2's.
 */
export const WestonHasNone: Story = {
  render: () => <Screen edition="weston" initialState={atVenue('eighteen', { view: 'pos', leftPanelCollapsed: false, cart: LUNCH, modal: { kind: 'checkout' } })} />,
  play: async () => {
    const checkout = await screen.findByRole('dialog');
    await expect(checkout.querySelector('[data-tender="tenderEvent"]')).toBeNull();
    await expect(within(checkout).queryByText('Charge to event')).toBeNull();
  },
};

/** The other half: the same May 30 in Weston's edition has no Member-Guest on the first tee. */
export const WestonHasNoOuting: Story = {
  render: () => <Screen edition="weston" initialState={atVenue('eighteen', { currentDate: new Date(2026, 4, 30) })} />,
  play: async ({ canvasElement }) => {
    const first = SEED_EVENT_BOOKINGS.find((b) => b.groupId === 'grp-member-guest')!;
    await expect(canvasElement.querySelector(`[data-booking-id="${first.id}"]`)).toBeNull();
  },
};
