import { describe, expect, it } from 'vitest';
import { ALL_GOLFERS } from '../data/golfers';
import { liveCustomer } from '../data/roster';
import { venueBookings } from '../data/venues';
import { orderTotals, payableTotal } from '../logic/cart';
import { comboSavings, defaultHoldName, type GiftCardDraft, type PayoutDraft } from '../logic/register-extras';
import { createInitialState, reducer, type PosState } from './pos-store';
import { ORDER_FIELDS, registerExtrasDefaults } from './register-extras';

/**
 * The register's four V1 → V2 functions, asserted through the store's own reducer — so what is
 * tested is what the register dispatches, wiring included.
 */

const base = (extra: Partial<PosState> = {}): PosState =>
  createInitialState({ venueId: 'eighteen', view: 'pos', leftPanelCollapsed: false, ...extra });

const run = (s: PosState, ...actions: Parameters<typeof reducer>[1][]): PosState => actions.reduce(reducer, s);

const withRetail = (s = base()) =>
  run(s, { type: 'addItem', name: 'Golf Glove Mens', price: 18 }, { type: 'addItem', name: 'Water', price: 2.5 });

const chen = ALL_GOLFERS.find((g) => g.name === 'Chen, Emily')!;

const giftFor = (recipient: GiftCardDraft['recipient'], amount = 50): GiftCardDraft => ({ amount, recipient });

// ─── Combos ─────────────────────────────────────────────────────────────────

describe('combos', () => {
  it('rings as one line at the combo price, with its components carried on it', () => {
    const s = run(base(), { type: 'addCombo', comboId: 'combo-range-beer' });
    expect(s.cart).toHaveLength(1);
    const [line] = s.cart;
    expect(line.name).toBe('Range & a Cold One');
    expect(line.price).toBe(17.5);
    expect(line.combo?.components.map((c) => c.name)).toEqual(['Range Bucket Large', 'Beer Craft']);
    expect(comboSavings(line)).toBe(3.5);
    // The components are a description, not charges.
    expect(payableTotal(s.cart)).toBe(17.5);
  });

  it('applies quantity to the whole combo — ringing it again steps the same line', () => {
    const s = run(base(), { type: 'addCombo', comboId: 'combo-turn-dog' }, { type: 'addCombo', comboId: 'combo-turn-dog' });
    expect(s.cart).toHaveLength(1);
    expect(s.cart[0].qty).toBe(2);
    expect(payableTotal(s.cart)).toBe(16);
    // Turn Dog: $5 + $2.50 + $3 = $10.50 against $8 — $2.50 a combo, $5 for two.
    expect(comboSavings(s.cart[0])).toBe(5);
    const stepped = run(s, { type: 'changeQty', index: 0, delta: -1 });
    expect(stepped.cart[0].qty).toBe(1);
  });

  it('removes as a group — there is no way to take one component off', () => {
    const s = run(withRetail(), { type: 'addCombo', comboId: 'combo-sleeve-glove' });
    const at = s.cart.findIndex((i) => i.combo);
    const after = run(s, { type: 'removeItem', index: at });
    expect(after.cart.some((i) => i.combo)).toBe(false);
    // Nothing of it is left behind as a loose line.
    expect(after.cart.map((i) => i.name)).toEqual(['Golf Glove Mens', 'Water']);
  });

  it('ignores an unknown combo id', () => {
    const s = base();
    expect(run(s, { type: 'addCombo', comboId: 'nope' })).toBe(s);
  });
});

// ─── Hold ───────────────────────────────────────────────────────────────────

