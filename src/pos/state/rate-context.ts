import { ALL_GOLFERS } from '../data/golfers';
import type { RateContext } from '../logic/rates';
import type { Golfer } from '../types';
import type { PosState } from './pos-store';

/**
 * The roster and pricing context, out of `pos-store` so that a slice (`operations.ts`) can price a
 * booking without importing the store it is part of.
 */

const rosters = new WeakMap<Golfer[], Golfer[]>();

/**
 * Every customer: the demo roster plus anyone created this session, surname-sorted.
 * Sorted once per `addedGolfers` array — pricing reads it for every seat on every render.
 */
export const golferRoster = (s: Pick<PosState, 'addedGolfers'>): Golfer[] => {
  if (!s.addedGolfers?.length) return ALL_GOLFERS;
  let roster = rosters.get(s.addedGolfers);
  if (!roster) {
    roster = [...ALL_GOLFERS, ...s.addedGolfers].sort((a, b) => a.name.localeCompare(b.name));
    rosters.set(s.addedGolfers, roster);
  }
  return roster;
};

/**
 * What pricing a reservation needs from state beyond the booking — the operator's per-row
 * price overrides, and the customer roster that says which players are members. Pass it to
 * `playerFee`, `holesFee`, `buildTeeTimeCart` and friends.
 */
export const rateContext = (s: Pick<PosState, 'timePrices' | 'addedGolfers'>): RateContext => ({
  timePrices: s.timePrices,
  roster: golferRoster(s),
});

