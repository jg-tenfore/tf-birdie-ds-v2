import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';
import { CURRENT_EDITION } from '../../../../pos/edition';
import { planColor } from '../../../../pos/data/memberships';
import { withEdition } from '../../../edition-decorator';
import { Screen, atVenue } from '../../../pos/screen-helpers';

/**
 * Customer Search — **membership colours from the plan** (Nov 26).
 *
 * In TF Buck a membership's colour is picked on the plan and drawn as given. Birdie's membership
 * chips now carry their plan's colour as a dot — the same colour the tee sheet's member dot and the
 * bay sheet's ribbon draw for that plan (`memberships.ts`), so a member reads the same on every
 * screen. The chip stays amber, because membership is still the rate-deciding thing.
 */
const meta = {
  title: 'Prototypes/Tablet/Customer Search/Membership colours',
  parameters: { layout: 'fullscreen' },
  decorators: [withEdition('current-tablet')],
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** **Every membership chip carries its plan's colour.** */
export const PlanColoursOnTheChips: Story = {
  render: () => <Screen edition={CURRENT_EDITION.tablet} initialState={atVenue('eighteen', { view: 'customers', leftPanelCollapsed: true })} />,
  play: async ({ canvasElement }) => {
    const chips = await waitFor(() => {
      const els = [...canvasElement.querySelectorAll<HTMLElement>('[data-membership-chip]')];
      if (!els.length) throw new Error('no membership chips yet');
      return els;
    });
    for (const chip of chips) {
      const plan = chip.getAttribute('data-membership-chip')!;
      await expect(chip.querySelector('[data-plan-color]')!.getAttribute('data-plan-color')).toBe(planColor(plan));
    }
  },
};
