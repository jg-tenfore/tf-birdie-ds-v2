import type { CreditKind } from '../logic/credit-tenders';
import { clubPricingDefaults, type ClubPricing, type Pricing } from '../logic/pricing';
import type { Tab } from '../logic/restaurant';
import type { AppliedDiscount } from '../logic/discounts';
import { productSettings } from '../data/products';
import type { CartItem } from '../types';
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

export type CheckoutModal =
  /** Pay with a rain check, punch card, credit book or lesson credit. `tip`: what checkout recalculated in. */
  | { kind: 'tenderCredit'; credit: CreditKind; tip?: number }
  /** A Buck discount, or a price override, on one line of the order. */
  | { kind: 'lineDiscount'; index: number }
  /** A Buck discount or a promo code on the whole order. */
  | { kind: 'orderDiscount'; tab?: 'types' | 'promo' };

const MODAL_KINDS = new Set<string>(['tenderCredit', 'lineDiscount', 'orderDiscount']);

export const isCheckoutModal = (m: { kind: string }): m is CheckoutModal => MODAL_KINDS.has(m.kind);

// ─── Actions ────────────────────────────────────────────────────────────────

export type CheckoutAction =
  /** A Buck discount on a line, or `null` to take it off. */
  | { type: 'applyLineDiscount'; index: number; discount: AppliedDiscount | null }
  /** A Buck discount or promo code on the whole order — a line of its own. */
  | { type: 'applyOrderDiscount'; discount: AppliedDiscount }
  /** Buck's Price override: a new unit price on a line whose product allows it. */
  | { type: 'overridePrice'; index: number; price: number };

const ACTION_TYPES = new Set<string>(['applyLineDiscount', 'applyOrderDiscount', 'overridePrice']);

export const isCheckoutAction = (a: { type: string }): a is CheckoutAction => ACTION_TYPES.has(a.type);

const cents = (n: number) => Math.round(n * 100) / 100;

export function checkoutReducer(state: PosState, action: CheckoutAction): PosState {
  // A paid order is finished: nothing changes its price.
  if (state.lastPayment || state.splitTender) return state;
  switch (action.type) {
    case 'applyLineDiscount': {
      const line = state.cart[action.index];
      if (!line) return state;
      const cart = state.cart.map((l, i) => {
        if (i !== action.index) return l;
        const { lineDiscount: _drop, ...rest } = l;
        return action.discount ? { ...rest, lineDiscount: action.discount } : rest;
      });
      return { ...state, cart };
    }
    case 'applyOrderDiscount': {
      const d = action.discount;
      // The same type or code twice is one discount: the new one replaces it.
      const same = (l: CartItem) => Boolean(l.orderDiscount && ((d.code && l.orderDiscount.code === d.code) || (d.typeId != null && l.orderDiscount.typeId === d.typeId)));
      const line: CartItem = { name: d.label, price: 0, qty: 1, orderDiscount: d };
      return { ...state, cart: [...state.cart.filter((l) => !same(l)), line] };
    }
    case 'overridePrice': {
      const line = state.cart[action.index];
      const price = cents(action.price);
      if (!line || line.isCheckIn || !productSettings(line.name)?.priceOverride || !(price >= 0)) return state;
      const from = line.priceOverride?.from ?? line.price;
      const cart = state.cart.map((l, i) =>
        i !== action.index ? l : price === from ? (({ priceOverride: _p, ...rest }) => ({ ...rest, price }))(l) : { ...l, price, priceOverride: { from, by: state.operatorId } },
      );
      return { ...state, cart };
    }
  }
}
