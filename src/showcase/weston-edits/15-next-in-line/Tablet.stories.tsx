import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import type { Booking } from '../../../pos/types';
import { Screen } from '../../pos/screen-helpers';
import {
  beforeBlock,
  dayBlocks,
  dayLine,
  earlyFrontNine,
  firstInLine,
  lastInLine,
  lineIndex,
  lineStep,
  sheetWithPanel,
} from '../tablet-scenarios';

/**
 * Weston Edits / 15 · Next In Line / Tablet
 *
 * Justin's idea on the third call, which Weston took immediately: once you have worked one
 * reservation you are usually about to work the next one, and closing the panel to hunt for a
 * chip two rows down is a step that buys nothing. So the panel header carries a **‹ n of m ›**
 * stepper, and the whole day is one keyboard-less walk.
 *
 * > "If you're just moving fast, you're boom, boom, boom, going through." — Weston
 *
 * The rules are small and all of them are about not losing your place:
 *
 * | | |
 * |---|---|
 * | **Order** | Tee time, then course, then slot — the order the day actually happens in, not the order the sheet stores |
 * | **Empty slots** | Skipped. There is nothing to open in an empty slot, and stepping into one would mean a panel with no reservation in it |
 * | **Blocks and events** | Skipped too. Course Maintenance and Shift Change are on the sheet but they are not parties, and a rate grid for a block is nonsense |
 * | **The ends** | The arrows **disable** rather than wrap. A silent jump from the last tee time back to the 6:00 AM is disorienting when you are moving fast, and the counter reads "88 of 88" as "that's the day" |
 * | **What a step does** | Switches the booking, and resets to the **Players** tab. You are moving to new golf, not continuing the last thought |
 *
 * The counter — **n of m** — is doing real work beside the arrows: it is the only thing on the
 * screen that says how far through the day you are, and it is what tells you the arrow is
 * disabled because you have reached the end rather than because something is broken.
 *
 * The stepper hides itself when there is nothing to step through (a day with one booking on
 * it), rather than showing two dead arrows.
 */
const meta = {
  title: 'Weston Edits/15 · Next In Line/Tablet',
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'counterTerminal', isRotated: false } },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** How the header prints a position: 1-based, out of the day's real bookings. */
const position = (b: Booking) => `${lineIndex(b) + 1} of ${dayLine().length}`;

/**
 * The stepper in place, mid-morning. **‹ 3 of 88 ›** sits between the reservation's header and
 * its ✕: near enough to the close button to be found without looking, far enough not to be hit
 * by accident.
 */
export const TheStepper: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(earlyFrontNine())} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(position(earlyFrontNine()))).toBeTruthy();
    await expect(canvas.getByRole('button', { name: 'Next tee time' })).toBeEnabled();
    await expect(canvas.getByRole('button', { name: 'Previous tee time' })).toBeEnabled();
  },
};

/**
 * **Forward, and back again.** The play test steps ›, checks the panel is now the next tee
 * time on the day — a different booking, one higher on the counter — then steps ‹ and checks
 * it is back on the one it started from.
 *
 * Nothing about the tee sheet moves except the highlight: the sheet stays where it is and
 * scrolls the new booking into view only if it is off screen, so stepping through a morning
 * doesn't throw the page around.
 */
export const SteppingForwardAndBack: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(earlyFrontNine())} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const here = earlyFrontNine();
    const next = lineStep(here, 1);
    await canvas.findByRole('complementary', { name: `Reservation · ${here.name}` });

    await userEvent.click(canvas.getByRole('button', { name: 'Next tee time' }));
    await waitFor(() => expect(canvas.getByText(position(next))).toBeTruthy());
    await expect(canvas.getByRole('complementary', { name: `Reservation · ${next.name}` })).toBeTruthy();

    await userEvent.click(canvas.getByRole('button', { name: 'Previous tee time' }));
    await waitFor(() => expect(canvas.getByText(position(here))).toBeTruthy());
    await expect(canvas.getByRole('complementary', { name: `Reservation · ${here.name}` })).toBeTruthy();
  },
};

/**
 * **Three in a row.** What Weston described — boom, boom, boom. Three presses of › walk three
 * tee times forward, and the counter and the panel agree at every step. Worth watching for the
 * thing that *doesn't* happen: no dialog opens, nothing closes, and the sheet is never left.
 */
export const BoomBoomBoom: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(firstInLine())} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const start = firstInLine();
    for (let step = 1; step <= 3; step++) {
      await userEvent.click(canvas.getByRole('button', { name: 'Next tee time' }));
      const landed = lineStep(start, step);
      await waitFor(() => expect(canvas.getByText(position(landed))).toBeTruthy());
      await expect(canvas.getByRole('complementary', { name: `Reservation · ${landed.name}` })).toBeTruthy();
    }
  },
};

/**
 * **Blocks are not tee times.** Course Maintenance, Shift Change and league events sit on the
 * sheet like bookings and are deliberately absent from the walk: there is no party, no rate
 * and nothing to check in.
 *
 * This story opens the last reservation before the day's first block. Pressing › steps over
 * the block to the next real tee time. The test also holds the general rule — no entry in the
 * stepper's order is a block — so a change to the demo data can't quietly put one back.
 */
export const BlocksAndEmptySlotsAreSkipped: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(beforeBlock())} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(dayBlocks().length).toBeGreaterThan(0);
    await expect(dayLine().some((b) => b.pay === 'block' || b.pay === 'event')).toBe(false);
    const landed = lineStep(beforeBlock(), 1);
    await userEvent.click(canvas.getByRole('button', { name: 'Next tee time' }));
    await waitFor(() => expect(canvas.getByText(position(landed))).toBeTruthy());
    await expect(landed.pay).not.toBe('block');
  },
};

/**
 * **The first tee time of the day: ‹ is off.** Rather than wrapping round to the evening, which
 * would read as the panel losing its place. The counter says **1 of 88**, which is the
 * explanation.
 */
export const AtTheStartOfTheDay: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(firstInLine())} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(position(firstInLine()))).toBeTruthy();
    await expect(canvas.getByRole('button', { name: 'Previous tee time' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Next tee time' })).toBeEnabled();
  },
};

/**
 * **The last tee time: › is off.** The end of the day is a real place to be, and the stepper
 * says so instead of starting the morning over. Moving to tomorrow is the date control's job,
 * which is a decision, not a keystroke.
 */
export const AtTheEndOfTheDay: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(lastInLine())} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(position(lastInLine()))).toBeTruthy();
    await expect(canvas.getByRole('button', { name: 'Next tee time' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Previous tee time' })).toBeEnabled();
  },
};
