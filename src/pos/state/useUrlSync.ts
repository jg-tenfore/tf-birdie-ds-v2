import { useEffect, useRef } from 'react';
import type { Dispatch } from 'react';
import type { Action, PosState } from './pos-store';
import { isNavigation, readUrl, stateToHash } from './url-state';

/**
 * Keeps the address bar and the app in step, in both directions.
 *
 * **State → URL.** After any change, the hash is rewritten to describe the new state.
 * Changes that read as navigation — a different screen, day, or dialog — get their own
 * history entry so Back undoes them; incidental ones (typing in a filter, toggling
 * compact rows) replace the current entry instead, so Back isn't buried under dozens of
 * keystrokes.
 *
 * **URL → state.** Back, Forward, and hand-edited links dispatch the parsed patch.
 *
 * The two directions have to be kept from chasing each other: writing the URL fires no
 * event, but *applying* a popstate would otherwise immediately trigger a write of the
 * same hash. `lastHash` is the guard — whichever side moves first records the hash, and
 * the other side sees it already matches and does nothing.
 */
export function useUrlSync(state: PosState, dispatch: Dispatch<Action>) {
  const lastHash = useRef<string | null>(null);
  const prevState = useRef<PosState>(state);

  // ── State → URL ──
  useEffect(() => {
    const hash = stateToHash(state);
    if (hash === lastHash.current) {
      prevState.current = state;
      return;
    }

    const navigational = isNavigation(prevState.current, state);
    // On the very first run there is nothing to push onto — replace, so the app doesn't
    // add a bogus entry the user can Back into before they've done anything.
    const method = navigational && lastHash.current !== null ? 'pushState' : 'replaceState';

    window.history[method](null, '', `${window.location.pathname}${window.location.search}${hash}`);
    lastHash.current = hash;
    prevState.current = state;
  }, [state]);

  // ── URL → state ──
  useEffect(() => {
    const onPopState = () => {
      const hash = window.location.hash;
      if (hash === lastHash.current) return;
      lastHash.current = hash;
      dispatch({ type: 'applyUrl', patch: readUrl() });
    };

    window.addEventListener('popstate', onPopState);
    // `hashchange` covers the case the History API misses: someone editing the hash in the
    // address bar directly, which is exactly how these links get shared and tweaked.
    window.addEventListener('hashchange', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('hashchange', onPopState);
    };
  }, [dispatch]);
}
