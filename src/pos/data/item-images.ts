/**
 * Product photography for catalog items.
 *
 * ## How an image finds its item
 *
 * By filename. Each file in `src/assets/items/` is named after the slugified catalog item
 * name — `Titleist Pro V1 Box` → `titleist-pro-v1-box.png` — and this module globs the
 * folder and looks items up by that slug. Adding a photo is dropping in a correctly-named
 * file; there is no registry to update and nothing to keep in sync.
 *
 * ## How it reaches the browser
 *
 * `import.meta.glob(..., { query: '?url' })` hands each file to Vite as an asset, so it is
 * content-hashed, emitted to `assets/`, and rewritten with whatever base path the build was
 * given. That is what makes these work unchanged on `localhost:5173` and under
 * `…github.io/tf-birdie-ds-v2/prototype/` — no absolute paths, no separate image host, no
 * CDN. Tiles are plain `<img>` tags, so a browser only downloads the category on screen.
 *
 * Source screenshots live in `pos-item-imagery/` (~130MB, not committed) and are downscaled
 * into `src/assets/items/` by `scripts/import-item-images.mjs`.
 */

const modules = import.meta.glob('../../assets/items/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/**
 * Catalog item name → asset filename stem.
 *
 * Kept in step with the same function in `scripts/import-item-images.mjs`; the unit test
 * asserts every emitted file matches a real item, which is what catches drift between them.
 * `+` and `&` are spelled out rather than dropped so `Distance+` and `Distance` can't
 * collide.
 */
export const slugify = (name: string): string =>
  name
    .toLowerCase()
    .replace(/\+/g, ' plus ')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** slug → resolved URL, built once at module load. */
export const ITEM_IMAGES: Record<string, string> = Object.fromEntries(
  Object.entries(modules).map(([path, url]) => [
    path.split('/').pop()!.replace(/\.png$/, ''),
    url,
  ]),
);

/**
 * The photo for a catalog item, or undefined.
 *
 * Undefined is a normal, expected answer — rates, modifiers, memberships, services and
 * promotions have no physical product to photograph, so their tiles stay text-only by
 * design rather than by omission.
 */
export const itemImage = (itemName: string): string | undefined =>
  ITEM_IMAGES[slugify(itemName)];

/** Whether any item in a list has a photo — decides which tile layout a category uses. */
export const hasImages = (itemNames: string[]): boolean => itemNames.some((n) => itemImage(n));
