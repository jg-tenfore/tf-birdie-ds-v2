import { describe, expect, it } from 'vitest';
import { DEMO_TODAY } from '../data/bookings';
import { toDateStr } from '../data/courses';
import { createInitialState } from './pos-store';
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
