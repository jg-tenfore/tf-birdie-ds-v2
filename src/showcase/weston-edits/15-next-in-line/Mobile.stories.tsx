import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import type { Booking } from '../../../pos/types';
import { MobileStory, mobileMeta } from '../../pos-mobile/mobile-helpers';
import {
  at18,
  beforeBlock,
  dayBlocks,
  dayLine,
  earlyFrontNine,
  firstInLine,
  lastInLine,
  lineIndex,
  lineStep,
} from '../mobile-scenarios';

/**
 * Weston Edits / 15 · Next In Line / Mobile
 *
 * Justin's idea on the third call, which Weston took immediately: once you have worked one
 * reservation you are usually about to work the next one, and closing it to hunt for a chip two
 * rows down is a step that buys nothing. So the reservation's app bar carries a **‹ n of m ›**
 * stepper, and the whole day is one walk.
 *
 * > "If you're just moving fast, you're boom, boom, boom, going through." — Weston
 *
 * **The phone is arguably where this matters most.** At the counter the tee sheet is in front of
 * you the whole time and closing the panel costs a glance; on a phone the sheet is a screen you
 * have left, so getting back to it, finding your place in a 402px-wide column and tapping the
 * next chip is four or five interactions. The stepper collapses all of that into one tap on a
 * control that is already under your thumb.
 *
 * The rules are the terminal's, because they are about not losing your place rather than about
 * the device:
 *
 * | | |
 * |---|---|
 * | **Order** | Tee time, then course, then slot — the order the day actually happens in, not the order the sheet stores |
 * | **Empty slots** | Skipped. There is nothing to open in an empty slot |
 * | **Blocks and events** | Skipped too. Course Maintenance and Shift Change are on the sheet but they are not parties, and a rate grid for a block is nonsense |
 * | **The ends** | The arrows **disable** rather than wrap. A silent jump from the last tee time back to the 6:00 AM is disorienting when you are moving fast, and the counter reads "88 of 88" as "that's the day" |
 * | **What a step does** | Switches the booking and resets to the **Players** tab. You are moving to new golf, not continuing the last thought |
 *
 * **One thing is phone-only, and it is the important one.** A step is `nav.replace`, not
 * `nav.push` (`NextInLine` in `BookingDetailScreen.tsx`). Pushing would be the obvious thing and
 * it would be wrong: after walking nine tee times, Back would have to be pressed nine times to
 * get out, and the system back gesture would rewind the morning one reservation at a time
 * instead of returning to the sheet. Replacing keeps the stack two deep however far you walk, so
 * Back always means "done with reservations" — which is the only thing anyone wants it to mean.
 *
 * The counter — **n of m** — is doing real work beside the arrows: it is the only thing on the
 * screen that says how far through the day you are, and it is what tells you the arrow is
 * disabled because you have reached the end rather than because something is broken. The stepper
 * hides itself when there is nothing to step through (`day.length < 2`) rather than showing two
 * dead arrows, and it never appears on a block or league slot, which have no party to work.
 */
const meta = {
  title: 'Weston Edits/15 · Next In Line/Mobile',
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** How the app bar prints a position: 1-based, out of the day's real bookings. */
const position = (b: Booking) => `${lineIndex(b) + 1} of ${dayLine().length}`;

const reservation = (b: Booking, tab?: 'financial' | 'notes' | 'activity') => (
  <MobileStory
    edition="weston"
    initialState={at18()}
    tab="tee"
    stack={[{ name: 'bookingDetail', bookingId: b.id, tab }]}
  />
);

/**
 * **The stepper in place, early in the morning.** **‹ 3 of 88 ›** sits between the app bar's
 * back arrow and its ⋮, on its own line above the status badges and the tabs: close enough to
 * the thumb to be used without looking, far enough from Back not to be caught by accident.
 */
export const TheStepper: Story = {
  render: () => reservation(earlyFrontNine()),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(await c.findByText(position(earlyFrontNine()))).toBeTruthy();
    await expect(c.getByRole('button', { name: 'Next tee time' })).toBeEnabled();
    await expect(c.getByRole('button', { name: 'Previous tee time' })).toBeEnabled();
  },
};

/**
 * **Forward, and back again.** The play test steps ›, checks the screen is now the next tee time
 * on the day — a different booking, one higher on the counter — then steps ‹ and checks it is
 * back on the one it started from.
 *
 * Note what the app bar's title does: it is the booking's name, so the screen re-titles itself
 * as you walk. That is the phone's version of the terminal highlighting a different chip on the
 * sheet — the only thing that tells you the step landed.
 */
export const SteppingForwardAndBack: Story = {
  render: () => reservation(earlyFrontNine()),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const here = earlyFrontNine();
    const next = lineStep(here, 1);
    await c.findByRole('heading', { name: here.name });

    await userEvent.click(c.getByRole('button', { name: 'Next tee time' }));
    await waitFor(() => expect(c.getByText(position(next))).toBeTruthy());
    await expect(c.getByRole('heading', { name: next.name })).toBeTruthy();

    await userEvent.click(c.getByRole('button', { name: 'Previous tee time' }));
    await waitFor(() => expect(c.getByText(position(here))).toBeTruthy());
    await expect(c.getByRole('heading', { name: here.name })).toBeTruthy();
  },
};

