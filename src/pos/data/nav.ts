/**
 * The app's destinations, and which of them this prototype actually has.
 *
 * Transcribed from v1's flyout drawer (`tf-birdie-ds-v1`, `components/app-chrome/nav-items.ts`)
 * so the two prototypes agree on what the product contains. The order and grouping are the
 * shipping app's, not ours to tidy.
 *
 * `live` is the honest part. Weston asked for the unbuilt destinations to be dimmed rather
 * than faked, so this flag is the single place that decides it — a destination becomes real by
 * being wired here, not by someone remembering to un-dim a tile.
 *
 * It is per edition, because V1 → V2 has screens Weston Edits does not. `true` means live
 * wherever the nav exists; `'v1v2'` means live only in V1 → V2. `isLive` is the one reader.
 */
import type { Edition } from '../edition';
import type { StaffRole } from './staff';

export type NavKey =
  | 'proshop'
  | 'teesheet'
  | 'courtsheet'
  | 'baysheet'
  | 'quickorder'
  | 'tabs'
  | 'tables'
  | 'reservations'
  | 'orderstips'
  | 'tablechart'
  | 'customersearch'
  | 'orderlookup'
  | 'timeclock'
  | 'giftcards'
  | 'events'
  | 'inventory'
  | 'shift'
  | 'settings';

export interface NavItem {
  key: NavKey;
  label: string;
  /** A registered name in `icons.ts` — the icon test fails the build on an unregistered one. */
  icon: string;
  /**
   * Where the screen exists. Unset renders the tile dimmed and unclickable everywhere; `'v1v2'`
   * makes it live in V1 → V2 only, which is how a migrated destination arrives.
   */
  live?: true | 'v1v2';
}

export interface NavGroup {
  /** Grey heading above the group; the last block has none, as in the shipping app. */
  heading?: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    heading: 'Pro Shop',
    items: [
      { key: 'proshop', label: 'Pro Shop', icon: 'storefront', live: true },
      { key: 'teesheet', label: 'Tee Sheet', icon: 'golf_course', live: true },
      { key: 'courtsheet', label: 'Court Sheet', icon: 'sports_tennis', live: 'v1v2' },
      { key: 'baysheet', label: 'Bay Sheet', icon: 'sports_golf', live: 'v1v2' },
    ],
  },
  {
    heading: 'Restaurant',
    items: [
      { key: 'quickorder', label: 'Quick Order', icon: 'bolt' , live: 'v1v2' },
      { key: 'tabs', label: 'Tabs', icon: 'credit_card' , live: 'v1v2' },
      { key: 'tables', label: 'Tables', icon: 'restaurant' , live: 'v1v2' },
      { key: 'reservations', label: 'Reservations', icon: 'assignment_turned_in' , live: 'v1v2' },
      { key: 'orderstips', label: 'Orders & Tips', icon: 'attach_money' , live: 'v1v2' },
      { key: 'tablechart', label: 'Table Chart', icon: 'grid_view' , live: 'v1v2' },
    ],
  },
  {
    items: [
      // Both of these have screens already — the golfer search modal and the tee sheet's
      // settings panel — so they are live rather than dimmed. In V1 → V2 Customer Search is a
      // screen of its own (Wave 3); elsewhere it is still the search modal.
      { key: 'customersearch', label: 'Customer Search', icon: 'search', live: true },
      { key: 'settings', label: 'Settings', icon: 'settings', live: true },
      { key: 'orderlookup', label: 'Order Lookup', icon: 'receipt_long', live: 'v1v2' },
      { key: 'timeclock', label: 'Time Clock', icon: 'schedule', live: 'v1v2' },
      { key: 'giftcards', label: 'Gift Cards', icon: 'card_giftcard', live: 'v1v2' },
      { key: 'events', label: 'Events', icon: 'calendar_month', live: 'v1v2' },
      { key: 'inventory', label: 'Inventory', icon: 'inventory_2', live: 'v1v2' },
      { key: 'shift', label: 'Shift', icon: 'badge', live: 'v1v2' },
    ],
  },
];

/** Every key the nav knows, for the deep-link codec and its tests. */
export const NAV_KEYS: NavKey[] = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.key));

export function isNavKey(v: string): v is NavKey {
  return (NAV_KEYS as string[]).includes(v);
}

/**
 * Identity for the overlay header, matching v1's dark drawer block.
 *
 * The shipping app prints the build and the device because a support call starts by asking
 * for them.
 */
export const APP_IDENTITY = {
  product: 'TenFore Birdie',
  version: 'v. 5.6.18.52',
  account: 'Test Test Account (test@testmember.com)',
  facility: 'The Dunes of Delgado PROD',
  device: 'sdk_gphone64_arm64',
} as const;

/** Whether a destination opens in this edition. The only reader of `live`. */
export function isLive(item: NavItem, edition: Edition): boolean {
  if (item.live === true) return true;
  if (item.live === 'v1v2') return edition === 'v1v2';
  return false;
}

// ─── By role (V1 → V2, 100226) ──────────────────────────────────────────────

const RESTAURANT: NavKey[] = ['quickorder', 'tabs', 'tables', 'reservations', 'orderstips', 'tablechart'];
const PRO_SHOP: NavKey[] = ['proshop', 'teesheet', 'courtsheet', 'baysheet'];
const SHARED: NavKey[] = ['customersearch', 'orderlookup', 'timeclock', 'giftcards'];

/**
 * What each role's menu shows. Justin, Sep 30: *"if it's just a bartender, right? She doesn't need to
 * see the tee sheet"*; Weston: *"you could be like pro shop and not see any of the restaurant."* He
 * approved the grid on Oct 2 (*"it'll just change dynamically based on what access they have"*) and
 * wants editing it to live in Buck, so Birdie only reads it.
 */
export const ROLE_ACCESS: Record<StaffRole, NavKey[]> = {
  manager: NAV_KEYS,
  server: [...RESTAURANT, ...SHARED],
  bartender: [...RESTAURANT, ...SHARED],
  host: ['tables', 'reservations', 'tablechart', 'customersearch', 'timeclock'],
  'pro-shop': [...PRO_SHOP, ...SHARED, 'events', 'inventory', 'shift'],
};

/** The groups a role's menu shows — destinations it can't use are left out, not dimmed. */
export const navGroupsFor = (role: StaffRole | undefined): NavGroup[] =>
  NAV_GROUPS.map((g) => ({ ...g, items: role ? g.items.filter((i) => ROLE_ACCESS[role].includes(i.key)) : g.items })).filter((g) => g.items.length > 0);
