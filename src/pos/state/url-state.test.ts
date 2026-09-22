import { describe, expect, it } from 'vitest';
import { DEMO_TODAY } from '../data/bookings';
import { toDateStr } from '../data/courses';
import { ALL_GOLFERS } from '../data/golfers';
import { venueBookings } from '../data/venues';
import { missingDemoDay } from './demo-days';
import { createInitialState, reducer } from './pos-store';
import type { Modal, PosState } from './pos-store';
import { demoBookings } from './scenarios';
import { hashToState, isNavigation, stateToHash } from './url-state';

/**
 * The deep-link codec.
 *
 * The property that matters is the round trip: encoding a state and decoding it must give
 * back a state that produces the *same link*. If that holds, a shared URL reopens the screen
 * it was copied from — which is the whole feature.
 */

/** Build a state, encode it, decode it, and re-encode. Round-trips iff the two hashes match. */
function roundTrip(overrides: Partial<PosState>): { first: string; second: string } {
  const state = createInitialState(overrides);
  const first = stateToHash(state);
  const decoded = createInitialState(hashToState(first));
  return { first, second: stateToHash(decoded) };
}

const expectStable = (overrides: Partial<PosState>) => {
  const { first, second } = roundTrip(overrides);
  expect(second, `round trip changed the link: ${first} -> ${second}`).toBe(first);
};

describe('screens', () => {
  it('encodes the register as the default, with no query noise', () => {
    expect(stateToHash(createInitialState())).toBe('#/register');
  });

  it('puts an open category in the path', () => {
    expect(stateToHash(createInitialState({ currentCategory: 'GOLF BALLS' }))).toBe(
      '#/register/GOLF%20BALLS',
    );
  });

  it('distinguishes the two tee-sheet modes by path', () => {
    const cal = createInitialState({ view: 'tee', leftPanelCollapsed: true });
    const list = createInitialState({ view: 'tee', teeSheetMode: 'list', leftPanelCollapsed: true });
    expect(stateToHash(cal)).toBe('#/tee-sheet');
    expect(stateToHash(list)).toBe('#/tee-sheet/list');
  });

  it.each([
    ['register', {}],
    ['register with a category', { currentCategory: 'RENTALS' }],
    ['tee sheet', { view: 'tee' as const, leftPanelCollapsed: true }],
    ['tee sheet list', { view: 'tee' as const, teeSheetMode: 'list' as const, leftPanelCollapsed: true }],
    ['tee sheet with the panel open', { view: 'tee' as const, leftPanelCollapsed: false }],
    ['register with the panel collapsed', { leftPanelCollapsed: true }],
  ])('round-trips %s', (_label, overrides) => expectStable(overrides));
});

describe('day and band', () => {
  it('omits the date when it is the demo day', () => {
    expect(stateToHash(createInitialState())).not.toContain('date=');
  });

  it('encodes and restores another day', () => {
    const date = new Date(2026, 4, 23);
    const hash = stateToHash(createInitialState({ view: 'tee', leftPanelCollapsed: true, currentDate: date }));
    expect(hash).toContain('date=2026-05-23');
    expect(toDateStr(hashToState(hash).currentDate!)).toBe('2026-05-23');
  });

  it('round-trips each time band', () => {
    for (const shift of ['early', 'peak', 'twilight'] as const) {
      expectStable({ view: 'tee', leftPanelCollapsed: true, shift });
    }
  });

  it('ignores a bogus date rather than throwing', () => {
    const patch = hashToState('#/tee-sheet?date=not-a-date');
    expect(patch.currentDate).toBeUndefined();
  });
});

