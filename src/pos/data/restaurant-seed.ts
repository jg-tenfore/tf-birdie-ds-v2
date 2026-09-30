import { DEMO_TODAY } from './bookings';
import { toDateStr } from './courses';
import { menuItem, modifierGroup, type AppliedModifier } from './menu';
import { dishLine, sendToKitchen, type DiningReservation, type KitchenTicket, type Tab } from '../logic/restaurant';
import type { CartItem } from '../types';

/**
 * The restaurant's demo day (V1 → V2, Wave 2): lunch in progress at the demo's noon.
 *
 * Authored, not generated, because every piece of it is a state some story needs to point at: a
 * table waiting on its check, a table whose food has partly gone to the kitchen, a table just sat
 * with nothing ordered, a bar tab with no table, a table held for a 12:30 reservation, an evening
 * of reservations some of which already have tables, a no-show, and a morning's payments to
 * adjust tips on. Deterministic, like every fixture here.
 */

const DAY = toDateStr(DEMO_TODAY());

/** A modifier by group and option name, denormalised the way a line stores it. */
function mod(groupId: string, optionName: string): AppliedModifier {
  const g = modifierGroup(groupId)!;
  const o = g.options.find((x) => x.name === optionName)!;
  return { groupId, optionId: o.id, name: o.name, price: o.price ?? 0, alert: g.alert };
}

let lineSeq = 0;
/** A dish on a seat. `id` is the menu item's, e.g. `nineteenth-filet-mignon-8oz`. */
function dish(id: string, seat: number | undefined, mods: AppliedModifier[] = [], qty = 1, note?: string): CartItem {
  const item = menuItem(id);
  if (!item) throw new Error(`restaurant seed: no menu item "${id}"`);
  lineSeq += 1;
  return dishLine(item, mods, { lineId: `L-${String(lineSeq).padStart(4, '0')}`, seat, qty, note });
}

let ticketSeq = 0;
const tickets: KitchenTicket[] = [];
/** Fire what is on `lines` now, as the kitchen would have received it at `time`. */
function fired(lines: CartItem[], time: string, label: string, tabId: string): CartItem[] {
  ticketSeq += 1;
  const r = sendToKitchen(lines, { ticketId: `K-${3000 + ticketSeq}`, date: DAY, time, label, tabId });
  if (r.ticket) tickets.push(r.ticket);
  return r.lines;
}

const tab = (t: Omit<Tab, 'openedDate' | 'status'>): Tab => ({ openedDate: DAY, status: 'open', ...t });

// ─── Lunch, in progress ─────────────────────────────────────────────────────

const t1Lines = fired(
  [
    dish('counter-clubhouse-cheeseburger', 1, [mod('temperature', 'Medium'), mod('side', 'Fries'), mod('burger-addons', 'Bacon')]),
    dish('nineteenth-caesar-salad', 2, [mod('salad-protein', 'Grilled chicken')]),
    dish('counter-nashville-hot-chicken-sandwich', 3, [mod('side', 'Sweet potato fries'), mod('hold', 'No mayo')]),
    dish('counter-miller-lite', 4, [], 2),
  ],
  '11:42 AM',
  'Table 1',
  'T-1001',
);

// Half sent: the mains are in, the second round of drinks and a dessert are not.
const t5Lines = [
  ...fired(
    [
      dish('nineteenth-filet-mignon-8oz', 1, [mod('temperature', 'Medium rare'), mod('steak-addons', 'Truffle butter')]),
      dish('nineteenth-crispy-calamari', undefined, [mod('allergies', 'Shellfish')]),
    ],
    '11:51 AM',
    'Table 5',
    'T-1002',
  ),
  dish('nineteenth-butter-cake', 2),
  dish('counter-josh-cabernet-sauvignon', 1),
];

const t10Lines = fired(
  [
    ...Array.from({ length: 4 }, (_, i) => dish('counter-turn-burger', i + 1, [mod('temperature', 'Medium well'), mod('side', 'Fries')])),
    dish('counter-clubhouse-blt', 5, [mod('side', 'Chips')]),
    dish('counter-clubhouse-blt', 6, [mod('side', 'Side salad'), mod('allergies', 'Gluten')], 1, 'Gluten-free bread'),
    dish('counter-southwest-chicken-wrap', 7, [mod('side', 'Fries')]),
    dish('counter-chicken-tenders', 8),
    dish('counter-corona-extra', undefined, [], 6),
  ],
  '11:18 AM',
  'Table 10',
  'T-1003',
);

const barLines = fired([dish('counter-sapporo-premium', 1, [], 2)], '11:55 AM', 'B3', 'T-1005');

const leagueLines = fired(
  [dish('counter-miller-lite', undefined, [], 8), dish('counter-basket-of-fries', undefined, [], 3)],
  '11:30 AM',
  "Men's league",
  'T-1006',
);

