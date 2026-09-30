import { priceWithModifiers, type AppliedModifier, type MenuItem } from '../data/menu';
import { allTables, type FloorElement, type Room } from '../data/floor';
import type { CartItem } from '../types';
import { orderTotals } from './cart';

/**
 * The rules of the restaurant (V1 → V2, Wave 2). Pure, so the floor, the tab, the kitchen and the
 * tests all agree.
 *
 * The chain, in one line: a **reservation** is given a **table**; seating it opens a **tab** on that
 * table; the tab's **dishes** go to the **kitchen**; paying the tab closes it and the table is free.
 * v1 had all of these and joined none of them — a reservation knew nothing about tables, and v1's
 * own notes say seating was "entirely a matter of the host remembering".
 */

// ─── Tabs, reservations, payments ───────────────────────────────────────────

export interface Tab {
  /** `T-1042`. From a counter, never reused. */
  id: string;
  /** What the server calls it: "Table 12 · Kim", "Bar · Scott". */
  name: string;
  /** The floor element it is on. Absent for a tab with no table — a bar tab, a golfer's tab. */
  tableId?: string;
  reservationId?: string;
  customerId?: string;
  guests: number;
  serverId: string;
  /** `YYYY-MM-DD` and `h:mm AM`. */
  openedDate: string;
  openedAt: string;
  lines: CartItem[];
  /** The table has asked for the check — the one status a server needs to see from across the room. */
  checkRequested?: boolean;
  status: 'open' | 'paid';
  paidAt?: string;
}

export type ReservationStatus = 'booked' | 'seated' | 'completed' | 'no_show' | 'cancelled';

export interface DiningReservation {
  id: string;
  date: string;
  timeMin: number;
  partySize: number;
  name: string;
  customerId?: string;
  phone?: string;
  /** Assigned ahead of time, or chosen at the moment of seating. */
  tableId?: string;
  status: ReservationStatus;
  /** The tab seating opened. */
  tabId?: string;
  note?: string;
}

/**
 * One payment, as it happened (V1 → V2).
 *
 * The store used to remember only `lastPayment`, so there was nothing for Orders & Tips to list.
 * `amount` is what was charged before the tip; `tip` is kept apart because it is the part that gets
 * adjusted afterwards, and because a tip-out is paid from it alone.
 */
export interface PaymentRecord {
  id: string;
  date: string;
  time: string;
  method: string;
  amount: number;
  tip: number;
  cardLast4?: string;
  orderNumber: string;
  tabId?: string;
  /** Who took it — the tab's server, or the operator. */
  staffId: string;
  /** Set when the tip was changed after the fact. */
  tipAdjustedAt?: string;
  /**
   * A refund is a payment going back (V1 → V2, Wave 3): its `amount` is negative, so the day's
   * totals net out without a special case. Absent means a sale, as every Wave 2 payment was.
   */
  kind?: 'sale' | 'refund';
  /** The customer, gift card or event a tender drew on (Wave 3's tenders). */
  ref?: import('./orders').PaymentRef;
}

/** A ticket the kitchen received. Kept for the KDS that will one day read it. */
export interface KitchenTicket {
  id: string;
  date: string;
  time: string;
  /** "Table 12", "Bar · Scott", "Counter #A-10311". */
  label: string;
  tabId?: string;
  lines: { lineId: string; name: string; qty: number; seat?: number; modifiers: string[]; note?: string; allergy: boolean }[];
}

// ─── Dishes ─────────────────────────────────────────────────────────────────

/** A new dish line. Unsent. */
export function dishLine(
  item: MenuItem,
  modifiers: AppliedModifier[],
  opts: { lineId: string; seat?: number; note?: string; qty?: number },
): CartItem {
  const unit = priceWithModifiers(item.price, modifiers);
  return {
    name: item.name,
    price: unit,
    unitPrice: unit,
    qty: opts.qty ?? 1,
    dish: {
      lineId: opts.lineId,
      menuItemId: item.id,
      basePrice: item.price,
      modifiers,
      seat: opts.seat,
      note: opts.note?.trim() || undefined,
    },
  };
}

export const isDish = (l: CartItem): l is CartItem & { dish: NonNullable<CartItem['dish']> } => Boolean(l.dish);

/** A dish's unit price: base, plus modifiers, less any discount, to the cent. */
export function dishUnitPrice(d: Pick<NonNullable<CartItem['dish']>, 'basePrice' | 'modifiers' | 'discountPct'>): number {
  const full = priceWithModifiers(d.basePrice, d.modifiers);
  const pct = Math.max(0, Math.min(100, d.discountPct ?? 0));
  return Math.round(full * (100 - pct)) / 100;
}

