import { CHECK_IN_ITEMS, MODIFIER_ITEMS } from '../data/catalog';
import { COURSES, TEE_PRICES, TIMES } from '../data/courses';
import { TAX_RATE } from '../data/config';
import type { Booking, CartItem, CartPlayer, ModifierTag, Transport } from '../types';

/**
 * Cart construction and pricing.
 *
 * Ported from the prototype's `addToCart` / `updateTotals` / `computeCartTotal` /
 * `buildTeeTimeCart` and the per-player modifier functions. Rewritten as pure
 * functions over immutable state so React can own the cart, but the arithmetic is
 * unchanged — including the one place where the prototype contradicts itself (see
 * `payableTotal`).
 *
 * The central idea: a **check-in line** is priced per player, not per quantity.
 * Its `unitPrice` is the green fee, and each entry in `players` can carry its own
 * modifiers (transport, discounts, rate overrides). Everything else in the cart is
 * an ordinary `price × qty` line.
 */

/** Is this item name a round rather than merchandise? */
export const isCheckInItem = (name: string): boolean => CHECK_IN_ITEMS.has(name);

/** Is this item name a modifier that attaches to an existing round? */
export const isModifierItem = (name: string): boolean => name in MODIFIER_ITEMS;

/** The first check-in line in a cart, if any. */
export const findCheckInItem = (cart: CartItem[]): CartItem | undefined =>
  cart.find((i) => i.isCheckIn);

/**
 * Locks the cart to 9 or 18 holes once a round is on it.
 *
 * Returns `'9H'`, `'18H'`, or null when nothing constrains the choice. The item
 * grid greys out rates that would mix hole counts within one tee time.
 */
export function cartHolesLock(cart: CartItem[]): '9H' | '18H' | null {
  const item = findCheckInItem(cart);
  if (!item) return null;
  if (/18/.test(item.name)) return '18H';
  if (/\b9\b|9 Holes|9H/.test(item.name)) return '9H';
  return null;
}

// ─── Per-player pricing ─────────────────────────────────────────────────────

/**
 * What one player on a check-in line actually costs.
 *
 * Modifiers resolve in a fixed precedence, matching the prototype:
 *
 *  - **transport** (`isTransport`) adds its own fee and never replaces the fee;
 *    only one transport modifier can be applied at a time.
 *  - **discount** (`isDiscount`) adds a negative delta to the green fee.
 *  - anything else is a **rate override** — it *replaces* the green fee outright
 *    (Twilight Rate, Comp Round, Member Rate). Only one override can apply.
 *
 * The green fee floors at zero so a large discount can't produce a credit, but
 * the transport fee is added after that floor — a comped round still pays for
 * its cart.
 */
export function playerPrice(unitPrice: number, player: CartPlayer): number {
  let fee = unitPrice;
  let transport = 0;

  for (const t of player.modifierTags ?? []) {
    if (t.isTransport) transport = t.p;
    else if (t.isDiscount) fee += t.p;
    else fee = t.p;
  }
  return Math.max(0, fee) + transport;
}

/** Per-player breakdown, for receipt and confirmation views. */
export function playerBreakdown(
  unitPrice: number,
  player: CartPlayer,
): { fee: number; transport: number; discount: number; total: number } {
  let fee = unitPrice;
  let transport = 0;
  let discount = 0;

  for (const t of player.modifierTags ?? []) {
    if (t.isTransport) transport = t.p;
    else if (t.isDiscount) {
      fee += t.p;
      discount += t.p;
    } else {
      discount += t.p - unitPrice;
      fee = t.p;
    }
  }
  return { fee: Math.max(0, fee), transport, discount, total: Math.max(0, fee) + transport };
}

// ─── Totals ─────────────────────────────────────────────────────────────────

export interface CartTotals {
  /** Sum of green fees plus transport, before discounts are subtracted. */
  subtotal: number;
  /** Negative number, or 0. */
  discount: number;
  /** Tax carried on explicit `Taxes` lines (tee-sheet rounds arrive with one). */
  tax: number;
}