describe('hold', () => {
  it('parks the whole order and empties the rail', () => {
    const s = run(withRetail(base({ selectedGolfer: chen })), { type: 'holdOrder' });
    expect(s.cart).toEqual([]);
    expect(s.selectedGolfer).toBeNull();
    expect(s.heldOrders).toHaveLength(1);
    const [h] = s.heldOrders;
    expect(h.name).toBe('Chen, Emily');
    expect(h.order.cart.map((i) => i.name)).toEqual(['Golf Glove Mens', 'Water']);
    expect(h.order.selectedGolfer).toEqual(chen);
  });

  it('names a held order after whoever it is for, else by number', () => {
    const booking = venueBookings('eighteen').find((b) => b.players >= 2 && b.pay === 'open')!;
    expect(defaultHoldName({ bookingName: booking.name, golferName: 'Chen, Emily', cart: [] }, 1)).toBe(booking.name);
    expect(defaultHoldName({ golferName: 'Chen, Emily', cart: [] }, 1)).toBe('Chen, Emily');
    expect(defaultHoldName({ cart: [] }, 3)).toBe('Held order 3');

    const twice = run(withRetail(), { type: 'holdOrder' });
    const again = run(withRetail(twice), { type: 'holdOrder' });
    expect(again.heldOrders.map((h) => h.name)).toEqual(['Held order 1', 'Held order 2']);
  });

  it('keeps a typed name', () => {
    const s = run(withRetail(), { type: 'holdOrder', name: '  Red hat, range  ' });
    expect(s.heldOrders[0].name).toBe('Red hat, range');
  });

  it('keeps the booking link — resuming a tee-time order puts it back on the booking', () => {
    const b = venueBookings('eighteen').find((x) => x.players >= 2 && x.pay === 'open' && x.status !== 'block')!;
    const loaded = run(base(), { type: 'loadBooking', bookingId: b.id }, { type: 'addItem', name: 'Water', price: 2.5 });
    const held = run(loaded, { type: 'holdOrder' });
    expect(held.selectedBookingId).toBeNull();
    expect(held.heldOrders[0].name).toBe(b.name);

    const back = run(held, { type: 'resumeHeldOrder', id: held.heldOrders[0].id });
    expect(back.selectedBookingId).toBe(b.id);
    expect(back.cart).toEqual(loaded.cart);
    expect(back.heldOrders).toEqual([]);
  });

  it('refuses to hold nothing, or an order already paid', () => {
    const empty = base();
    expect(run(empty, { type: 'holdOrder' })).toBe(empty);
    const paid = run(withRetail(), { type: 'recordPayment', method: 'cash', amount: 20.5 });
    expect(run(paid, { type: 'holdOrder' })).toBe(paid);
  });

  it('never silently discards the order on the rail when resuming another', () => {
    const held = run(withRetail(), { type: 'holdOrder' });
    const busy = run(held, { type: 'addCombo', comboId: 'combo-cart-bucket' });
    const id = held.heldOrders[0].id;

    // Without holdCurrent the resume is refused outright.
    expect(run(busy, { type: 'resumeHeldOrder', id })).toBe(busy);

    // With it, the current order is held first — nothing is lost.
    const swapped = run(busy, { type: 'resumeHeldOrder', id, holdCurrent: true });
    expect(swapped.cart.map((i) => i.name)).toEqual(['Golf Glove Mens', 'Water']);
    expect(swapped.heldOrders).toHaveLength(1);
    expect(swapped.heldOrders[0].order.cart[0].name).toBe('Cart Bucket');
  });

  it('empties the rail by exactly the rule Clear order uses', () => {
    // If `clearOrder` starts resetting another field, holding must too — otherwise a held
    // order leaves a piece of itself on the rail. Compare every field but the slice's own.
    const s = withRetail(base({ selectedGolfer: chen, flowMode: 'walkin' }));
    const held = run(s, { type: 'holdOrder' });
    const cleared = run(s, { type: 'clearOrder' });
    const own = new Set(Object.keys(registerExtrasDefaults()));
    for (const k of Object.keys(cleared) as Array<keyof PosState>) {
      if (own.has(k)) continue;
      expect(held[k], k).toEqual(cleared[k]);
    }
    // And what the hold kept is what the clear threw away.
    for (const k of ORDER_FIELDS) expect(held.heldOrders[0].order[k], k).toEqual(s[k]);
  });

  it('survives Back / Forward — held orders are session data, not navigation', () => {
    const s = run(withRetail(), { type: 'holdOrder' });
    const after = run(s, { type: 'applyUrl', patch: { view: 'tee' } });
    expect(after.heldOrders).toEqual(s.heldOrders);
  });
});