describe('the order', () => {
  it('restores a loaded booking, cart and all', () => {
    const booking = demoBookings().find((b) => b.date === toDateStr(DEMO_TODAY()) && b.players === 4)!;
    const hash = stateToHash(createInitialState({ selectedBookingId: booking.id, cart: [] }));
    expect(hash).toContain(`booking=${booking.id}`);

    const patch = hashToState(hash);
    expect(patch.selectedBookingId).toBe(booking.id);
    // A link that named a booking but restored an empty cart would look like the screen
    // and behave like nothing — the cart has to come back with it.
    expect(patch.cart?.length).toBeGreaterThan(0);
  });

  it('names a cart scenario rather than serializing line items', () => {
    const hash = stateToHash(
      createInitialState({ orderScenario: 'walkin', cart: [{ name: 'x', price: 1, qty: 1 }] }),
    );
    expect(hash).toContain('order=walkin');

    const patch = hashToState(hash);
    expect(patch.cart?.some((i) => i.isCheckIn)).toBe(true);
    expect(patch.orderScenario).toBe('walkin');
  });

  it('drops a booking id that no longer exists', () => {
    const patch = hashToState('#/register?booking=does-not-exist');
    expect(patch.selectedBookingId).toBeUndefined();
    expect(patch.cart).toBeUndefined();
  });

  it('ignores an unknown scenario name', () => {
    expect(hashToState('#/register?order=nonsense').orderScenario).toBeUndefined();
  });
});

describe('modals', () => {
  const cases: Array<[string, Modal]> = [
    ['checkout', { kind: 'checkout' }],
    ['payment reader', { kind: 'paymentReader', method: 'card' }],
    ['payment reader with a tip', { kind: 'paymentReader', method: 'card', tip: 12.5 }],
    ['booking detail', { kind: 'bookingDetail', bookingId: 'p01', tab: 2 }],
    ['tee picker', { kind: 'teePicker', is18H: true }],
    ['reserve confirm', { kind: 'reserveConfirm', payMode: 'now' }],
    ['member lookup', { kind: 'memberLookup', itemName: 'Senior Member 18 Holes', requiredType: 'senior' }],
    ['golfer search (primary)', { kind: 'golferSearch', target: 'primary' }],
    ['golfer search (a seat)', { kind: 'golferSearch', target: { itemIdx: 0, playerIdx: 2 } }],
    ['guest detail', { kind: 'guestDetail', guestIndex: 2 }],
    ['new customer', { kind: 'newCustomer' }],
    ['walk-in', { kind: 'walkIn' }],
    ['open item', { kind: 'openItem' }],
    ['player modifiers', { kind: 'playerModifier', itemIdx: 0, playerIdx: 1 }],
    ['new booking', { kind: 'newBooking', courseId: 'ponds', timeMin: 520, startSlot: 2 }],
    ['action panel', { kind: 'actionPanel', action: 'refund' }],
    ['block time', { kind: 'blockTime', timeMin: 552, editing: true }],
    ['time note', { kind: 'timeNote', timeMin: 552 }],
    ['time price', { kind: 'timePrice', timeMin: 552 }],
    ['league', { kind: 'league', timeMin: 480, editGroupId: 'grp-1' }],
    ['move players', { kind: 'movePlayers', timeMin: 552 }],
    ['course time settings', { kind: 'courseTimeSettings', courseId: 'valley' }],
    ['course rates', { kind: 'courseRates', courseId: 'ponds' }],
    ['tee sheet search', { kind: 'teeSheetSearch' }],
  ];

  it.each(cases)('round-trips %s', (_label, modal) => {
    const patch = hashToState(stateToHash(createInitialState({ modal })));
    expect(patch.modal).toEqual(modal);
  });

  it('writes times as readable HHMM, not raw minutes', () => {
    expect(stateToHash(createInitialState({ modal: { kind: 'timeNote', timeMin: 552 } }))).toContain(
      't=0912',
    );
  });

  it('does not link the confirm dialog', () => {
    // It carries prose and only ever follows an action you just took, so a bare
    // "are you sure?" link would be a question with no context.
    const hash = stateToHash(
      createInitialState({
        modal: {
          kind: 'confirm',
          title: 'Delete this booking?',
          body: 'Cannot be undone.',
          confirmLabel: 'Delete',
          onConfirm: 'deleteBooking:p01',
        },
      }),
    );
    expect(hash).not.toContain('modal=');
  });

  it('drops a modal that is missing the thing it operates on', () => {
    expect(hashToState('#/tee-sheet?modal=booking').modal).toBeUndefined();
    expect(hashToState('#/tee-sheet?modal=block').modal).toBeUndefined();
    expect(hashToState('#/tee-sheet?modal=new-booking&course=ponds').modal).toBeUndefined();
  });

  it('ignores an unrecognized modal slug', () => {
    expect(hashToState('#/register?modal=not-a-dialog').modal).toBeUndefined();
  });
});

