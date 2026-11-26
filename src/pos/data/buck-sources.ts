/**
 * Where each thing Birdie shows is configured in TF Buck — the back office that sets the counter up
 * (Nov 26). A Start Here page renders this table so the team can see, area by area, which system
 * owns what and how far the prototype follows it.
 *
 * - `birdieArea` is a nav destination label exactly as `nav.ts` has it.
 * - `buckScreen` is Buck's own path to the screen that configures it.
 * - `buckFile` is the Buck prototype file the data and vocabulary came from, relative to
 *   `tf-buck-ds-v1/`.
 * - `birdieFile` is where Birdie keeps its side.
 * - `status`: **aligned** — same names, structure and rules; **partial** — Buck's vocabulary and
 *   structure, with a stated difference; **not yet** — Buck has it, the counter does not.
 *
 * Plain data, no imports, so a docs page can render it without pulling in the app.
 */

export type BuckAlignment = 'aligned' | 'partial' | 'not yet';

export interface BuckSource {
  birdieArea: string;
  /** What the counter shows or obeys. */
  shows: string;
  buckScreen: string;
  buckFile: string;
  birdieFile: string;
  status: BuckAlignment;
  /** What differs, or what is missing, in a sentence. */
  note?: string;
}

const COURSE_SETTINGS = 'src/components/application/buck-v1-old/course-settings-data.ts';
const PRODUCTS = 'src/components/application/products-oct-27/data.ts';
const CREDITS = 'src/components/application/credits-oct-27/data.ts';
const BAYS = 'src/components/application/nov-11-2026/bay-data.ts';

