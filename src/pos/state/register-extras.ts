import { toDateStr } from '../data/courses';
import { demoNow } from '../data/bookings';
import { comboById } from '../data/combos';
import { liveCustomer } from '../data/roster';
import type { CustomerGiftCard } from '../data/customers';
import {
  addCombo,
  customerGiftCard,
  defaultHoldName,
  giftCardLine,
  giftCardProblem,
  payoutProblem,
  pendingGiftCards,
  type GiftCardDraft,
  type PayoutDraft,
  type PayoutReason,
} from '../logic/register-extras';
import type { CartGiftCard } from '../types';
import type { PosState } from './pos-store';

/**
 * The register's V1 → V2 state: held orders, drawer events and issued gift cards, and the
 * actions that write them.
 *
 * A slice of its own rather than more cases in `pos-store.ts`, so the four register functions
 * can be read — and merged — as one piece. `pos-store.ts` extends `PosState` with
 * `RegisterExtrasState`, spreads `registerExtrasDefaults()` into the initial state, and hands
 * every `RegisterExtrasAction` to `registerExtrasReducer`. Nothing else there knows about them,
 * except `recordPayment`, which issues the gift cards on the order it just took payment for.
 *
 * ## Session data, not navigation
 *
 * All three lists are things that *happened* — an order parked, cash paid out, a card sold.
 * `applyUrl` resets what a link describes (a dialog, a panel) on Back / Forward and leaves
 * everything else alone, so these survive it the way bookings and courts do. A held order that
 * vanished because someone pressed Back would be a lost sale.
 *
 * Every action here is a no-op outside V1 → V2 only because nothing outside V1 → V2 dispatches
 * one: the controls that do are all behind `useV1V2()`. The base and Weston editions carry the
 * empty lists and never touch them.
 */

// ─── Held orders ────────────────────────────────────────────────────────────

/**
 * The fields that *are* the order on the rail — what holding parks and resuming restores.
 *
 * Everything `clearOrder` resets that describes the order itself. `lastPayment` is deliberately
 * absent: a paid order is finished, not parked, and Hold refuses one. If `clearOrder` ever
 * starts resetting another order field, add it here too — `register-extras.test.ts` compares
 * the two and fails if they drift.
 */
export const ORDER_FIELDS = [
  'cart',
  'orderSeats',
  'selectedGolfer',
  'selectedBookingId',
  'flowMode',
  'additionalGolfers',
  'orderScenario',
] as const satisfies ReadonlyArray<keyof PosState>;

export type OrderSnapshot = Pick<PosState, (typeof ORDER_FIELDS)[number]>;

/**
 * An order parked off the rail.
 *
 * v1's HOLD moved the ticket into the restaurant's Tabs list — one collection for bar tabs,
 * table checks and a pro-shop sale somebody stepped away from, told apart by status. That is
 * why "where did my held order go" had an answer in the restaurant. Here held orders are their
 * own list: the Tabs of a later wave are a different thing (a running check, opened on purpose)
 * and mixing a parked golf order into them is exactly what made v1's list hard to scan.
 *
 * It keeps the whole order — lines, the golfer, the booking it was loaded from, the seats of a
 * split bill — so resuming puts the rail back exactly as it was.
 */
export interface HeldOrder {
  /** `H-1`, `H-2`, … from `registerSeq.held`, never reused in a session. */
  id: string;
  name: string;
  /** `h:mm AM` on the demo clock. */
  heldAt: string;
  order: OrderSnapshot;
}

// ─── Drawer events ──────────────────────────────────────────────────────────

/**
 * Cash moving in or out of the drawer that is **not** a sale.
 *
 * v1 rang a payout as an "Add Cash Payout" line inside an order: a negative item that reduced
 * whatever the golfer in front of you was paying, printed on their receipt, and taxed or
 * discounted along with it. But a payout has no customer and nothing is sold — it is the drawer
 * paying someone. So it is recorded here, against the drawer, and never touches the order.
 *
 * Shaped for Shift close, which will read this list to reconcile the drawer:
 *
 *  - `kind` leaves room for the other drawer events a close needs (paid in, a safe drop, a
 *    no-sale open). Only `payout` exists today.
 *  - `amount` is always positive; `cashDelta` is the signed effect on the drawer, so a close
 *    sums one field without knowing every kind's sign.
 *  - `reason` is a key, not the label, so a close can group by it and a relabel doesn't split
 *    a group in two.
 *  - `operator` is who did it. There is no sign-in in this prototype, so it is `null` — the
 *    field exists now so the close is not built on events that cannot say whose they were.
 */
