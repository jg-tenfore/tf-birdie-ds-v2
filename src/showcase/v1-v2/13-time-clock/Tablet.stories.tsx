import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { STAFF } from '../../../pos/data/staff';
import { SEED_PUNCHES } from '../../../pos/data/staff-seed';
import { fmtHours, weeklyTotals } from '../../../pos/logic/staff-hours';
import { Screen, TODAY_STR, atVenue } from '../../pos/screen-helpers';

/**
 * V1 → V2 Migration / 13 · Time Clock / Tablet
 *
 * **Who is working, and the hours they have worked.**
 *
 * ## What v1 did
 *
 * `tf-birdie-ds-v1/app/src/screens/time-clock.tsx`, from `references/072926/13-timeclock/`: two big
 * buttons, CLOCK IN and CLOCK OUT, set far apart, one live at a time, and a log of bare punches —
 * `07/29/2026 8:51 AM  Clock In` — newest first.
 *
 * ## What was wrong with it
 *
 * It clocked only whoever was signed in, and showed nobody else. A manager could not see who was on,
 * could not clock out a server who had gone home without doing it, and never saw an hour: the log
 * was single punches, not pairs, so a week's hours were added up by hand.
 *
 * ## What this does
 *
 * - **Everyone on one list** — on since when, hours so far — each with their own Clock in / Clock out,
 *   one live action per person. The signed-in person is marked "You", and their punch is also the
 *   toolbar's one button.
 * - **Punches in pairs**, today and every day before, with hours to a quarter-hour. An open punch
 *   counts up to now.
 * - **Weekly totals per person**, Monday to Sunday.
 * - A second clock-in, or a clock-out with nothing open, is refused by the store.
 */
const meta = {
  title: 'V1 → V2 Migration/13 · Time Clock/Tablet',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const at = (extra = {}) => atVenue('eighteen', { view: 'timeclock', leftPanelCollapsed: true, ...extra });
const row = (el: HTMLElement, id: string) => el.querySelector<HTMLElement>(`[data-clock-row="${id}"]`)!;

/**
 * **The morning so far.** Six people on the clock, each with when they came in and hours so far; the
 * week's totals beside the log.
 */
export const WhoIsOn: Story = {
  render: () => <Screen edition="v1v2" initialState={at()} />,
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('[data-clock-row]').length).toBe(STAFF.length);
    for (const s of STAFF) await expect(row(canvasElement, s.id).getAttribute('data-on-clock')).toBe('true');
    await expect(row(canvasElement, 's-1').textContent).toContain('On since 6:30 AM · 5.5 h');
    await expect(row(canvasElement, 's-1').textContent).toContain('YOU');
    // Avery: three closed 8.5-hour days this week and 5.5 hours today.
    const week = weeklyTotals(SEED_PUNCHES, '12:00 PM', TODAY_STR)[0];
    const avery = week.rows.find((r) => r.staffId === 's-1')!;
    await expect(canvasElement.querySelector(`[data-week="${week.weekStart}"] [data-week-row="s-1"]`)!.textContent).toContain(fmtHours(avery.hours));
    await expect(avery.hours).toBe(31);
  },
};

/**
 * **Clocking someone else out.** Jordan left without punching; a manager clocks him out from his
 * row. He is off, today's log pairs his in with the out, and five remain on the clock.
 */
export const ClockingSomeoneOut: Story = {
  render: () => <Screen edition="v1v2" initialState={at()} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Clock out Jordan Ellis' }));
    await waitFor(() => expect(row(canvasElement, 's-2').getAttribute('data-on-clock')).toBe('false'));
    await expect(row(canvasElement, 's-2').textContent).toContain('Out at 12:00 PM');
    await expect(canvasElement.querySelector('[data-on-clock-count]')!.getAttribute('data-on-clock-count')).toBe('5');
    const punch = canvasElement.querySelector<HTMLElement>('[data-punch="PU-104"]')!;
    await expect(punch.textContent).toContain('10:00 AM');
    await expect(punch.textContent).toContain('12:00 PM');
    await expect(punch.textContent).toContain('2 h');
  },
};

/**
 * **Your own punch, out and back in.** The toolbar's button is the signed-in person's: out, then in
 * again — a second punch on today's log, and never both actions live at once.
 */
export const ClockYourselfOutAndIn: Story = {
  render: () => <Screen edition="v1v2" initialState={at()} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: /Clock out Avery R\./ }));
    await waitFor(() => expect(row(canvasElement, 's-1').getAttribute('data-on-clock')).toBe('false'));
    await expect(c.queryByRole('button', { name: /Clock out Avery R\./ })).toBeNull();
    await userEvent.click(c.getByRole('button', { name: /Clock in Avery R\./ }));
    await waitFor(() => expect(row(canvasElement, 's-1').getAttribute('data-on-clock')).toBe('true'));
    await expect(row(canvasElement, 's-1').textContent).toContain('On since 12:00 PM');
    const todays = SEED_PUNCHES.filter((p) => p.date === TODAY_STR).length;
    await expect(canvasElement.querySelectorAll(`[data-punch]`).length).toBeGreaterThan(todays);
  },
};

/** **The days before**, each with its punches paired and its total — Wednesday's five closed shifts. */
export const PastDays: Story = {
  render: () => <Screen edition="v1v2" initialState={at()} />,
  play: async ({ canvasElement }) => {
    const days = canvasElement.querySelectorAll('[data-punch-day]');
    await expect(days.length).toBe(5);
    const first = days[0] as HTMLElement;
    await expect(first.querySelectorAll('[data-punch]').length).toBe(5);
    await expect(first.textContent).toContain('3:00 PM');
    await expect(first.textContent).toContain('8.5 h');
  },
};

/** **Weston Edits has no Time Clock** — its route falls back to the tee sheet. */
export const WestonEditionHasNone: Story = {
  render: () => <Screen edition="weston" initialState={at()} />,
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-time-clock]')).toBeNull();
  },
};
