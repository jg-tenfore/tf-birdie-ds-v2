import { useLayoutEffect } from 'react';
import { toDateStr } from '../data/courses';
import { missingDemoDay } from './demo-days';
import { usePos } from './PosProvider';

/**
 * Give the viewed date a tee sheet when it has none (Weston edition only — the caller
 * decides). One implementation for both devices: the phone's tee sheet and the tablet's
 * app body call it.
 *
 * Runs as a layout effect so the generated bookings land before the frame paints:
 * navigating to June never flashes an empty sheet. It dispatches `fillDemoDay`, which
 * records the date, so `missingDemoDay` returns `[]` on every later visit — revisits
 * don't regenerate or duplicate, and a day cleared of bookings stays cleared.
 */
export function useDemoDayFill(enabled: boolean) {
  const { state, dispatch } = usePos();
  const dateStr = toDateStr(state.currentDate);
  useLayoutEffect(() => {
    if (!enabled) return;
    const missing = missingDemoDay(state, state.currentDate);
    if (missing.length) dispatch({ type: 'fillDemoDay', date: dateStr, bookings: missing });
    // Only a date change (or a club change) can make a day missing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, dateStr, state.venueId]);
}
