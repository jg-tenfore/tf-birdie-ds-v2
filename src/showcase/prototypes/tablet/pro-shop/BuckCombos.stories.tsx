import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';
import { CURRENT_EDITION, EditionProvider } from '../../../../pos/edition';
import { COMBOS } from '../../../../pos/data/combos';
import { Screen, atVenue } from '../../../pos/screen-helpers';

/**
 * Pro Shop — **combos as Buck files them** (Nov 26).
 *
 * Buck › Products › Combos gives every combo a department — Pro Shop, Restaurant or Bev Carts — and a
 * title. The register's combos now carry the department on the tile, and two take Buck's titles
 * because they are Buck's bundles: the **Turn Special** (hot dog, chips and a drink, Restaurant) and
 * the **6 Pack Combo** (three domestic, three craft, Bev Carts). The other four are Birdie's own.
 */
const meta = {
  title: 'Prototypes/Tablet/Pro Shop/Combos from Buck',
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

/** **Every tile says where Buck sells it.** The Turn Special is the restaurant's; the 6 Pack, the bev cart's. */
export const DepartmentsOnTheTiles: Story = {
  render: () => <Screen edition={CURRENT_EDITION.tablet} initialState={atVenue('eighteen', { view: 'pos', leftPanelCollapsed: false, currentCategory: 'COMBOS' })} />,
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelectorAll('[data-combo-tile]').length).toBe(COMBOS.length));
    const tile = (id: string) => canvasElement.querySelector<HTMLElement>(`[data-combo-tile="${id}"]`)!;
    await expect(tile('combo-turn-dog').textContent).toContain('Turn Special');
    await expect(tile('combo-turn-dog').querySelector('[data-combo-department]')!.textContent).toBe('Restaurant');
    await expect(tile('combo-cart-bucket').textContent).toContain('6 Pack Combo');
    await expect(tile('combo-cart-bucket').querySelector('[data-combo-department]')!.textContent).toBe('Bev Carts');
    await expect(tile('combo-cart-bucket').textContent).toContain('Save $6.00');
  },
};
