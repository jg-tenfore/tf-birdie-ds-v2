import type { CreditKind } from '../logic/credit-tenders';
import { clubPricingDefaults, type ClubPricing, type Pricing } from '../logic/pricing';
import type { Tab } from '../logic/restaurant';
import type { PosState } from './pos-store';

// ─── State ──────────────────────────────────────────────────────────────────

export interface CheckoutState {
  /**
   * V1 → V2 prices by Buck (Nov 26): tax per line by Buck's tax types, service charges, Buck's
   * discounts. Set by the shell for the current edition, like `transportFromRow` — so the archived
   * base edition keeps its one sales-tax rate and nothing there moves.
   */
  buckCheckout: boolean;
  /** Buck's club pricing — tax types, per-kind rates, service charges. Set in Buck; a story can push other values. */
  clubPricing: ClubPricing;
}

export const checkoutDefaults = (): CheckoutState => ({
  buckCheckout: false,
  clubPricing: clubPricingDefaults(),
});

/**
 * How the register prices an order: Settings' one sales-tax rate, or — in V1 → V2 — Buck's per-line
 * pricing, knowing what kind of order it is: a table's tab takes the F&B Service Charge, an event's
 * bill the Event Service Charge. `tab` prices a tab that is not on the register (Tabs, Tables).
 *
 * Every total reads this — the rail, checkout, the readers, a tab's own total — so they agree.
 */
export function pricingOf(
  s: Pick<PosState, 'buckCheckout' | 'clubPricing' | 'terminalSettings'> & Partial<Pick<PosState, 'payingTabId' | 'tabs' | 'payingEventId'>>,
  ctx: { tab?: Pick<Tab, 'tableId'> | null } = {},
): number | Pricing {
  const rate = s.terminalSettings.checkout.taxRate;
  if (!s.buckCheckout) return rate;
  const tab = ctx.tab !== undefined ? ctx.tab : s.payingTabId ? s.tabs?.find((t) => t.id === s.payingTabId) : null;
  return {
    kind: 'buck',
    club: s.clubPricing,
    salesRate: rate,
    ...(tab?.tableId && { dineIn: true }),
    ...(ctx.tab === undefined && s.payingEventId && { eventBill: true }),
  };
}

// ─── Dialogs ────────────────────────────────────────────────────────────────

/**
 * Checkout's dialogs (Nov 26, "checkout that's right" — V1 → V2): the credit tenders, and the order
 * tools around them. Merged into `Modal` by `pos-store.ts`, routed by `modals/CheckoutDialogs.tsx`.
 * None is linkable — a tender half-chosen is not a place, as Wave 3 decided for its own.
 */
export type CheckoutModal =
  /** Pay with a rain check, punch card, credit book or lesson credit. `tip`: what checkout recalculated in. */
  { kind: 'tenderCredit'; credit: CreditKind; tip?: number };

const MODAL_KINDS = new Set<string>(['tenderCredit']);

export const isCheckoutModal = (m: { kind: string }): m is CheckoutModal => MODAL_KINDS.has(m.kind);
