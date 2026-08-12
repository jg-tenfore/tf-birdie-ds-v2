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

/** Progress rail for a player's round. Index matches `PlayerState.step`. */
export const STATUS_STEPS = ['Pending', 'Checked In', 'Teed Off', 'At Turn', 'Finished'] as const;

/** Material Symbols names for each step in `STATUS_STEPS`. */
export const STATUS_STEP_ICONS = [
  'person',
  'how_to_reg',
  'sports_golf',
  'repeat',
  'flag',
] as const;

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
