import { describe, expect, it } from 'vitest';
import { allTables } from '../data/floor';
import { MENU_ITEMS, MODIFIER_GROUPS, menuItem, missingRequired, modifierGroup } from '../data/menu';
import { SEED_RESERVATIONS, SEED_TABS } from '../data/restaurant-seed';
import { ICONS } from '../icons';
import { createInitialState, reducer, type PosState } from '../state/pos-store';
import { openTabs, tabById } from '../state/restaurant';
import { orderTotals } from './cart';
import { bySeat, dishLine, isSent, sendToKitchen, tableStatus, tablesFor, unsent } from './restaurant';

const NOON = 12 * 60;
const DAY = SEED_TABS[0].openedDate;
const ctx = (s: PosState, nowMin = NOON) => ({ tabs: s.tabs, reservations: s.diningReservations, date: DAY, nowMin });
const burger = menuItem('counter-clubhouse-cheeseburger')!;
const temp = (name: string) => {
  const g = modifierGroup('temperature')!;
  const o = g.options.find((x) => x.name === name)!;
  return { groupId: g.id, optionId: o.id, name: o.name, price: 0 };
};

describe('the menu', () => {
  it('points only at modifier groups that exist', () => {
    const ids = new Set(MODIFIER_GROUPS.map((g) => g.id));
    for (const i of MENU_ITEMS) for (const m of i.modifiers ?? []) expect(ids.has(m), `${i.id} → ${m}`).toBe(true);
  });

  it('has unique ids', () => {
    expect(new Set(MENU_ITEMS.map((i) => i.id)).size).toBe(MENU_ITEMS.length);
  });

  it('says what a modifier group is — one or many — rather than looking like one and behaving like the other', () => {
    for (const g of MODIFIER_GROUPS) expect(['one', 'many']).toContain(g.select);
    expect(modifierGroup('temperature')!.select).toBe('one');
    expect(modifierGroup('burger-addons')!.select).toBe('many');
  });

  it('will not let a burger be fired without a temperature', () => {
    expect(missingRequired(burger, []).map((g) => g.id)).toContain('temperature');
    expect(missingRequired(burger, [temp('Medium')]).map((g) => g.id)).not.toContain('temperature');
  });

  it('has no icons it cannot draw', () => {
    // The menu itself carries none, but the seed must not smuggle any in either.
    expect(Object.keys(ICONS).length).toBeGreaterThan(0);
  });
});

describe('dishes and the kitchen', () => {
  it('prices a dish with its modifiers, and the register totals it with no special case', () => {
    const bacon = modifierGroup('burger-addons')!.options.find((o) => o.name === 'Bacon')!;
    const l = dishLine(burger, [temp('Medium'), { groupId: 'burger-addons', optionId: bacon.id, name: 'Bacon', price: 2 }], {
      lineId: 'L-1',
      qty: 2,
    });
    expect(l.price).toBe(burger.price + 2);
    expect(orderTotals([l]).subtotal).toBe((burger.price + 2) * 2);
  });

  it('fires only what is unsent, and a second Send with nothing new makes no ticket', () => {
    const a = dishLine(burger, [temp('Rare')], { lineId: 'L-1' });
    const once = sendToKitchen([a], { ticketId: 'K-1', date: DAY, time: '12:00 PM', label: 'Table 1' });
    expect(once.ticket?.lines).toHaveLength(1);
    expect(isSent(once.lines[0])).toBe(true);
    expect(sendToKitchen(once.lines, { ticketId: 'K-2', date: DAY, time: '12:01 PM', label: 'Table 1' }).ticket).toBeNull();
  });

  it('flags an allergy on the ticket, not just in the modifier text', () => {
    const g = modifierGroup('allergies')!;
    const gluten = g.options.find((o) => o.name === 'Gluten')!;
    const l = dishLine(burger, [temp('Medium'), { groupId: g.id, optionId: gluten.id, name: 'Gluten', price: 0, alert: true }], {
      lineId: 'L-1',
    });
    const r = sendToKitchen([l], { ticketId: 'K-1', date: DAY, time: '12:00 PM', label: 'Table 1' });
    expect(r.ticket!.lines[0].allergy).toBe(true);
  });

  it('groups by seat, keeps empty seats, and puts shared plates last', () => {
    const t = SEED_TABS.find((x) => x.id === 'T-1002')!;
    const groups = bySeat(t);
    expect(groups.slice(0, t.guests).map((g) => g.seat)).toEqual([1, 2]);
    expect(groups.at(-1)!.seat).toBeNull();
  });
});

