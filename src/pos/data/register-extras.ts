import { COMBOS_CATEGORY } from './combos';
import type { SETTINGS_MENU_ITEMS } from './config';

/**
 * Where the register's V1 → V2 functions sit, as data — the category buttons and the cog-menu
 * entry. Icon names here are object fields, which `icons.test.ts` cannot see, so
 * `register-extras.test.ts` checks them against `ICONS` instead.
 */

/**
 * Category buttons added to the register's grid in V1 → V2, as a row of their own below the
 * catalog's two.
 *
 * - **Combos** is a category like any other: it opens a grid of combo tiles. v1 put combos
 *   behind a COMBOS button on the bottom bar that went to a screen of its own, with its own
 *   back button — a second way of browsing for things to sell, when the register already has
 *   one. Here it is where the other things to sell are.
 * - **Gift card** is a destination, not a list: a card has no price until somebody picks one
 *   and no meaning until it has a recipient, so the button opens the dialog directly. That much
 *   v1 had right ("a category tile is a destination, not necessarily a list").
 *
 * A row of their own, rather than appended to the catalog's, so the base and Weston editions'
 * grid — which staff navigate by position — is not rearranged by something they do not have.
 */
export const REGISTER_CATEGORIES: Array<{
  key: string;
  label: string;
  icon: string;
  color: string;
  tc: string;
  /** Opens a dialog instead of selecting a category. */
  opens?: 'giftCard';
}> = [
  { key: COMBOS_CATEGORY, label: 'Combos', icon: 'fastfood', color: '#0f766e', tc: '#fff' },
  { key: 'GIFT CARD', label: 'Gift card', icon: 'redeem', color: '#9d174d', tc: '#fff', opens: 'giftCard' },
];

/**
 * The cog menu's **Cash payout** entry, appended to `SETTINGS_MENU_ITEMS` in V1 → V2 only.
 *
 * In the cog because a payout is a register-level action — it belongs to the drawer, not to
 * whatever order happens to be on the rail — and the cog is where the rail's other
 * not-about-this-line actions already live. v1 put it in the register's overflow menu too, but
 * then made it a line on the sale.
 */
export const CASH_PAYOUT_MENU_ITEM: (typeof SETTINGS_MENU_ITEMS)[number] = {
  label: 'Cash payout',
  icon: 'payments',
  action: 'cashPayout',
  chevron: true,
};
