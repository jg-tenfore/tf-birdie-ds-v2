import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';
import { SEED_ROOMS, type Room } from '../../../pos/data/floor';
import type { PosState } from '../../../pos/state/pos-store';
import { Screen, atVenue } from '../../pos/screen-helpers';

/**
 * V1 → V2 Migration / 7 · Tables / Tablet
 *
 * **The live floor: every table saying what it is, and what can be done with it.**
 *
 * ## What v1 did
 *
 * The shipping app's Restaurant Tables (`tf-birdie-ds-v1/app/src/screens/tables.tsx`, from
 * `references/072926/7-tables/`) drew the room Table Chart laid out, each table warm (seated) or
 * cool (anything else), with the status stored on the table. Tapping any table opened or started
 * a check — with a hard-coded server — and dropped the operator into the seat editor. Rooms were
 * a dark sheet of eleven names, eight of them with nothing laid out.
 *
 * ## What was wrong with it
 *
 * - **Two states, one of them stored.** "Not seated" meant free, *or* held for the 12:30, *or* out
 *   of service; and a status kept on the table could say seated with no check open.
 * - **Reservations never reached the floor.** v1's reservations had no tables — its own note:
 *   "seating is entirely a matter of the host remembering" — so a walk-in could be put on the
 *   table promised to the 12:30 without a word.
 * - **Looking was doing.** There was no way to see who was on a table, or for how long, without
 *   opening its check.
 *
 * ## What this does
 *
 * Five statuses — **free, reserved, seated, check, out of service** — derived from the tabs and
 * reservations (`tableStatus`), so the floor cannot disagree with them. It is live to the demo's
 * clock, noon, whatever day the tee sheet shows. A legend counts each status in the room; seated
 * tables carry server, guests and minutes sat; a held table carries its time and party.
 *
 * Tapping a table **selects** it, and the panel offers what that table allows: a tab or a
 * reservation on a free table; *Seat now* on a held one, or a walk-in with the hold spelled out;
 * *Open tab*, *Move* and *Pay* on a seated one — and why Pay is refused while the register holds
 * another order; *Put back in service* on a blocked one. Out of service is floor data, written
 * with `saveFloor`, so Table Chart sees it too.
 *
 * The seed (`data/restaurant-seed.ts`) is lunch at noon: Tables 1 and 5 seated, Table 10 waiting
 * on its check, Table 3 held for Delgado's 12:30, P2 just sat, B3 a bar tab.
 */
