import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { withEdition } from '../../../edition-decorator';
import { MobileStory, mobileMeta } from '../../../pos-mobile/mobile-helpers';
import { asServer } from '../restaurant-scenarios';

/**
 * Prototypes / Mobile / Orders & Tips / Today on the handheld (V1 → V2, Nov 26)
 *
 * What a server asks at the end of a shift — *what did I take, and what did I make* — from the same
 * payment ledger and arithmetic as the tablet's Orders & Tips (`logic/tips.ts`): the day's totals,
 * always numbers; tips by person; every payment newest first, with its tip and percentage; and
 * **Mine** for the signed-in operator. `OrdersTipsScreen` in `src/pos/mobile/screens/restaurant/`,
 * reached from More.
 *
 * **Read-only here.** Adjusting a tip after the fact, and finding an order to refund, stay on the
 * tablet in this pass; whether a server should adjust their own tips from the handheld is an open
 * question for the review.
 */
const meta = {
  title: 'Prototypes/Mobile/Orders & Tips/Today on the handheld',
  id: 'prototypes-mobile-orders-tips-today-on-the-handheld',
  decorators: [withEdition('current-mobile')],
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** **The day so far**, pushed from a server's More. */
export const TheDaySoFar: Story = {
  render: () => <MobileStory initialState={asServer()} tab="more" stack={[{ name: 'ordersTips' }]} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(await c.findByText('Tips by person')).toBeTruthy();
    await waitFor(() => expect(canvasElement.querySelectorAll('[data-payment]').length).toBeGreaterThan(0));
  },
};

/** **Mine**: only what Jordan took. */
export const JustMine: Story = {
  render: () => <MobileStory initialState={asServer()} tab="more" stack={[{ name: 'ordersTips' }]} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const all = await waitFor(() => {
      const n = canvasElement.querySelectorAll('[data-payment]').length;
      expect(n).toBeGreaterThan(0);
      return n;
    });
    await userEvent.click(c.getByRole('button', { name: 'Mine' }));
    await waitFor(() => expect(canvasElement.querySelectorAll('[data-payment]').length).toBeLessThan(all));
  },
};
