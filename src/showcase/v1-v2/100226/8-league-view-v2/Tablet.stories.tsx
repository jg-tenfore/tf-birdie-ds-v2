import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { leagueBookingId, LEAGUES } from '../../../../pos/data/leagues';
import type { PosState } from '../../../../pos/state/pos-store';
import { Screen, atVenue } from '../../../pos/screen-helpers';
import { MAY30, memberGuest, outing } from '../../100126/scenarios';

/**
 * V1 → V2 Migration / 100226 / 8 · League view v2
 *
 * **Weston, on 100126's group view:** *"the idea is just to have a place where you can manage the
 * whole group… speed and checking in of golfers who are arriving at the same time."* Two of his
 * examples: *"Justin, you're the 7:20"* — placing the roster on tee times, ahead of time or on the
 * day — and *"Justin's here, pay. Johnny, check in, pay"* without leaving the screen.
 *
 * **Built into the V1 → V2 prototype.** Every story below renders the live app on Saturday, May 30
 * at the 18-hole club, where three leagues are real tee times on the sheet:
 *
 * | League | Goes out | Roster |
 * |---|---|---|
 * | Senior League | Tee times, Championship · Back 9, 7:04–7:36 AM | 20 — 16 placed, 4 to place (Justin among them); the 7:04 in and paid |
 * | Skins League | Tee times, Front 9, from 1:04 PM | 12 on 3 tee times, 1 to place |
 * | Men's League | **Shotgun**, Front 9 tee times from 3:04 PM | 20 in 5 teams, 2 to place |
 *
 * (The Member-Guest holds the front nine 7:04–9:20, so the Senior League takes the back; the sheet's
 * rows are every 8 minutes from 6:00, so 1:00 and 3:00 are 1:04 and 3:04.)
 *
 * 1. **Check in without leaving** — search by name or tee time; **Check in**, **Pay** and **Extra**
 *    on every golfer. Pay is the register's own checkout, over the League view; the seat it pays is
 *    the real seat, so the tee sheet shows it paid. Extra goes to the register with the golfer's seat
 *    on the order and a **Back to Senior League** on the rail.
 * 2. **Roster to tee times** — tap a name, then a seat, or drag it across. Placing fills a real seat
 *    on that tee time's booking; ✕ frees it.
 * 3. **Shotgun or tee times** — a label in the League view (the tee sheet does not move): a shotgun
 *    lists everyone under one big search, A–Z or by team (*Team k · Hole k*).
 * 4. **Several leagues in a day** — a switcher across the top, each keeping its own state.
 *
 * The way in: a league tee time still opens like any reservation, with League view one tap away.
 */
