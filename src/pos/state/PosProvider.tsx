import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import type { Dispatch, ReactNode } from 'react';
import type { Action, PosState } from './pos-store';
import { createInitialState, reducer } from './pos-store';

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
  const [state, dispatch] = useReducer(
    reducer,
    initialState,
    (overrides) => createInitialState(overrides ?? {}),
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
