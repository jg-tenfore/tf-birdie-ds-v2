import { CHECK_IN_ITEMS, MODIFIER_ITEMS } from '../data/catalog';
import { COURSES, TEE_PRICES, TIMES } from '../data/courses';
import { TAX_RATE } from '../data/config';
import { VENUES } from '../data/venues';
import type { Booking, CartItem, CartPlayer, Course, ModifierTag, Transport } from '../types';
import { playerFee, playerHoles, playerName, playerTransport, roundLabel } from './reservation';
import { seatIsMember } from './rates';
import { seatNetGreenFee, seatTransportOverride } from './seat-pricing';
import type { RateContext } from './rates';

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
  // Settled on the booking already — on the order so the party reads whole, but free.
  if (player.paid || player.noShow) return 0;
  let fee = player.fee ?? unitPrice;
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
  if (player.paid || player.noShow) return { fee: 0, transport: 0, discount: 0, total: 0 };
  const base = player.fee ?? unitPrice;
  let fee = base;
  let transport = 0;
  let discount = 0;

  for (const t of player.modifierTags ?? []) {
    if (t.isTransport) transport = t.p;
    else if (t.isDiscount) {
      fee += t.p;
      discount += t.p;
    } else {
      discount += t.p - base;
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
          if (p.paid || p.noShow) continue;
          const b = playerBreakdown(unitPrice, p);
          subtotal += (p.fee ?? unitPrice) + b.transport;
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
  // Tax is carried on lines that hang off a round. With nothing left to charge — every
  // player settled, or the round removed — there is nothing for it to be tax *on*.
  if (!hasChargeableLines(cart)) tax = 0;
  return { subtotal, discount, tax };
}

/** Anything on the order that isn't a tax row, and still charges. */
function hasChargeableLines(cart: CartItem[]): boolean {
  return cart.some((i) => {
    if (i.isTax || i.name === 'Taxes') return false;
    if (i.isCheckIn) return (i.players ?? []).length === 0 ? i.qty > 0 : (i.players ?? []).some((p) => !p.paid && !p.noShow);
    return true;
  });
}

/**
 * The order is a tee time whose players have all settled — paid earlier or no-shows — and
 * nothing else is on it. The Pay button shows "Paid in full" rather than asking again.
 */
export function cartIsSettled(cart: CartItem[]): boolean {
  const rounds = cart.filter((i) => i.isCheckIn);
  return rounds.length > 0 && !hasChargeableLines(cart);
}

/** Drop tax rows when nothing chargeable is left for them to hang off. */
export function dropOrphanTax(cart: CartItem[]): CartItem[] {
  if (cart.some((i) => i.isCheckIn) || hasChargeableLines(cart)) return cart;
  return cart.filter((i) => !(i.isTax || i.name === 'Taxes'));
}

/**
 * What the lines charge — tax rows included as they stand, no sales tax. The amount an
 * order actually charges is `orderTotals(cart).total`; this is its building block.
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
  const chargeable = hasChargeableLines(cart);
  return cart.reduce((sum, i) => {
    if (!chargeable && (i.isTax || i.name === 'Taxes')) return sum;
    if (i.isCheckIn) {
      if (i.players && i.players.length > 0) {
        return sum + i.players.reduce((ps, p) => ps + playerPrice(i.unitPrice ?? 0, p), 0);
      }
      return sum + (i.unitPrice ?? 0) * i.qty;
    }
    return sum + (i.price || 0) * (i.qty || 1);
  }, 0);
}

/** Sales tax on a taxable amount. */
export const salesTax = (amount: number): number => +(amount * TAX_RATE).toFixed(2);

/** A tax row — the `Taxes` line a tee-sheet round arrives with. */
const isTaxRow = (i: CartItem): boolean => Boolean(i.isTax) || i.name === 'Taxes';

const cents = (n: number): number => Math.round(n * 100) / 100;

/** Everything an order costs, from `orderTotals`. */
export interface OrderTotals {
  /** List price of every line, before discounts. */
  subtotal: number;
  /** Discounts actually applied — negative, or 0. `subtotal + discount = goods`. */
  discount: number;
  /** What the lines charge, before tax. */
  goods: number;
  /** Tax on the golf: the booking's own `Taxes` line. */
  golfTax: number;
  /** Sales tax (`TAX_RATE`) on everything else — retail, F&B, rentals. */
  salesTax: number;
  /** `golfTax + salesTax`, or 0 when the order is tax exempt. */
  tax: number;
  /** The order carries a Tax Exempt line. */
  exempt: boolean;
  /** `goods + tax` — the one number the Pay button, checkout and every reader charge. */
  total: number;
}

/**
 * **The** order total — one calculation for the register, the reservation's Check in & pay,
 * checkout, the tip screen, the payment reader and change due, on the terminal and the
 * phone alike. Nothing else adds tax to an order.
 *
 *  - **Golf** is taxed by the booking's own `Taxes` line — the sum of each chargeable seat's
 *    own green-fee tax, by that seat's rate class (`seatCharges`, from `buildTeeTimeCart`). A round rung up at the counter has no such
 *    line, so it's taxed like everything else.
 *  - **Everything else** — retail, F&B, rentals, and any round without a tax line — pays
 *    sales tax (`salesTax`, `TAX_RATE`) on what it charges. Before this, retail on a
 *    tee-time order was untaxed (the tax line short-circuited it), the terminal's checkout
 *    counted the golf tax twice, and its reader added a flat 8% on top of that.
 *  - A **Tax Exempt** line zeroes both.
 *
 * With nothing left to charge (every seat settled, or the round removed), a stray tax row
 * charges nothing.
 */
export function orderTotals(cart: CartItem[]): OrderTotals {
  const lines = cart.filter((i) => !isTaxRow(i));
  const exempt = cart.some((i) => i.name === 'Tax Exempt');
  const goods = cents(payableTotal(lines));
  const subtotal = cents(cartTotals(lines).subtotal);

  const golfTaxed = hasChargeableLines(cart) && cart.some(isTaxRow);
  const golfTax = golfTaxed ? cents(cart.filter(isTaxRow).reduce((s, i) => s + i.price, 0)) : 0;
  // The golf a tax line already covers; sales tax is on the rest.
  const golfGoods = golfTaxed ? payableTotal(lines.filter((i) => i.isCheckIn)) : 0;
  const sales = salesTax(Math.max(0, goods - golfGoods));
  const tax = exempt ? 0 : cents(golfTax + sales);

  return {
    subtotal,
    discount: cents(goods - subtotal),
    goods,
    golfTax: exempt ? 0 : golfTax,
    salesTax: exempt ? 0 : sales,
    tax,
    exempt,
    total: cents(goods + tax),
  };
}

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

/**
 * Remove a line. Removing a round also removes the tax rows that hang off it (`isSubItem`
 * lines directly after it) — otherwise the order is left charging tax on nothing.
 */
export function removeItem(cart: CartItem[], index: number): CartItem[] {
  const item = cart[index];
  if (!item) return cart;
  let end = index + 1;
  if (item.isCheckIn) while (cart[end]?.isSubItem) end++;
  return dropOrphanTax(cart.filter((_, i) => i < index || i >= end));
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

/** Every course at every club, so a booking's course resolves whichever venue it's on. */
const ALL_COURSES: Course[] = [...COURSES, ...Object.values(VENUES).flatMap((v) => v.courses)];

/** What one seat of a tee time adds besides its green fee, by the seat's own class. */
export interface SeatCharges {
  /** The seat plays on the membership row (`seatIsMember`). */
  member: boolean;
  /** Riding-cart fee for this seat's class. */
  cartFee: number;
  /** Push-cart fee for this seat's class. */
  pushFee: number;
  /** Green-fee tax for this seat — 0 when the seat's green fee is $0. */
  tax: number;
}

/**
 * The cart fee, push fee and green-fee tax for seat `i`, by **that seat's** rate class
 * (`seatIsMember` — linked customer or booker phone, never a name), not the booking's status:
 *
 *  - a **member** seat reads the member row of `TEE_PRICES`;
 *  - a **guest** seat reads the booking's own row — or, when the booking is a member's, the
 *    reservation (`booked`) row, the guest rate a member's guest pays.
 *
 * Green-fee tax is tax *on the green fee*, so a seat whose fee is $0 — a member on the
 * membership row, or a comped seat — carries none. Settled seats are the caller's concern
 * (`buildTeeTimeCart` skips paid and no-show seats).
 */
export function seatCharges(b: Booking, i: number, rates?: RateContext): SeatCharges {
  const member = seatIsMember(b, i, rates?.roster);
  const row = member
    ? TEE_PRICES.member
    : b.status === 'member'
      ? TEE_PRICES.booked
      : (TEE_PRICES[b.status] ?? TEE_PRICES.booked);
  // The fee the register charges this seat: a member with no hand-set fee plays at $0, and a
  // discount or a punch card takes it down from there. Taxing the rate rather than the net is
  // how a comped seat came to carry green-fee tax.
  const rateFee = member && b.playerStates[i]?.fee == null ? 0 : playerFee(b, i, rates);
  const greenFee = seatNetGreenFee(b, i, rateFee);
  // Transport is the class fee until someone picks a row from the catalog or types a price.
  const chosenTransport = seatTransportOverride(b, i);
  return {
    member,
    cartFee: chosenTransport ?? row.cartFee ?? 0,
    pushFee: chosenTransport ?? row.pushFee ?? 5,
    tax: greenFee > 0 ? (row.tax ?? 0) : 0,
  };
}

/**
 * Turn a tee-sheet booking into cart lines: one per-player check-in line plus a
 * tax line. Ported from `buildTeeTimeCart`, with the reservation as the source of truth:
 *
 *  - **Price** is the booking's own rate (`b.price`), per player via `playerFee` — what the
 *    reservation and the booking's Financial tab show. The original priced from
 *    `TEE_PRICES[status]` and then took a time-of-day discount off that, so a $29 twilight
 *    booking charged $59 − $3.
 *  - **Holes** are per player (`playerHoles`), never read off the course — the original
 *    looked the course up in the three-nines `COURSES` and got 9 at every other club.
 *  - **Transport** is per player (`playerTransport`), priced from the seat's own class
 *    (`seatCharges`) — a guest in a member's group pays the guest cart fee.
 *  - **Settled seats** — already paid, or no-shows — come across marked, and charge nothing.
 *    Tax is only carried for the seats that still pay; with none, there is no tax line.
 *
 *  - **Rate class** is per player too (`seatRateClass`): a member in a guest's group
 *    charges the membership rate and carries the Member tag; a guest in a member's group
 *    charges rack.
 *  - **Tax** is per seat as well: the `Taxes` line is the sum of each chargeable seat's own
 *    green-fee tax (`seatCharges`), so a member's $0 seat in a guest group adds nothing and a
 *    guest in a member booking adds the guest tax.
 *
 * `courses` is the venue's own list; the lookup falls back to every club's courses. `rates`
 * carries the operator's per-row price overrides and the customer roster (`holesFee`) —
 * pass `rateContext(state)`.
 */
export function buildTeeTimeCart(
  b: Booking,
  courses: Course[] = [],
  rates?: RateContext,
  seats?: readonly number[],
): CartItem[] {
  const course = courses.find((c) => c.id === b.course) ?? ALL_COURSES.find((c) => c.id === b.course);
  let taxTotal = 0;

  // `seats` limits the order to the players added so far — Weston's third round put an **Add to
  // cart** on each row, so a foursome splitting the bill rings up two seats now and two later.
  // Omitted means the whole booking, which is what Check in & pay does.
  const indices = seats ? [...seats].sort((x, y) => x - y) : Array.from({ length: b.players }, (_, i) => i);

  const players: CartPlayer[] = indices.map((i) => {
    const modifierTags: ModifierTag[] = [];
    const transport = playerTransport(b, i);
    const state = b.playerStates[i];
    const fee = seatNetGreenFee(b, i, playerFee(b, i, rates));
    const prices = seatCharges(b, i, rates);
    if (!state?.paid && !state?.noShow) taxTotal += prices.tax;

    if (transport === 'cart') {
      modifierTags.push({
        name: 'Riding Cart',
        tag: 'Riding Cart',
        tagColor: '#d97706',
        p: prices.cartFee,
        isTransport: true,
      });
    } else if (transport === 'push') {
      modifierTags.push({
        name: 'Push Cart',
        tag: 'Push Cart',
        tagColor: '#7c3aed',
        p: prices.pushFee,
        isTransport: true,
      });
    }

    // Members play on the member rate unless someone set a fee for this seat by hand — per
    // player, so a member in a guest's group is tagged and a guest in a member's isn't.
    if (prices.member && state?.fee == null) {
      modifierTags.push({
        name: 'Member Rate',
        tag: 'Member',
        tagColor: '#2563eb',
        p: 0,
        isOverride: true,
      });
    }

    const guest = b.guests?.[i];
    return {
      name: playerName(b, i),
      transport,
      modifierTags,
      ...(fee !== b.price ? { fee } : {}),
      holes: playerHoles(b, i),
      ...(state?.paid ? { paid: true } : {}),
      ...(state?.noShow ? { noShow: true } : {}),
      ...(guest?.crmId ? { crmId: guest.crmId } : {}),
    };
  });

  const chargeable = players.filter((p) => !p.paid && !p.noShow).length;
  const seatCount = players.length;
  const teeTime = {
    label: TIMES.find((x) => x.totalMin === b.timeMin)?.label ?? '?',
    courseName: course?.name ?? '',
    courseId: b.course,
    timeMin: b.timeMin,
  };

  return [
    {
      name: roundLabel(b),
      unitPrice: b.price,
      price: b.price * seatCount,
      qty: seatCount,
      isCheckIn: true,
      teeTime,
      players,
    },
    // Kept even at $0 (every paying seat a member, say): the line is what marks the golf as
    // taxed by its booking, so `orderTotals` doesn't charge it sales tax instead.
    ...(chargeable > 0
      ? [
          {
            name: 'Taxes',
            price: cents(taxTotal),
            qty: 1,
            isSubItem: true,
            isTax: true,
          },
        ]
      : []),
  ];
}

// ─── Money formatting ───────────────────────────────────────────────────────

/** One formatter for the whole app, terminal and phone. Built once, not per call. */
const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** U+2212, the typographic minus — the width of `+`, so signed columns line up. */
export const MINUS = '\u2212';

/**
 * Format a dollar amount the way the POS does everywhere: `$6,632.00`, `−$12.50`.
 *
 * Every price, total and balance on screen goes through this — never a hand-rolled
 * `` `$${n.toFixed(2)}` ``, which drops the thousands separator. Rounds to the cent
 * first so a float like `-0.001` shows `$0.00`, not `−$0.00`. Negatives take the true
 * minus (U+2212) rather than a hyphen, on the terminal and the phone alike. Editable
 * amount fields are the exception: they hold plain numbers the operator types into.
 */
export const money = (n: number): string =>
  USD.format(Math.round(n * 100) / 100 || 0).replace(/^-/, MINUS);

/**
 * `money()` without a trailing `.00` on whole dollars: `$45`, `$1,200`, `$12.50`. For
 * compact labels (quick-tender buttons, list balances, price-override chips) that have
 * always shown whole dollars — same formatter, so the separator still appears.
 */
export const moneyShort = (n: number): string => money(n).replace(/\.00$/, '');

/**
 * A price difference, always signed: `+$20.00`, `−$3.00`, or `Free` at zero. For rate and
 * modifier choices, where the sign is the point.
 */
export const deltaMoney = (n: number): string => {
  const s = money(n);
  if (s === '$0.00') return 'Free';
  return s.startsWith(MINUS) ? s : `+${s}`;
};

/**
 * A credit — a discount line: `−$10.00`. Takes the magnitude, so a discount stored as a
 * negative or positive number reads the same.
 */
export const creditMoney = (n: number): string => `${MINUS}${money(Math.abs(n))}`;