/**
 * Totals as shown in the left panel's Discount / Subtotal / Tax grid.
 *
 * Mirrors the prototype's `updateTotals`: overrides are recorded as a discount of
 * `override − unitPrice` while the subtotal still counts the full green fee, so
 * the panel shows the list price and the concession separately.
 */
export function cartTotals(cart: CartItem[]): CartTotals {
  let discount = 0;
  let tax = 0;
  let subtotal = 0;

  for (const i of cart) {
    if (i.isCheckIn) {
      const unitPrice = i.unitPrice ?? i.price / Math.max(i.qty, 1);
      if (i.players && i.players.length > 0) {
        for (const p of i.players) {
          const b = playerBreakdown(unitPrice, p);
          subtotal += unitPrice + b.transport;
          discount += b.discount;
        }
      } else {
        subtotal += unitPrice * i.qty;
      }
    } else if (i.price < 0) {
      discount += i.price * (i.qty || 1);
    } else if (i.isTax || i.name === 'Taxes') {
      // Already an absolute amount for the whole line, so qty is not applied.
      tax += i.price;
    } else {
      subtotal += i.price * (i.qty || 1);
    }
  }
  return { subtotal, discount, tax };
}

/**
 * The amount the Pay button charges.
 *
 * Mirrors the prototype's `computeCartTotal`, which is *not* simply
 * `subtotal + discount + tax` from `cartTotals`. Two deliberate differences:
 *
 *  1. Overrides are applied as the price (not as list-price-plus-discount), so an
 *     override never inflates the charge.
 *  2. The prototype's version hard-codes transport at $20 riding / $5 push by
 *     modifier *name* rather than reading `t.p`. That matters for rounds loaded
 *     from the tee sheet, where `buildTeeTimeCart` sets the riding-cart fee from
 *     `TEE_PRICES[status].cartFee` — $18 for walk-ins, not $20.
 *
 * This port keeps behaviour (1) and fixes (2) by reading `t.p`, which is what the
 * displayed subtotal has always used. The effect is that a walk-in's cart fee now
 * charges the $18 shown in the panel instead of $20.
 */
export function payableTotal(cart: CartItem[]): number {
  return cart.reduce((sum, i) => {
    if (i.isCheckIn) {
      if (i.players && i.players.length > 0) {
        return sum + i.players.reduce((ps, p) => ps + playerPrice(i.unitPrice ?? 0, p), 0);
      }
      return sum + (i.unitPrice ?? 0) * i.qty;
    }
    return sum + (i.price || 0) * (i.qty || 1);
  }, 0);
}

/** Discounts to surface on the checkout receipt (a positive magnitude). */
export function checkoutDiscounts(cart: CartItem[]): number {
  return Math.abs(cartTotals(cart).discount);
}

/** Sales tax on a taxable amount. */
export const salesTax = (amount: number): number => +(amount * TAX_RATE).toFixed(2);

/** Total players across the check-in lines — drives the guest chip row. */
export function playerCount(cart: CartItem[]): number {
  const item = findCheckInItem(cart);
  return item?.players?.length ?? item?.qty ?? 0;
}

// ─── Mutations (pure — each returns a new cart) ──────────────────────────────

/** Default label for a seat with no name yet. */
export const defaultPlayerName = (index: number): string => `Guest ${index + 1}`;

/**
 * Add an item.
 *
 * Modifiers and member-rate items are *not* handled here — the caller intercepts
 * those first, because a modifier needs a target player and a member rate needs a
 * validated CRM lookup before it can be priced.
 */
export function addItem(cart: CartItem[], name: string, price: number, golferName?: string): CartItem[] {
  const checkIn = isCheckInItem(name);
  const existing = checkIn
    ? cart.find((i) => i.name === name && i.isCheckIn)
    : cart.find((i) => i.name === name && !i.isCheckIn);

  if (existing) {
    return cart.map((i) => {
      if (i !== existing) return i;
      const qty = i.qty + 1;
      if (!checkIn) return { ...i, qty };
      const players = [
        ...(i.players ?? [{ name: golferName ?? defaultPlayerName(0), transport: 'walking' as Transport, modifierTags: [] }]),
      ];
      players.push({ name: defaultPlayerName(players.length), transport: 'walking', modifierTags: [] });
      return { ...i, qty, players, price: (i.unitPrice ?? i.price) * qty };
    });
  }

  if (checkIn) {
    // A new round inherits any tee time already attached to the order, so adding
    // a second rate to the same booking doesn't lose the slot.
    const existingTeeTime = cart.find((i) => i.isCheckIn && i.teeTime)?.teeTime;
    return [
      ...cart,
      {
        name,
        unitPrice: price,
        price,
        qty: 1,
        isCheckIn: true,
        teeTime: existingTeeTime,
        players: [
          { name: golferName ?? defaultPlayerName(0), transport: 'walking', modifierTags: [] },
        ],
      },
    ];
  }
  return [...cart, { name, price, qty: 1 }];
}

