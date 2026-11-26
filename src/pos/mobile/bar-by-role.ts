import { ROLE_ACCESS } from '../data/nav';
import type { StaffRole } from '../data/staff';
import type { MobileTab } from './navigation';

/** The golf bar: the pro shop's four destinations, and every edition's bar before V1 → V2. */
export const GOLF_BAR: MobileTab[] = ['tee', 'register', 'people', 'more'];

/**
 * **The navigation bar is the menu, by role** (V1 → V2, Nov 26).
 *
 * Weston approved *Menu by role* on Oct 2 for the tablet's main menu — *"you could be like pro shop
 * and not see any of the restaurant"*, and a bartender *"doesn't need to see the tee sheet"* — and
 * `ROLE_ACCESS` in `data/nav.ts` is that grid. On the handheld the bottom bar is the menu, so it is
 * decided the same way: a role's bar is the destinations its grid allows, up to MD3's limit of
 * five, with More last.
 *
 * - **Pro shop** and **manager** — Tee Sheet · Register · People · More, the golf bar every
 *   existing phone flow is built on. A manager, who may use everything, reaches the restaurant
 *   from **More › Restaurant**, where each screen is a push with a back arrow.
 * - **Server** and **bartender** — Tables · Tabs · Quick Order · More. Their whole shift is the
 *   restaurant, so it is one tap from anywhere; Reservations and Orders & Tips are in More.
 * - **Host** — Tables · Reservations · More: seating, not ordering.
 *
 * Why not one bar with a Restaurant section in More for everyone: a server would then live two
 * taps deep for the whole of a shift. Why not five tabs for a manager: the bar would change under
 * every pro-shop flow and story built so far, for a role that uses the restaurant least. This
 * keeps both, and reads the same grid the tablet's menu reads.
 *
 * Only in V1 → V2 (`restaurant`); Weston Edits and the archive keep the golf bar.
 */
export function barFor(role: StaffRole | undefined, restaurant: boolean): MobileTab[] {
  if (!restaurant || !role) return GOLF_BAR;
  const can = ROLE_ACCESS[role];
  if (can.includes('teesheet')) return GOLF_BAR;
  const bar: MobileTab[] = [];
  if (can.includes('tables')) bar.push('tables');
  if (can.includes('tabs')) bar.push('tabs');
  if (can.includes('quickorder')) bar.push('quick');
  if (can.includes('reservations') && !can.includes('tabs')) bar.push('reservations');
  return [...bar.slice(0, 4), 'more'];
}
