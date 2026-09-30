import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';
import { orderTotals } from '../../../pos/logic/cart';
import type { PosState } from '../../../pos/state/pos-store';
import type { CartItem } from '../../../pos/types';
import { Screen, atVenue } from '../../pos/screen-helpers';

/**
 * V1 → V2 Migration / 11 · Customer Search / Tablet
 *
 * **Find someone, see what they owe and hold, and settle an account — with the money taken at checkout.**
 *
 * ## What v1 did
 *
 * `tf-birdie-ds-v1/app/src/screens/customer-search.tsx` and `new-customer.tsx`, from
 * `references/072926/11-customerSearch/`: a centred heading over one underlined field, a results
 * sheet after two characters, and the record on a second route with Swipe CC, Key CC, Pay on balance
 * and Save in its bottom bar. Adding a customer was a separate full-screen form.
 *
 * ## What was wrong with it
 *
 * - **The membership was baked into the name** — "Weston Farnsworth - 30 Day booking window" — so two
 *   records for one household read as unrelated people, and one person's two records as a family.
 * - **Nothing until you typed**, not even who owes the course.
 * - **Taking money happened on the record.** Swipe and Key CC charged a card with no order in front of
 *   you to say what for.
 * - **The new-customer rule was a secret**: a last name, and a phone *or* an email. You learned it by
 *   failing Save. And the email-domain chips **appended**, so `sam@yahoo.com` + @GMAIL.COM made
 *   `sam@yahoo.com@gmail.com`.
 *
 * ## What this does
 *
 * - **Search and record side by side**; the name is only the name, memberships and types are chips.
 * - **Before you type**: who was added this session, and every account with a balance, largest first.
 * - **House account and card on file are tenders at checkout** (Justin's decision). A house-account
 *   charge raises the balance; the record's **Pay balance** loads an untaxed account payment onto the
 *   register and goes there to be checked out. The card on file is shown here and charged there.
 * - **New customer states the rule first**, ticks each half off as it is met, and its domain chips
 *   replace the domain.
 * - None of it exists in Weston Edits.
 */
const meta = {
  title: 'V1 → V2 Migration/11 · Customer Search/Tablet',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const at = (extra: Partial<PosState> = {}) => atVenue('eighteen', { view: 'customers', leftPanelCollapsed: true, ...extra });

/** The register with lunch on it and a tender dialog open over checkout. */
const lunch: CartItem[] = [
  { name: 'Hamburger', price: 8, qty: 2 },
  { name: 'Gatorade', price: 3.5, qty: 2 },
];
const atCheckout = (modal: PosState['modal'], extra: Partial<PosState> = {}) =>
  atVenue('eighteen', { view: 'pos', leftPanelCollapsed: false, cart: lunch, modal, ...extra });

const dialog = async () => screen.findByRole('dialog');
/** A `ResultRow` inside the tender picker — the row, not its wrapper, carries the click. */
const pickResult = async (id: string) => {
  const hit = await waitFor(() => {
    const el = document.querySelector<HTMLElement>(`[data-tender-result="${id}"]`);
    if (!el) throw new Error(`no result ${id}`);
    return el;
  });
  await userEvent.click(hit.firstElementChild as HTMLElement);
};

/**
 * **Searching, and opening someone.** "Brennevin" finds the family. Each row is the person's name with
 * their membership as a chip beside it — not "Ivar Brennevin - Full Golf" — and opening Ivar shows his
 * house account, card on file and gift cards next to the list, so the next Brennevin is one tap away.
 */
export const SearchAndOpen: Story = {
  render: () => <Screen edition="v1v2" initialState={at()} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByRole('textbox', { name: 'Search customers' }), 'Brennevin');
    const row = await waitFor(() => canvasElement.querySelector<HTMLElement>('[data-customer-row="458337"]')!);
    await expect(row.querySelector('[data-customer-name]')!.textContent).toBe('Ivar Brennevin');
    await expect(row.querySelector('[data-membership-chip="Full Golf"]')).not.toBeNull();
    await expect(row.textContent).not.toContain(' - Full Golf');
    await expect(canvasElement.querySelectorAll('[data-customer-row]').length).toBeGreaterThanOrEqual(3);

    await userEvent.click(row);
    const detail = await waitFor(() => canvasElement.querySelector<HTMLElement>('[data-customer-detail="458337"]')!);
    await expect(detail.querySelector('[data-account-balance]')!.textContent).toBe('$861.00');
    await expect(detail.querySelector('[data-card-on-file="2983"]')).not.toBeNull();
    await expect(detail.querySelectorAll('[data-customer-gift-card]').length).toBe(2);
  },
};

/**
 * **Before anyone types.** v1 opened on an empty field. Here the list is every account that owes the
 * course, largest first — the people a counter is asked about — with what each owes on the row.
 */