const meta = {
  title: 'V1 → V2 Migration/7 · Tables/Tablet',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const floorState = (extra: Partial<PosState> = {}) => atVenue('eighteen', { view: 'tables', leftPanelCollapsed: true, ...extra });

/** The seeded floor with one table out of service. */
const withBlocked = (id: string): Room[] =>
  SEED_ROOMS.map((r) => ({ ...r, elements: r.elements.map((e) => (e.id === id ? { ...e, outOfService: true } : e)) }));

const tableEl = (root: HTMLElement, id: string) => {
  const el = root.querySelector<HTMLElement>(`[data-floor-element="${id}"]`);
  if (!el) throw new Error(`no table ${id} on the floor`);
  return el;
};
const statusOf = (root: HTMLElement, id: string) => tableEl(root, id).getAttribute('data-table-status');
const legendCount = (root: HTMLElement, status: string) =>
  root.querySelector(`[data-legend="${status}"] [data-legend-count]`)?.textContent;
const panel = (root: HTMLElement) => within(root.querySelector<HTMLElement>('[data-table-panel]')!);
const onTabs = (root: HTMLElement) =>
  waitFor(() => {
    expect(root.querySelector('[data-restaurant-view="TablesView"]')).toBeNull();
    expect(root.querySelector('[data-restaurant-view="TabsView"]')).not.toBeNull();
  });

/**
 * **Every status, live.** Lunch at noon, with Table 4 taken out of service. Each table's colour
 * is derived; the legend counts the room — 7 free, 1 reserved, 2 seated, 1 check, 1 out of
 * service — and the badges say who and how long: Table 1 is Jordan Ellis's four, sat 25 minutes;
 * Table 3 is held for Delgado at 12:30.
 */
export const EveryStatusLive: Story = {
  render: () => <Screen edition="v1v2" initialState={floorState({ floor: withBlocked('d-4') })} />,
  play: async ({ canvasElement }) => {
    await expect(statusOf(canvasElement, 'd-2')).toBe('free');
    await expect(statusOf(canvasElement, 'd-3')).toBe('reserved');
    await expect(statusOf(canvasElement, 'd-1')).toBe('seated');
    await expect(statusOf(canvasElement, 'd-10')).toBe('check');
    await expect(statusOf(canvasElement, 'd-4')).toBe('blocked');
    await expect(legendCount(canvasElement, 'free')).toBe('7');
    await expect(legendCount(canvasElement, 'reserved')).toBe('1');
    await expect(legendCount(canvasElement, 'seated')).toBe('2');
    await expect(legendCount(canvasElement, 'check')).toBe('1');
    await expect(legendCount(canvasElement, 'blocked')).toBe('1');
    const t1 = canvasElement.querySelector('[data-table-badge="d-1"]')!;
    await expect(t1.textContent).toContain('JE · 4');
    await expect(t1.textContent).toContain('25m');
    await expect(canvasElement.querySelector('[data-table-badge="d-10"]')!.textContent).toContain('CHECK');
    await expect(canvasElement.querySelector('[data-table-badge="d-3"]')!.textContent).toContain('12:30 PM');
    await expect(within(canvasElement).getByText(/Live · 12:00/)).toBeTruthy();
  },
};

/**
 * **Rooms.** The patio: P2 just sat, three guests, two minutes. The room is shared with Table
 * Chart (`state.floorRoomId`), so switching here is where the editor opens too.
 */
export const SwitchingRooms: Story = {
  render: () => <Screen edition="v1v2" initialState={floorState()} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(canvasElement.querySelector<HTMLElement>('[data-room="patio"]')!);
    await waitFor(() => expect(canvasElement.querySelector('[data-floor-room="patio"]')).not.toBeNull());
    await expect(statusOf(canvasElement, 'p-2')).toBe('seated');
    await expect(canvasElement.querySelector('[data-table-badge="p-2"]')!.textContent).toContain('2m');
    await expect(legendCount(canvasElement, 'seated')).toBe('1');
  },
};

/**
 * **Opening a tab on a free table.** Table 2 → *Open a tab*: the dialog asks how many and whose
 * — two guests and the operator by default, so the common case is still one more tap — and the
 * tab opens and the screen goes to it.
 */
export const OpeningATab: Story = {
  render: () => <Screen edition="v1v2" initialState={floorState()} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(tableEl(canvasElement, 'd-2'));
    await userEvent.click(panel(canvasElement).getByRole('button', { name: 'Open a tab' }));
    const dialog = within(await screen.findByRole('dialog'));
    await expect(dialog.getByText('Open a tab on Table 2')).toBeTruthy();
    await userEvent.click(dialog.getByRole('button', { name: 'More guests' }));
    await userEvent.click(dialog.getByRole('button', { name: 'More guests' }));
    await expect(dialog.getByText('4 guests')).toBeTruthy();
    await userEvent.click(dialog.getByRole('button', { name: 'Open tab' }));
    await onTabs(canvasElement);
  },
};

/**
 * **Seating the held table, and landing on its tab.** Table 3 is held for Delgado's 12:30. *Seat
 * Delgado now* opens a tab on Table 3 for four, linked to the reservation; the table turns seated
 * and the panel becomes its tab — which is the offer to go to it. *Open tab* goes.
 */
