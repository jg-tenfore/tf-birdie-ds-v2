import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { SHEETS, resourcesOf, seedResourceDay } from '../../../pos/data/resources';
import { resourceCartLine } from '../../../pos/logic/resource-booking';
import { Screen, TODAY_STR } from '../../pos/screen-helpers';
import { at, booking, panelOn, sheetWith, tapAt } from '../resource-scenarios';

/**
 * V1 → V2 Migration / 4 · Bay Sheet / Tablet
 *
 * **The simulator bays — the same scheduler as the courts, configured for bays.**
 *
 * ## What v1 did
 *
 * The shipping app's Bay Sheet (`tf-birdie-ds-v1/app/src/screens/bay-sheet.tsx`, from
 * `references/072926/4-baysheet/`) was the better of v1's two schedulers: a continuous time axis
 * with a ruled gutter, where a booking's height was proportional to its length, and a reservation
 * dialog with a duration stepper. Six colour-named bays at $45 an hour, 90 minutes by default.
 *
 * ## What was wrong with it
 *
 * Not the sheet — the fact that it was **different from Court Sheet**, which booked the identical
 * thing with discrete cards, no duration and no price. Staff who ran both sheets carried two
 * mental models for one job. The dialog also cycled bays by tapping the bay name over and over
 * rather than offering the ones that were free.
 *
 * ## What this does
 *
 * Bay Sheet is Court Sheet with a different configuration — see **3 · Court Sheet** for the
 * behaviour they share, which is all of it. What is particular to bays is only data, and it is
 * v1's own: **six bays, $45/hr, a 90-minute default**, open 8 AM to 10 PM, up to six golfers.
 *
 * The one place the model helps bays most is length. A simulator session is sold by time, so the
 * price on the panel follows the length stepper live, and the charge that reaches the register is
 * whatever the stepper said when Check in & pay was tapped — re-tapping after a change refreshes
 * the line rather than adding a second one.
 */
const meta = {
  title: 'V1 → V2 Migration/4 · Bay Sheet/Tablet',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const KIND = 'bay' as const;

/** **An ordinary Thursday**, seeded: six bays, and busiest in the evening. */
export const AnOrdinaryDay: Story = {
  render: () => <Screen edition="v1v2" initialState={sheetWith(KIND, seedResourceDay(KIND, TODAY_STR, at(12)))} />,
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('[data-resource-column]').length).toBe(resourcesOf(KIND).length);
    await expect(within(canvasElement).getAllByText('$45/hr').length).toBe(6);
    await expect(canvasElement.querySelectorAll('[data-resource-booking]').length).toBeGreaterThan(10);
  },
};

/** **A new bay booking runs 90 minutes** — v1's default for a simulator session. */
export const NinetyMinutesByDefault: Story = {
  render: () => <Screen edition="v1v2" initialState={sheetWith(KIND, [])} />,
  play: async ({ canvasElement }) => {
    tapAt(canvasElement, KIND, 'bay-red', at(14));
    const panel = await waitFor(() => {
      const el = canvasElement.querySelector<HTMLElement>('[data-resource-panel]');
      if (!el) throw new Error('no panel');
      return el;
    });
    await expect(within(panel).getByText(/2:00 PM – 3:30 PM · 1 hr 30 min/)).toBeTruthy();
    await expect(SHEETS[KIND].defaultDurationMin).toBe(90);
  },
};

/**
 * **The price follows the length.** 90 minutes is $67.50; one more half-hour makes it $90.00,
 * and the Check in & pay button says so before it is tapped.
 */
export const PriceFollowsLength: Story = {
  render: () => {
    const a = booking(KIND, { resourceId: 'bay-blue', startMin: at(14), durationMin: 90 });
    return <Screen edition="v1v2" initialState={panelOn(KIND, [a], a.id)} />;
  },
  play: async ({ canvasElement }) => {
    const panel = within(canvasElement.querySelector<HTMLElement>('[data-resource-panel]')!);
    await expect(panel.getByText('$67.50')).toBeTruthy();
    await userEvent.click(panel.getByRole('button', { name: 'Increase length' }));
    await waitFor(() => expect(panel.getByText('$90.00')).toBeTruthy());
    await expect(panel.getByRole('button', { name: 'Check in & pay · $90.00' })).toBeTruthy();
  },
};

/**
 * **A paid session has nothing left to take.** The panel says Paid, offers no payment and no
 * cancellation — a refund is a register job, not something to do from the sheet — and the block
 * is solid green on the sheet behind it.
 */
export const APaidSession: Story = {
  render: () => {
    const a = booking(KIND, { resourceId: 'bay-green', startMin: at(10), checkedIn: true, paid: true });
    return <Screen edition="v1v2" initialState={panelOn(KIND, [a], a.id)} />;
  },
  play: async ({ canvasElement }) => {
    const panel = within(canvasElement.querySelector<HTMLElement>('[data-resource-panel]')!);
    await expect(panel.getByText('PAID')).toBeTruthy();
    await expect(panel.queryByRole('button', { name: /Check in & pay/ })).toBeNull();
    await expect(panel.queryByRole('button', { name: 'Cancel booking' })).toBeNull();
    await expect(panel.queryByText('Move to')).toBeNull();
    const block = canvasElement.querySelector<HTMLElement>('[data-resource-booking]')!;
    await expect(block.getAttribute('aria-label')).toMatch(/paid$/);
  },
};

/**
 * **Changing the length after Check in & pay refreshes the charge.** Back on the sheet with the
 * session already on the order, a longer session and a second tap leave **one** line at the new
 * price, not two.
 */
export const RePayingRefreshesTheLine: Story = {
  render: () => {
    const a = booking(KIND, { resourceId: 'bay-white', startMin: at(16), durationMin: 60 });
    // Already on the order at its 60-minute price.
    return (
      <Screen
        edition="v1v2"
        initialState={{ ...panelOn(KIND, [a], a.id), cart: [resourceCartLine(a)] }}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const panel = within(canvasElement.querySelector<HTMLElement>('[data-resource-panel]')!);
    await userEvent.click(panel.getByRole('button', { name: 'Increase length' }));
    // On the order already, so the button offers to update it rather than add to it.
    await userEvent.click(await panel.findByRole('button', { name: 'Update order · $67.50' }));
    await waitFor(() => expect(canvasElement.querySelector('[data-resource-sheet]')).toBeNull());
    await expect(canvas.getAllByText('White Bay · 1 hr 30 min')).toHaveLength(1);
    await expect(canvas.queryByText('White Bay · 1 hr')).toBeNull();
  },
};
