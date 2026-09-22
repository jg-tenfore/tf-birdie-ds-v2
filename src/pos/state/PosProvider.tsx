import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import type { Dispatch, ReactNode } from 'react';
import { ALL_GOLFERS } from '../data/golfers';
import type { Golfer } from '../types';
import type { Action, PosState } from './pos-store';
import { createInitialState, golferRoster, reducer } from './pos-store';
import { seedWestonDefaults, useWestonDefaults } from './weston-globals';

/**
 * Wires the POS reducer into React and exposes it through context.
 *
 * `initialState` exists for Storybook: a screen story can hand in a fully-formed
 * state — a loaded booking, an open modal, a filtered list — and get exactly that
 * screen with no clicking and no effects. The prototype app just uses the default.
 */

interface PosContextValue {
  state: PosState;
  dispatch: Dispatch<Action>;
  /** Show a transient message; auto-clears after ~2.2s. */
  toast: (message: string) => void;
}

const PosContext = createContext<PosContextValue | null>(null);

export function PosProvider({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState?: Partial<PosState>;
}) {
  // Storybook's toolbar can preset the four Weston variant switches for the whole session —
  // panel width, row density, transport style, rate catalog. `null` everywhere else, which is
  // every published prototype, and then this is a no-op. A story that pins one of those
  // switches itself still wins; see `seedWestonDefaults`.
  const westonDefaults = useWestonDefaults();

  const [state, dispatch] = useReducer(
    reducer,
    initialState,
    (overrides) => createInitialState(seedWestonDefaults(overrides ?? {}, westonDefaults)),
  );

  const toast = useCallback((message: string) => dispatch({ type: 'toast', message }), []);

  // Toasts clear themselves. Keyed on the message so a second toast with the same
  // text still restarts the timer rather than inheriting the first one's deadline.
  useEffect(() => {
    if (!state.toast) return;
    const t = window.setTimeout(() => dispatch({ type: 'toast', message: null }), 2200);
    return () => window.clearTimeout(t);
  }, [state.toast]);

  const value = useMemo(() => ({ state, dispatch, toast }), [state, toast]);

  return <PosContext.Provider value={value}>{children}</PosContext.Provider>;
}

/** Access POS state and dispatch. Throws outside a `PosProvider`. */
export function usePos(): PosContextValue {
  const ctx = useContext(PosContext);
  if (!ctx) throw new Error('usePos must be used inside a <PosProvider>');
  return ctx;
}

/**
 * Every customer — `golferRoster(state)` — for components that look people up.
 *
 * Unlike `usePos` this does not throw outside a provider: the lookup primitives (`MemberDot`)
 * also render in plain component stories, where the fixed roster is the right answer. The
 * sorted list is cached per `addedGolfers` array, so a tee sheet full of member dots sorts
 * it once rather than once per cell.
 */
export function useGolferRoster(): Golfer[] {
  const state = useContext(PosContext)?.state;
  if (!state?.addedGolfers.length) return ALL_GOLFERS;
  if (rosterCache.added !== state.addedGolfers) {
    rosterCache = { added: state.addedGolfers, roster: golferRoster(state) };
  }
  return rosterCache.roster;
}

let rosterCache: { added: Golfer[] | null; roster: Golfer[] } = { added: null, roster: ALL_GOLFERS };