export const SeatingTheHeldTable: Story = {
  render: () => <Screen edition="v1v2" initialState={floorState()} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(tableEl(canvasElement, 'd-3'));
    const p = panel(canvasElement);
    await expect(p.getByText('Delgado, Ana')).toBeTruthy();
    await expect(p.getByText(/4 guests · 12:30 PM · in 30 min/)).toBeTruthy();
    await userEvent.click(p.getByRole('button', { name: 'Seat Delgado now' }));
    await waitFor(() => expect(statusOf(canvasElement, 'd-3')).toBe('seated'));
    const seated = panel(canvasElement);
    await expect(seated.getByText('Table 3 · Delgado')).toBeTruthy();
    await userEvent.click(seated.getByRole('button', { name: 'Open tab' }));
    await onTabs(canvasElement);
  },
};

/**
 * **A walk-in on a held table is warned, not stopped.** The host may be about to give Delgado
 * another table, so it is allowed — but the dialog says who is coming and when, and the button
 * says what it is: *Seat walk-in anyway*.
 */
export const AWalkInOnAHeldTable: Story = {
  render: () => <Screen edition="v1v2" initialState={floorState()} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(tableEl(canvasElement, 'd-3'));
    await userEvent.click(panel(canvasElement).getByRole('button', { name: 'Seat a walk-in instead…' }));
    const dialog = within(await screen.findByRole('dialog'));
    await expect(dialog.getByText(/Table 3 is held for Delgado, Ana \(4\) at 12:30 PM/)).toBeTruthy();
    await expect(dialog.getByRole('button', { name: 'Seat walk-in anyway' })).toBeEnabled();
  },
};

/**
 * **Seating a reservation at a free table.** Walsh's 1:00 has no table. Tap Table 11, and she
 * is among the bookings that fit it and are due soon; *Seat* puts her there and the table turns.
 */
export const SeatingAReservationAtAFreeTable: Story = {
  render: () => <Screen edition="v1v2" initialState={floorState()} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(tableEl(canvasElement, 'd-11'));
    const row = within(canvasElement.querySelector<HTMLElement>('[data-seat-here="R-505"]')!);
    await expect(row.getByText('Walsh, Patricia')).toBeTruthy();
    await userEvent.click(row.getByRole('button', { name: 'Seat' }));
    await waitFor(() => expect(statusOf(canvasElement, 'd-11')).toBe('seated'));
    await expect(panel(canvasElement).getByText('Table 11 · Walsh')).toBeTruthy();
  },
};

/**
 * **A table with a tab can't take another.** Asked to open a tab on Table 1, which has one, the
 * dialog does not open a second — the store would refuse — it says so and offers the one there.
 */
export const AnOccupiedTableOffersItsTab: Story = {
  render: () => <Screen edition="v1v2" initialState={floorState({ modal: { kind: 'openTab', tableId: 'd-1' } })} />,
  play: async ({ canvasElement }) => {
    const dialog = within(await screen.findByRole('dialog'));
    await expect(dialog.getByText(/Table 1 already has a tab open/)).toBeTruthy();
    await expect(dialog.queryByRole('button', { name: 'Open tab' })).toBeNull();
    await userEvent.click(dialog.getByRole('button', { name: 'Open that tab' }));
    await onTabs(canvasElement);
  },
};

/**
 * **Moving a tab.** Table 1 → *Move*. Tables with a tab on them can't be chosen; Table 3 can, but
 * warns it is held. Table 4: the tab goes, dishes and all, and Table 1 is free again.
 */
