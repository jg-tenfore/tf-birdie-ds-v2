import { describe, expect, it } from 'vitest';
import { DEFAULT_WESTON_OPTIONS } from './pos-store';
import { seedWestonDefaults, westonDefaultsKey } from './weston-globals';

/**
 * The toolbar's variant switches are a review instrument, and the only way they can do harm is
 * by winning an argument they should lose — flattening the "10 · Panel Size" comparison into
 * three identical screenshots, or quietly changing what a published prototype renders. The
 * precedence rule is therefore worth pinning down here rather than discovering in a screenshot.
 */
describe('seedWestonDefaults', () => {
  it('leaves state untouched when nothing is driving the switches', () => {
    // Which is every published prototype: no provider, so no toolbar, so no seeding. The
    // overrides object must come back as the same value, not a copy with a `weston` bolted on.
    const overrides = { view: 'tee' as const };
    expect(seedWestonDefaults(overrides, null)).toBe(overrides);
  });

  it('fills the switches the toolbar set, and leaves the rest at the shipped defaults', () => {
    const seeded = seedWestonDefaults({}, { panelWidth: 'cover' });
    expect(seeded.weston).toEqual({ ...DEFAULT_WESTON_OPTIONS, panelWidth: 'cover' });
  });

  it("lets a story's own pin beat the toolbar", () => {
    // A story that states a variant is *about* that variant; the toolbar is about the session.
    // `WestonOptions` has no optional fields, so such a story has named all four and takes all
    // four — the toolbar's `cover` and `heavy` both lose here, which is what keeps a pinned
    // story photographing the same screen no matter who has the toolbar open.
    const seeded = seedWestonDefaults(
      { weston: { ...DEFAULT_WESTON_OPTIONS, panelWidth: 'wide', rowDensity: 'dense' } },
      { panelWidth: 'cover', rateCatalog: 'heavy' },
    );
    expect(seeded.weston).toEqual({
      ...DEFAULT_WESTON_OPTIONS,
      panelWidth: 'wide',
      rowDensity: 'dense',
    });
  });

  it('keeps the rest of the story state', () => {
    const seeded = seedWestonDefaults({ view: 'tee', leftPanelCollapsed: true }, { rowDensity: 'dense' });
    expect(seeded.view).toBe('tee');
    expect(seeded.leftPanelCollapsed).toBe(true);
  });
});

describe('westonDefaultsKey', () => {
  it('changes when a switch changes, so Storybook rebuilds the state rather than re-rendering it', () => {
    expect(westonDefaultsKey({ panelWidth: 'standard' })).not.toBe(
      westonDefaultsKey({ panelWidth: 'cover' }),
    );
  });

  it('is stable for the same choices, so an unrelated global does not remount the story', () => {
    expect(westonDefaultsKey({ panelWidth: 'wide', rateCatalog: 'heavy' })).toBe(
      westonDefaultsKey({ rateCatalog: 'heavy', panelWidth: 'wide' }),
    );
  });

  it('reads an unset switch as the shipped default', () => {
    expect(westonDefaultsKey({})).toBe(westonDefaultsKey(DEFAULT_WESTON_OPTIONS));
  });
});