/** Step a line's quantity; removes the line when it hits zero. */
export function changeQty(cart: CartItem[], index: number, delta: number): CartItem[] {
  const item = cart[index];
  if (!item) return cart;

  const qty = item.qty + delta;
  if (qty <= 0) return cart.filter((_, i) => i !== index);

  return cart.map((i, idx) => {
    if (idx !== index) return i;
    if (!i.isCheckIn) return { ...i, qty };

    // Keep the player roster in step with the quantity.
    const players = [...(i.players ?? [])];
    while (players.length < qty) {
      players.push({ name: defaultPlayerName(players.length), transport: 'walking', modifierTags: [] });
    }
    while (players.length > qty) players.pop();
    return { ...i, qty, players, price: (i.unitPrice ?? 0) * qty };
  });
}

export function removeItem(cart: CartItem[], index: number): CartItem[] {
  return cart.filter((_, i) => i !== index);
}

/** Add a seat to a round. The prototype caps a tee time at five players. */
export function addPlayer(cart: CartItem[], itemIndex: number, maxPlayers = 5): CartItem[] {
  const item = cart[itemIndex];
  if (!item || item.qty >= maxPlayers) return cart;
  return changeQty(cart, itemIndex, 1);
}

export function removePlayer(cart: CartItem[], itemIndex: number): CartItem[] {
  const item = cart[itemIndex];
  if (!item || item.qty <= 1) return cart;
  return changeQty(cart, itemIndex, -1);
}

/** Update one field on one player of one line. */
export function updatePlayer(
  cart: CartItem[],
  itemIndex: number,
  playerIndex: number,
  patch: Partial<CartPlayer>,
): CartItem[] {
  return cart.map((item, i) => {
    if (i !== itemIndex || !item.players) return item;
    return {
      ...item,
      players: item.players.map((p, pi) => (pi === playerIndex ? { ...p, ...patch } : p)),
    };
  });
}

/**
 * Toggle a modifier on one player.
 *
 * Applying a second transport modifier replaces the first, and applying a second
 * rate override replaces the first — an operator can't accidentally stack two
 * carts or two rates. Discounts do stack.
 */
export function togglePlayerModifier(
  cart: CartItem[],
  itemIndex: number,
  playerIndex: number,
  modName: string,
): CartItem[] {
  const mod = MODIFIER_ITEMS[modName];
  if (!mod) return cart;

  return cart.map((item, i) => {
    if (i !== itemIndex || !item.players?.[playerIndex]) return item;

    const players = item.players.map((p, pi) => {
      if (pi !== playerIndex) return p;
      const tags = p.modifierTags ?? [];

      if (tags.some((t) => t.name === modName)) {
        return { ...p, modifierTags: tags.filter((t) => t.name !== modName) };
      }

      let kept = tags;
      if (mod.isTransport) {
        kept = tags.filter((t) => !MODIFIER_ITEMS[t.name]?.isTransport);
      } else if (!mod.isDiscount) {
        kept = tags.filter(
          (t) => MODIFIER_ITEMS[t.name]?.isDiscount || MODIFIER_ITEMS[t.name]?.isTransport,
        );
      }

      const tag: ModifierTag = {
        name: modName,
        tag: mod.tag ?? modName,
        tagColor: mod.tagColor ?? '#374151',
        p: mod.p,
        isDiscount: mod.isDiscount,
        isTransport: mod.isTransport,
        isOverride: mod.isOverride,
      };
      return { ...p, modifierTags: [...kept, tag] };
    });

    return { ...item, players };
  });
}