export const isSent = (l: CartItem): boolean => Boolean(l.dish?.sentAt);

/** Unsent, un-voided dishes — what Send would fire. */
export const unsent = (lines: CartItem[]): CartItem[] => lines.filter((l) => isDish(l) && !isSent(l) && !l.dish!.voided);

/**
 * Change an unsent dish. A sent one is refused — the cook is already making it — and comes back
 * unchanged, so a caller cannot edit a fired plate by accident.
 */
export function editDish(
  line: CartItem,
  patch: { modifiers?: AppliedModifier[]; seat?: number | null; note?: string; qty?: number },
): CartItem {
  if (!line.dish || isSent(line)) return line;
  const modifiers = patch.modifiers ?? line.dish.modifiers;
  // Through `dishUnitPrice`, so changing a comped plate's modifiers keeps its discount.
  const unit = dishUnitPrice({ ...line.dish, modifiers });
  return {
    ...line,
    price: unit,
    unitPrice: unit,
    qty: patch.qty != null ? Math.max(1, patch.qty) : line.qty,
    dish: {
      ...line.dish,
      modifiers,
      seat: patch.seat === null ? undefined : (patch.seat ?? line.dish.seat),
      note: patch.note !== undefined ? patch.note.trim() || undefined : line.dish.note,
    },
  };
}

/**
 * The three jobs v1 kept in each line's ⋮ menu beside Fire — Move, Split and Discount — which the
 * first cut of Wave 2 missed. None of them touches the food, so none is stopped by the kitchen
 * lock: moving a fired plate from seat 2 to seat 3 changes who pays for it, not what the cook
 * makes. A voided plate is left alone by all three.
 */

/** Put a dish on another seat, sent or not. `null` makes it a shared plate. */
export function moveDish(line: CartItem, seat: number | null): CartItem {
  if (!line.dish || line.dish.voided) return line;
  return { ...line, dish: { ...line.dish, seat: seat ?? undefined } };
}

/** Take a percentage off a dish, sent or not. 0 removes the discount. */
export function discountDish(line: CartItem, pct: number): CartItem {
  if (!line.dish || line.dish.voided) return line;
  const discountPct = Math.max(0, Math.min(100, Math.round(pct))) || undefined;
  const unit = dishUnitPrice({ ...line.dish, discountPct });
  return { ...line, price: unit, unitPrice: unit, dish: { ...line.dish, discountPct } };
}

/**
 * Split one unit off a line of two or more onto another seat — "two Miller Lites" becomes one for
 * seat 1 and one for seat 3. The new line keeps its sent state and ticket: the kitchen made both.
 * Returns the lines unchanged for a single unit, which is a move, not a split.
 */
export function splitDish(lines: CartItem[], lineId: string, seat: number | null, newLineId: string): CartItem[] {
  const i = lines.findIndex((l) => l.dish?.lineId === lineId);
  const line = lines[i];
  if (i < 0 || !line.dish || line.dish.voided || line.qty < 2) return lines;
  const rest = { ...line, qty: line.qty - 1 };
  const one: CartItem = { ...line, qty: 1, dish: { ...line.dish, lineId: newLineId, seat: seat ?? undefined } };
  return [...lines.slice(0, i), rest, one, ...lines.slice(i + 1)];
}

/** Void a sent dish: it stays on the ticket so the kitchen sees it cancelled, and costs nothing. */
export function voidDish(line: CartItem): CartItem {
  if (!line.dish) return line;
  return { ...line, price: 0, dish: { ...line.dish, voided: true } };
}

/**
 * Fire everything unsent. Returns the lines, now stamped, and the ticket the kitchen gets.
 * Nothing unsent means no ticket — Send on an order the kitchen already has is a no-op.
 */
export function sendToKitchen(
  lines: CartItem[],
  meta: { ticketId: string; date: string; time: string; label: string; tabId?: string },
): { lines: CartItem[]; ticket: KitchenTicket | null } {
  const firing = new Set(unsent(lines).map((l) => l.dish!.lineId));
  if (firing.size === 0) return { lines, ticket: null };
  const out = lines.map((l) =>
    l.dish && firing.has(l.dish.lineId) ? { ...l, dish: { ...l.dish, sentAt: meta.time, ticketId: meta.ticketId } } : l,
  );
  const ticket: KitchenTicket = {
    id: meta.ticketId,
    date: meta.date,
    time: meta.time,
    label: meta.label,
    tabId: meta.tabId,
    lines: lines
      .filter((l) => l.dish && firing.has(l.dish.lineId))
      .map((l) => ({
        lineId: l.dish!.lineId,
        name: l.name,
        qty: l.qty,
        seat: l.dish!.seat,
        modifiers: l.dish!.modifiers.map((m) => m.name),
        note: l.dish!.note,
        allergy: l.dish!.modifiers.some((m) => m.alert),
      })),
  };
  return { lines: out, ticket };
}

