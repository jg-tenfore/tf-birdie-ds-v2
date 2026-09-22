import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Screen, atVenue } from '../../pos/screen-helpers';

/**
 * Weston Edits / 9 · Date Navigation / Tablet
 *
 * The tablet already had a month calendar, so its controls stay as they are — ‹ ›, the
 * date's calendar popover, **Today** and **Weekend**. What changes (Weston Edits only) is
 * what's behind them: any date within twelve months of today now has a tee sheet, the same
 * generated day the phone shows, and the calendar dots those days and greys out the dates
 * beyond the year.
 *
 * One fill, shared with the phone (`src/pos/state/use-demo-day-fill.ts`): the first time a
 * date is viewed its generated bookings are added to state, and from then on they're
 * ordinary bookings — edits stick, and a day cleared of bookings stays cleared (see
 * **Mobile › ClearedDayStaysEmpty**; the rule is the reducer's, so it holds on both).
 */
const meta = {
  title: 'Weston Edits/9 · Date Navigation/Tablet',
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'counterTerminal', isRotated: false } },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const JUNE_12 = new Date(2026, 5, 12);

/** The toolbar's golfer count for the viewed day. */
const golferCount = (canvasElement: HTMLElement): number => {
  const pill = within(canvasElement).getByText(
    (_, el) => el?.tagName === 'DIV' && /^\s*\d+\s*golfers$/.test(el.textContent ?? ''),
  );
  return Number(pill.textContent?.match(/\d+/)?.[0] ?? 0);
};

/**
 * **What changed:** a June date has a tee sheet. Fri, Jun 12 is outside the demo's authored
 * eleven days, so it's generated on first view — grid, list, the day summary and the golfer
 * count all read it — and it's the same bookings every load and every visit.
 *
 * **Why:** Weston's case — "I want to go to, let's say, June". The tablet could always get
 * there; there was just nothing to see.
 */
export const GeneratedDay: Story = {
  render: () => <Screen edition="weston" initialState={atVenue('eighteen', { currentDate: JUNE_12 })} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await c.findByText(/Fri, Jun 12, 2026/);
    await waitFor(() => expect(golferCount(canvasElement)).toBeGreaterThan(0));
  },
};

/**
 * **What changed:** the calendar popover knows the demo's range. Days with tee times are
 * dotted — including the generated ones not yet visited — and past May 21, 2027 (a year from
 * today) days are greyed and can't be picked; › stops at the range's last month. This story
 * starts on Tue, May 18, 2027 and opens the calendar.
 *
 * **Why:** a dot on a day that turns out empty, or a date that opens nothing, would be a
 * dead end.
 */
export const CalendarRange: Story = {
  render: () => <Screen edition="weston" initialState={atVenue('eighteen', { currentDate: new Date(2027, 4, 18) })} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByText(/Tue, May 18, 2027/));
    await expect(await c.findByRole('button', { name: /^Saturday, May 22, 2027/ })).toBeDisabled();
    await expect(c.getByRole('button', { name: 'Next month' })).toBeDisabled();
    await expect(c.getByRole('button', { name: /^Thursday, May 20, 2027, has tee times$/ })).toBeEnabled();
  },
};

/**
 * **What changed:** picking June 12 from the calendar — ‹ › to June, tap the day — lands on
 * its generated tee sheet.
 */
export const PickJuneFromCalendar: Story = {
  render: () => <Screen edition="weston" initialState={atVenue('eighteen')} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByText(/Thu, May 21, 2026/));
    await userEvent.click(c.getByRole('button', { name: 'Next month' }));
    await userEvent.click(await c.findByRole('button', { name: /^Friday, June 12, 2026, has tee times$/ }));
    await c.findByText(/Fri, Jun 12, 2026/);
    await waitFor(() => expect(golferCount(canvasElement)).toBeGreaterThan(0));
  },
};

/**
 * **Before Weston Edits (base edition, for comparison):** the same Fri, Jun 12 is an empty
 * sheet — the base demo only has its eleven authored days, and its calendar is unchanged.
 */
export const BeforeWestonEdits: Story = {
  render: () => <Screen edition="base" initialState={atVenue('eighteen', { currentDate: JUNE_12 })} />,
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByText(/Fri, Jun 12, 2026/);
    await expect(golferCount(canvasElement)).toBe(0);
  },
};
