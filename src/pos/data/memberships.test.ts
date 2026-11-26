import { describe, expect, it } from 'vitest';
import { memberTypes } from '../../theme/tokens';
import { memberTierOf } from './customers';
import { MEMBERSHIP_PLANS, NO_MEMBERSHIP, SIM_PLAN_COLOR, planColor, ribbonOf } from './memberships';
import { roster } from './roster';

describe('membership plan colours', () => {
  it('knows every plan a customer holds', () => {
    const held = new Set(roster.flatMap((c) => c.memberships.map((m) => m.name)));
    for (const name of held) expect(MEMBERSHIP_PLANS.some((p) => p.name === name), name).toBe(true);
  });

  it("draws a golf plan in the tier colour the tee sheet already uses, so the screens agree", () => {
    for (const c of roster.filter((x) => x.memberships.length && !x.customerTypes.includes('Senior') && !x.customerTypes.includes('Junior'))) {
      const tier = memberTierOf(c)!;
      expect(planColor(c.memberships[0].name)).toBe(memberTypes[tier].color);
    }
  });

  it('prefers a simulator plan for a bay ribbon, and greys out no membership', () => {
    expect(ribbonOf({ memberships: [{ name: 'Single Premium Membership', expires: '' }, { name: '12-Month Public Simulator Membership', expires: '' }] }).color).toBe(SIM_PLAN_COLOR);
    expect(ribbonOf({ memberships: [] })).toEqual(NO_MEMBERSHIP);
    expect(ribbonOf(null)).toEqual(NO_MEMBERSHIP);
  });
});
