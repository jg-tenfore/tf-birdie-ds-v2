import type { CreditKind } from '../logic/credit-tenders';

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