export const WhoOwesTheCourse: Story = {
  render: () => <Screen edition="v1v2" initialState={at()} />,
  play: async ({ canvasElement }) => {
    const rows = [...canvasElement.querySelectorAll<HTMLElement>('[data-customer-row]')];
    await expect(rows.length).toBeGreaterThan(5);
    await expect(rows[0].getAttribute('data-customer-row')).toBe('458381');
    await expect(rows[0].textContent).toContain('$2,493.09');
  },
};

/**
 * **Adding a customer, with the rule stated up front.** The form opens saying what it needs — a last
 * name, and a phone or an email — and ticks each off. Add stays disabled and says what is missing,
 * rather than failing. The domain chips **replace**: `sam@yahoo.com` then @gmail.com is
 * `sam@gmail.com`. Saved, the new customer is open on the screen and listed under "Added this session".
 */
export const AddingACustomer: Story = {
  render: () => <Screen edition="v1v2" initialState={at()} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'New customer' }));
    const d = within(await dialog());
    const rule = document.querySelector<HTMLElement>('[data-contact-rule]')!;
    await expect(rule.textContent).toContain('a phone number or an email');
    await expect(rule.querySelector('[data-rule="last-name"]')!.getAttribute('data-met')).toBe('no');
    await expect(d.getByRole('button', { name: 'Add customer' })).toBeDisabled();

    await userEvent.type(d.getAllByRole('textbox')[0], 'Sam');
    await userEvent.type(d.getAllByRole('textbox')[1], 'Quillfeather');
    await expect(rule.querySelector('[data-rule="last-name"]')!.getAttribute('data-met')).toBe('yes');
    await expect(rule.querySelector('[data-rule="contact"]')!.getAttribute('data-met')).toBe('no');
    await expect(document.querySelector('[data-customer-form-problem]')!.textContent).toBe('Add a phone number or an email');

    const email = d.getByPlaceholderText('name@example.com') as HTMLInputElement;
    await userEvent.type(email, 'sam@yahoo.com');
    await userEvent.click(document.querySelector<HTMLElement>('[data-email-domain="@gmail.com"]')!);
    await expect(email.value).toBe('sam@gmail.com');
    await expect(rule.querySelector('[data-rule="contact"]')!.getAttribute('data-met')).toBe('yes');

    await userEvent.click(d.getByRole('button', { name: 'Add customer' }));
    const detail = await waitFor(() => canvasElement.querySelector<HTMLElement>('[data-customer-detail]')!);
    await expect(detail.textContent).toContain('Sam Quillfeather');
    await expect(canvasElement.textContent).toContain('Added this session');
    await expect(canvasElement.querySelector(`[data-customer-row="${detail.getAttribute('data-customer-detail')}"]`)).not.toBeNull();
  },
};

/**
 * **Paying a balance loads the register.** Nadia owes $19.91. Pay balance puts an untaxed account
 * payment on the register — no order to pick, nothing to ring up — and goes there, rail open, for
 * checkout. Paying it off lowers her balance.
 */
export const PayingABalance: Story = {
  render: () => <Screen edition="v1v2" initialState={at({ selectedCustomerId: '458380' })} />,
  play: async ({ canvasElement }) => {
    const detail = canvasElement.querySelector<HTMLElement>('[data-customer-detail="458380"]')!;
    await expect(detail.querySelector('[data-account-balance]')!.textContent).toBe('$19.91');
    await userEvent.click(within(detail).getByRole('button', { name: 'Pay balance' }));
    await waitFor(() => expect(canvasElement.querySelector('[data-customers]')).toBeNull());
    await waitFor(() => expect(canvasElement.textContent).toContain('Account payment · '));
    await expect(canvasElement.textContent).toContain('$19.91');
  },
};

/**
 * **…but not over another order.** With something already on the register, Pay balance is disabled
 * and says why — the account payment and the order would be checked out as one.
 */
export const PayingWaitsForAnEmptyRegister: Story = {
  render: () => <Screen edition="v1v2" initialState={at({ selectedCustomerId: '458380', cart: lunch })} />,
  play: async ({ canvasElement }) => {
    const detail = canvasElement.querySelector<HTMLElement>('[data-customer-detail="458380"]')!;
    await expect(within(detail).getByRole('button', { name: 'Pay balance' })).toBeDisabled();
    await expect(detail.querySelector('[data-pay-balance-problem]')!.textContent).toContain('The register has an order on it');
  },
};

/**
 * **A house-account charge raises the balance.** At checkout, House account: find Ivar — a Full Golf
 * member, so he has an account — see his balance now, the order, and the balance after, then charge
 * it. He owes the course the lunch on top of the $861.00 already on his account.
 */
export const ChargingAHouseAccount: Story = {
  render: () => <Screen edition="v1v2" initialState={atCheckout({ kind: 'tenderHouseAccount' })} />,
  play: async () => {
    const d = within(await dialog());
    await expect(d.getByRole('button', { name: 'Charge' })).toBeDisabled();
    await userEvent.type(d.getByPlaceholderText('Find the customer — name, email, phone'), 'Ivar');
    await pickResult('458337');
    const total = orderTotals(lunch).total;
    const after = (861 + total).toFixed(2);
    await waitFor(() => expect(document.querySelector('[data-balance-after]')!.getAttribute('data-balance-after')).toBe(after));
    await userEvent.click(d.getByRole('button', { name: `Charge $${total.toFixed(2)}` }));
    await screen.findByText(`Charged $${total.toFixed(2)} to Ivar Brennevin’s account · balance $${after}`);
  },
};