/**
 * **Three in a row.** What Weston described — boom, boom, boom. Three presses of › walk three
 * tee times forward, and the counter and the title agree at every step. Worth watching for the
 * thing that *doesn't* happen: no screen slides in, nothing closes, and the tee sheet is never
 * returned to.
 */
export const BoomBoomBoom: Story = {
  render: () => reservation(firstInLine()),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const start = firstInLine();
    for (let step = 1; step <= 3; step++) {
      await userEvent.click(c.getByRole('button', { name: 'Next tee time' }));
      const landed = lineStep(start, step);
      await waitFor(() => expect(c.getByText(position(landed))).toBeTruthy());
      await expect(c.getByRole('heading', { name: landed.name })).toBeTruthy();
    }
  },
};

/**
 * **Back still means "done", however far you walked.** This is the `replace`-not-`push` rule,
 * made visible: after three steps the navigation stack is still exactly two deep — the tee sheet
 * and one reservation — so one Back lands on the tee sheet with the navigation bar showing,
 * rather than unwinding three tee times one at a time.
 *
 * The play test walks three, presses Back once, and checks the app is at a destination root.
 */
export const BackStillLeavesTheReservation: Story = {
  render: () => reservation(firstInLine()),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    for (let step = 1; step <= 3; step++) {
      await userEvent.click(c.getByRole('button', { name: 'Next tee time' }));
      await waitFor(() => expect(c.getByText(position(lineStep(firstInLine(), step)))).toBeTruthy());
    }
    await userEvent.click(c.getByRole('button', { name: 'Back' }));
    // The navigation bar only shows on a destination root, so finding it is the assertion.
    await waitFor(() => expect(c.getByRole('navigation', { name: 'Main' })).toBeTruthy());
  },
};

/**
 * **A step resets to Players.** Open on Activity, press ›, and the next reservation comes up on
 * **Players** — the replaced route carries no `tab`, and the screen defaults.
 *
 * Deliberate rather than incidental: you are moving to new golf, and the reason you were reading
 * the last party's activity log does not travel with you. Landing on somebody else's Activity
 * tab is a screen you have to read before you can tell it is not what you wanted.
 */
export const SteppingResetsToPlayers: Story = {
  render: () => reservation(earlyFrontNine(), 'activity'),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(await c.findByRole('tab', { name: 'Activity' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(c.getByRole('button', { name: 'Next tee time' }));
    await waitFor(() =>
      expect(c.getByRole('tab', { name: 'Players' })).toHaveAttribute('aria-selected', 'true'),
    );
  },
};

/**
 * **Blocks are not tee times.** Course Maintenance, Shift Change and league events sit on the
 * sheet like bookings and are deliberately absent from the walk: there is no party, no rate and
 * nothing to check in. Opening one directly gets the holder body and no stepper at all
 * (`weston && !holder`), which is the same rule read from the other end.
 *
 * This story opens the last reservation before the day's first block. Pressing › steps over the
 * block to the next real tee time. The test also holds the general rule — no entry in the
 * stepper's order is a block — so a change to the demo data can't quietly put one back.
 */
export const BlocksAndEmptySlotsAreSkipped: Story = {
  render: () => reservation(beforeBlock()),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(dayBlocks().length).toBeGreaterThan(0);
    await expect(dayLine().some((b) => b.pay === 'block' || b.pay === 'event')).toBe(false);
    const landed = lineStep(beforeBlock(), 1);
    await userEvent.click(await c.findByRole('button', { name: 'Next tee time' }));
    await waitFor(() => expect(c.getByText(position(landed))).toBeTruthy());
    await expect(landed.pay).not.toBe('block');
  },
};

/**
 * **The first tee time of the day: ‹ is off.** Rather than wrapping round to the evening, which
 * would read as the screen losing its place. The counter says **1 of 88**, which is the
 * explanation — and on a phone, where you cannot glance at the sheet to check, that sentence is
 * the only thing standing between "the end of the day" and "the app is broken".
 */
export const AtTheStartOfTheDay: Story = {
  render: () => reservation(firstInLine()),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(await c.findByText(position(firstInLine()))).toBeTruthy();
    await expect(c.getByRole('button', { name: 'Previous tee time' })).toBeDisabled();
    await expect(c.getByRole('button', { name: 'Next tee time' })).toBeEnabled();
  },
};

/**
 * **The last tee time: › is off.** The end of the day is a real place to be, and the stepper
 * says so instead of starting the morning over. Moving to tomorrow is the date control's job
 * (9 · Date Navigation), which is a decision, not a keystroke.
 */
export const AtTheEndOfTheDay: Story = {
  render: () => reservation(lastInLine()),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(await c.findByText(position(lastInLine()))).toBeTruthy();
    await expect(c.getByRole('button', { name: 'Next tee time' })).toBeDisabled();
    await expect(c.getByRole('button', { name: 'Previous tee time' })).toBeEnabled();
  },
};