export const SEED_TABS: Tab[] = [
  tab({ id: 'T-1001', name: 'Table 1 · Kim', tableId: 'd-1', reservationId: 'R-501', customerId: 'M005', guests: 4, serverId: 's-2', openedAt: '11:35 AM', lines: t1Lines }),
  tab({ id: 'T-1002', name: 'Table 5', tableId: 'd-5', guests: 2, serverId: 's-3', openedAt: '11:46 AM', lines: t5Lines }),
  tab({
    id: 'T-1003',
    name: 'Table 10 · Farnsworth',
    tableId: 'd-10',
    reservationId: 'R-502',
    customerId: 'G006',
    guests: 8,
    serverId: 's-2',
    openedAt: '11:10 AM',
    lines: t10Lines,
    checkRequested: true,
  }),
  // Just sat. Nothing ordered yet.
  tab({ id: 'T-1004', name: 'P2', tableId: 'p-2', guests: 3, serverId: 's-3', openedAt: '11:58 AM', lines: [] }),
  tab({ id: 'T-1005', name: 'B3 · Okonkwo', tableId: 'b-3', customerId: 'M011', guests: 1, serverId: 's-4', openedAt: '11:52 AM', lines: barLines }),
  // No table: a tab run for a group, paid at the end of the day.
  tab({ id: 'T-1006', name: "Men's league", guests: 12, serverId: 's-4', openedAt: '11:25 AM', lines: leagueLines }),
];

export const SEED_KITCHEN_TICKETS: KitchenTicket[] = tickets;

// ─── Reservations ───────────────────────────────────────────────────────────

const at = (h: number, m = 0) => h * 60 + m;
const res = (r: Omit<DiningReservation, 'date'>): DiningReservation => ({ date: DAY, ...r });

export const SEED_RESERVATIONS: DiningReservation[] = [
  // Lunch — already seated, which is where tabs T-1001 and T-1003 came from.
  res({ id: 'R-501', timeMin: at(11, 30), partySize: 4, name: 'Kim, David', customerId: 'M005', tableId: 'd-1', status: 'seated', tabId: 'T-1001' }),
  res({ id: 'R-502', timeMin: at(11, 0), partySize: 8, name: 'Farnsworth, Weston', customerId: 'G006', tableId: 'd-10', status: 'seated', tabId: 'T-1003', note: 'Post-round lunch for the member-guest' }),
  res({ id: 'R-503', timeMin: at(11, 15), partySize: 2, name: 'Novak, Carmen', customerId: 'M002', status: 'no_show' }),
  // Within the hold window at noon, so Table 3 reads as reserved on the live floor.
  res({ id: 'R-504', timeMin: at(12, 30), partySize: 4, name: 'Delgado, Ana', customerId: 'M010', tableId: 'd-3', status: 'booked' }),
  res({ id: 'R-505', timeMin: at(13, 0), partySize: 2, name: 'Walsh, Patricia', customerId: 'M008', status: 'booked', note: 'Window if possible' }),
  // Dinner.
  res({ id: 'R-506', timeMin: at(17, 30), partySize: 4, name: 'Park, Susan', customerId: 'M004', tableId: 'd-2', status: 'booked' }),
  res({ id: 'R-507', timeMin: at(18, 0), partySize: 2, name: 'Blake, Ethan', customerId: 'M001', tableId: 'd-6', status: 'booked', note: 'Anniversary' }),
  res({ id: 'R-508', timeMin: at(18, 30), partySize: 6, name: 'Whitfield, Gerald', customerId: 'M015', tableId: 'd-8', status: 'booked' }),
  res({ id: 'R-509', timeMin: at(19, 0), partySize: 4, name: 'Patel, Priya', customerId: 'M012', status: 'booked', note: 'Shellfish allergy at the table' }),
  res({ id: 'R-510', timeMin: at(19, 0), partySize: 8, name: 'Johnson, Sarah', customerId: 'G002', tableId: 'd-12', status: 'booked' }),
  res({ id: 'R-511', timeMin: at(19, 15), partySize: 3, name: 'Bennett, Laura', customerId: 'G008', status: 'booked' }),
  res({ id: 'R-512', timeMin: at(19, 45), partySize: 2, name: 'Yuen, Marcus', customerId: 'M017', tableId: 'd-7', status: 'booked' }),
  res({ id: 'R-513', timeMin: at(20, 0), partySize: 5, name: 'Martinez, Robert', customerId: 'G003', status: 'cancelled' }),
];

// ─── The morning's payments ─────────────────────────────────────────────────

/**
 * Now derived from the morning's orders (Wave 3), so Order Lookup can show what each paid for and a
 * refund can find its lines. See `orders-seed.ts`.
 */
export { SEED_PAYMENTS } from './orders-seed';