describe('tee-sheet chrome', () => {
  it('round-trips the summary drawer, for the day and for one course', () => {
    expect(hashToState('#/tee-sheet?summary=day').sidebarCourse).toBeNull();
    expect(hashToState('#/tee-sheet?summary=ponds').sidebarCourse).toBe('ponds');
    expect(hashToState('#/tee-sheet?summary=day').sidebarOpen).toBe(true);
  });

  it('round-trips multi-select', () => {
    const patch = hashToState('#/tee-sheet?select=p01,p02');
    expect(patch.multiSelectActive).toBe(true);
    expect(patch.multiSelectIds).toEqual(['p01', 'p02']);
  });

  it('round-trips the display toggles', () => {
    const patch = hashToState('#/tee-sheet?compact=1&hide-empty=1');
    expect(patch.settings?.compactMode).toBe(true);
    expect(patch.settings?.hideEmpty).toBe(true);
  });

  it('round-trips list filters', () => {
    expectStable({
      view: 'tee',
      teeSheetMode: 'list',
      leftPanelCollapsed: true,
      listFilters: {
        status: 'open',
        guest: 'all',
        membership: 'senior',
        courses: ['ponds', 'valley'],
        holes: '18H',
        players: [],
        special: [],
        sort: 'status',
        search: 'blake',
      },
    });
  });

  it('leaves list filters out of the link when the list is not showing', () => {
    const hash = stateToHash(
      createInitialState({ view: 'tee', listFilters: { ...createInitialState().listFilters, status: 'open' } }),
    );
    expect(hash).not.toContain('status=');
  });
});

describe('history behaviour', () => {
  const base = createInitialState();

  it('treats a change of screen, day, dialog, or loaded booking as navigation', () => {
    expect(isNavigation(base, createInitialState({ view: 'tee' }))).toBe(true);
    expect(isNavigation(base, createInitialState({ modal: { kind: 'checkout' } }))).toBe(true);
    expect(isNavigation(base, createInitialState({ currentDate: new Date(2026, 4, 23) }))).toBe(true);
    expect(isNavigation(base, createInitialState({ selectedBookingId: 'p01' }))).toBe(true);
    expect(
      isNavigation(
        createInitialState({ view: 'tee' }),
        createInitialState({ view: 'tee', teeSheetMode: 'list' }),
      ),
    ).toBe(true);
  });

  it('does not, for incidental changes that would bury the Back button', () => {
    expect(isNavigation(base, createInitialState({ currentCategory: 'SNACKS' }))).toBe(false);
    expect(
      isNavigation(base, createInitialState({ listFilters: { ...base.listFilters, search: 'ab' } })),
    ).toBe(false);
    expect(
      isNavigation(base, createInitialState({ settings: { ...base.settings, compactMode: true } })),
    ).toBe(false);
  });
});

describe('malformed input', () => {
  it.each([
    ['', '#'],
    ['a bare slash', '#/'],
    ['an unknown screen', '#/nope'],
    ['junk query', '#/register?%%%=&&'],
    ['a truncated time', '#/tee-sheet?modal=note&t=99'],
  ])('degrades to a usable screen: %s', (_label, hash) => {
    expect(() => hashToState(hash)).not.toThrow();
    const patch = hashToState(hash);
    expect(patch.view).toBeDefined();
  });
});

