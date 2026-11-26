import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor } from 'storybook/test';
import { CURRENT_EDITION, EditionProvider } from '../../../../pos/edition';
import { GENERIC_MENU_IMAGES } from '../../../../pos/data/menu-images';
import type { PosState } from '../../../../pos/state/pos-store';
import { Screen, atVenue } from '../../../pos/screen-helpers';

/**
 * Quick Order — **menu photography** (Nov 26).
 *
 * Every dish on both menus has a photo now: invented, generated, on white, so it sits beside the
 * pro shop's product photos (`src/assets/menu/README.md`). Branded snacks, sodas, beers and wines
 * are never pictured in their real packaging — each maps to an unbranded stand-in (a plain candy
 * bar, an unlabelled can, a glass of red). Tiles with a photo carry it on top; a dish without one
 * keeps the text tile, so a new item still reads as finished. The dish dialog shows the photo too.
 * Quick Order, a table's tab and Tables' ordering share the same tiles.
 */
const meta = {
  title: 'Prototypes/Tablet/Quick Order/Menu photography',
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <EditionProvider edition={CURRENT_EDITION.tablet}>
        <Story />
      </EditionProvider>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj;

const at = (extra: Partial<PosState> = {}) => atVenue('eighteen', { view: 'quickorder', leftPanelCollapsed: false, ...extra });
const q = (root: ParentNode, sel: string) => root.querySelector<HTMLElement>(sel);
const photoOf = (root: ParentNode, id: string) => q(root, `[data-menu-item="${id}"] img`) as HTMLImageElement | null;

/** **Burgers, photographed.** Every tile on the grill's burger list carries its dish. */
export const PhotographedDishes: Story = {
  render: () => <Screen edition={CURRENT_EDITION.tablet} initialState={at()} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(q(canvasElement, '[data-menu-category="Burgers"]')!);
    const tiles = [...canvasElement.querySelectorAll('[data-menu-item]')];
    await expect(tiles.length).toBeGreaterThan(0);
    for (const t of tiles) await expect(t.hasAttribute('data-has-photo')).toBe(true);
  },
};

/** **A branded candy bar shows a plain one.** The stand-in, never the real wrapper. */
export const BrandedItemsShowAStandIn: Story = {
  render: () => <Screen edition={CURRENT_EDITION.tablet} initialState={at()} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(q(canvasElement, '[data-menu-category="Snacks"]')!);
    await expect(photoOf(canvasElement, 'counter-snickers')!.getAttribute('src')).toBe(GENERIC_MENU_IMAGES['candy-bar']);
    await userEvent.click(q(canvasElement, '[data-menu-category="Beer"]')!);
    await expect(photoOf(canvasElement, 'counter-corona-extra')!.getAttribute('src')).toBe(GENERIC_MENU_IMAGES['lager-bottle-lime']);
  },
};

/** **The dish dialog shows it too** — a burger, opened to choose its temperature. */
export const TheDishDialog: Story = {
  render: () => <Screen edition={CURRENT_EDITION.tablet} initialState={at()} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(q(canvasElement, '[data-menu-category="Burgers"]')!);
    await userEvent.click(q(canvasElement, '[data-menu-item="counter-bacon-bbq-burger"]')!);
    await screen.findByRole('dialog');
    await waitFor(() => expect(q(document.body, '[data-dish-photo]')).not.toBeNull());
  },
};