/** What a tab owes — the register's own arithmetic, so the tab and the checkout agree. */
export const tabTotal = (tab: Pick<Tab, 'lines'>, taxRate?: number): number => orderTotals(tab.lines, taxRate).total;

/** Dishes grouped by seat, shared plates last. Seats with nothing on them are kept, so an empty seat shows. */
export function bySeat(tab: Pick<Tab, 'lines' | 'guests'>): { seat: number | null; lines: CartItem[] }[] {
  const seats = Array.from({ length: tab.guests }, (_, i) => ({ seat: i + 1 as number | null, lines: [] as CartItem[] }));
  const shared = { seat: null as number | null, lines: [] as CartItem[] };
  for (const l of tab.lines) {
    const s = l.dish?.seat;
    if (s && s >= 1 && s <= tab.guests) seats[s - 1].lines.push(l);
    else shared.lines.push(l);
  }
  return shared.lines.length ? [...seats, shared] : seats;
}

// ─── Tables ─────────────────────────────────────────────────────────────────

export type TableStatus = 'free' | 'reserved' | 'seated' | 'check' | 'blocked';

/** How long before a reservation its table counts as held for it. */
export const HOLD_BEFORE_MIN = 90;

/**
 * A table's status, **derived** — never stored. v1 kept a status on each table, which is a second
 * source of truth: a table can say "seated" while no tab is open on it. Here it is computed from
 * the tabs and reservations, so it cannot disagree with them.
 *
 * In order: out of service beats everything; an open tab makes it seated (or `check` once the
 * check is asked for); a booked reservation for it starting within the next 90 minutes, or up to
 * 15 late, makes it reserved; otherwise it is free.
 */
export function tableStatus(
  table: FloorElement,
  ctx: { tabs: Tab[]; reservations: DiningReservation[]; date: string; nowMin: number },
): TableStatus {
  if (table.outOfService) return 'blocked';
  const tab = openTabOn(table.id, ctx.tabs);
  if (tab) return tab.checkRequested ? 'check' : 'seated';
  const held = upcomingReservationFor(table.id, ctx);
  return held ? 'reserved' : 'free';
}

export const openTabOn = (tableId: string, tabs: Tab[]): Tab | undefined =>
  tabs.find((t) => t.status === 'open' && t.tableId === tableId);

export function upcomingReservationFor(
  tableId: string,
  ctx: { reservations: DiningReservation[]; date: string; nowMin: number },
): DiningReservation | undefined {
  return ctx.reservations
    .filter(
      (r) =>
        r.tableId === tableId &&
        r.date === ctx.date &&
        r.status === 'booked' &&
        r.timeMin - ctx.nowMin <= HOLD_BEFORE_MIN &&
        ctx.nowMin - r.timeMin <= 15,
    )
    .sort((a, b) => a.timeMin - b.timeMin)[0];
}

/**
 * Tables a party of `size` could sit at right now: free, seating at least `size`, not held for
 * someone else. Smallest first, so a two-top is not offered the eight-top while a four is free.
 */
export function tablesFor(
  size: number,
  rooms: Room[],
  ctx: { tabs: Tab[]; reservations: DiningReservation[]; date: string; nowMin: number },
  forReservation?: string,
): { room: Room; table: FloorElement }[] {
  return allTables(rooms)
    .filter(({ table }) => (table.seats ?? 0) >= size)
    .filter(({ table }) => {
      const s = tableStatus(table, ctx);
      if (s === 'free') return true;
      // A table held for *this* reservation is the right table for it.
      return s === 'reserved' && upcomingReservationFor(table.id, ctx)?.id === forReservation;
    })
    .sort((a, b) => (a.table.seats ?? 0) - (b.table.seats ?? 0));
}

/** "Table 12", "P3", "B6" — how a server says it. */
export function tableLabel(t: Pick<FloorElement, 'num'> | undefined): string {
  if (!t?.num) return 'Table';
  return /^\d+$/.test(t.num) ? `Table ${t.num}` : t.num;
}
