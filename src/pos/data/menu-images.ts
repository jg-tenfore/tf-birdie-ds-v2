import type { MenuItem } from './menu';

/**
 * Photography for restaurant menu items (Nov 26).
 *
 * ## How an image finds its dish
 *
 * By filename, like `item-images.ts`: each prepared dish's photo is `src/assets/menu/<item id>.webp`,
 * named exactly after its `id` in `menu.ts` (`nineteenth-filet-mignon-8oz.webp`). This module globs
 * the folder and looks dishes up by id. Adding a photo is dropping in a correctly-named file; there
 * is no registry, and `menu-images.test.ts` fails on a file that matches no dish.
 *
 * ## Branded items get an unbranded stand-in
 *
 * The counter menu sells real brands — candy bars, a cola, light lagers, house wines by name — and
 * none of them is ever pictured in its real packaging. They map to a generic photo in
 * `src/assets/menu/generic/` (`GENERIC_FOR`): a plain candy bar, an unlabelled can, a glass of red.
 * The photos are Higgsfield-generated and invented; see `src/assets/menu/README.md`.
 *
 * ## No photo is a normal answer
 *
 * `menuImage` returns undefined for a dish with no photo yet, and its tile stays the text tile it
 * always was. Assets go through Vite (`?url`), so they are content-hashed and base-path aware, the
 * same as the product photos.
 */

const dishes = import.meta.glob('../../assets/menu/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const generics = import.meta.glob('../../assets/menu/generic/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

const byStem = (mods: Record<string, string>): Record<string, string> =>
  Object.fromEntries(Object.entries(mods).map(([path, url]) => [path.split('/').pop()!.replace(/\.webp$/, ''), url]));

/** Menu item id → URL, for prepared dishes. */
export const MENU_IMAGES: Record<string, string> = byStem(dishes);

/** Generic key → URL, for the unbranded stand-ins. */
export const GENERIC_MENU_IMAGES: Record<string, string> = byStem(generics);

export type GenericMenuImage =
  | 'candy-bar'
  | 'candy-sharing-bag'
  | 'water-bottle'
  | 'cola-bottle'
  | 'cola-can'
  | 'light-lager-can'
  | 'tall-lager-can'
  | 'fruit-ale-can'
  | 'lager-bottle-lime'
  | 'rose-glass'
  | 'red-wine-glass'
  | 'moscato-glass';

/** Each branded menu item → the unbranded photo it shows. */
export const GENERIC_FOR: Record<string, GenericMenuImage> = {
  'counter-3-musketeers': 'candy-bar',
  'counter-snickers': 'candy-bar',
  'counter-hershey-s-almond': 'candy-bar',
  'counter-kit-kat': 'candy-bar',
  'counter-kit-kat-king-size': 'candy-bar',
  'counter-nestl-crunch': 'candy-bar',
  'counter-snickers-sharing': 'candy-bar',
  'counter-peanut-m-m-s': 'candy-sharing-bag',
  'counter-milk-chocolate-m-m-s': 'candy-sharing-bag',
  'counter-peanut-m-m-s-sharing': 'candy-sharing-bag',
  'counter-milk-chocolate-m-m-s-sharing': 'candy-sharing-bag',
  'counter-bottled-water': 'water-bottle',
  'counter-dasani-water': 'water-bottle',
  'counter-bottled-coke': 'cola-bottle',
  'counter-coca-cola': 'cola-can',
  'counter-miller-lite': 'light-lager-can',
  'counter-sapporo-premium': 'tall-lager-can',
  'counter-redd-s-wicked': 'fruit-ale-can',
  'counter-corona-extra': 'lager-bottle-lime',
  'counter-yes-way-ros': 'rose-glass',
  'counter-19-crimes-red': 'red-wine-glass',
  'counter-josh-cabernet-sauvignon': 'red-wine-glass',
  'counter-decoy-cabernet-sauvignon': 'red-wine-glass',
  'counter-stella-rosa-moscato': 'moscato-glass',
};

/** The photo for a menu item — its own, else its unbranded stand-in — or undefined. */
export function menuImage(item: Pick<MenuItem, 'id'> | string): string | undefined {
  const id = typeof item === 'string' ? item : item.id;
  const generic = GENERIC_FOR[id];
  return MENU_IMAGES[id] ?? (generic ? GENERIC_MENU_IMAGES[generic] : undefined);
}