// ─── Cash payout ────────────────────────────────────────────────────────────

describe('cash payout', () => {
  const skins: PayoutDraft = { amount: 40, reason: 'winnings', recipient: 'Harrington, Cole', note: 'Saturday skins' };

  it('records a drawer event and leaves the order exactly as it was', () => {
    const s = run(withRetail(), { type: 'addCombo', comboId: 'combo-range-beer' });
    const after = run(s, { type: 'recordCashPayout', draft: skins });
    expect(after.cart).toBe(s.cart);
    expect(orderTotals(after.cart)).toEqual(orderTotals(s.cart));
    expect(after.drawerEvents).toEqual([
      {
        id: 'DE-0001',
        kind: 'payout',
        amount: 40,
        cashDelta: -40,
        reason: 'winnings',
        recipient: 'Harrington, Cole',
        note: 'Saturday skins',
        operator: 's-1', // the signed-in operator (Wave 3); Wave 1 had none to record
        date: '2026-05-21',
        time: '12:00 PM',
      },
    ]);
  });

  it('numbers events in order', () => {
    const s = run(base(), { type: 'recordCashPayout', draft: skins }, { type: 'recordCashPayout', draft: { amount: 12.5, reason: 'petty' } });
    expect(s.drawerEvents.map((e) => e.id)).toEqual(['DE-0001', 'DE-0002']);
    expect(s.drawerEvents.reduce((t, e) => t + e.cashDelta, 0)).toBe(-52.5);
  });

  it('refuses a payout with no amount, no reason, too large, or an unexplained Other', () => {
    const s = base();
    for (const draft of [
      { ...skins, amount: 0 },
      { ...skins, reason: null },
      { ...skins, amount: 5000.01 },
      { amount: 20, reason: 'other' as const },
      { amount: 20, reason: 'other' as const, note: '   ' },
    ]) {
      expect(run(s, { type: 'recordCashPayout', draft })).toBe(s);
    }
    expect(run(s, { type: 'recordCashPayout', draft: { amount: 20, reason: 'other', note: 'Ranger’s fuel' } }).drawerEvents).toHaveLength(1);
  });

  it('survives Back / Forward', () => {
    const s = run(base(), { type: 'recordCashPayout', draft: skins });
    expect(run(s, { type: 'applyUrl', patch: {} }).drawerEvents).toEqual(s.drawerEvents);
  });
});

// ─── Gift cards ─────────────────────────────────────────────────────────────

