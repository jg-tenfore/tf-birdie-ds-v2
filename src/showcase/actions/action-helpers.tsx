import type { ComponentProps } from 'react';
import { Box } from '@mui/material';
import { expect, waitFor, within } from 'storybook/test';
import type { StoryObj } from '@storybook/react-vite';
import { md3 } from '../../theme/tokens';
import { TeeSheetAction } from '../../pos/components/TeeSheetAction';
import { DEMO_TODAY } from '../../pos/data/bookings';
import { toDateStr } from '../../pos/data/courses';
import { timeRowKey } from '../../pos/state/pos-store';
import type { Booking, PayStatus, PlayerState } from '../../pos/types';

/**
 * Shared pieces for the Tee Sheet Actions stories.
 *
 * Each story is one action: the sheet before with the action's dialog over it, the sheet
 * after, and the writes derived from the difference. The `play` helpers below are what keep
 * that honest — they drive the real dialog on the left sheet and check it converges on the
 * right one, so a story cannot document an outcome the dialog does not actually produce.
 */

export const TODAY = toDateStr(DEMO_TODAY());

/** 6:00 AM — the first row of the Early Morning band, so a story opens on its own rows. */
export const T0 = 6 * 60;
/** Subsequent rows at the default 8-minute interval. */
export const row = (n: number) => T0 + n * 8;

/** The `timeNotes` / `timePrices` key for a row on the demo day. */
export const rowKey = (timeMin: number) => timeRowKey(DEMO_TODAY(), timeMin);

let seq = 0;

/** One booking; only the fields a story cares about need naming. */
export function mk(over: Partial<Booking> & { course: string; timeMin: number }): Booking {
  seq += 1;
  const players = over.players ?? 2;
  const pay: PayStatus = over.pay ?? 'open';
  const states: PlayerState[] = Array.from({ length: players }, () => ({
    paid: pay === 'paid',
    step: -1,
    noShow: false,
  }));
  return {
    id: `act-${seq}`,
    date: TODAY,
    slot: 0,
    name: 'Harrison, T.',
    players,
    cart: 'cart',
    status: 'booked',
    phone: '(555)100-0001',
    conf: `R-${7000 + seq}`,
    pay,
    price: 100,
    holes: '18H',
    playerStates: states,
    ...over,
  };
}

/** Dark ground, so the two panes read as one exhibit rather than as page furniture. */
export function Exhibit(props: ComponentProps<typeof TeeSheetAction>) {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: md3.scrim, p: 1.5, boxSizing: 'border-box' }}>
      <TeeSheetAction {...props} />
    </Box>
  );
}

export const actionParams = { layout: 'fullscreen' as const };

// ─── Assertions ─────────────────────────────────────────────────────────────

/** The two sheets, left then right. */
function panes(root: HTMLElement): [HTMLElement, HTMLElement] {
  const found = root.querySelectorAll<HTMLElement>('[data-pane]');
  if (found.length < 2) throw new Error(`expected two panes, found ${found.length}`);
  return [found[0], found[1]];
}

/**
 * Every booking on a sheet, as `name|players|pay|status|ci:n|paid:n`, sorted so the order
 * the grid happens to render them in cannot affect a comparison.
 */
export const bookingsOn = (pane: HTMLElement): string[] =>
  [...pane.querySelectorAll<HTMLElement>('[data-booking]')]
    .map((e) => e.dataset.booking ?? '')
    .sort();

/**
 * Drive the real dialog on the Before sheet, then require it to match the After sheet.
 *
 * This is the assertion worth having. Building the After pane through the reducer proves
 * the reducer works; only this proves the *dialog* dispatches what the story claims — the
 * gap where a modal silently dropping a prop hides.
 */
export const convergesOnAfter =
  (drive: (dialog: ReturnType<typeof within>) => Promise<void>): NonNullable<StoryObj['play']> =>
  async ({ canvasElement }) => {
    const [before, after] = panes(canvasElement as HTMLElement);
    const expected = bookingsOn(after);
    // A story whose panes already agree would pass without testing anything.
    await expect(bookingsOn(before)).not.toEqual(expected);

    await drive(within(before));
    await waitFor(() => expect(bookingsOn(before)).toEqual(expected), { timeout: 4000 });
  };

/** Assert the After sheet holds, or has lost, particular bookings. */
export const afterShows =
  (opts: { has?: RegExp[]; lacks?: RegExp[] }): NonNullable<StoryObj['play']> =>
  async ({ canvasElement }) => {
    const [, after] = panes(canvasElement as HTMLElement);
    const list = bookingsOn(after).join('\n');
    for (const re of opts.has ?? []) await expect(list).toMatch(re);
    for (const re of opts.lacks ?? []) await expect(list).not.toMatch(re);
  };
