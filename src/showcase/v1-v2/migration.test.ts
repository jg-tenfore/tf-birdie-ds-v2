import { describe, expect, it } from 'vitest';
import { NAV_GROUPS, NAV_KEYS, isLive } from '../../pos/data/nav';
import { MIGRATION } from './migration';

/**
 * The audit and the nav describe the same nineteen destinations. These keep them honest with
 * each other, since the Overview's coverage table is generated from both.
 */
describe('the V1 → V2 audit', () => {
  it('has exactly one row for every destination in the nav', () => {
    expect(MIGRATION.map((m) => m.key).sort()).toEqual([...NAV_KEYS].sort());
  });

  it('builds in nav order — no destination is in an earlier wave than one above it', () => {
    // The owner chose nav order, top to bottom. A row's wave may equal the one before it but
    // never go backwards, or the plan and the table have drifted apart.
    const byNav = NAV_KEYS.map((k) => MIGRATION.find((m) => m.key === k)!.wave);
    for (let i = 1; i < byNav.length; i++) {
      // Settings sits in the last block but was inherited, so it is the one allowed exception.
      if (NAV_KEYS[i] === 'settings') continue;
      expect(byNav[i]).toBeGreaterThanOrEqual(byNav[i - 1]);
    }
  });

  it('marks as live only what the nav will actually open in V1 → V2', () => {
    const live = NAV_GROUPS.flatMap((g) => g.items).filter((i) => isLive(i, 'v1v2'));
    // Waves 1 and 2, plus the four Weston Edits already had.
    expect(live.map((i) => i.key).sort()).toEqual(['baysheet', 'courtsheet', 'customersearch', 'orderstips', 'proshop', 'quickorder', 'reservations', 'settings', 'tablechart', 'tables', 'tabs', 'teesheet']);
  });
});