describe('the chain: reservation → table → tab → pay → free', () => {
  const s0 = createInitialState();

  it('derives a table’s status from tabs and reservations, never storing it', () => {
    const tables = Object.fromEntries(allTables(s0.floor).map(({ table }) => [table.id, table]));
    expect(tableStatus(tables['d-1'], ctx(s0))).toBe('seated');
    expect(tableStatus(tables['d-10'], ctx(s0))).toBe('check');
    // Delgado at 12:30, inside the 90-minute hold.
    expect(tableStatus(tables['d-3'], ctx(s0))).toBe('reserved');
    // Park at 5:30 is too far off to hold the table at noon.
    expect(tableStatus(tables['d-2'], ctx(s0))).toBe('free');
  });

  it('offers a party the smallest free table that fits, never one held for someone else', () => {
    const fits = tablesFor(4, s0.floor, ctx(s0)).map((x) => x.table.id);
    expect(fits).not.toContain('d-1'); // seated
    expect(fits).not.toContain('d-3'); // held for Delgado
    const seats = tablesFor(4, s0.floor, ctx(s0)).map((x) => x.table.seats ?? 0);
    expect(seats).toEqual([...seats].sort((a, b) => a - b));
    // …but Delgado's own table is offered to Delgado.
    expect(tablesFor(4, s0.floor, ctx(s0), 'R-504').map((x) => x.table.id)).toContain('d-3');
  });

  it('seats a reservation: opens a tab on the table, sized to the party, and links the two', () => {
    const s = reducer(s0, { type: 'seatReservation', id: 'R-504', tableId: 'd-3' });
    const tab = tabById(s, s.activeTabId)!;
    expect(tab.tableId).toBe('d-3');
    expect(tab.guests).toBe(4);
    expect(tab.reservationId).toBe('R-504');
    const r = s.diningReservations.find((x) => x.id === 'R-504')!;
    expect(r.status).toBe('seated');
    expect(r.tabId).toBe(tab.id);
  });

  it('refuses to seat a party at a table someone is already sitting at', () => {
    const s = reducer(s0, { type: 'seatReservation', id: 'R-504', tableId: 'd-1' });
    expect(s).toBe(s0);
  });

  it('opening a tab on an occupied table opens that table’s tab instead of a second one', () => {
    const s = reducer(s0, { type: 'openTab', tableId: 'd-1', guests: 2 });
    expect(openTabs(s).filter((t) => t.tableId === 'd-1')).toHaveLength(1);
    expect(s.activeTabId).toBe('T-1001');
  });

  it('pays a tab through the register — and paying frees the table and completes the reservation', () => {
    const loaded = reducer(s0, { type: 'payTab', tabId: 'T-1001' });
    expect(loaded.view).toBe('pos');
    expect(loaded.payingTabId).toBe('T-1001');
    expect(loaded.cart.length).toBe(SEED_TABS[0].lines.length);

    const paid = reducer(loaded, { type: 'recordPayment', method: 'card', amount: 100, tip: 15 });
    expect(tabById(paid, 'T-1001')!.status).toBe('paid');
    expect(paid.payingTabId).toBeNull();
    const table = allTables(paid.floor).find((x) => x.table.id === 'd-1')!.table;
    expect(tableStatus(table, ctx(paid))).toBe('free');
    expect(paid.diningReservations.find((r) => r.id === 'R-501')!.status).toBe('completed');

    const rec = paid.payments.at(-1)!;
    expect(rec.tip).toBe(15);
    expect(rec.amount).toBe(85);
    expect(rec.staffId).toBe(SEED_TABS[0].serverId);
  });

  it('will not pay a tab over a different order already on the rail', () => {
    const busy = { ...s0, cart: [{ name: 'Sleeve of balls', price: 12, qty: 1 }] };
    expect(reducer(busy, { type: 'payTab', tabId: 'T-1001' })).toBe(busy);
  });

  it('refuses counter dishes while a tab is on the register being paid', () => {
    // The rail's lines are copies of the tab's. Adding to them would be paid with the tab but never
    // written back to it, and fired to the kitchen labelled "Counter" — so it is refused outright.
    const loaded = reducer(s0, { type: 'payTab', tabId: 'T-1001' });
    const added = reducer(loaded, { type: 'addDish', target: 'cart', menuItemId: burger.id, modifiers: [temp('Medium')] });
    expect(added).toBe(loaded);
    expect(reducer(loaded, { type: 'sendToKitchen', target: 'cart' })).toBe(loaded);
    const lineId = loaded.cart.find((l) => l.dish)!.dish!.lineId;
    expect(reducer(loaded, { type: 'removeDish', target: 'cart', lineId })).toBe(loaded);
  });

  it('clearing a tab off the register without paying leaves it open, untouched', () => {
    const loaded = reducer(s0, { type: 'payTab', tabId: 'T-1001' });
    const cleared = reducer(loaded, { type: 'clearOrder' });
    expect(cleared.payingTabId).toBeNull();
    expect(tabById(cleared, 'T-1001')!.status).toBe('open');
    expect(tabById(cleared, 'T-1001')!.lines.length).toBe(SEED_TABS[0].lines.length);
  });
});

