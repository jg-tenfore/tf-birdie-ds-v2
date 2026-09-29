import { catalogPrice, type Combo } from '../data/combos';
import type { CustomerGiftCard } from '../data/customers';
import type { CartCombo, CartComboComponent, CartGiftCard, CartItem, GiftCardRecipient } from '../types';
import { money } from './cart';

/**
 * The rules behind the register's four V1 → V2 functions — combos, holding an order, cash
 * payouts and issuing gift cards. Pure, so the register, the dialogs and the tests agree.
 *
 * The state that holds them (held orders, drawer events, issued cards) is in
 * `state/register-extras.ts`; this file only answers questions about values.
 */

const cents = (n: number): number => Math.round(n * 100) / 100;

// ─── Combos ─────────────────────────────────────────────────────────────────

/**
 * A combo's components at catalog list price.
 *
 * Priced from `CATALOG` rather than written into the combo, so a combo can never claim a
 * saving against a price the tile no longer charges. An item missing from the catalog prices
 * at 0 — `combos.test.ts` fails on that, so it never reaches a screen.
 */
export function comboComponents(combo: Combo): CartComboComponent[] {
  return combo.components.map((c) => ({ name: c.item, qty: c.qty, p: catalogPrice(c.item) ?? 0 }));
}

/** What one combo's components would cost bought separately. */
export const comboListPrice = (combo: Combo): number =>
  cents(comboComponents(combo).reduce((s, c) => s + c.p * c.qty, 0));

/** What one combo saves against its components, never negative. */
export const comboSaving = (combo: Combo): number => Math.max(0, cents(comboListPrice(combo) - combo.price));

/** What a combo line saves, for its whole quantity — the "Save $3.50" on the rail. */
export function comboSavings(line: CartItem): number {
  if (!line.combo) return 0;
  return Math.max(0, cents((line.combo.listPrice - line.price) * (line.qty || 1)));
}

/** The `CartCombo` a combo line carries. */
export const cartCombo = (combo: Combo): CartCombo => ({
  id: combo.id,
  components: comboComponents(combo),
  listPrice: comboListPrice(combo),
});

/**
 * Ring a combo: one line at the combo price, its components carried on it.
 *
 * The same combo again steps the quantity of the line already there rather than adding a
 * second — quantity applies to the whole combo, as it does for any other line. Matched by
 * combo id, not name, so an open item that happens to share a combo's name is never merged
 * into it.
 */
export function addCombo(cart: CartItem[], combo: Combo): CartItem[] {
  const at = cart.findIndex((i) => i.combo?.id === combo.id);
  if (at >= 0) return cart.map((i, idx) => (idx === at ? { ...i, qty: i.qty + 1 } : i));
  return [...cart, { name: combo.name, price: combo.price, qty: 1, combo: cartCombo(combo) }];
}

// ─── Hold ───────────────────────────────────────────────────────────────────

/**
 * The name an order is held under unless the operator types another.
 *
 * Whoever the order is for, in the order the rail itself reads it: the booking behind it, the
 * golfer attached to it, a named player on the round. Only when nobody is named does it fall
 * back to a number — "Held order 3" — which is still better than v1, where a held ticket went
 * into the restaurant's Tabs list under a ticket number next to every open bar tab.
 */
export function defaultHoldName(
  order: { bookingName?: string | null; golferName?: string | null; cart: CartItem[] },
  seq: number,
): string {
  const player = order.cart.find((i) => i.isCheckIn)?.players?.[0]?.name;
  const named = player && !/^(Guest|Player) \d+$/.test(player) && player !== 'Group Name' ? player : null;
  return order.bookingName || order.golferName || named || `Held order ${seq}`;
}

// ─── Cash payout ────────────────────────────────────────────────────────────

/**
 * Why cash left the drawer. The four the owner named; `other` must say why in the note.
 *
 * Kept short on purpose. Shift close reconciles by reason, and a long list is one people pick
 * from at random.
 */
export const PAYOUT_REASONS = [
  { key: 'winnings', label: 'Skins / tournament winnings' },
  { key: 'refund', label: 'Refund' },
  { key: 'petty', label: 'Petty cash' },
  { key: 'other', label: 'Other' },
] as const;

export type PayoutReason = (typeof PAYOUT_REASONS)[number]['key'];

