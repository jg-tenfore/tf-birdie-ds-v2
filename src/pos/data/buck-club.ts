import type { TenderKey } from '../state/settings';

/**
 * The Dunes of Delgado as TF Buck configures it — the club-wide settings a counter terminal
 * shows or obeys, in Buck's own vocabulary.
 *
 * ## Why this file exists
 *
 * Buck is the back office that sets Birdie up. Its **Course Settings** screen
 * (`tf-buck-ds-v1/src/components/application/buck-v1-old/course-settings-data.ts`) has a section
 * literally called **Birdie** — defaults, point-of-sale options, receipt text — and its Taxes &
 * Fees, Payments, Transportation Types, Printers and Tablets sections decide what the register
 * charges, which tenders checkout offers, and where a ticket prints. Birdie's own Settings used to
 * invent a parallel list. Now it shows these as they are named in Buck, read-only, marked
 * **Set in Buck**, so the team can see at a glance which system owns which setting.
 *
 * ## What is Buck's and what is invented
 *
 * The **structure and the labels** are Buck's, verbatim: section names, group names, field names,
 * toggle labels, printer uses, payment-type names. The **values** are this club's, invented for
 * the demo and kept consistent with Birdie's own data — the green-fee rates and transport the
 * register already sells, its 8% sales tax, its tenders. Buck's sample values come from a
 * capture of a test environment (test tablets, test printers, a tax type called "Crazy Taxes"),
 * which is the right thing for Buck to show and the wrong thing for a counter demo. No person's
 * name, no brand and no image comes across.
 *
 * Fixed data: no clock, no randomness.
 */

/** A Buck Course Settings section, by the name Buck's accordion gives it. */
export type BuckSection =
  | 'Main Info'
  | 'Taxes & Fees'
  | 'Payments'
  | 'Birdie'
  | 'Tablets'
  | 'Transportation Types'
  | 'Printers';

/** Where a club-wide setting is changed. Shown under every read-only group. */
export const buckPath = (section: BuckSection, group?: string): string =>
  ['Buck', 'Course Settings', section, group].filter(Boolean).join(' › ');

// ─── Main Info ──────────────────────────────────────────────────────────────

/** Buck › Course Settings › Main Info — the parts a receipt or a credit reads. */
export const MAIN_INFO = {
  courseName: 'The Dunes of Delgado',
  phone: '(555) 010-4400',
  timeZone: 'Central Standard Time',
  reportingEndTime: '02:00 AM',
} as const;

/**
 * Buck › Main Info › **Credits and Expirations** — "How long issued credits stay valid, in days."
 *
 * A rain check or gift card the counter issues takes its expiry from here. Birdie's rain-check
 * ledger already runs a year (`rain-checks.ts`), which is Buck's 365.
 */
export const CREDIT_EXPIRATIONS: { label: string; days: number }[] = [
  { label: 'Rewards Expiration', days: 365 },
  { label: 'Rain Check Expiration', days: 365 },
  { label: 'Gift Card Expiration', days: 1825 },
];

// ─── Taxes & Fees ───────────────────────────────────────────────────────────

/** Buck › Taxes & Fees › **Tax Types** — the named rates the per-line fields choose from. */
export interface TaxType {
  id: string;
  name: string;
  /** A fraction: 0.08 is 8%. */
  rate: number;
  isDefault?: boolean;
  /**
   * **Same as sales tax**: charged at the default type's rate, as one line with it, until Buck gives
   * the type a rate of its own (`rate`, with this off).
   */
  sameAsDefault?: boolean;
}

export const TAX_TYPES: TaxType[] = [
  { id: 'sales', name: 'Sales Tax', rate: 0.08, isDefault: true },
  // Buck's own name for a liquor tax (Products › Tax types), charged as Open Liquor's Tax Rate 2.
  { id: 'alcohol', name: 'Alcohol Tax', rate: 0.067 },
  // Food's own rate (Nov 26 decision), for clubs where prepared food is taxed differently. This club
  // taxes food at its sales tax, so it is Same as sales tax and prints as one Sales Tax line.
  { id: 'food', name: 'Food Tax', rate: 0.08, sameAsDefault: true },
  { id: 'exempt', name: 'Tax Exempt', rate: 0 },
];

/** "Sales Tax (8.00%)", the way Buck's selects print a tax type. */
export const taxTypeLabel = (t: Pick<TaxType, 'name' | 'rate'>): string => `${t.name} (${(t.rate * 100).toFixed(2)}%)`;

