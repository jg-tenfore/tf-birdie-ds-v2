import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';
import { CURRENT_EDITION, EditionProvider } from '../../../../pos/edition';
import type { PosState } from '../../../../pos/state/pos-store';
import { Screen, atVenue } from '../../../pos/screen-helpers';

/**
 * Quick Order — **menus by day and time**, as TF Buck schedules them (Nov 26).
 *
 * Buck › Products › Menus gives each menu its days, its hours and sometimes its dates: the *19th
 * Hole Menu* all day, *Dinner* from five, the *Turn Stand* weekday afternoons, *Happy Hour* in
 * November and December, a *Member-Guest Weekend* menu for two days. The counter now opens on the
 * menu **running at the demo's clock** (Thursday, 12:00 PM) — the 19th Hole Menu — and lists the
 * other running menu (*Lunch*, Birdie's addition) beside it. Everything else is behind **More
 * menus**, saying when it runs; picking one is allowed and says it is off-hours.
 */
const meta = {
  title: 'Prototypes/Tablet/Quick Order/Menus by day and time',
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

/**
 * **Opens on what is running.** At noon on a Thursday that is the 19th Hole Menu (8 AM – 9 PM daily)
 * and Lunch; Dinner, the Turn Stand, Happy Hour and the Member-Guest menu wait behind More menus,
 * each saying why it is not up.
 */
export const OpensOnWhatIsRunning: Story = {
  render: () => <Screen edition={CURRENT_EDITION.tablet} initialState={at()} />,
  play: async ({ canvasElement }) => {
    await expect(q(canvasElement, '[data-menu="nineteenth-hole-menu"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(q(canvasElement, '[data-menu="lunch"]')).toHaveAttribute('aria-pressed', 'false');
    await expect(q(canvasElement, '[data-menu="dinner"]')).toBeNull();
    await userEvent.click(q(canvasElement, '[data-more-menus]')!);
    const dinner = await screen.findByText('Dinner');
    await expect(dinner.closest('[data-menu-option]')!.textContent).toContain('Starts at 5:00 PM');
    await expect(q(document.body, '[data-menu-option="happy-hour"]')!.textContent).toContain('Not until Nov 1');
  },
};

/**
 * **Ringing from a menu that is not up.** A guest at the counter wants a dinner side at noon: pick
 * Dinner from More menus. It joins the row with a clock, the row says it is off-hours, and its
 * dishes ring at their usual price.
 */
export const RingingFromAMenuThatIsNotUp: Story = {
  render: () => <Screen edition={CURRENT_EDITION.tablet} initialState={at()} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(q(canvasElement, '[data-more-menus]')!);
    await userEvent.click(await screen.findByText('Dinner'));
    await waitFor(() => expect(q(canvasElement, '[data-menu="dinner"]')).toHaveAttribute('aria-pressed', 'true'));
    await expect(q(canvasElement, '[data-menu-off-hours]')!.textContent).toContain('Dinner is not running now (Starts at 5:00 PM)');
    await userEvent.click(q(canvasElement, '[data-menu-category="Chops & Seafood"]')!);
    await userEvent.click(q(canvasElement, '[data-menu-item="nineteenth-blackened-salmon"]')!);
    await waitFor(() => expect(within(canvasElement).getAllByText('Blackened Salmon').length).toBeGreaterThan(1));
  },
};

/** **The Turn Stand, at four.** Weekday afternoons only, and only what a turn stand sells. */
export const TheTurnStandMenu: Story = {
  render: () => <Screen edition={CURRENT_EDITION.tablet} initialState={at()} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(q(canvasElement, '[data-more-menus]')!);
    await userEvent.click(await screen.findByText('Turn Stand'));
    await waitFor(() => expect(q(canvasElement, '[data-menu="turn-stand"]')).toHaveAttribute('aria-pressed', 'true'));
    const cats = [...canvasElement.querySelectorAll('[data-menu-category]')].map((c) => c.getAttribute('data-menu-category'));
    await expect(cats).toEqual(['Grill', 'Snacks', 'Drinks', 'Beer']);
  },
};