export const payoutReasonLabel = (r: PayoutReason): string =>
  PAYOUT_REASONS.find((x) => x.key === r)?.label ?? r;

export interface PayoutDraft {
  amount: number;
  reason: PayoutReason | null;
  recipient?: string;
  note?: string;
}

/**
 * The largest single payout the dialog takes. Not a policy — a guard against a slipped
 * keypad: $5,000 is more than a skins pot and less than a stray extra zero on one.
 */
export const MAX_PAYOUT = 5000;

/** What is stopping this payout, or `null` when it can be recorded. */
export function payoutProblem(d: PayoutDraft): string | null {
  if (!(d.amount > 0)) return 'Enter an amount';
  if (d.amount > MAX_PAYOUT) return `A single payout is capped at ${money(MAX_PAYOUT)}`;
  if (!d.reason) return 'Pick a reason';
  if (d.reason === 'other' && !d.note?.trim()) return 'Say what “Other” is in the note';
  return null;
}

// ─── Gift cards ─────────────────────────────────────────────────────────────

/** The amounts offered as one tap. Anything else is Custom. */
export const GIFT_CARD_PRESETS = [25, 50, 100, 200] as const;

/** The most one card can hold — a guard against a mistyped custom amount, as with payouts. */
export const MAX_GIFT_CARD = 1000;

export interface GiftCardDraft {
  amount: number;
  recipient: GiftCardRecipient | null;
  from?: string;
  message?: string;
}

/** What is stopping this card going on the order, or `null`. */
export function giftCardProblem(d: GiftCardDraft): string | null {
  if (!(d.amount > 0)) return 'Pick or enter an amount';
  if (d.amount > MAX_GIFT_CARD) return `A single card holds up to ${money(MAX_GIFT_CARD)}`;
  if (!d.recipient?.name.trim()) return 'Say who the card is for';
  return null;
}

/** `Gift card · $50 → Scott, Leon` — the line as the rail and the receipt print it. */
export const giftCardLineName = (amount: number, recipient: GiftCardRecipient): string =>
  `Gift card · ${money(amount).replace(/\.00$/, '')} → ${recipient.name.trim()}`;

/** The order line for a gift card. `id` comes from the store's counter so it is stable. */
export function giftCardLine(id: string, d: GiftCardDraft): CartItem {
  const recipient = { ...d.recipient!, name: d.recipient!.name.trim() };
  const card: CartGiftCard = {
    id,
    amount: cents(d.amount),
    recipient,
    ...(d.from?.trim() && { from: d.from.trim() }),
    ...(d.message?.trim() && { message: d.message.trim() }),
  };
  return { name: giftCardLineName(card.amount, recipient), price: card.amount, qty: 1, giftCard: card };
}

/**
 * How long an issued card is good for: five years from the day it is sold.
 *
 * v1's form defaulted the expiry "a century out", and its own comment flagged that as worth a
 * decision rather than a default. Five years is the floor US federal law sets for a gift card's
 * funds (the CARD Act), so it is the shortest defensible term and the easiest one to explain.
 */
export const GIFT_CARD_TERM_YEARS = 5;

/** `MM/DD/YYYY`, the format the customer record prints. */
const mdy = (d: Date): string =>
  `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;

/**
 * The card as the customer record holds it (`CustomerGiftCard`) — the same shape the ported
 * records already use, so the record's Gift cards section shows an issued card exactly as it
 * shows one from the fixtures.
 *
 * The UPC is derived from the card id rather than drawn at random, so a replayed session
 * issues the same numbers.
 */
export function customerGiftCard(card: CartGiftCard, soldOn: Date): CustomerGiftCard {
  const expires = new Date(soldOn);
  expires.setFullYear(expires.getFullYear() + GIFT_CARD_TERM_YEARS);
  const digits = card.id.replace(/\D/g, '').padStart(5, '0');
  return {
    id: card.id,
    type: 'Purchased',
    expires: mdy(expires),
    awarded: card.amount,
    spent: 0,
    balance: card.amount,
    upc: `6004${digits.padStart(8, '0')}`,
  };
}

/** The gift-card lines an order would issue if it were paid now. */
export const pendingGiftCards = (cart: CartItem[]): CartGiftCard[] =>
  cart.flatMap((i) => (i.giftCard ? [i.giftCard] : []));
