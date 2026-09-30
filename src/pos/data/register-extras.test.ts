import { describe, expect, it } from 'vitest';
import { ICONS } from '../icons';
import { comboComponents, comboListPrice, comboSaving } from '../logic/register-extras';
import { COMBOS, catalogPrice } from './combos';
import { CASH_PAYOUT_MENU_ITEM, REGISTER_CATEGORIES } from './register-extras';

/**
 * The register's V1 → V2 data: the combo seed, and the icon names written as object fields
 * (which `icons.test.ts` cannot see — see `nav.test.ts` for the same hole, closed the same way).
 */
describe('combo seed data', () => {
  it('builds every combo from items the catalog actually sells', () => {
    const missing = COMBOS.flatMap((c) => c.components.filter((x) => catalogPrice(x.item) == null).map((x) => `${c.id} → ${x.item}`));
    expect(missing).toEqual([]);
  });

  it('prices every combo below the sum of its parts — the saving is the point', () => {
    for (const c of COMBOS) {
      expect(c.price, c.id).toBeGreaterThan(0);
      expect(c.price, c.id).toBeLessThan(comboListPrice(c));
      expect(comboSaving(c), c.id).toBeGreaterThan(0);
    }
  });

  it('carries none of v1’s test rows — no $0 combos, nothing absurd', () => {
    // v1 kept production's `test1` at $0 and a `Sandhill Test` at $2,074.
    expect(COMBOS.every((c) => c.price > 0 && c.price < 100)).toBe(true);
    expect(COMBOS.some((c) => /test/i.test(c.name))).toBe(false);
  });

  it('has five or six combos with unique ids and names', () => {
    expect(COMBOS.length).toBeGreaterThanOrEqual(5);
    expect(COMBOS.length).toBeLessThanOrEqual(6);
    expect(new Set(COMBOS.map((c) => c.id)).size).toBe(COMBOS.length);
    expect(new Set(COMBOS.map((c) => c.name)).size).toBe(COMBOS.length);
  });

  it('works the saving out from catalog prices: a large bucket and a craft beer save $3.50', () => {
    const c = COMBOS.find((x) => x.id === 'combo-range-beer')!;
    expect(comboComponents(c)).toEqual([
      { name: 'Range Bucket Large', qty: 1, p: 14 },
      { name: 'Beer Craft', qty: 1, p: 7 },
    ]);
    expect(comboListPrice(c)).toBe(21);
    expect(comboSaving(c)).toBe(3.5);
  });
});

describe('register extras icons', () => {
  it('asks only for icons that are registered', () => {
    const names = [...REGISTER_CATEGORIES.map((c) => c.icon), CASH_PAYOUT_MENU_ITEM.icon];
    expect(names.filter((n) => !ICONS[n])).toEqual([]);
  });
});
