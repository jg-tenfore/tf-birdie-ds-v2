import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { MobileStory, mobileMeta } from '../../pos-mobile/mobile-helpers';
import { at18 } from '../mobile-scenarios';

/**
 * Weston Edits / 9 · Date Navigation / Mobile
 *
 * Weston's second round: *"If I'm on the tee sheet and I want to go to, let's say, June —
 * there's no way to select the month, so I just have to click."* On the base phone the date
 * row's ‹ › moved one day a tap and the date opened a "Go to date" list of the demo's
 * eleven days — no month, no paging, no calendar — so June was a dozen taps away.
 *
 * The Weston edition replaces that with two MD3 patterns:
 *
 * - a **week strip** under the date row — the week you're in, one tap per day, swipe for
 *   the next or previous week (the date row's ‹ › now page a week too);
 * - a **calendar sheet** from the date — a month grid with ‹ › by month, a month/year
 *   header that opens a year → month chooser, and **Today**.
 *
 * Any date within twelve months of today now has a tee sheet: days outside the demo's
 * eleven are generated on first visit — the same every time — and beyond a year the
 * calendar greys dates out. The tablet keeps its own controls but gets the same generated
 * days (see **Tablet**); the base phone is unchanged.
 */
const meta = {
  title: 'Weston Edits/9 · Date Navigation/Mobile',
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/**
 * **What changed:** a seven-day week strip under the date row — weekday letter and day,
 * the viewed day filled, today outlined, a dot on days with tee times (fainter on quieter
 * days). Tap a day to view it; swipe, or the date row's ‹ ›, to move a week.
 *
 * **Why:** Weston stepped a day at a time to get anywhere. Day-by-day is now a single tap
 * within the week, so the arrows take the bigger step.
 */
export const WeekStrip: Story = {
  render: () => <MobileStory edition="weston" initialState={at18()} tab="tee" />,
};

/**
 * **What changed:** tapping the date opens a calendar bottom sheet (inside the phone frame)
 * instead of the "Go to date" list: the month, the viewed date filled, today outlined, a dot
 * on every day with tee times, ‹ › by month. Picking a day views it and closes the sheet.
 *
 * **Why:** the list only offered the demo's eleven days, with no month or way to page.
 */
export const CalendarSheet: Story = {
  render: () => <MobileStory edition="weston" initialState={at18()} tab="tee" stack={[{ name: 'teeSheet', calendar: {} }]} />,
};

/**
 * **What changed:** June is three taps away — open the calendar, ‹ › to June, pick a day —
 * and the day has a tee sheet: generated for any date the demo didn't author, the same
 * bookings every visit, weekends busier and far-off days lighter.
 *
 * **Why:** Weston's exact case — "I want to go to, let's say, June".
 */
export const JumpToJune: Story = {
  render: () => <MobileStory edition="weston" initialState={at18()} tab="tee" />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByLabelText('Choose date'));
    await userEvent.click(await c.findByLabelText('Next month'));
    await c.findByRole('grid', { name: 'June 2026' });
    await userEvent.click(await c.findByLabelText(/^Friday, June 12, 2026/));
    await waitFor(() => expect(c.getByLabelText('Choose date')).toHaveTextContent('Fri, Jun 12'));
    await waitFor(() => expect(c.getByText(/golfers ·/).textContent).not.toMatch(/^0 golfers/));
  },
};

/**
 * **What changed:** the calendar's month/year header opens a year → month chooser, for jumps
 * further than a few months — pick the year, then the month. Months beyond the demo's range
 * are greyed.
 *
 * **Why:** paging month by month is fine for June, not for next spring.
 */
export const YearChooser: Story = {
  render: () => (
    <MobileStory edition="weston" initialState={at18()} tab="tee" stack={[{ name: 'teeSheet', calendar: { view: 'years' } }]} />
  ),
};

/**
 * **What changed:** the calendar's **Today** returns to the demo's today (Thu, May 21) from
 * wherever you are. This story starts on Fri, Jun 12 with the calendar open, and taps it.
 *
 * **Why:** a far jump needs a one-tap way home.
 */
export const TodayButton: Story = {
  render: () => (
    <MobileStory
      edition="weston"
      initialState={at18(undefined, { currentDate: new Date(2026, 5, 12) })}
      tab="tee"
      stack={[{ name: 'teeSheet', calendar: {} }]}
    />
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByRole('button', { name: /^Today/ }));
    await waitFor(() => expect(c.getByLabelText('Choose date')).toHaveTextContent('Today · Thu, May 21'));
  },
};

/**
 * **What changed:** the demo covers twelve months either side of today. Past the end
 * (May 21, 2027) days are greyed and can't be picked, and ‹ › stop at the range's edge.
 *
 * **Why:** a tee sheet that goes on forever would be generating data nobody asked for — a
 * year each way covers every real booking horizon.
 */
export const OutOfRange: Story = {
  render: () => (
    <MobileStory
      edition="weston"
      initialState={at18(undefined, { currentDate: new Date(2027, 4, 18) })}
      tab="tee"
      stack={[{ name: 'teeSheet', calendar: {} }]}
    />
  ),
};

/**
 * **Before Weston Edits (base edition, for comparison):** the date opens the "Go to date"
 * list — the demo's eleven days with their tee-time counts, and nothing else.
 */
export const BeforeWestonEdits: Story = {
  render: () => <MobileStory edition="base" initialState={at18()} tab="tee" />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByLabelText('Choose date'));
    await c.findByText('Go to date');
  },
};

/**
 * **What changed:** a generated day is generated once. Delete every booking on it and it
 * stays empty for the session — leave for another day and come back, and it's still clear
 * rather than refilled with a fresh copy. (Edits on a generated day stick the same way.)
 * This story starts on Fri, Jun 12 after its generated bookings were all deleted, steps to
 * Sat, Jun 13 (a day generated on arrival) and back.
 *
 * **Why:** a day that quietly refills after you cleared it would undo the operator's work.
 * The rule lives in the reducer (`generatedDates`), so the tablet behaves the same.
 */
export const ClearedDayStaysEmpty: Story = {
  render: () => (
    <MobileStory
      edition="weston"
      // June 12 was filled, then every booking on it deleted: no June bookings in state,
      // and the date recorded as generated.
      initialState={at18(undefined, { currentDate: new Date(2026, 5, 12), generatedDates: ['2026-06-12'] })}
      tab="tee"
    />
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const summary = () => c.getByText(/golfers? ·/).textContent ?? '';
    await waitFor(() => expect(summary()).toMatch(/^0 golfers/));
    await userEvent.click(await c.findByRole('button', { name: /^Saturday, June 13/ }));
    await waitFor(() => expect(c.getByLabelText('Choose date')).toHaveTextContent('Sat, Jun 13'));
    await waitFor(() => expect(summary()).not.toMatch(/^0 golfers/));
    await userEvent.click(await c.findByRole('button', { name: /^Friday, June 12/ }));
    await waitFor(() => expect(c.getByLabelText('Choose date')).toHaveTextContent('Fri, Jun 12'));
    await expect(summary()).toMatch(/^0 golfers/);
    await expect(c.getByRole('button', { name: /^Friday, June 12/ })).toHaveAccessibleName(/0 tee times$/);
  },
};