// ─── Building a cart from a tee-sheet booking ────────────────────────────────

/**
 * Time-of-day discount applied when a round is checked in from the tee sheet.
 *
 * Early morning (6–10am) and twilight (2–6pm) discount; peak (10am–2pm) does not.
 * Members are exempt — their rate is already zero.
 */
export function timeShiftDiscount(
  timeMin: number,
  holes: string,
): { name: string; disc: number; color: string } | null {
  const is18 = holes === '18';
  if (timeMin >= 360 && timeMin < 600)
    return { name: 'Early Morning Discount', disc: is18 ? -6 : -3, color: '#f59e0b' };
  if (timeMin >= 840 && timeMin < 1080)
    return { name: 'Twilight Discount', disc: is18 ? -6 : -3, color: '#7c3aed' };
  return null;
}

/**
 * Turn a tee-sheet booking into cart lines: one per-player check-in line plus a
 * tax line. Ported from `buildTeeTimeCart`.
 *
 * Transport comes off the booking (`b.cart`) rather than being chosen at the
 * counter, because the golfer already picked it when they reserved.
 */
export function buildTeeTimeCart(b: Booking): CartItem[] {
  const course = COURSES.find((c) => c.id === b.course);
  const prices = TEE_PRICES[b.status] ?? TEE_PRICES.booked;
  const holes = course?.holes.replace(' HOLES', '') ?? '9';

  const roundLabel =
    b.status === 'member'
      ? 'Member Check-in'
      : b.status === 'walkin'
        ? `Walk-in ${holes} holes`
        : `Tee Time ${holes} holes`;

  const shiftDisc = b.status !== 'member' ? timeShiftDiscount(b.timeMin, holes) : null;

  // Player 1 is the booking name; the rest come from `guests` or fall back to
  // "Guest n" so every seat is addressable even before it's named.
  const guestNames = [
    b.name,
    ...(b.guests ?? []).slice(1).map((g, i) => g?.name || `Guest ${i + 2}`),
  ];

  const players: CartPlayer[] = Array.from({ length: b.players }, (_, i) => {
    const modifierTags: ModifierTag[] = [];

    if (b.cart === 'cart') {
      modifierTags.push({
        name: 'Riding Cart',
        tag: 'Riding Cart',
        tagColor: '#d97706',
        p: prices.cartFee ?? 0,
        isTransport: true,
      });
    } else if (b.cart === 'push') {
      modifierTags.push({
        name: 'Push Cart',
        tag: 'Push Cart',
        tagColor: '#7c3aed',
        p: prices.pushFee ?? 5,
        isTransport: true,
      });
    }

    if (b.status === 'member' && prices.memberDiscount) {
      modifierTags.push({
        name: 'Member Rate',
        tag: 'Member',
        tagColor: '#2563eb',
        p: 0,
        isOverride: true,
      });
    }

    if (shiftDisc) {
      modifierTags.push({
        name: shiftDisc.name,
        tag: shiftDisc.name.toUpperCase(),
        tagColor: shiftDisc.color,
        p: shiftDisc.disc,
        isDiscount: true,
      });
    }

    return {
      name: guestNames[i] || `Guest ${i + 1}`,
      transport: b.cart === 'cart' ? 'cart' : b.cart === 'push' ? 'push' : 'walking',
      modifierTags,
    };
  });

  const basePrice = b.status === 'member' ? 0 : prices.basePrice;

  return [
    {
      name: roundLabel,
      unitPrice: basePrice,
      price: basePrice * b.players,
      qty: b.players,
      isCheckIn: true,
      teeTime: {
        label: TIMES.find((x) => x.totalMin === b.timeMin)?.label ?? '?',
        courseName: course?.name ?? '',
        courseId: b.course,
        timeMin: b.timeMin,
      },
      players,
    },
    {
      name: 'Taxes',
      price: prices.tax * b.players,
      qty: 1,
      isSubItem: true,
      isTax: true,
    },
  ];
}

/** Format a dollar amount the way the POS does everywhere. */
export const money = (n: number): string => `$${n.toFixed(2)}`;