/** The four kinds of line Buck sets a tax for. */
export type TaxField = 'teeFee' | 'transportation' | 'food' | 'liquor';

/**
 * Buck › Taxes & Fees › **Tax Rates** — "Which configured tax applies to each kind of line item."
 *
 * Buck has eight fields: each kind's Tax Rate and a stacking **Tax Rate 2**. Since Nov 26 the register
 * charges them **per line** (`logic/pricing.ts`, V1 → V2): a green fee by the tee-fee rate, a cart by
 * transportation, food by open food, a beer by open liquor plus its Tax Rate 2. A line that is none of
 * the four — a shirt, a sleeve of balls — takes the default tax type, as a Buck product does. A tee
 * time from the sheet is taxed the same way (its green fees and carts), not by a flat tax per seat.
 *
 * Open food takes the **Food Tax** type, which is Same as sales tax at this club.
 */
export const TAX_RATE_FIELDS: { field: TaxField; label: string; appliesTo: string; tax: string; tax2: string | null }[] = [
  { field: 'teeFee', label: 'General Tee Fee Tax Rate', appliesTo: 'Green fees', tax: 'sales', tax2: null },
  { field: 'transportation', label: 'Transportation Tax Rate', appliesTo: 'Carts and walking fees', tax: 'sales', tax2: null },
  { field: 'food', label: 'Open Food Tax Rate', appliesTo: 'Food from the menus', tax: 'food', tax2: null },
  { field: 'liquor', label: 'Open Liquor Tax Rate', appliesTo: 'Beer, wine and liquor', tax: 'sales', tax2: 'alcohol' },
];

/**
 * Buck › Taxes & Fees › **Tax service charges** (Nov 26 decision). Some states tax a mandatory service
 * charge on food; each club follows its own state's rule. Off here. On, a food-and-drink charge is
 * taxed at the Food Tax rate and any other at the sales tax.
 */
export const TAX_SERVICE_CHARGES = false;

/** Buck's service charges, by what they are for. */
export type ServiceChargeId = 'card' | 'fnb' | 'event';

/**
 * Buck › Taxes & Fees › **Service Charges**, as percentages. Added since Nov 26 (V1 → V2), each as its
 * own line on the order, checkout and the receipt, untaxed — Buck's product total is price, tax, tax 2
 * and fees, the fee untaxed:
 *
 * - **F&B Service Charge** on the food and drink of a **table's** tab — table service, not the counter,
 *   with the tip prompt still on top (Nov 26 decision).
 * - **Event Service Charge** on an event's bill.
 * - **Credit Card Surcharge** on a card payment — 0% at this club, so nothing is added unless Buck
 *   pushes a rate.
 *
 * Checkout's **Service charge** button adds any of them by hand too.
 */
export const SERVICE_CHARGES: { id: ServiceChargeId; label: string; percent: number; appliesTo: string }[] = [
  { id: 'card', label: 'Credit Card Surcharge', percent: 0, appliesTo: 'A card payment, on what the card pays' },
  { id: 'fnb', label: 'F&B Service Charge', percent: 18, appliesTo: 'Food and drink on a table’s tab' },
  { id: 'event', label: 'Event Service Charge', percent: 20, appliesTo: 'An event’s bill' },
];

// ─── Payments ───────────────────────────────────────────────────────────────

/**
 * Buck › Payments › **Payment Types**, as Birdie's checkout tenders.
 *
 * Buck's list is long (thirty-odd types, most for back-office use); these are the ones a counter
 * tender maps to. Whether each is on is `terminalSettings.checkout.tenders` — the switch Checkout
 * reads — so a story or a future Buck push that turns one off takes it out of checkout.
 */
