import type { NavKey } from '../../pos/data/nav';

/**
 * The V1 → V2 audit, one row per destination in the shipping app's nav.
 *
 * Kept as data so the Overview's coverage table is **generated**, not typed: whether a
 * destination is live comes from `isLive` in `pos/data/nav.ts`, the same flag that decides the
 * tile, so the table cannot claim a screen exists that the nav would refuse to open.
 *
 * `v1` is what the destination is *for* — its job at the counter — and `leftBehind` is what v1's
 * own source notes record as wrong with the shipping app. Both are drawn from
 * `tf-birdie-ds-v1/app/src/screens/*.tsx`, whose doc comments document the real app faithfully,
 * warts included. The owner's instruction for V1 → V2 is to keep the jobs and drop the warts.
 */
export interface MigrationRow {
  key: NavKey;
  /** What it is for, in a line. */
  v1: string;
  /** What v1 recorded as wrong — the convention not to carry over. */
  leftBehind?: string;
  /** Which wave builds it. Waves run in nav order, by the owner's choice. */
  wave: 1 | 2 | 3;
  /** Where it stood before V1 → V2 began, when Weston Edits already had part of it. */
  inherited?: string;
}

export const MIGRATION: MigrationRow[] = [
  // ── Pro Shop ──
  {
    key: 'proshop',
    v1: 'The retail register: tiles, tenders, hold ticket, combos, gift-card issue, cash payout.',
    leftBehind: 'A cash payout was a negative line inside a sale; combos rang up as loose lines anyone could re-price.',
    wave: 1,
    inherited: 'Register and checkout, from Weston Edits',
  },
  {
    key: 'teesheet',
    v1: 'Booking, the tee time detail, edit, cart signout, rain checks.',
    leftBehind: 'The round’s whole commercial story was one unlabelled grey string under each name.',
    wave: 1,
    inherited: 'Fully rebuilt across Weston Edits rounds 1–5',
  },
  {
    key: 'courtsheet',
    v1: 'Tennis, pickleball, basketball and the pool — a column per court.',
    leftBehind: 'Fixed 20-minute cards with no duration, no party size and no price; the booking screen named the court twice and the day not at all.',
    wave: 1,
  },
  {
    key: 'baysheet',
    v1: 'Simulator bays on a continuous time axis, by the hour.',
    leftBehind: 'A second, different scheduler for the same job as Court Sheet.',
    wave: 1,
  },
  // ── Restaurant ──
  {
    key: 'quickorder',
    v1: 'Food and drink at the counter, by menu category.',
    leftBehind: 'Categories replaced the whole browsing surface, so the order being built dropped out of view.',
    wave: 2,
  },
  {
    key: 'tabs',
    v1: 'Open tabs, and the seat-by-seat order editor a tab opens into.',
    leftBehind: 'No sort, no grouping, no status; modifier options looked like radios and behaved like checkboxes.',
    wave: 2,
  },
  {
    key: 'tables',
    v1: 'The live floor — seated or free — and a tap to open the table’s check.',
    wave: 2,
  },
  {
    key: 'reservations',
    v1: 'Restaurant covers by day.',
    leftBehind: 'Knew nothing about tables: reservations and the floor never met.',
    wave: 2,
  },
  {
    key: 'orderstips',
    v1: 'Adjusting card tips after the fact, the cash drop, the day’s prints.',
    leftBehind: 'A table declaring eight columns and filling seven; a totals band with labels and no values.',
    wave: 2,
  },
  {
    key: 'tablechart',
    v1: 'The floor-plan editor. Its layout is what Tables renders.',
    wave: 2,
  },
  // ── The rest ──
  {
    key: 'customersearch',
    v1: 'Search, the customer record, and adding a new customer.',
    leftBehind: 'Membership type baked into the printed name; a validation rule you only discover by failing to save.',
    wave: 3,
    inherited: 'The record and search exist as dialogs, from Weston Edits',
  },
  {
    key: 'orderlookup',
    v1: 'Finding a past order by course, date, order ID, payment ID or product.',
    leftBehind: 'Three stacked fields that read as AND and behave as OR; nothing runs until SEARCH.',
    wave: 3,
  },
  {
    key: 'timeclock',
    v1: 'Clock in, clock out, and the punch log.',
    wave: 3,
  },
  {
    key: 'giftcards',
    v1: 'Every gift card and its balance.',
    leftBehind: 'A spent card was signalled only by dimming its row.',
    wave: 3,
    inherited: 'Balances show on the customer record',
  },
  {
    key: 'events',
    v1: 'Events and outings, and the expense ledger behind each.',
    leftBehind: 'No action bar at all — an overflow menu was the only way to do anything.',
    wave: 3,
    inherited: 'Leagues and outings on the tee sheet',
  },
  {
    key: 'inventory',
    v1: 'Stock counts: expected against actual, per SKU.',
    wave: 3,
  },
  {
    key: 'shift',
    v1: 'Closing the till: the counts, end shift, and the shift history.',
    leftBehind: 'No way out but BACK, and a history table wider than its pane.',
    wave: 3,
  },
  {
    key: 'settings',
    v1: 'Terminal and hardware configuration — a stub in v1.',
    wave: 3,
    inherited: 'Tee sheet settings, from Weston Edits',
  },
];