describe('gift cards', () => {
  const onRoster = { name: chen.name, customerId: chen.id };

  it('goes on the order as one line, named for who it is for', () => {
    const s = run(base(), { type: 'addGiftCardLine', draft: giftFor({ name: 'Scott, Leon' }) });
    expect(s.cart).toHaveLength(1);
    expect(s.cart[0].name).toBe('Gift card · $50 → Scott, Leon');
    expect(s.cart[0].price).toBe(50);
    expect(s.cart[0].giftCard?.id).toBe('GC-0001');
  });

  it('is not taxed — it is stored value, taxed when spent', () => {
    const s = run(base(), { type: 'addGiftCardLine', draft: giftFor(onRoster) }, { type: 'addItem', name: 'Golf Glove Mens', price: 18 });
    const t = orderTotals(s.cart);
    expect(t.salesTax).toBe(1.44); // 8% of the glove only
    expect(t.total).toBe(69.44);
  });

  it('issues nothing until the order is paid', () => {
    const s = run(base(), { type: 'addGiftCardLine', draft: giftFor(onRoster) });
    expect(s.issuedGiftCards).toEqual([]);
    expect(liveCustomer(chen.id, s.customerEdits)!.giftCards.some((g) => g.id === 'GC-0001')).toBe(false);
  });

  it('issues the card onto the recipient’s customer record when the order is paid', () => {
    const before = liveCustomer(chen.id)!.giftCards.length;
    const s = run(base(), { type: 'addGiftCardLine', draft: giftFor(onRoster, 100) }, { type: 'recordPayment', method: 'card', amount: 100 });
    const record = liveCustomer(chen.id, s.customerEdits)!;
    expect(record.giftCards).toHaveLength(before + 1);
    expect(record.giftCards.at(-1)).toEqual({
      id: 'GC-0001',
      type: 'Purchased',
      expires: '05/21/2031',
      awarded: 100,
      spent: 0,
      balance: 100,
      upc: '600400000001',
    });
    expect(s.issuedGiftCards).toHaveLength(1);
    expect(s.issuedGiftCards[0].onRecord).toBe(true);
  });

  it('issues nothing for a line removed before paying', () => {
    const s = run(
      base(),
      { type: 'addGiftCardLine', draft: giftFor(onRoster) },
      { type: 'addItem', name: 'Water', price: 2.5 },
      { type: 'removeItem', index: 0 },
      { type: 'recordPayment', method: 'cash', amount: 2.7 },
    );
    expect(s.issuedGiftCards).toEqual([]);
    expect(s.customerEdits).toEqual({});
  });

  it('issues nothing for an order that was held rather than paid', () => {
    const s = run(base(), { type: 'addGiftCardLine', draft: giftFor(onRoster) }, { type: 'holdOrder' });
    expect(s.issuedGiftCards).toEqual([]);
    expect(s.heldOrders[0].order.cart[0].giftCard?.id).toBe('GC-0001');
  });

  it('cannot issue the same card twice', () => {
    const paid = run(base(), { type: 'addGiftCardLine', draft: giftFor(onRoster) }, { type: 'recordPayment', method: 'card', amount: 50 });
    const again = run(paid, { type: 'recordPayment', method: 'card', amount: 50 });
    expect(again.issuedGiftCards).toHaveLength(1);
    expect(liveCustomer(chen.id, again.customerEdits)!.giftCards.filter((g) => g.id === 'GC-0001')).toHaveLength(1);
  });

  it('logs a card for someone not on the roster without touching any record', () => {
    const s = run(
      base(),
      { type: 'addGiftCardLine', draft: { amount: 25, recipient: { name: 'Scott, Leon', email: 'leon@example.com' }, from: 'Dad' } },
      { type: 'recordPayment', method: 'cash', amount: 25 },
    );
    expect(s.customerEdits).toEqual({});
    expect(s.issuedGiftCards).toHaveLength(1);
    expect(s.issuedGiftCards[0]).toMatchObject({ onRecord: false, from: 'Dad', recipient: { name: 'Scott, Leon', email: 'leon@example.com' } });
  });

  it('refuses a card with no amount, no recipient or an absurd amount', () => {
    const s = base();
    for (const draft of [giftFor(onRoster, 0), giftFor(null), giftFor({ name: '  ' }), giftFor(onRoster, 1000.01)]) {
      expect(run(s, { type: 'addGiftCardLine', draft })).toBe(s);
    }
  });

  it('never reuses a line id, even after one is removed', () => {
    const s = run(
      base(),
      { type: 'addGiftCardLine', draft: giftFor(onRoster) },
      { type: 'removeItem', index: 0 },
      { type: 'addGiftCardLine', draft: giftFor(onRoster) },
    );
    expect(s.cart[0].giftCard?.id).toBe('GC-0002');
  });

  it('survives Back / Forward', () => {
    const s = run(base(), { type: 'addGiftCardLine', draft: giftFor(onRoster) }, { type: 'recordPayment', method: 'card', amount: 50 });
    const after = run(s, { type: 'applyUrl', patch: { view: 'tee' } });
    expect(after.issuedGiftCards).toEqual(s.issuedGiftCards);
    expect(after.customerEdits).toEqual(s.customerEdits);
  });
});

describe('defaults', () => {
  it('starts every edition with empty lists', () => {
    const s = createInitialState();
    expect(s.heldOrders).toEqual([]);
    expect(s.drawerEvents).toEqual([]);
    expect(s.issuedGiftCards).toEqual([]);
  });
});
