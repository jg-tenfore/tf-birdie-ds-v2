import { describe, expect, it } from 'vitest';
import { ALL_ITEMS, CATALOG, CATEGORY_ICONS, CAT_ROWS } from './catalog';
import { ITEM_IMAGES, itemImage, slugify } from './item-images';
import { ICONS } from '../icons';

/**
 * Product imagery is wired by filename, which is convenient but silent when it's wrong: a
 * typo'd slug doesn't error, it just renders a text tile forever. These tests make that
 * failure loud.
 */

describe('slugify', () => {
  it.each([
    ['Titleist Pro V1 Box', 'titleist-pro-v1-box'],
    ['TaylorMade Distance+ Box', 'taylormade-distance-plus-box'],
    ['Golf & Cart 18', 'golf-and-cart-18'],
    ['Tee Pack 50ct', 'tee-pack-50ct'],
    ['Bridgestone e6 Box', 'bridgestone-e6-box'],
  ])('%s → %s', (name, slug) => expect(slugify(name)).toBe(slug));

  it('keeps + and & distinguishable rather than dropping them', () => {
    // Silently stripping them would collide `Distance+ Box` with a hypothetical
    // `Distance Box`, and the wrong photo is worse than none.
    expect(slugify('Distance+ Box')).not.toBe(slugify('Distance Box'));
  });
});

describe('every image belongs to a real item', () => {
  const catalogSlugs = new Set(ALL_ITEMS.map((i) => slugify(i.n)));

  it('has no orphaned files', () => {
    const orphans = Object.keys(ITEM_IMAGES).filter((slug) => !catalogSlugs.has(slug));
    expect(orphans, `these files match no catalog item: ${orphans.join(', ')}`).toEqual([]);
  });

  it('resolves each file to a URL', () => {
    for (const [slug, url] of Object.entries(ITEM_IMAGES)) {
      expect(url, `${slug} resolved to nothing`).toBeTruthy();
    }
  });
});

describe('coverage', () => {
  /** Categories whose items are physical goods, and so should be photographed. */
  const GOODS = ['RENTALS', 'GOLF BALLS', 'APPAREL', 'ACCESSORIES', 'SNACKS', 'DRINKS', 'ALCOHOL'];

  /**
   * Known gaps, each for a stated reason. Listing them explicitly means a *new* gap fails
   * the test rather than blending into an ever-growing allowance.
   */
  const EXPECTED_GAPS = new Set([
    // No source photo supplied.
    'Club Rental Half Set',
    // The scrape matched a home practice net, not a bucket of range balls — a wrong
    // photo is worse than none, so these stay text tiles.
    'Range Bucket Small',
    'Range Bucket Large',
  ]);

  it.each(GOODS)('%s has a photo for every item', (category) => {
    const missing = CATALOG[category].items
      .map((i) => i.n)
      .filter((n) => !itemImage(n) && !EXPECTED_GAPS.has(n));
    expect(missing, `no image for: ${missing.join(', ')}`).toEqual([]);
  });

  it('leaves non-goods categories text-only', () => {
    // Rates, modifiers and services have nothing to photograph. If one of these ever gains
    // an image it is almost certainly a mis-slugged file landing on the wrong item.
    for (const category of ['CHECK IN', 'MODIFIERS', 'SERVICES', 'PROMOTIONS']) {
      const withImages = CATALOG[category].items.filter((i) => itemImage(i.n)).map((i) => i.n);
      expect(withImages, `unexpected imagery on ${category}`).toEqual([]);
    }
  });

  it('still covers the great majority of sellable goods', () => {
    const goods = GOODS.flatMap((c) => CATALOG[c].items.map((i) => i.n));
    const covered = goods.filter((n) => itemImage(n)).length;
    expect(covered / goods.length).toBeGreaterThan(0.95);
  });
});

describe('category icons', () => {
  it('names an icon for every category', () => {
    const categories = CAT_ROWS.flat();
    const missing = categories.filter((c) => !CATEGORY_ICONS[c]);
    expect(missing, `no icon for: ${missing.join(', ')}`).toEqual([]);
  });

  it('uses icon names that actually resolve', () => {
    // `iconFor` falls back to a neutral dot, so a typo here would render a bullet on the
    // button rather than throwing.
    const unresolved = Object.entries(CATEGORY_ICONS)
      .filter(([, icon]) => !(icon in ICONS))
      .map(([category, icon]) => `${category} → ${icon}`);
    expect(unresolved).toEqual([]);
  });
});
