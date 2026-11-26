import { describe, expect, it } from 'vitest';
import { MENU_ITEMS } from './menu';
import { GENERIC_FOR, GENERIC_MENU_IMAGES, MENU_IMAGES, menuImage } from './menu-images';

/**
 * Menu photos are wired by filename, which fails silently into a text tile. These make it loud.
 */
describe('menu photography', () => {
  const ids = new Set(MENU_ITEMS.map((i) => i.id));

  it('has no dish photo that matches no menu item', () => {
    const orphans = Object.keys(MENU_IMAGES).filter((id) => !ids.has(id));
    expect(orphans, `these files match no menu item: ${orphans.join(', ')}`).toEqual([]);
  });

  it('maps only real menu items, to stand-ins that exist', () => {
    for (const [id, key] of Object.entries(GENERIC_FOR)) {
      expect(ids.has(id), `${id} is not a menu item`).toBe(true);
      expect(GENERIC_MENU_IMAGES[key], `generic/${key}.webp is missing`).toBeTruthy();
    }
  });

  it('never pictures a branded item as its own photo — only through a stand-in', () => {
    for (const id of Object.keys(GENERIC_FOR)) expect(MENU_IMAGES[id], `${id} has its own photo`).toBeUndefined();
  });

  it('pictures every item on the menus', () => {
    const missing = MENU_ITEMS.filter((i) => !menuImage(i)).map((i) => i.id);
    expect(missing, `no photo for: ${missing.join(', ')}`).toEqual([]);
  });
});