export const PAYMENT_TYPES: { tender: TenderKey; buckName: string; note?: string }[] = [
  { tender: 'card', buckName: 'Credit' },
  { tender: 'cash', buckName: 'Cash' },
  { tender: 'giftcard', buckName: 'Gift Card' },
  { tender: 'house', buckName: 'Customer Charge' },
  { tender: 'cardonfile', buckName: 'Credit', note: 'A saved card from Reports › Credits › Payment Sources' },
  { tender: 'event', buckName: 'Accounts Receivable', note: 'Billed to the event, invoiced from Buck' },
  { tender: 'check', buckName: 'Check' },
  { tender: 'cashpay', buckName: 'Course Custom' },
  // Credits as tenders (Nov 26). Rain Check is Buck's own payment type; the other three are redeemed
  // against the credit itself, which is where Buck records them.
  { tender: 'raincheck', buckName: 'Rain Check', note: 'Tee times only, as Buck’s “Rainchecks Only on Tee Times” says' },
  { tender: 'punchcard', buckName: 'Punch card redemption', note: 'Recorded on the card (Products › Punch Cards), not as a payment type' },
  { tender: 'creditbook', buckName: 'Credit book', note: 'Drawn on the book (Reports › Credits › Credit Books) for what it applies to' },
  { tender: 'lessoncredit', buckName: 'Lesson credit', note: 'Recorded on the golfer’s lesson package' },
];

/** Payment types Buck has on that the counter does not offer as a tender. */
export const BUCK_ONLY_PAYMENT_TYPES = ['ACH', 'Tab', 'Internet Sales', 'Management', 'Bad Debt'];

/**
 * Buck › Payments › Other Settings: the two switches that decide when the counter asks for a
 * **manager's PIN** (Nov 26 decision). In October the counter went to PIN sign-in with no manager
 * approvals, so this club has them set that way: refunds need no PIN, and cancelling an order needs no
 * manager. A club that turns either the other way gets the PIN pad at that step (`managerNeededFor`).
 */
export interface ManagerSwitches {
  /** "Allow refunds without manager pin". Off: a refund asks for a manager's PIN. */
  refundsWithoutManagerPin: boolean;
  /** "Order Cancels Require Manager". On: clearing an order asks for a manager's PIN. */
  orderCancelsRequireManager: boolean;
}

export const MANAGER_SWITCHES: ManagerSwitches = { refundsWithoutManagerPin: true, orderCancelsRequireManager: false };

/**
 * Buck › Payments › **Other Settings** — the switches a counter feels. `followed` says whether the
 * prototype honours it today; the rest are shown so the team can see they exist. `managerSwitch` names
 * the two read from the club's live values (`ManagerSwitches`), so Settings shows what the counter does.
 */
export const PAYMENT_OPTIONS: { label: string; on: boolean; followed: boolean; managerSwitch?: keyof ManagerSwitches }[] = [
  { label: 'Order Cancels Require Manager', on: MANAGER_SWITCHES.orderCancelsRequireManager, followed: true, managerSwitch: 'orderCancelsRequireManager' },
  { label: 'Tee Fee Edits Require Manager', on: false, followed: false },
  { label: 'Pro Shop Accepts Tips', on: true, followed: true },
  { label: 'Paperless Tipping in Restaurant', on: true, followed: true },
  { label: 'Allow refunds without manager pin', on: MANAGER_SWITCHES.refundsWithoutManagerPin, followed: true, managerSwitch: 'refundsWithoutManagerPin' },
  { label: 'Credit Card Tips As Cash', on: false, followed: false },
];

// ─── Birdie ─────────────────────────────────────────────────────────────────

/**
 * Buck › Birdie › **Defaults** — "What Birdie preselects when starting a new sale or event."
 *
 * The values are Birdie's own catalog names, so the default Buck names is a rate and a transport
 * row the register really sells (`rate-catalog.ts`).
 */
export const BIRDIE_DEFAULTS: { label: string; value: string }[] = [
  { label: 'Cart Signout Method', value: 'Quick or Signout' },
  { label: 'Default Event Tee Fee', value: 'Rack Prime' },
  { label: 'Default Event Transportation', value: 'Riding Cart' },
  { label: 'Most Common # of Holes', value: '18' },
];

/**
 * Buck › Birdie › **Point of Sale Options** — the eleven switches, in Buck's order and words.
 *
 * `followed` is whether this prototype behaves as the switch says. Where it does not, the
 * Settings screen says "Shown only", so nobody reads a switch here as a promise.
 */
