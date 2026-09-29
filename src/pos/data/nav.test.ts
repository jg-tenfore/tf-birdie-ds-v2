import { describe, expect, it } from 'vitest';
import { ICONS } from '../icons';
import { NAV_GROUPS, NAV_KEYS, isNavKey } from './nav';

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

  it('marks exactly the destinations this prototype can actually open', () => {
    // Weston asked for unbuilt destinations to be dimmed rather than faked. If a screen gets
    // built, this list is the deliberate place to say so — and if one is flipped to `live`
    // without a screen behind it, this fails rather than shipping a tile that does nothing.
    const live = NAV_GROUPS.flatMap((g) => g.items)
      .filter((i) => i.live)
      .map((i) => i.key)
      .sort();
    expect(live).toEqual(['customersearch', 'proshop', 'settings', 'teesheet']);
  });

  it('keeps the shipping app’s grouping', () => {
    expect(NAV_GROUPS.map((g) => g.heading)).toEqual(['Pro Shop', 'Restaurant', undefined]);
  });

  it('recognises its own keys and nothing else', () => {
    expect(isNavKey('teesheet')).toBe(true);
    expect(isNavKey('nosuchscreen')).toBe(false);
  });
});