export const BUCK_SOURCES: BuckSource[] = [
  // ─── Settings ─────────────────────────────────────────────────────────────
  {
    birdieArea: 'Settings',
    shows: 'Birdie defaults, Point of Sale Options and Receipt Text, read-only and marked Set in Buck',
    buckScreen: 'Buck › Course Settings › Birdie',
    buckFile: COURSE_SETTINGS,
    birdieFile: 'src/pos/data/buck-club.ts',
    status: 'partial',
    note: 'Labels and structure are Buck’s. Of the eleven POS options the prototype acts on three (auto-print receipts, tip suggestions, card to start a tab); the rest say “Shown only”.',
  },
  {
    birdieArea: 'Settings',
    shows: 'The tax each kind of line is charged, and service charges',
    buckScreen: 'Buck › Course Settings › Taxes & Fees',
    buckFile: COURSE_SETTINGS,
    birdieFile: 'src/pos/data/buck-club.ts',
    status: 'partial',
    note: 'Buck sets a tax per line type (tee fee, transportation, food, liquor); Birdie charges one sales-tax rate on all of them. Service charges are shown, not added.',
  },
  {
    birdieArea: 'Settings',
    shows: 'Which tenders checkout offers, as Buck payment types; payment options',
    buckScreen: 'Buck › Course Settings › Payments',
    buckFile: COURSE_SETTINGS,
    birdieFile: 'src/pos/data/buck-club.ts',
    status: 'aligned',
    note: 'Every checkout tender maps to one Buck payment type, and the on/off switch is the one checkout reads.',
  },
  {
    birdieArea: 'Settings',
    shows: 'Transportation types, with the transport rows the register prices',
    buckScreen: 'Buck › Course Settings › Transportation Types',
    buckFile: COURSE_SETTINGS,
    birdieFile: 'src/pos/data/buck-club.ts',
    status: 'aligned',
  },
  {
    birdieArea: 'Settings',
    shows: 'The club’s printers by use, and this tablet’s registration',
    buckScreen: 'Buck › Course Settings › Printers · Tablets',
    buckFile: COURSE_SETTINGS,
    birdieFile: 'src/pos/data/buck-club.ts',
    status: 'aligned',
    note: 'A register picks its Pro Shop and Service printers from the printers Buck lists for that use.',
  },
  {
    birdieArea: 'Settings',
    shows: 'Receipt header, credit expirations',
    buckScreen: 'Buck › Course Settings › Main Info',
    buckFile: COURSE_SETTINGS,
    birdieFile: 'src/pos/data/buck-club.ts',
    status: 'aligned',
  },
  {
    birdieArea: 'Settings',
    shows: 'Staff & PINs (managers edit at the counter)',
    buckScreen: 'Buck › Employees',
    buckFile: 'src/stories/screens/Employees.stories.tsx',
    birdieFile: 'src/pos/state/settings.ts',
    status: 'partial',
    note: 'Buck keeps employees and PINs too. Birdie still lets a manager edit them at the counter; which system owns them is an open question.',
  },
  {
    birdieArea: 'Settings',
    shows: 'Tip suggestion percentages and the new gift card default',
    buckScreen: '—',
    buckFile: '—',
    birdieFile: 'src/pos/state/settings.ts',
    status: 'not yet',
    note: 'Buck has a Tip Suggestions on/off switch but no percentages, and no gift-card default. Marked “Not in Buck” on the counter.',
  },

  // ─── Restaurant ───────────────────────────────────────────────────────────
  {
    birdieArea: 'Quick Order',
    shows: 'The menu running now, by day and time, with every other menu one tap away',
    buckScreen: 'Buck › Products › Menus',
    buckFile: PRODUCTS,
    birdieFile: 'src/pos/data/menu-schedule.ts',
    status: 'partial',
    note: 'Buck’s five menus, titles and windows as Buck has them. Lunch is Birdie’s addition so the dining room has a running menu at the demo’s noon.',
  },
  {
    birdieArea: 'Tabs',
    shows: 'Modifier groups by Buck’s names, numbers and button colours',
    buckScreen: 'Buck › Products › Modifiers',
    buckFile: PRODUCTS,
    birdieFile: 'src/pos/data/menu.ts',
    status: 'partial',
    note: 'Temp, Sides, Cheeses, Sandwich Toppings, Side Sauces and Allergies are Buck’s. Buck’s sample calls its burger add-ons “Burger Temps”; Birdie calls them Burger Add-ons. Enhancements, Add Protein and Hold are Birdie’s.',
  },
  {
    birdieArea: 'Tabs',
    shows: 'Discount types in a plate’s Discount row, limited to the line’s category, approval for managers',
    buckScreen: 'Buck › Products › Discount Types',
    buckFile: PRODUCTS,
    birdieFile: 'src/pos/data/discount-types.ts',
    status: 'partial',
    note: 'Percent types only. Buck’s amount (Dollar Off, Memberships) and cost-plus types need a dollar discount and a product cost the register does not have.',
  },
  {
    birdieArea: 'Pro Shop',
    shows: 'Combos with Buck’s department; Turn Special and 6 Pack Combo by Buck’s titles',
    buckScreen: 'Buck › Products › Combos',
    buckFile: PRODUCTS,
    birdieFile: 'src/pos/data/combos.ts',
    status: 'partial',
    note: 'Four of the six combos are Birdie’s own bundles.',
  },
  {
    birdieArea: 'Pro Shop',
    shows: 'Products, product groups, price stickers, rewards',
    buckScreen: 'Buck › Products › List · Product Groups · Price Stickers · Rewards',
    buckFile: PRODUCTS,
    birdieFile: 'src/pos/data/catalog.ts',
    status: 'not yet',
    note: 'The register still sells Birdie’s ported catalog; SKUs, groups and departments are not wired.',
  },

  // ─── Credits ──────────────────────────────────────────────────────────────
  {
    birdieArea: 'Gift Cards',
    shows: 'Gift cards: type, what they are good for, awarded, used and balance',
    buckScreen: 'Buck › Reports › Credits › Gift Cards',
    buckFile: CREDITS,
    birdieFile: 'src/pos/data/customers.ts',
    status: 'partial',
    note: 'Same instrument and types; Birdie’s “good for” categories are Buck’s restrictions. Birdie still says Spent where Buck says Amount used.',
  },
  {
    birdieArea: 'Gift Cards',
    shows: 'Credit books: which book paid a Winnings card, and the books on a customer’s record',
    buckScreen: 'Buck › Reports › Credits › Credit Books',
    buckFile: CREDITS,
    birdieFile: 'src/pos/data/credits.ts',
    status: 'partial',
    note: 'Read-only at the counter; a book is never a tender. Which book paid a card is derived, not recorded.',
  },
  {
    birdieArea: 'Customer Search',
    shows: 'Punch cards: Green Fee item in rounds, awarded, used, remaining, and Buck’s status',
    buckScreen: 'Buck › Products › Punch Cards (final design)',
    buckFile: 'src/components/application/punch-cards-table/data.ts',
    birdieFile: 'src/pos/data/credits.ts',
    status: 'partial',
    note: 'Buck cards can hold carts, products, activities, clinics and lessons; Birdie’s hold rounds only (Weston: a punch pays the green fee, the ride is still billed). Expired cards no longer pay.',
  },
  {
    birdieArea: 'Customer Search',
    shows: 'Rain checks: the round, awarded, used, balance, a year to spend it',
    buckScreen: 'Buck › Reports › Credits › Rain Checks',
    buckFile: CREDITS,
    birdieFile: 'src/pos/data/rain-checks.ts',
    status: 'aligned',
  },

  // ─── Bays and members ─────────────────────────────────────────────────────
  {
    birdieArea: 'Bay Sheet',
    shows: 'Ten bays with capacities, Buck’s fees, the daily limit',
    buckScreen: 'Buck › Simulator Bays › Bay Sheet',
    buckFile: BAYS,
    birdieFile: 'src/pos/data/resources.ts',
    status: 'aligned',
    note: 'Open question carried from Buck: does the daily limit count bookings or hours? Birdie counts bookings.',
  },
  {
    birdieArea: 'Bay Sheet',
    shows: 'Layout A: tap open time to book, drag to move, drag the bottom edge or +30m/+1h to extend, undo, refusals that say why, 560px slide-over',
    buckScreen: 'Buck › Simulator Bays › Bay Sheet (decided Nov 24)',
    buckFile: 'src/components/application/nov-11-2026/bay-sheet.tsx',
    birdieFile: 'src/pos/components/ResourceSheetView.tsx',
    status: 'partial',
    note: 'Blocks (repairs, league setup), repeating bookings and booking statuses (no-show, cancelled) are Buck’s and not on the counter yet.',
  },
  {
    birdieArea: 'Bay Sheet',
    shows: 'The ribbon in the golfer’s membership colour',
    buckScreen: 'Buck › Membership › Memberships (plan colour)',
    buckFile: BAYS,
    birdieFile: 'src/pos/data/memberships.ts',
    status: 'aligned',
  },
  {
    birdieArea: 'Customer Search',
    shows: 'Membership chips with their plan’s colour',
    buckScreen: 'Buck › Membership › Memberships',
    buckFile: 'src/stories/screens/Membership.stories.tsx',
    birdieFile: 'src/pos/data/memberships.ts',
    status: 'partial',
    note: 'Plan colours are Birdie’s tier colours, so the tee sheet’s member dot keeps its colour. A Senior member still draws the senior tier dot on the tee sheet.',
  },
  {
    birdieArea: 'Tee Sheet',
    shows: 'Member dots in the plan colour',
    buckScreen: 'Buck › Membership › Memberships',
    buckFile: 'src/stories/screens/Membership.stories.tsx',
    birdieFile: 'src/pos/data/memberships.ts',
    status: 'partial',
    note: 'The tee sheet still draws by tier, which matches the plan colour for every plan but the Senior and Junior customer-type overrides.',
  },
  {
    birdieArea: 'Tee Sheet',
    shows: 'Booking rules, fees on advance bookings, waitlist',
    buckScreen: 'Buck › Course Settings › Booking Engine · Booking Rules · Taxes & Fees › Fee tables',
    buckFile: COURSE_SETTINGS,
    birdieFile: '—',
    status: 'not yet',
  },
  {
    birdieArea: 'Court Sheet',
    shows: 'Courts and their pricing',
    buckScreen: 'Buck › Activities',
    buckFile: 'src/stories/screens/Activities.stories.tsx',
    birdieFile: 'src/pos/data/resources.ts',
    status: 'not yet',
    note: 'The court sheet shares the bay sheet’s model and interactions; its courts and rates are still Birdie’s placeholders.',
  },
  {
    birdieArea: 'Events',
    shows: 'Default event tee fee and transportation',
    buckScreen: 'Buck › Course Settings › Birdie › Defaults',
    buckFile: COURSE_SETTINGS,
    birdieFile: 'src/pos/data/buck-club.ts',
    status: 'partial',
    note: 'Shown in Settings; the Events screen does not preselect them yet.',
  },
];

/** How many areas sit at each status — for a summary line. */
export const buckAlignmentCounts = (): Record<BuckAlignment, number> =>
  BUCK_SOURCES.reduce((n, s) => ({ ...n, [s.status]: n[s.status] + 1 }), { aligned: 0, partial: 0, 'not yet': 0 } as Record<BuckAlignment, number>);
