import { md3 } from '../../theme/tokens';
import type { BookingStatus } from '../types';

/**
 * Small configuration maps ported verbatim from the prototype.
 *
 * Icon names are Material Symbols ligatures (`'how_to_reg'`, `'wb_cloudy'`) —
 * the prototype renders them through the icon font. In this port they are
 * resolved to `@mui/icons-material` components by `iconFor()` in
 * `../icons.ts`, so the names stay as the shared vocabulary.
 */

/** The three player-level actions reachable from the POS left panel. */
export const AP_CONFIGS: Record<
  string,
  { title: string; icon: string; color: string; accent: string; accentText: string }
> = {
  checkin:   { title:'Check-in',   icon:'how_to_reg', color: md3.primary,  accent:'#dcfce7', accentText:'#16a34a' },
  refund:    { title:'Refund',     icon:'reply',      color:'#d97706',         accent:'#ffdad6', accentText: md3.error },
  raincheck: { title:'Rain Check', icon:'wb_cloudy',  color:'#2563eb',         accent:'#dbeafe', accentText:'#2563eb' },
};

/** The cog menu on the POS left panel, top to bottom. */
export const SETTINGS_MENU_ITEMS: Array<{
  label: string;
  icon: string;
  action: string;
  chevron: boolean;
  destructive?: boolean;
}> = [
  { label: '1 Guest',           icon: 'person_add',        action: 'addGuest',         chevron: true },
  { label: 'Split',             icon: 'call_split',        action: 'split',            chevron: true },
  { label: 'Change Customer',   icon: 'manage_accounts',   action: 'changeCustomer',   chevron: true },
  { label: 'Transfer to Course',icon: 'swap_horiz',        action: 'transferCourse',   chevron: true },
  { label: 'Promo Code',        icon: 'local_offer',       action: 'promoCode',        chevron: true },
  { label: 'Service Charge',    icon: 'add_circle',        action: 'serviceCharge',    chevron: true },
  { label: 'Tax Exempt',        icon: 'receipt_long',      action: 'taxExempt',        chevron: true },
  { label: 'Reprint Receipt',   icon: 'print',             action: 'reprintReceipt',   chevron: true },
  { label: 'Remove Tee Time',   icon: 'delete',            action: 'removeTeeTime',    chevron: false, destructive: true },
  { label: 'Refund',            icon: 'reply',             action: 'refund',           chevron: true, destructive: true },
  { label: 'Issue Raincheck',   icon: 'wb_cloudy',         action: 'raincheck',        chevron: true },
];

/** Payment-reader copy per tender type. `showKeyIn` reveals the manual-entry path. */
export const PR_CONFIG: Record<
  string,
  { icon: string; title: string; subtitle: string; showKeyIn: boolean }
> = {
  card:     { icon: 'credit_card',   title: 'Credit card payment',       subtitle: 'Insert, swipe, or tap card to take payment',  showKeyIn: true  },
  cash:     { icon: 'attach_money',  title: 'Cash payment',              subtitle: 'Collect cash from customer',                  showKeyIn: false },
  giftcert: { icon: 'card_giftcard', title: 'Gift certificate payment',  subtitle: 'Scan or enter gift certificate number',       showKeyIn: true  },
  cashpay:  { icon: 'payments',      title: 'Cash payment',              subtitle: 'Collect cash from customer',                  showKeyIn: false },
};

/**
 * Booking chip colors by status.
 *
 * Every bookable status resolves to the same white-on-green treatment: the
 * prototype deliberately does *not* color-code chips by status, because payment
 * state (the badge) and check-in progress (the dot count) are what an operator
 * scans for. Blocks and events are the exceptions and are styled separately.
 */
export const STATUS_COLORS: Record<string, { bg: string; border: string; dot: string }> = {
  booked: { bg: '#fff', border: md3.primary, dot: md3.primary },
  walkin: { bg: '#fff', border: md3.primary, dot: md3.primary },
  member: { bg: '#fff', border: md3.primary, dot: md3.primary },
  checkedin: { bg: '#fff', border: md3.primary, dot: md3.primary },
  group: { bg: '#fff', border: md3.primary, dot: md3.primary },
};

// ─── Round progress ─────────────────────────────────────────────────────────

/**
 * What `PlayerState.step` means — the one definition the terminal and the phone share.
 *
 * The encoding is the one the demo fixtures, the original's booking context menu
 * (All Checked In = 0 · All Teed Off = 1 · All At Turn = 2 · All Finished = 3) and every
 * "checked in" counter (`step >= 0`) already agree on:
 *
 *   -1 not arrived · 0 checked in · 1 teed off · 2 at the turn · 3+ finished
 *
 * The fixtures also write `6` for a round finished on a past day, which is why a value is
 * resolved with `roundStepOf` (the last step it has reached) and never by indexing.
 * The original's Booking Detail rail was the odd one out: it labelled index 0 "Pending",
 * so every value read one step behind (see the README's Known divergences).
 */
export const ROUND_STEP = { notArrived: -1, checkedIn: 0, teedOff: 1, atTurn: 2, finished: 3 } as const;

/**
 * The round's steps in order. `label` is the phone's sentence-case wording; `railLabel` is
 * the terminal rail's title case, matching the rest of the terminal chrome.
 */
export const ROUND_STEPS = [
  { step: ROUND_STEP.notArrived, label: 'Not arrived', railLabel: 'Not Arrived', icon: 'person' },
  { step: ROUND_STEP.checkedIn, label: 'Checked in', railLabel: 'Checked In', icon: 'how_to_reg' },
  { step: ROUND_STEP.teedOff, label: 'Teed off', railLabel: 'Teed Off', icon: 'sports_golf' },
  { step: ROUND_STEP.atTurn, label: 'At the turn', railLabel: 'At Turn', icon: 'repeat' },
  { step: ROUND_STEP.finished, label: 'Finished', railLabel: 'Finished', icon: 'flag' },
] as const;

export type RoundStep = (typeof ROUND_STEPS)[number];

/** The `ROUND_STEPS` entry a `PlayerState.step` has reached (`6` → Finished). */
export function roundStepOf(p: { step: number }): RoundStep {
  let at: RoundStep = ROUND_STEPS[0];
  for (const r of ROUND_STEPS) if (p.step >= r.step) at = r;
  return at;
}

/** Transport mode → icon name and label, as rendered on cards and chips. */
export const TRANSPORT_META: Record<string, { icon: string; label: string }> = {
  cart: { icon: 'directions_car', label: 'Riding Cart' },
  walking: { icon: 'directions_walk', label: 'Walking' },
  push: { icon: 'electric_scooter', label: 'Push Cart' },
};

/** Statuses that occupy a slot without being a sellable round. */
export const NON_SELLABLE_STATUSES: BookingStatus[] = ['block', 'event'];

/** Sales tax applied at checkout. */
export const TAX_RATE = 0.08;