export const POS_OPTIONS: { label: string; on: boolean; followed: boolean; note?: string }[] = [
  { label: 'Auto Print Pro Shop Receipts', on: false, followed: true, note: "Off: each register's Receipts after a sale decides" },
  { label: 'Auto Print Starter Tickets', on: true, followed: false },
  { label: 'Tip Suggestions on F&B Receipts', on: true, followed: true, note: "The percentages are this register's" },
  { label: 'Roll Fees Into Items on Receipts', on: false, followed: false },
  { label: 'Search By SKU', on: true, followed: false },
  { label: 'Blind Checkout', on: true, followed: false },
  { label: 'Force Registered Tee Times', on: false, followed: false },
  { label: 'Require Credit Card To Start Tab', on: false, followed: true },
  { label: 'Only Members Can Charge', on: true, followed: false },
  { label: 'Disallow Negative Balance', on: false, followed: false },
  { label: 'Cross Course Member Balance', on: false, followed: false },
];

/**
 * Buck › Birdie › **Receipt Text**. The Pro Shop tag is the footer Checkout prints
 * (`terminalSettings.checkout.receiptFooter`); the restaurant's prints on a tab's receipt.
 */
export const RECEIPT_TEXT_FIELDS = ['Pro Shop Receipt Tag', 'Restaurant Receipt Tag', 'Cart Sign Out Disclaimer'] as const;
export const RESTAURANT_RECEIPT_TAG = 'Thanks for joining us at the 19th Hole.';
export const CART_SIGN_OUT_DISCLAIMER = 'Carts stay on the paths within 30 yards of every green. The renter is responsible for damage.';

// ─── Transportation Types ───────────────────────────────────────────────────

/**
 * Buck › **Transportation Types** — "Carts and other transport offered at checkout." The rows a
 * seat's transport catalog (`TRANSPORT_RATES`) prices, by mode.
 */
export const TRANSPORTATION_TYPES: { type: string; mode: 'cart' | 'walking' | 'push'; booking: boolean; isDefault: boolean }[] = [
  { type: 'Cart', mode: 'cart', booking: true, isDefault: true },
  { type: 'Walk', mode: 'walking', booking: true, isDefault: false },
  { type: 'Push Cart', mode: 'push', booking: false, isDefault: false },
];

// ─── Printers and Tablets ───────────────────────────────────────────────────

/** What a printer is for, in Buck's words (Course Settings › Printers › Uses). */
export type PrinterUse = 'Pro Shop Printer' | 'F&B Receipt Printer' | 'Service Printer' | 'Sticker Printer';

export interface ClubPrinter {
  name: string;
  uses: PrinterUse[];
  mac: string;
  /** Pop the cash drawer on a cash sale. */
  popOnCash: boolean;
}

/**
 * Buck › **Printers** — "Receipt and ticket printers for this course." A register chooses among
 * the ones whose uses include the job (`printersFor`); the list itself is the club's.
 */
export const PRINTERS: ClubPrinter[] = [
  { name: 'Pro Shop Counter', uses: ['Pro Shop Printer', 'F&B Receipt Printer'], mac: '00:11:62:4a:10:01', popOnCash: true },
  { name: 'Starter Booth', uses: ['Pro Shop Printer'], mac: '00:11:62:4a:10:02', popOnCash: false },
  { name: 'Kitchen Hot Line', uses: ['Service Printer'], mac: '00:11:62:4a:10:04', popOnCash: false },
  { name: '19th Hole Bar', uses: ['F&B Receipt Printer', 'Service Printer'], mac: '00:11:62:4a:10:03', popOnCash: true },
  { name: 'Back Office Labels', uses: ['Sticker Printer'], mac: '00:11:62:4a:10:05', popOnCash: false },
];

export const printersFor = (use: PrinterUse): ClubPrinter[] => PRINTERS.filter((p) => p.uses.includes(use));

/** Buck › **Tablets** — "Registered tablets and what each one is assigned to." */
export interface RegisteredTablet {
  /** Buck's six-digit number. */
  id: string;
  description: string;
  /** The device identifier Buck shows; the demo's are invented. */
  identifier: string;
  printer: string;
}

export const TABLETS: RegisteredTablet[] = [
  { id: '000112', description: 'Register 1', identifier: '5b1e0c9a7d2f4e31', printer: 'Pro Shop Counter' },
  { id: '000113', description: 'Starter Booth', identifier: '8c4d21f06a9b3e77', printer: 'Starter Booth' },
  { id: '000118', description: '19th Hole Bar', identifier: 'a07e3b5c19d26f48', printer: '19th Hole Bar' },
  { id: '000121', description: 'Beverage Cart', identifier: 'e2f9604d8b1c7a35', printer: '' },
];

/** This terminal's row in Buck's Tablets table. */
export const THIS_TABLET = TABLETS[0];