describe('reservation panel (Weston Edits)', () => {
  const id = demoBookings().find((b) => b.date === toDateStr(DEMO_TODAY()) && b.players >= 2)!.id;
  const tee = { view: 'tee' as const, leftPanelCollapsed: true };

  it('stays out of the link when closed', () => {
    expect(stateToHash(createInitialState(tee))).not.toContain('res=');
  });

  it('writes only the non-default parts', () => {
    const hash = stateToHash(
      createInitialState({ ...tee, reservationPanel: { bookingId: id, tab: 'players', playerIndex: 0 } }),
    );
    expect(hash).toBe(`#/tee-sheet?res=${id}`);
  });

  it.each([
    ['players', 0],
    ['customer', 1],
    ['financial', 0],
    ['notes', 0],
    ['activity', 0],
  ] as const)('round-trips the %s tab', (tab, playerIndex) => {
    expectStable({ ...tee, reservationPanel: { bookingId: id, tab, playerIndex } });
    const patch = hashToState(
      stateToHash(createInitialState({ ...tee, reservationPanel: { bookingId: id, tab, playerIndex } })),
    );
    expect(patch.reservationPanel).toEqual({ bookingId: id, tab, playerIndex });
  });

  it('survives a dialog opened on top of it', () => {
    const patch = hashToState(`#/tee-sheet?res=${id}&res-tab=customer&modal=new-customer`);
    expect(patch.reservationPanel?.tab).toBe('customer');
    expect(patch.modal).toEqual({ kind: 'newCustomer' });
  });

  it('drops a panel for a booking the club does not have, and a bogus tab', () => {
    expect(hashToState('#/tee-sheet?res=nope').reservationPanel).toBeUndefined();
    expect(hashToState(`#/tee-sheet?res=${id}&res-tab=bogus&res-p=-2`).reservationPanel).toEqual({
      bookingId: id,
      tab: 'players',
      playerIndex: 0,
    });
  });

  it('treats opening, closing or switching the panel as navigation, not changing its tab', () => {
    const open = createInitialState({ ...tee, reservationPanel: { bookingId: id, tab: 'players', playerIndex: 0 } });
    expect(isNavigation(createInitialState(tee), open)).toBe(true);
    expect(
      isNavigation(open, createInitialState({ ...tee, reservationPanel: { bookingId: id, tab: 'notes', playerIndex: 0 } })),
    ).toBe(false);
  });
});