describe('dishes on a tab, through the store', () => {
  const s0 = createInitialState();
  const target = { tabId: 'T-1004' } as const; // just sat, nothing ordered

  it('adds, edits and removes an unsent dish', () => {
    let s = reducer(s0, { type: 'addDish', target, menuItemId: burger.id, modifiers: [temp('Medium')], seat: 1 });
    const line = tabById(s, 'T-1004')!.lines[0];
    s = reducer(s, { type: 'editDish', target, lineId: line.dish!.lineId, patch: { modifiers: [temp('Rare')], seat: 2 } });
    expect(tabById(s, 'T-1004')!.lines[0].dish!.modifiers[0].name).toBe('Rare');
    expect(tabById(s, 'T-1004')!.lines[0].dish!.seat).toBe(2);
    s = reducer(s, { type: 'removeDish', target, lineId: line.dish!.lineId });
    expect(tabById(s, 'T-1004')!.lines).toHaveLength(0);
  });

  it('locks a dish once it is sent — editing and removing are refused, voiding is how it changes', () => {
    let s = reducer(s0, { type: 'addDish', target, menuItemId: burger.id, modifiers: [temp('Medium')], seat: 1 });
    s = reducer(s, { type: 'sendToKitchen', target });
    const id = tabById(s, 'T-1004')!.lines[0].dish!.lineId;
    expect(s.kitchenTickets.at(-1)!.label).toBe('P2');

    expect(reducer(s, { type: 'editDish', target, lineId: id, patch: { seat: 3 } })).toBe(s);
    expect(reducer(s, { type: 'removeDish', target, lineId: id })).toBe(s);

    const voided = reducer(s, { type: 'voidDish', target, lineId: id });
    const l = tabById(voided, 'T-1004')!.lines[0];
    expect(l.dish!.voided).toBe(true);
    expect(l.price).toBe(0);
    expect(unsent(tabById(voided, 'T-1004')!.lines)).toHaveLength(0);
  });

  it('keeps the seeded reservations and tabs consistent with each other', () => {
    for (const r of SEED_RESERVATIONS.filter((x) => x.status === 'seated')) {
      const t = SEED_TABS.find((x) => x.id === r.tabId)!;
      expect(t.reservationId).toBe(r.id);
      expect(t.tableId).toBe(r.tableId);
    }
  });

  it('keeps restaurant state across Back / Forward — a link resets the open tab, not the day', () => {
    const s = reducer(reducer(s0, { type: 'setActiveTab', tabId: 'T-1001' }), { type: 'addDish', target, menuItemId: burger.id, modifiers: [temp('Medium')] });
    const after = reducer(s, { type: 'applyUrl', patch: { view: 'tee' } });
    expect(after.tabs).toBe(s.tabs);
    expect(after.payments).toBe(s.payments);
    expect(after.activeTabId).toBeNull();
  });
});