export interface DrawerEvent {
  /** `DE-0001`, … — sequential for the session. */
  id: string;
  kind: 'payout';
  amount: number;
  /** Signed effect on cash in the drawer: `−amount` for a payout. */
  cashDelta: number;
  reason: PayoutReason;
  /** Who received the cash, if anyone was named. */
  recipient?: string;
  note?: string;
  operator: string | null;
  /** `YYYY-MM-DD` and `h:mm AM` on the demo clock. */
  date: string;
  time: string;
}

// ─── Issued gift cards ──────────────────────────────────────────────────────

/**
 * A gift card that exists — issued when the order carrying it was paid.
 *
 * The session's own log of cards sold, beside the copy written onto the recipient's customer
 * record. The log is what a close or a reprint reads; the record is what the counter sees when
 * the golfer comes back to spend it. A recipient typed in at the counter has no record, so the
 * log is the only place that card lives (`onRecord: false`).
 */
export interface IssuedGiftCard extends CartGiftCard {
  card: CustomerGiftCard;
  onRecord: boolean;
  date: string;
  time: string;
}

// ─── State ──────────────────────────────────────────────────────────────────

export interface RegisterExtrasState {
  heldOrders: HeldOrder[];
  drawerEvents: DrawerEvent[];
  issuedGiftCards: IssuedGiftCard[];
  /**
   * Counters for ids and default names. Monotonic rather than derived from list lengths,
   * because held orders leave their list when resumed and gift-card lines can be removed — a
   * length would hand out the same id twice.
   */
  registerSeq: { held: number; drawer: number; giftCard: number };
}

export const registerExtrasDefaults = (): RegisterExtrasState => ({
  heldOrders: [],
  drawerEvents: [],
  issuedGiftCards: [],
  registerSeq: { held: 0, drawer: 0, giftCard: 0 },
});

// ─── Dialogs ────────────────────────────────────────────────────────────────

/** The register's dialogs, merged into `Modal` by `pos-store.ts`. */
export type RegisterExtrasModal =
  | { kind: 'holdOrder' }
  | { kind: 'heldOrders' }
  | { kind: 'cashPayout' }
  /** `draft` carries the form across the trip to the golfer picker and back. */
  | { kind: 'giftCard'; draft?: GiftCardDraft };

const MODAL_KINDS = new Set<string>(['holdOrder', 'heldOrders', 'cashPayout', 'giftCard']);

export const isRegisterExtrasModal = (m: { kind: string }): m is RegisterExtrasModal => MODAL_KINDS.has(m.kind);

/**
 * The golfer picker's gift-card target: pick the recipient, then return to the gift-card
 * dialog with everything already typed still there.
 */
export interface GiftCardRecipientTarget {
  giftCard: GiftCardDraft;
}

// ─── Actions ────────────────────────────────────────────────────────────────

export type RegisterExtrasAction =
  | { type: 'addCombo'; comboId: string }
  | { type: 'addGiftCardLine'; draft: GiftCardDraft }
  /** Park the order on the rail. `name` falls back to `defaultHoldName`. */
  | { type: 'holdOrder'; name?: string }
  /**
   * Put a held order back on the rail. With something already on it, `holdCurrent` must be
   * set — the current order is held first. Without it the action is refused rather than
   * discarding what is there.
   */
  | { type: 'resumeHeldOrder'; id: string; holdCurrent?: boolean }
  | { type: 'recordCashPayout'; draft: PayoutDraft };

const ACTION_TYPES = new Set<string>(['addCombo', 'addGiftCardLine', 'holdOrder', 'resumeHeldOrder', 'recordCashPayout']);

export const isRegisterExtrasAction = (a: { type: string }): a is RegisterExtrasAction => ACTION_TYPES.has(a.type);

const clockTime = (d: Date): string => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

/** Is there an order on the rail that holding would park? A paid one is finished, not parked. */
export const canHold = (s: Pick<PosState, 'cart' | 'lastPayment'>): boolean => s.cart.length > 0 && !s.lastPayment;

/**
 * The slice's reducer.
 *
 * `clearOrder` is the store's own, passed in rather than imported so this module never needs
 * the store's runtime — and so holding empties the rail by exactly the rule the ← button uses,
 * not a copy of it.
 */
