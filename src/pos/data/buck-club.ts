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
}

export const TAX_TYPES: TaxType[] = [
  { id: 'sales', name: 'Sales Tax', rate: 0.08, isDefault: true },
  { id: 'exempt', name: 'Tax Exempt', rate: 0 },
];

/** "Sales Tax (8.00%)", the way Buck's selects print a tax type. */
export const taxTypeLabel = (t: Pick<TaxType, 'name' | 'rate'>): string => `${t.name} (${(t.rate * 100).toFixed(2)}%)`;

/**
 * Buck › Taxes & Fees › **Tax Rates** — "Which configured tax applies to each kind of line item."
 *
 * Buck sets one per kind of line (and a second, stacking tax for each). Birdie charges **one**
 * sales-tax rate on everything that is not a round, and a round's tax comes from its booking —
 * so today every row below reads the same rate, the one Checkout charges (`taxRateOf`). Splitting
 * food from liquor at the register is listed as *not yet* in `buck-sources.ts`.
 */
export const TAX_RATE_FIELDS: { label: string; appliesTo: string; tax: 'sales' | 'exempt' | 'none' }[] = [
  { label: 'General Tee Fee Tax Rate', appliesTo: 'Green fees', tax: 'sales' },
  { label: 'Transportation Tax Rate', appliesTo: 'Carts and walking fees', tax: 'sales' },
  { label: 'Open Food Tax Rate', appliesTo: 'Food from the menus', tax: 'sales' },
  { label: 'Open Liquor Tax Rate', appliesTo: 'Beer, wine and liquor', tax: 'sales' },
];

/**
 * Buck › Taxes & Fees › **Service Charges**, as percentages. Birdie does not add any of them yet —
 * Checkout's "Service charge" button is a placeholder — so the screen says so beside them.
 */
export const SERVICE_CHARGES: { label: string; percent: number }[] = [
  { label: 'Credit Card Surcharge', percent: 0 },
  { label: 'F&B Service Charge', percent: 18 },
  { label: 'Event Service Charge', percent: 20 },
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
 * Buck › Payments › **Other Settings** — the switches a counter feels. `followed` says whether the
 * prototype honours it today; the rest are shown so the team can see they exist.
 */
export const PAYMENT_OPTIONS: { label: string; on: boolean; followed: boolean }[] = [
  { label: 'Order Cancels Require Manager', on: true, followed: false },
  { label: 'Tee Fee Edits Require Manager', on: false, followed: false },
  { label: 'Pro Shop Accepts Tips', on: true, followed: true },
  { label: 'Paperless Tipping in Restaurant', on: true, followed: true },
  { label: 'Allow refunds without manager pin', on: false, followed: false },
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