describe('back and forward keep the session', () => {
  // What `useUrlSync` does on popstate: parse the new hash against the running state and
  // merge it in.
  const back = (state: PosState, hash: string) =>
    reducer(state, { type: 'applyUrl', patch: hashToState(hash, state) });

  const today = toDateStr(DEMO_TODAY());
  const tee = createInitialState({ view: 'tee', leftPanelCollapsed: true });
  const target = tee.bookings.find((b) => b.date === today && b.status !== 'block' && b.players >= 2)!;
  const checkedIn = reducer(tee, {
    type: 'patchBooking',
    bookingId: target.id,
    patch: { name: 'Edited, E.', playerStates: target.playerStates.map((p) => ({ ...p, step: 0 })) },
  });

  it('keeps a booking edit across a link to another screen and day', () => {
    const away = back(checkedIn, '#/register?date=2026-05-23');
    expect(away.view).toBe('pos');
    expect(toDateStr(away.currentDate)).toBe('2026-05-23');
    const home = back(away, '#/tee-sheet');
    expect(home.view).toBe('tee');
    const b = home.bookings.find((x) => x.id === target.id)!;
    expect(b.name).toBe('Edited, E.');
    expect(b.playerStates.every((p) => p.step === 0)).toBe(true);
    expect(home.bookings).toBe(checkedIn.bookings);
  });

  it('leaves the sheet and the course layout out of a same-club patch', () => {
    const patch = hashToState('#/tee-sheet?date=2026-05-23', checkedIn);
    expect(patch.bookings).toBeUndefined();
    expect(patch.courses).toBeUndefined();
    // …but a first load, with no session, still seeds both.
    expect(hashToState('#/tee-sheet').bookings?.length).toBeGreaterThan(0);
    expect(hashToState('#/tee-sheet').courses?.length).toBeGreaterThan(0);
  });

  it('keeps course edits, new tee times, notes, prices and added golfers', () => {
    const added = { ...target, id: 'new-1', timeMin: target.timeMin + 8, name: 'New, N.' };
    let s = reducer(checkedIn, { type: 'addBookings', bookings: [added] });
    s = reducer(s, { type: 'patchCourse', courseId: s.courses[0].id, patch: { locked: true, note: 'Frost' } });
    s = reducer(s, { type: 'setTimeNote', key: '2026-5-21_552', note: { text: 'Shotgun', color: 'yellow' } });
    s = reducer(s, { type: 'setTimePrice', key: '2026-5-21_552', price: { fee: 10 } });
    s = reducer(s, { type: 'addGolfer', golfer: { ...ALL_GOLFERS[0], id: 'g-new', name: 'Zed, Z.' } });
    const after = back(back(s, '#/register'), '#/tee-sheet');
    expect(after.bookings.some((b) => b.id === 'new-1')).toBe(true);
    expect(after.courses[0]).toMatchObject({ locked: true, note: 'Frost' });
    expect(after.timeNotes).toBe(s.timeNotes);
    expect(after.timePrices).toBe(s.timePrices);
    expect(after.addedGolfers).toBe(s.addedGolfers);
  });

  it('opens the reservation panel for a booking made this session', () => {
    const added = { ...target, id: 'new-2', name: 'New, N.' };
    const s = reducer(checkedIn, { type: 'addBookings', bookings: [added] });
    expect(back(s, '#/tee-sheet?res=new-2').reservationPanel?.bookingId).toBe('new-2');
  });

  it('keeps the cart of the booking already on the order', () => {
    const loaded = reducer(checkedIn, { type: 'loadBooking', bookingId: target.id });
    const edited = reducer(loaded, { type: 'addItem', name: 'Titleist Pro V1 Box', price: 54 });
    const s = back(back(edited, '#/tee-sheet'), `#/register?booking=${target.id}`);
    expect(s.selectedBookingId).toBe(target.id);
    expect(s.cart).toBe(edited.cart);
  });

  it('keeps generated days across Back', () => {
    const june12 = new Date(2026, 5, 12);
    const filled = reducer(reducer(tee, { type: 'setDate', date: june12 }), {
      type: 'fillDemoDay',
      date: '2026-06-12',
      bookings: missingDemoDay(tee, june12),
    });
    const s = back(filled, '#/tee-sheet');
    expect(s.generatedDates).toEqual(['2026-06-12']);
    expect(s.bookings).toBe(filled.bookings);
    expect(s.bookings.some((b) => b.date === '2026-06-12')).toBe(true);
  });

  it('re-homes onto another club when the link changes venue', () => {
    const s = back(checkedIn, '#/tee-sheet?venue=nine');
    expect(s.venueId).toBe('nine');
    expect(s.bookings).toBe(venueBookings('nine'));
    expect(s.courses.map((c) => c.id)).toEqual(['the-nine']);
    expect(s.generatedDates).toEqual([]);
    // …and back to the first club is a fresh sheet too: the venue changed twice.
    const again = back(s, '#/tee-sheet');
    expect(again.venueId).toBe(checkedIn.venueId);
    expect(again.bookings.find((b) => b.id === target.id)!.name).toBe(target.name);
  });
});

describe('back and forward restore the day and band', () => {
  const back = (state: PosState, hash: string) =>
    reducer(state, { type: 'applyUrl', patch: hashToState(hash, state) });

  it('returns to the demo day and the full band when the link omits them', () => {
    // A link leaves out the defaults, so Back from another day's link to a bare `#/tee-sheet`
    // has to mean "today" — otherwise the sheet would stay on the day you came back from.
    const away = back(createInitialState({ view: 'tee' }), '#/tee-sheet?date=2026-05-23&shift=peak');
    expect(toDateStr(away.currentDate)).toBe('2026-05-23');
    expect(away.shift).toBe('peak');
    const home = back(away, '#/tee-sheet');
    expect(toDateStr(home.currentDate)).toBe(toDateStr(DEMO_TODAY()));
    expect(home.shift).toBe('full');
  });
});