export function registerExtrasReducer(
  state: PosState,
  action: RegisterExtrasAction,
  clearOrder: (s: PosState) => PosState,
): PosState {
  switch (action.type) {
    case 'addCombo': {
      const combo = comboById(action.comboId);
      if (!combo) return state;
      return { ...state, cart: addCombo(state.cart, combo), leftPanelCollapsed: false };
    }

    case 'addGiftCardLine': {
      if (giftCardProblem(action.draft)) return state;
      const seq = state.registerSeq.giftCard + 1;
      const line = giftCardLine(`GC-${String(seq).padStart(4, '0')}`, action.draft);
      return {
        ...state,
        cart: [...state.cart, line],
        registerSeq: { ...state.registerSeq, giftCard: seq },
        leftPanelCollapsed: false,
      };
    }

    case 'holdOrder': {
      if (!canHold(state)) return state;
      const seq = state.registerSeq.held + 1;
      const booking = state.bookings.find((b) => b.id === state.selectedBookingId);
      const name =
        action.name?.trim() ||
        defaultHoldName({ bookingName: booking?.name, golferName: state.selectedGolfer?.name, cart: state.cart }, seq);
      const order = Object.fromEntries(ORDER_FIELDS.map((k) => [k, state[k]])) as OrderSnapshot;
      const held: HeldOrder = { id: `H-${seq}`, name, heldAt: clockTime(demoNow()), order };
      return {
        ...clearOrder(state),
        heldOrders: [...state.heldOrders, held],
        registerSeq: { ...state.registerSeq, held: seq },
      };
    }

    case 'resumeHeldOrder': {
      const held = state.heldOrders.find((h) => h.id === action.id);
      if (!held) return state;
      let s = state;
      if (canHold(s)) {
        // Never silently discard the order on the rail.
        if (!action.holdCurrent) return state;
        s = registerExtrasReducer(s, { type: 'holdOrder' }, clearOrder);
      } else if (s.lastPayment) {
        // A paid order is only a receipt on the rail now; the payment is recorded. Clearing it
        // loses nothing, which is what "New order" does too.
        s = clearOrder(s);
      }
      return {
        ...s,
        ...held.order,
        heldOrders: s.heldOrders.filter((h) => h.id !== held.id),
        lastPayment: null,
        view: 'pos',
        leftPanelCollapsed: false,
        modal: null,
      };
    }

    case 'recordCashPayout': {
      const d = action.draft;
      if (payoutProblem(d)) return state;
      const seq = state.registerSeq.drawer + 1;
      const now = demoNow();
      const amount = Math.round(d.amount * 100) / 100;
      const event: DrawerEvent = {
        id: `DE-${String(seq).padStart(4, '0')}`,
        kind: 'payout',
        amount,
        cashDelta: -amount,
        reason: d.reason!,
        ...(d.recipient?.trim() && { recipient: d.recipient.trim() }),
        ...(d.note?.trim() && { note: d.note.trim() }),
        operator: null,
        date: toDateStr(now),
        time: clockTime(now),
      };
      // The order is not part of this: no line, no total, no golfer. That is the whole change.
      return {
        ...state,
        drawerEvents: [...state.drawerEvents, event],
        registerSeq: { ...state.registerSeq, drawer: seq },
      };
    }
  }
}

/**
 * The gift cards an order issues when it is paid — called from `recordPayment`.
 *
 * Each gift-card line on the paid order becomes a card: written onto the recipient's customer
 * record (through `customerEdits`, the same overlay the record's own Save uses, so the record's
 * Gift cards section shows it straight away) and added to the session's log. A card already in
 * the log is skipped, so a second payment on the same lines cannot issue it twice.
 *
 * Nothing here runs for a line that was removed, or an order that was cleared or held instead
 * of paid — a card that exists before the money does is a card someone can spend for free.
 */
export function issueGiftCardsOnPayment(
  state: PosState,
): Pick<PosState, 'customerEdits' | 'issuedGiftCards'> {
  const done = new Set(state.issuedGiftCards.map((c) => c.id));
  const cards = pendingGiftCards(state.cart).filter((c) => !done.has(c.id));
  if (cards.length === 0) return { customerEdits: state.customerEdits, issuedGiftCards: state.issuedGiftCards };

  const now = demoNow();
  let edits = state.customerEdits;
  const issued = cards.map((c): IssuedGiftCard => {
    const card = customerGiftCard(c, now);
    const record = c.recipient.customerId ? liveCustomer(c.recipient.customerId, edits) : null;
    if (record) {
      edits = { ...edits, [record.id]: { ...edits[record.id], giftCards: [...record.giftCards, card] } };
    }
    return { ...c, card, onRecord: Boolean(record), date: toDateStr(now), time: clockTime(now) };
  });
  return { customerEdits: edits, issuedGiftCards: [...state.issuedGiftCards, ...issued] };
}
