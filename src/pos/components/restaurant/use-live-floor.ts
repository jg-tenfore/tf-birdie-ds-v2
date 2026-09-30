import { useMemo } from 'react';
import { liveCtx, type FloorCtx } from '../../logic/dining';
import { usePos } from '../../state/PosProvider';

/**
 * The live floor's context — tabs, reservations, the demo's today and its noon — memoised on the
 * two arrays it reads, so a floor of thirty tables derives thirty statuses once per change rather
 * than once per render.
 *
 * A hook in its own file because a file that exports components should export only components.
 */
export function useLiveFloor(): FloorCtx {
  const { state } = usePos();
  const { tabs, diningReservations } = state;
  return useMemo(() => liveCtx({ tabs, diningReservations }), [tabs, diningReservations]);
}
