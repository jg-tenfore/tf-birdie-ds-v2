import { useLayoutEffect, useRef } from 'react';
import type { MainView } from '../types';
import { usePos } from './PosProvider';

/** The screens where the rail is the order being rung up. */
const ORDER_VIEWS: MainView[] = ['pos', 'quickorder'];

/**
 * The register's rail follows the order (V1 → V2, 100226 — the caller decides).
 *
 * Weston, Sep 30: *"just collapsed if there's nothing in it. Unless you deliberately open it."* And
 * Oct 2, on the proposal: *"So if I add something… at that point"* it should open. So:
 *
 * - **Arriving** at the register with an empty order, the rail is tucked away.
 * - **The order emptying** (paid and cleared, or the last line removed) tucks it away again.
 * - **The first line arriving** opens it.
 *
 * Only those moments move it, so someone who opens the empty rail on purpose — by tapping it —
 * keeps it open. An order on hold counts as something on the rail: its count, and Resume, are there. A layout effect, so the register never paints with the rail in the wrong place.
 */
export function useEmptyRail(enabled: boolean) {
  const { state, dispatch } = usePos();
  // Held orders keep it out: they are waiting to come back, and Held · N lives on the rail.
  const empty = state.cart.length === 0 && state.heldOrders.length === 0;
  const onOrderView = ORDER_VIEWS.includes(state.view);
  const prev = useRef<{ empty: boolean; onOrderView: boolean } | null>(null);
  useLayoutEffect(() => {
    if (!enabled) return;
    const was = prev.current;
    prev.current = { empty, onOrderView };
    if (!onOrderView) return;
    const arrived = !was || !was.onOrderView;
    if ((arrived && empty) || (was && !was.empty && empty)) {
      if (!state.leftPanelCollapsed) dispatch({ type: 'toggleLeftPanel', collapsed: true });
    } else if (was && was.empty && !empty) {
      if (state.leftPanelCollapsed) dispatch({ type: 'toggleLeftPanel', collapsed: false });
    }
    // Only emptiness and the screen move the rail; the collapsed flag itself is the operator's.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, empty, onOrderView]);
}