const meta = {
  title: 'V1 → V2 Migration/100226/8 · League view v2',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const [SENIOR, SKINS, MENS] = LEAGUES;

/** May 30 at the 18-hole club, with a league's view open. */
const leagueView = (groupId: string, extra: Partial<PosState> = {}): Partial<PosState> =>
  atVenue('eighteen', { currentDate: MAY30, view: 'league', leagueGroupId: groupId, ...extra });

/** Today, before the League view: one tee time of the outing, opened like a single reservation. */
export const Original: Story = {
  render: () => <Screen edition="v1v2" initialState={outing(memberGuest()[0])} />,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const viewOf = (el: HTMLElement) =>
  waitFor(() => {
    const v = el.querySelector<HTMLElement>('[data-league-view]');
    if (!v) throw new Error('no league view yet');
    // The leagues' tee times land on the sheet in a layout effect; wait for the roster's seats.
    const seated = [...v.querySelectorAll('[data-golfer-fees]')].some((n) => n.textContent?.startsWith('League Rate')) || v.querySelector('[data-assign-group] [aria-label^="Take "]');
    if (!seated) throw new Error('no golfers on tee times yet');
    return v;
  });

/** No two cards in `selector` overlap — a grid row that shrank to fit would draw one over the next. */
async function expectNoOverlap(view: HTMLElement, selector: string) {
  const rects = [...view.querySelectorAll<HTMLElement>(selector)].map((n) => n.getBoundingClientRect());
  for (const a of rects)
    for (const b of rects) {
      if (a === b) continue;
      const sideBySide = a.right <= b.left + 1 || b.right <= a.left + 1;
      const stacked = a.bottom <= b.top + 1 || b.bottom <= a.top + 1;
      await expect(sideBySide || stacked).toBe(true);
    }
}

/** The tee sheet's chip for a league tee time: `name|players|pay|status|ci:n|paid:n`. */
const chipOf = (el: HTMLElement, groupId: string, k: number) =>
  el.querySelector<HTMLElement>(`[data-booking-id="${leagueBookingId(LEAGUES.find((l) => l.groupId === groupId)!, k)}"]`);

/** Pay with a card through the register's checkout: tap card, simulate the tap, Done. */
async function payByCard(el: HTMLElement, amount: string) {
  const body = within(el.ownerDocument.body);
  const checkout = await body.findByRole('dialog');
  await expect(within(checkout).getByText('Checkout')).toBeTruthy();
  await expect(checkout.textContent).toContain(amount);
  await userEvent.click(within(checkout).getByRole('button', { name: /^card$/i }));
  await userEvent.click(await body.findByRole('button', { name: 'Simulate tap' }));
  await userEvent.click(await body.findByRole('button', { name: 'Done' }, { timeout: 3000 }));
  await waitFor(() => expect(body.queryByRole('dialog')).toBeNull());
}

// ─── Stories ────────────────────────────────────────────────────────────────

/**
 * Senior League, tee times. *"Johnny, check in, pay"*: search the 7:20, check Johnny in, and Pay —
 * the register's checkout opens over the League view for Johnny's seat alone. Pay, and you are back
 * in the League view with Johnny paid; the tee sheet's 7:20 shows his seat in and paid.
 */
export const CheckInAndPay: Story = {
  name: 'Check in and pay',
  render: () => <Screen edition="v1v2" initialState={leagueView(SENIOR.groupId)} />,
  play: async ({ canvasElement }) => {
    const view = await viewOf(canvasElement);
    const v = within(view);
    // Five tee times, and the four still to place.
    await expect(view.querySelectorAll('[data-league-group^="time-"]').length).toBe(5);
    await expect(view.querySelector('[data-league-group="unplaced"]')).not.toBeNull();
    await expect(v.getByText('5/20 checked in')).toBeTruthy();
    await expectNoOverlap(view, '[data-league-group]');
    // The 7:04 is in and paid; the 7:12 is up next.
    await expect(within(view.querySelector<HTMLElement>('[data-league-group="time-0"]')!).getByText('All paid')).toBeTruthy();
    await expect(within(view.querySelector<HTMLElement>('[data-league-group="time-1"]')!).getByText('Up next')).toBeTruthy();
    // Search by tee time.
    await userEvent.type(view.querySelector<HTMLInputElement>('[data-league-search]')!, '7:20');
    await expect(view.querySelectorAll('[data-league-group]').length).toBe(1);
    await expect(view.querySelector('[data-league-golfer="g2"] [data-golfer-fees]')!.textContent).toBe('League Rate $36.00 · Riding Cart $26.82');
    await userEvent.click(v.getByRole('button', { name: 'Check in Alvarez, Johnny' }));
    await expect(v.getByText('6/20 checked in')).toBeTruthy();
    // Pay: the real checkout, for what the button said.
    const pay = v.getByRole('button', { name: 'Pay for Alvarez, Johnny' });
    const amount = pay.textContent!.replace(/^Pay /, '');
    await userEvent.click(pay);
    await payByCard(canvasElement, amount);
    // Back in the League view, Johnny paid.
    await waitFor(() => expect(v.getByRole('button', { name: 'Alvarez, Johnny has paid' })).toBeTruthy());
    await expect(v.getByText('5 paid')).toBeTruthy();
    // And on the tee sheet, the 7:20's seat is paid.
    await userEvent.click(v.getByRole('button', { name: /Tee sheet/ }));
    await waitFor(() => expect(canvasElement.querySelector('[data-league-view]')).toBeNull());
    const chip = await waitFor(() => chipOf(canvasElement, SENIOR.groupId, 2)!);
    await expect(chip.getAttribute('data-booking')).toBe('Alvarez, Johnny|3|open|group|ci:1|paid:1');
  },
};

/**
 * **Extra** — Tom wants a bucket of balls. The register opens with Tom's seat on the order and a
 * **Back to Senior League** on the rail; the bucket lands on Tom's real order, and back in the League
 * view his Pay takes the round and the bucket together.
 */
export const Extra: Story = {
  render: () => <Screen edition="v1v2" initialState={leagueView(SENIOR.groupId)} />,
  play: async ({ canvasElement }) => {
    const view = await viewOf(canvasElement);
    const c = within(canvasElement);
    const before = within(view).getByRole('button', { name: 'Pay for Hughes, Tom' }).textContent;
    await userEvent.click(within(view).getByRole('button', { name: 'Extra for Hughes, Tom' }));
    // The register, Tom's seat on the order.
    await waitFor(() => expect(canvasElement.querySelector('[data-league-view]')).toBeNull());
    const back = await c.findByRole('button', { name: 'Back to Senior League' });
    await userEvent.click((await c.findAllByText('Range Bucket Large')).at(-1)!);
    await waitFor(() => expect(c.getAllByText(/Range Bucket Large/).length).toBeGreaterThan(1));
    await userEvent.click(back);
    // Back in the league: the bucket is on Tom's bill.
    const again = await viewOf(canvasElement);
    const tom = again.querySelector<HTMLElement>('[data-league-golfer="g10"]')!;
    await expect(within(tom).getByText('+ Range Bucket Large')).toBeTruthy();
    const after = within(again).getByRole('button', { name: 'Pay for Hughes, Tom' }).textContent;
    await expect(after).not.toBe(before);
    await expect(Number(after!.replace(/[^\d.]/g, ''))).toBeGreaterThan(Number(before!.replace(/[^\d.]/g, '')) + 14);
  },
};

/** *"Justin, you're the 7:20."* Tap Justin, then the open seat — the seat is filled on the real booking. */
export const AssignTeeTimes: Story = {
  name: 'Assign tee times',
  render: () => <Screen edition="v1v2" initialState={leagueView(SENIOR.groupId, { leagueTab: 'assign' })} />,
  play: async ({ canvasElement }) => {
    const view = await viewOf(canvasElement);
    const v = within(view);
    await waitFor(() => expect(view.querySelectorAll('[data-roster-golfer]').length).toBe(20));
    await waitFor(() => expect(v.getByText('4 to place')).toBeTruthy());
    await expectNoOverlap(view, '[data-assign-group]');
    await userEvent.click(view.querySelector<HTMLElement>('[data-roster-golfer="g0"]')!);
    const seven20 = view.querySelector<HTMLElement>('[data-assign-group="2"]')!;
    await userEvent.click(within(seven20).getByRole('button', { name: 'Open seat on 7:20 AM' }));
    await expect(within(seven20).getByText('Girard, Justin')).toBeTruthy();
    await expect(within(seven20).queryByRole('button', { name: /Open seat/ })).toBeNull();
    await expect(v.getByText('3 to place')).toBeTruthy();
    await expect(within(view.querySelector<HTMLElement>('[data-roster-golfer="g0"]')!).getByText('7:20 AM')).toBeTruthy();
    // On the tee sheet, the 7:20 is a foursome now.
    await userEvent.click(v.getByRole('button', { name: /Tee sheet/ }));
    const chip = await waitFor(() => chipOf(canvasElement, SENIOR.groupId, 2)!);
    await expect(chip.getAttribute('data-booking')).toBe('Alvarez, Johnny|4|open|group|ci:0|paid:0');
  },
};

/** Men's League, a shotgun: everyone at once — one big search, by name or by team. */
export const Shotgun: Story = {
  render: () => <Screen edition="v1v2" initialState={leagueView(MENS.groupId)} />,
  play: async ({ canvasElement }) => {
    const view = await viewOf(canvasElement);
    const v = within(view);
    await expect(view.getAttribute('data-league-mode')).toBe('shotgun');
    await expect(view.querySelectorAll('[data-league-golfer]').length).toBe(20);
    // "Justin's here."
    await userEvent.type(view.querySelector<HTMLInputElement>('[data-league-search]')!, 'justin');
    await expect(view.querySelectorAll('[data-league-golfer]').length).toBe(1);
    await expect(within(view.querySelector<HTMLElement>('[data-league-golfer="g0"]')!).getByText(/^Team \d · Hole \d$/)).toBeTruthy();
    await userEvent.click(v.getByRole('button', { name: 'Check in Girard, Justin' }));
    await expect(v.getByText('1/20 checked in')).toBeTruthy();
    await userEvent.click(v.getByRole('button', { name: 'Clear search' }));
    // By team: five teams on five holes, and the two with no team yet.
    await userEvent.click(within(v.getByRole('group', { name: 'Sort' })).getByRole('button', { name: 'By team' }));
    await expect(view.querySelectorAll('[data-league-group^="team-"]').length).toBe(5);
    await expect(v.getByText('Team 5 · Hole 5')).toBeTruthy();
    await expect(view.querySelector('[data-league-group="unplaced"]')).not.toBeNull();
    await expectNoOverlap(view, '[data-league-group]');
  },
};

/** Three leagues today: switch between them; each keeps its own state, and its own format. */
export const SeveralLeagues: Story = {
  name: 'Several leagues',
  render: () => <Screen edition="v1v2" initialState={leagueView(SENIOR.groupId)} />,
  play: async ({ canvasElement }) => {
    const view = await viewOf(canvasElement);
    const v = within(view);
    await expect(view.querySelectorAll('[data-league-switch]').length).toBe(3);
    await userEvent.click(v.getByRole('button', { name: 'Check in Alvarez, Johnny' }));
    await expect(v.getByText('6/20 checked in')).toBeTruthy();
    // The Senior League goes out as a shotgun today, for the sake of it.
    await userEvent.click(within(v.getByRole('group', { name: 'Format' })).getByRole('button', { name: /Shotgun/ }));
    await expect(view.getAttribute('data-league-mode')).toBe('shotgun');
    // The Skins League: its own roster, still tee times.
    await userEvent.click(view.querySelector<HTMLElement>(`[data-league-switch="${SKINS.groupId}"]`)!);
    await waitFor(() => expect(view.querySelector('[data-league-title]')!.textContent).toBe('Skins League'));
    await expect(view.getAttribute('data-league-mode')).toBe('tee-times');
    await expect(view.querySelectorAll('[data-league-golfer]').length).toBe(12);
    await expect(v.getByText('0/12 checked in')).toBeTruthy();
    // …and back: the Senior League kept its check-in and its format.
    await userEvent.click(view.querySelector<HTMLElement>(`[data-league-switch="${SENIOR.groupId}"]`)!);
    await waitFor(() => expect(view.querySelector('[data-league-title]')!.textContent).toBe('Senior League'));
    await expect(view.getAttribute('data-league-mode')).toBe('shotgun');
    await expect(v.getByText('6/20 checked in')).toBeTruthy();
  },
};

/** The way in: a Senior League tee time opens like any reservation, with League view one tap away. */
export const WayIn: Story = {
  name: 'Way in',
  render: () => <Screen edition="v1v2" initialState={atVenue('eighteen', { currentDate: MAY30 })} />,
  play: async ({ canvasElement }) => {
    const chip = await waitFor(() => chipOf(canvasElement, SENIOR.groupId, 2)!);
    await userEvent.click(chip);
    const panel = await waitFor(() => canvasElement.querySelector<HTMLElement>('[data-reservation-panel]')!);
    const card = await waitFor(() => panel.querySelector<HTMLElement>('[data-league-entry]')!);
    await expect(card.textContent).toContain('Part of Senior League · 20 golfers on 5 tee times');
    await expect(canvasElement.querySelector('[data-league-view]')).toBeNull();
    await userEvent.click(within(card).getByRole('button', { name: /League view/ }));
    const view = await viewOf(canvasElement);
    await expect(view.querySelector('[data-league-title]')!.textContent).toBe('Senior League');
    await expect(canvasElement.querySelector('[data-reservation-panel]')).toBeNull();
    await userEvent.click(within(view).getByRole('button', { name: /Tee sheet/ }));
    await waitFor(() => expect(canvasElement.querySelector('[data-league-view]')).toBeNull());
  },
};
