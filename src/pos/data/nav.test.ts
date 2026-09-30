import { describe, expect, it } from 'vitest';
import { ICONS } from '../icons';
import type { Edition } from '../edition';
import { NAV_GROUPS, NAV_KEYS, isLive, isNavKey } from './nav';

/**
 * The navigation's own guards.
 *
 * `icons.test.ts` scans source for JSX props — `name="tune"`, `icon={open ? 'a' : 'b'}` — so it
 * does not see icon names written as object fields in a data file. Every tile in the nav gets
 * its glyph from exactly that shape, which would put all nineteen of them outside the one test
 * that exists to stop a name rendering as a dot. This closes that hole for this file.
 */
describe('nav data', () => {
  it('asks only for icons that are registered', () => {
    const missing = NAV_GROUPS.flatMap((g) => g.items)
      .filter((i) => !ICONS[i.icon])
      .map((i) => `${i.key} → ${i.icon}`);
    expect(missing).toEqual([]);
  });

  it('has no duplicate destinations', () => {
    expect(new Set(NAV_KEYS).size).toBe(NAV_KEYS.length);
  });

  it('marks exactly the destinations each edition can actually open', () => {
    // Weston asked for unbuilt destinations to be dimmed rather than faked. If a screen gets
    // built, this is the deliberate place to say so — and if one is flipped live without a
    // screen behind it, this fails rather than shipping a tile that does nothing.
    const liveIn = (e: Edition) =>
      NAV_GROUPS.flatMap((g) => g.items)
        .filter((i) => isLive(i, e))
        .map((i) => i.key)
        .sort();
    expect(liveIn('weston')).toEqual(['customersearch', 'proshop', 'settings', 'teesheet']);
    // V1 → V2 is Weston's four plus whatever has been migrated so far: waves 1 and 2.
    expect(liveIn('v1v2')).toEqual(['baysheet', 'courtsheet', 'customersearch', 'events', 'giftcards', 'inventory', 'orderlookup', 'orderstips', 'proshop', 'quickorder', 'reservations', 'settings', 'shift', 'tablechart', 'tables', 'tabs', 'teesheet', 'timeclock']);
  });

  it('never makes a V1 → V2 destination live in Weston Edits', () => {
    const v1v2Only = NAV_GROUPS.flatMap((g) => g.items).filter((i) => i.live === 'v1v2');
    for (const i of v1v2Only) expect(isLive(i, 'weston')).toBe(false);
  });

  it('keeps the shipping app’s grouping', () => {
    expect(NAV_GROUPS.map((g) => g.heading)).toEqual(['Pro Shop', 'Restaurant', undefined]);
  });

  it('recognises its own keys and nothing else', () => {
    expect(isNavKey('teesheet')).toBe(true);
    expect(isNavKey('nosuchscreen')).toBe(false);
  });
});
