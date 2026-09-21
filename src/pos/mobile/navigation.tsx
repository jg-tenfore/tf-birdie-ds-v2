import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Mobile navigation — the whole information architecture in one file.
 *
 * The phone app has four top-level destinations on an MD3 navigation bar. Everything
 * below a destination is reached one of three ways, and every route declares which:
 *
 *  - `push`       A full-screen page that slides in from the right with a back arrow in a
 *                 small top app bar. Drill-down: the list → the thing in the list.
 *  - `dialog`     A full-screen dialog that rises from the bottom with a close (✕) and a
 *                 confirming text action ("Save", "Reserve"). Creating or editing something
 *                 you can abandon. MD3 uses these in place of centred dialogs on phones.
 *  - `takeover`   Full screen with no back affordance at all — the payment reader and the
 *                 receipt. The operator must finish or explicitly cancel; an accidental
 *                 back-swipe mid-transaction is the one thing this app must not allow.
 *
 * The navigation bar only shows on the four roots. Anything pushed covers it, so each
 * level below the root owns the whole screen — the "go a level deep with a back button"
 * model, rather than nesting tabs inside tabs.
 *
 * Each destination keeps its own back stack (MD3's recommended behaviour), so leaving a
 * half-built order to check the tee sheet and coming back lands you where you were.
 * Re-tapping the active destination pops it to its root.
 */

// ─── Destinations ───────────────────────────────────────────────────────────

export type MobileTab = 'tee' | 'register' | 'people' | 'more';

export const TABS: Array<{ id: MobileTab; label: string; root: MobileRoute }> = [
  { id: 'tee', label: 'Tee Sheet', root: { name: 'teeSheet' } },
  { id: 'register', label: 'Register', root: { name: 'register' } },
  { id: 'people', label: 'People', root: { name: 'people' } },
  { id: 'more', label: 'More', root: { name: 'more' } },
];

// ─── Routes ─────────────────────────────────────────────────────────────────

export type BookingTab = 'players' | 'financial' | 'notes' | 'activity';

/**
 * Who a golfer picked from the People search gets attached to: the open order's customer
 * (`primary`), the tee time being booked (`booking`), or one seat on a round line.
 */
export type GolferPickTarget = 'primary' | 'booking' | { itemIdx: number; playerIdx: number };

export type MobileRoute =
  // ── Tee Sheet (desktop sections 2 · Tee Sheet and 3 · Booking & Check-in)
  | { name: 'teeSheet' }
  | { name: 'teeSheetFilters' }
  | { name: 'teeSheetSearch' }
  | { name: 'daySummary' }
  | { name: 'bookingDetail'; bookingId: string; tab?: BookingTab }
  | { name: 'playerDetail'; bookingId: string; playerIndex: number }
  | { name: 'bookingAction'; bookingId: string; action: 'checkin' | 'refund' | 'raincheck' }
  | { name: 'newTeeTime'; courseId: string; timeMin: number; players?: number }
  /** One booking (`bookingId`), or everyone at a tee time (`timeMin`, optionally one course). */
  | { name: 'movePlayers'; bookingId?: string; timeMin?: number; courseId?: string }
  // ── Register (desktop sections 1 · Register & Order, 4 · Tee Time Selection, 5 · Payment)
  | { name: 'register' }
  | { name: 'category'; category: string }
  | { name: 'order' }
  | { name: 'playerModifiers'; itemIdx: number; playerIdx: number }
  | { name: 'teePicker'; is18H?: boolean }
  | { name: 'reserveConfirm'; payMode: 'now' | 'later' }
  | { name: 'checkout' }
  | { name: 'tip'; method: string }
  | { name: 'paymentReader'; method: string; amount: number }
  | { name: 'paymentComplete' }
  // ── People (desktop section 7 · People)
  | { name: 'people' }
  | { name: 'golferDetail'; golferId: string }
  | { name: 'newCustomer' }
  | { name: 'golferPicker'; target: GolferPickTarget }
  // ── More + Operations (desktop section 6 · Operations)
  | { name: 'more' }
  | { name: 'blockTime'; timeMin: number; courseId?: string }
  | { name: 'timeNote'; timeMin: number }
  | { name: 'priceOverride'; timeMin: number }
  | { name: 'league'; timeMin: number }
  | { name: 'rateCard'; courseId?: string }
  | { name: 'courseSettings'; courseId?: string };

export type RouteName = MobileRoute['name'];
export type RouteOf<N extends RouteName> = Extract<MobileRoute, { name: N }>;

export type Presentation = 'root' | 'push' | 'dialog' | 'takeover';

/**
 * How each route enters. Kept as data so the navigation map story and the router read
 * the same table — the diagram can't drift from what the app does.
 */
export const PRESENTATION: Record<RouteName, Presentation> = {
  teeSheet: 'root',
  teeSheetFilters: 'dialog',
  teeSheetSearch: 'push',
  daySummary: 'push',
  bookingDetail: 'push',
  playerDetail: 'push',
  bookingAction: 'dialog',
  newTeeTime: 'dialog',
  movePlayers: 'dialog',

  register: 'root',
  category: 'push',
  order: 'push',
  playerModifiers: 'push',
  teePicker: 'push',
  reserveConfirm: 'push',
  checkout: 'push',
  tip: 'push',
  paymentReader: 'takeover',
  paymentComplete: 'takeover',

  people: 'root',
  golferDetail: 'push',
  newCustomer: 'dialog',
  golferPicker: 'push',

  more: 'root',
  blockTime: 'dialog',
  timeNote: 'dialog',
  priceOverride: 'dialog',
  league: 'dialog',
  rateCard: 'push',
  courseSettings: 'push',
};

// ─── Navigator ──────────────────────────────────────────────────────────────

export interface NavState {
  tab: MobileTab;
  /** One back stack per destination. Index 0 is always that destination's root. */
  stacks: Record<MobileTab, MobileRoute[]>;
}

export function createNavState(tab: MobileTab = 'tee', stack?: MobileRoute[]): NavState {
  const stacks = Object.fromEntries(TABS.map((t) => [t.id, [t.root]])) as NavState['stacks'];
  if (stack?.length) {
    // A story can hand in just the screens above the root; the root is implied.
    const root = TABS.find((t) => t.id === tab)!.root;
    stacks[tab] = stack[0].name === root.name ? stack : [root, ...stack];
  }
  return { tab, stacks };
}

export interface MobileNav {
  tab: MobileTab;
  stack: MobileRoute[];
  current: MobileRoute;
  /** True on a destination root — the only place the navigation bar shows. */
  atRoot: boolean;
  push: (route: MobileRoute) => void;
  /** Close the top screen. `count` pops several — e.g. the receipt returning to the register. */
  pop: (count?: number) => void;
  /** Swap the top screen — the reader handing over to the receipt, with no way back. */
  replace: (route: MobileRoute) => void;
  /** Pop to the destination root. */
  popToRoot: () => void;
  /** Switch destination. Re-selecting the active one pops it to root, per MD3. */
  selectTab: (tab: MobileTab) => void;
  /** Jump to another destination and open a screen there (booking → its order). */
  openIn: (tab: MobileTab, route: MobileRoute) => void;
}

const NavContext = createContext<MobileNav | null>(null);

export function MobileNavProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial?: NavState;
}) {
  const [nav, setNav] = useState<NavState>(() => initial ?? createNavState());

  const update = useCallback(
    (fn: (stack: MobileRoute[]) => MobileRoute[]) =>
      setNav((n) => ({ ...n, stacks: { ...n.stacks, [n.tab]: fn(n.stacks[n.tab]) } })),
    [],
  );

  const value = useMemo<MobileNav>(() => {
    const stack = nav.stacks[nav.tab];
    return {
      tab: nav.tab,
      stack,
      current: stack[stack.length - 1],
      atRoot: stack.length === 1,
      push: (route) => update((s) => [...s, route]),
      pop: (count = 1) => update((s) => s.slice(0, Math.max(1, s.length - count))),
      replace: (route) => update((s) => [...s.slice(0, -1), route]),
      popToRoot: () => update((s) => s.slice(0, 1)),
      selectTab: (tab) =>
        setNav((n) =>
          n.tab === tab
            ? { ...n, stacks: { ...n.stacks, [tab]: n.stacks[tab].slice(0, 1) } }
            : { ...n, tab },
        ),
      openIn: (tab, route) =>
        setNav((n) => ({ tab, stacks: { ...n.stacks, [tab]: [n.stacks[tab][0], route] } })),
    };
  }, [nav, update]);

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

/** Navigation for the current destination. Throws outside `MobileApp`. */
export function useMobileNav(): MobileNav {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useMobileNav must be used inside <MobileApp>');
  return ctx;
}