export const MovingATab: Story = {
  render: () => <Screen edition="v1v2" initialState={floorState()} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(tableEl(canvasElement, 'd-1'));
    await userEvent.click(panel(canvasElement).getByRole('button', { name: 'Move' }));
    const dialog = within(await screen.findByRole('dialog'));
    await expect(dialog.getByRole('button', { name: 'Table 5' })).toBeDisabled();
    await expect(dialog.getByRole('button', { name: 'Table 1' })).toBeDisabled();
    await userEvent.click(dialog.getByRole('button', { name: 'Table 3' }));
    await expect(dialog.getByText(/is held for/)).toBeTruthy();
    await userEvent.click(dialog.getByRole('button', { name: 'Table 4' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Move to Table 4' }));
    await waitFor(() => expect(statusOf(canvasElement, 'd-4')).toBe('seated'));
    await expect(statusOf(canvasElement, 'd-1')).toBe('free');
  },
};

/**
 * **Paying from the floor.** Table 10 has asked for its check. *Pay* loads its dishes onto the
 * register exactly as they are, and the register takes over; paying there closes the tab and
 * frees the table.
 */
export const PayingFromTheFloor: Story = {
  render: () => <Screen edition="v1v2" initialState={floorState()} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(tableEl(canvasElement, 'd-10'));
    const p = panel(canvasElement);
    await expect(p.getByText('The table has asked for its check.')).toBeTruthy();
    await userEvent.click(p.getByRole('button', { name: 'Pay $154.98' }));
    await waitFor(() => expect(canvasElement.querySelector('[data-restaurant-view="TablesView"]')).toBeNull());
    await waitFor(() => expect(within(canvasElement).getAllByText('Turn Burger').length).toBeGreaterThan(0));
  },
};

/**
 * **Pay is refused while the register holds another order — and says so.** A sleeve of balls is
 * on the register. Loading Table 10's tab would bury it, so the store refuses `payTab`; the panel
 * disables *Pay* and explains before anyone taps it.
 */
export const PayIsRefusedWhileTheRegisterIsBusy: Story = {
  render: () => <Screen edition="v1v2" initialState={floorState({ cart: [{ name: 'Titleist Pro V1 Box', price: 54, qty: 1 }] })} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(tableEl(canvasElement, 'd-10'));
    const p = panel(canvasElement);
    await expect(p.getByRole('button', { name: 'Pay $154.98' })).toBeDisabled();
    await expect(p.getByText(/Another order is on the register/)).toBeTruthy();
  },
};

/**
 * **Out of service, and back.** Table 4 is blocked: the panel offers only *Put back in service*,
 * which writes the floor, and the table is free. *Take out of service* on a free table does the
 * reverse.
 */
export const OutOfServiceAndBack: Story = {
  render: () => <Screen edition="v1v2" initialState={floorState({ floor: withBlocked('d-4') })} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(tableEl(canvasElement, 'd-4'));
    await expect(panel(canvasElement).queryByRole('button', { name: 'Open a tab' })).toBeNull();
    await userEvent.click(panel(canvasElement).getByRole('button', { name: 'Put back in service' }));
    await waitFor(() => expect(statusOf(canvasElement, 'd-4')).toBe('free'));
    await expect(legendCount(canvasElement, 'blocked')).toBe('0');
    await userEvent.click(panel(canvasElement).getByRole('button', { name: 'Take out of service' }));
    await waitFor(() => expect(statusOf(canvasElement, 'd-4')).toBe('blocked'));
  },
};

/**
 * **Nothing selected: what needs the host.** The panel lists the tables waiting on their check
 * and the parties due in the next 90 minutes — Delgado on Table 3, Walsh with no table yet.
 * Tapping Table 10's entry selects it.
 */
export const RightNow: Story = {
  render: () => <Screen edition="v1v2" initialState={floorState()} />,
  play: async ({ canvasElement }) => {
    const overview = within(canvasElement.querySelector<HTMLElement>('[data-floor-overview]')!);
    await expect(overview.getByText('Walsh, Patricia')).toBeTruthy();
    await expect(overview.getByText('No table yet')).toBeTruthy();
    await userEvent.click(overview.getByText('Table 10 · Farnsworth'));
    await waitFor(() => expect(canvasElement.querySelector('[data-table-panel="d-10"]')).not.toBeNull());
  },
};