/**
 * **House accounts are for members.** Weston's membership has lapsed, and his account with it — so
 * there is nothing to charge: the dialog says so and offers nothing to press.
 */
export const OnlyMembersHaveAnAccount: Story = {
  render: () => <Screen edition="v1v2" initialState={atCheckout({ kind: 'tenderHouseAccount' })} />,
  play: async () => {
    const d = within(await dialog());
    await userEvent.type(d.getByPlaceholderText('Find the customer — name, email, phone'), 'Farnsworth');
    await pickResult('458342');
    await waitFor(() => expect(document.querySelector('[data-no-house-account]')!.textContent).toMatch(/membership has lapsed/));
    await expect(document.querySelector('[data-house-charge]')).toBeNull();
    await expect(d.getByRole('button', { name: 'No house account' })).toBeDisabled();
  },
};

/** **An account payment can't go back on an account.** Paying a house account off with the house account is moving a debt, so it is refused. */
export const AnAccountPaymentCannotGoOnAnAccount: Story = {
  render: () => (
    <Screen
      edition="v1v2"
      initialState={atCheckout(
        { kind: 'tenderHouseAccount' },
        { cart: [{ name: 'Account payment · Nadia Marchetti', price: 19.91, unitPrice: 19.91, qty: 1, accountPayment: { customerId: '458380' } }], payingAccountId: '458380' },
      )}
    />
  ),
  play: async () => {
    const d = within(await dialog());
    await expect(d.getByText(/can’t go back on one/)).toBeTruthy();
    await expect(d.getByRole('button', { name: 'Charge' })).toBeDisabled();
  },
};

/**
 * **Charging the card on file** is a tender too, not a button on the record. Weston's card ends 8243
 * and is good to 05/2038; the charge is what is due.
 */
export const ChargingTheCardOnFile: Story = {
  render: () => <Screen edition="v1v2" initialState={atCheckout({ kind: 'tenderCardOnFile' })} />,
  play: async () => {
    const d = within(await dialog());
    await userEvent.type(d.getByPlaceholderText('Find the customer — name, email, phone'), 'Farnsworth');
    await pickResult('458342');
    await waitFor(() => expect(document.querySelector('[data-card-on-file="8243"]')).not.toBeNull());
    const total = orderTotals(lunch).total.toFixed(2);
    await userEvent.click(d.getByRole('button', { name: `Charge •••• 8243 · $${total}` }));
    await screen.findByText(`Charged $${total} to Weston Farnsworth’s card •••• 8243`);
  },
};

/** **No card, or an expired one, is said up front** — and cannot be charged. */
export const NoCardOrAnExpiredOne: Story = {
  render: () => <Screen edition="v1v2" initialState={atCheckout({ kind: 'tenderCardOnFile' }, { customerEdits: { '458342': { cardExpires: '01/2025' } } })} />,
  play: async () => {
    const d = within(await dialog());
    const find = d.getByPlaceholderText('Find the customer — name, email, phone');
    await userEvent.type(find, 'Farnsworth');
    await pickResult('458342');
    await waitFor(() => expect(document.querySelector('[data-card-expired]')).not.toBeNull());
    await expect(d.getByRole('button', { name: 'Charge' })).toBeDisabled();

    await userEvent.click(d.getByRole('button', { name: 'Change' }));
    await userEvent.type(d.getByPlaceholderText('Find the customer — name, email, phone'), 'Oda Brennevin');
    await pickResult('458339');
    await waitFor(() => expect(document.querySelector('[data-no-card-on-file]')).not.toBeNull());
    await expect(d.getByRole('button', { name: 'Charge' })).toBeDisabled();
  },
};

/**
 * **None of this is in Weston Edits.** `#/customers` falls back to the tee sheet, and checkout offers
 * only the reader's tenders.
 */
export const NotInWestonEdits: Story = {
  render: () => (
    <>
      <Screen edition="weston" initialState={at()} />
      <Screen edition="weston" initialState={atCheckout({ kind: 'checkout' })} />
    </>
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-customers]')).toBeNull();
    await screen.findAllByRole('dialog');
    await expect(document.querySelector('[data-tender]')).toBeNull();
  },
};

/** The same checkout in V1 → V2, for contrast: gift card, house account, card on file and event are tenders. */
export const TheTendersInV1V2: Story = {
  render: () => <Screen edition="v1v2" initialState={atCheckout({ kind: 'checkout' })} />,
  play: async () => {
    await dialog();
    for (const kind of ['tenderGiftCard', 'tenderHouseAccount', 'tenderCardOnFile']) {
      await expect(document.querySelector(`[data-tender="${kind}"]`)).not.toBeNull();
    }
  },
};
