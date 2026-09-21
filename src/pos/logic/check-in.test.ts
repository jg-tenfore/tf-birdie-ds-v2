import { describe, expect, it } from 'vitest';
import { ROUND_STEP } from '../data/config';
import { checkInPlayer } from './bookings';

describe('checkInPlayer', () => {
  it('checks in a player who has not arrived, and clears a no-show', () => {
    expect(checkInPlayer({ paid: false, step: ROUND_STEP.notArrived, noShow: true })).toEqual({
      paid: false,
      step: ROUND_STEP.checkedIn,
      noShow: false,
    });
  });

  it('never moves a player backwards', () => {
    for (const step of [ROUND_STEP.teedOff, ROUND_STEP.atTurn, ROUND_STEP.finished, 6]) {
      expect(checkInPlayer({ paid: true, step, noShow: false }).step).toBe(step);
    }
  });
});
