import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';
import { SEED_RESERVATIONS } from '../../../pos/data/restaurant-seed';
import type { DiningReservation } from '../../../pos/logic/restaurant';
import type { PosState } from '../../../pos/state/pos-store';
import { Screen, TODAY_STR, atVenue } from '../../pos/screen-helpers';

/**
 * V1 → V2 Migration / 8 · Reservations / Tablet
 *
 * **A day of the dining room's bookings — each with a table, a status and the actions it allows.**
 *
 * ## What v1 did
 *
 * The shipping app's Restaurant Reservations (`tf-birdie-ds-v1/app/src/screens/restaurant-
 * reservations.tsx`, from `references/072926/8-reservations/`) was a slate date band over a
 * six-column table — Time, Party, First Name, Last Name, Email, Phone — whose rows could not be
 * tapped. *Add reservation* in the top bar took those six fields and nothing more.
 *
 * ## What was wrong with it
 *
 * - **No tables.** In v1's own words: "there is nothing here about tables… seating is entirely a
 *   matter of the host remembering." Nothing stopped two parties being promised one table.
 * - **No status.** Arrived, never came and cancelled all looked the same.
 * - **No seating.** A reservation and the check its party ran up were never connected.
 * - **No customer.** A member who booked every Friday was typed in fresh every Friday.
 *
 * ## What this does
 *
 * - **Grouped by service**, lunch then dinner, in time order, under the day's covers: booked,
 *   seated, still to come, no-shows, and how many have no table yet.
 * - **Every reservation shows its table**, or a *No table yet* flag. Tap it to assign one: only
 *   tables that fit and are free for the whole meal — **90 minutes**, `MEAL_MIN` — are offered,
 *   and a taken table says who has it. A 5:30 and a 7:00 can share a table; a 6:30 and a 7:00
 *   can't. Editing a reservation so its table no longer works is refused, with why.
 * - **Seat** opens a tab on the table for the party and links the two, then offers the tab. A
 *   table still occupied is flagged before Seat, not refused after it.
 * - **No-show** only once the time has come; **Cancel** and **Restore**; **Edit**.
 * - **New reservation** links a customer from the roster, found inline in the dialog.
 *
 * The date controls are the tee sheet's own. Email is gone; v1 collected it and used it for
 * nothing.
 */
const meta = {
  title: 'V1 → V2 Migration/8 · Reservations/Tablet',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const listState = (extra: Partial<PosState> = {}) => atVenue('eighteen', { view: 'reservations', leftPanelCollapsed: true, ...extra });

const withReservations = (patch: Record<string, Partial<DiningReservation>>, extra: DiningReservation[] = []) =>
  [...SEED_RESERVATIONS.map((r) => (patch[r.id] ? { ...r, ...patch[r.id] } : r)), ...extra];

const row = (root: HTMLElement, id: string) => {
  const el = root.querySelector<HTMLElement>(`[data-reservation="${id}"]`);
  if (!el) throw new Error(`no reservation ${id}`);
  return el;
};
const stat = (root: HTMLElement, name: string) => root.querySelector(`[data-stat="${name}"] [data-stat-value]`)?.textContent;
const onTabs = (root: HTMLElement) =>
  waitFor(() => {
    expect(root.querySelector('[data-restaurant-view="ReservationsView"]')).toBeNull();
    expect(root.querySelector('[data-restaurant-view="TabsView"]')).not.toBeNull();
  });

/**
 * **A day of reservations.** The demo Thursday: lunch in progress, dinner booked. 49 covers
 * expected (Martinez cancelled), 12 already seated, 35 to come, one no-show, and three bookings
 * with no table yet — Walsh's flagged in the list. Each service is in time order.
 */
export const ADayOfReservations: Story = {
  render: () => <Screen edition="v1v2" initialState={listState()} />,
  play: async ({ canvasElement }) => {
    await expect(stat(canvasElement, 'covers')).toBe('49');
    await expect(stat(canvasElement, 'seated')).toBe('12');
    await expect(stat(canvasElement, 'to-come')).toBe('35');
    await expect(stat(canvasElement, 'no-shows')).toBe('1');
    await expect(stat(canvasElement, 'unassigned')).toBe('3');
    const services = [...canvasElement.querySelectorAll('[data-service]')].map((s) => s.getAttribute('data-service'));
    await expect(services).toEqual(['lunch', 'dinner']);
    const dinner = canvasElement.querySelector('[data-service="dinner"]')!;
    const ids = [...dinner.querySelectorAll('[data-reservation]')].map((r) => r.getAttribute('data-reservation'));
    await expect(ids[0]).toBe('R-506');
    await expect(row(canvasElement, 'R-505').querySelector('[data-no-table]')).not.toBeNull();
    await expect(within(row(canvasElement, 'R-504')).getByText('Table 3')).toBeTruthy();
    await expect(row(canvasElement, 'R-503').getAttribute('data-status')).toBe('no_show');
    await expect(within(row(canvasElement, 'R-501')).getByRole('button', { name: 'Open tab' })).toBeTruthy();
  },
};

/**
 * **Assigning a table.** Patel, four at 7:00, has none. The picker shows the tables for four or
 * more: Table 12 is Johnson's at 7:00 and Table 8 Whitfield's at 6:30 — both overlap, both
 * disabled and saying who. Table 2 is Park's at 5:30, which is done by 7:00, so it is offered.
 */
export const AssigningATable: Story = {
  render: () => <Screen edition="v1v2" initialState={listState()} />,
  play: async ({ canvasElement }) => {
    const r = row(canvasElement, 'R-509');
    await userEvent.click(within(r).getByRole('button', { name: 'No table yet — assign a table' }));
    const picker = within(r.querySelector<HTMLElement>('[data-place-table]')!);
    await expect(picker.getByRole('button', { name: 'Table 12' })).toBeDisabled();
    await expect(picker.getByText('Johnson · 7:00 PM')).toBeTruthy();
    await expect(picker.getByRole('button', { name: 'Table 8' })).toBeDisabled();
    await expect(picker.queryByRole('button', { name: 'Table 5' })).toBeNull(); // a two-top
    await userEvent.click(picker.getByRole('button', { name: 'Table 2' }));
    await waitFor(() => expect(within(row(canvasElement, 'R-509')).getByRole('button', { name: 'Table 2 — change table' })).toBeTruthy());
    await expect(stat(canvasElement, 'unassigned')).toBe('2');
  },
};

/**
 * **The overlap rule, when a reservation changes.** Patel has Table 2 at 7:00. Moving Park's
 * 5:30 on the same table to 6:00 would put two parties there from 7:00 to 7:30 — the dialog says
 * so, names Patel, and will not save until the time or the table changes.
 */
export const TheOverlapRule: Story = {
  render: () => (
    <Screen
      edition="v1v2"
      initialState={listState({
        diningReservations: withReservations({ 'R-509': { tableId: 'd-2' } }),
        modal: { kind: 'reservation', id: 'R-506' },
      })}
    />
  ),
  play: async () => {
    const dialog = within(await screen.findByRole('dialog'));
    await expect(dialog.getByRole('button', { name: 'Save' })).toBeEnabled();
    await userEvent.selectOptions(dialog.getByLabelText('Time'), '6:00 PM');
    await expect(dialog.getByText(/Table 2 can't take this reservation: Patel · 7:00 PM/)).toBeTruthy();
    await expect(dialog.getByRole('button', { name: 'Save' })).toBeDisabled();
    await userEvent.selectOptions(dialog.getByLabelText('Time'), '5:15 PM');
    await expect(dialog.getByRole('button', { name: 'Save' })).toBeEnabled();
  },
};

/**
 * **Seating, and going to the tab.** Delgado's 12:30 is set for Table 3; *Seat* chooses it for
 * her. Seated, the dialog offers the tab rather than jumping to it — the host who seats is not
 * always the server who orders — and *Open tab* goes.
 */
export const SeatingAndGoingToTheTab: Story = {
  render: () => <Screen edition="v1v2" initialState={listState()} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(row(canvasElement, 'R-504')).getByRole('button', { name: 'Seat' }));
    let dialog = within(await screen.findByRole('dialog'));
    await expect(dialog.getByRole('button', { name: 'Table 3' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(dialog.getByRole('button', { name: 'Seat at Table 3' }));
    dialog = within(await screen.findByRole('dialog'));
    await expect(await dialog.findByText('Delgado, Ana is seated')).toBeTruthy();
    await expect(dialog.getByText('Table 3 · Delgado')).toBeTruthy();
    await userEvent.click(dialog.getByRole('button', { name: 'Open tab' }));
    await onTabs(canvasElement);
  },
};

/**
 * **An occupied table is flagged before Seat, not refused after it.** Walsh was set for Table 5,
 * where a party sat at 11:46 is still eating. The dialog says so, Table 5 can't be chosen, and
 * nothing is chosen for her — Seat waits for a table that is free. No tab is opened.
 */
export const RefusingAnOccupiedTable: Story = {
  render: () => <Screen edition="v1v2" initialState={listState({ diningReservations: withReservations({ 'R-505': { tableId: 'd-5' } }) })} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(row(canvasElement, 'R-505')).getByRole('button', { name: 'Seat' }));
    const dialog = within(await screen.findByRole('dialog'));
    await expect(dialog.getByText(/it is occupied — Table 5 is still open/)).toBeTruthy();
    await expect(dialog.getByRole('button', { name: 'Table 5' })).toBeDisabled();
    await expect(dialog.getByRole('button', { name: 'Choose a table' })).toBeDisabled();
    await userEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(row(canvasElement, 'R-505').getAttribute('data-status')).toBe('booked'));
  },
};

/**
 * **No-show, once the time has come.** An 11:45 that never arrived can be marked no-show at noon;
 * Delgado's 12:30 can't be — it hasn't happened yet. Marking it counts it, and frees its table.
 */
export const MarkingANoShow: Story = {
  render: () => (
    <Screen
      edition="v1v2"
      initialState={listState({
        diningReservations: withReservations({}, [
          { id: 'R-900', date: TODAY_STR, timeMin: 11 * 60 + 45, partySize: 2, name: 'Reyes, Tomas', tableId: 'd-6', status: 'booked' },
        ]),
      })}
    />
  ),
  play: async ({ canvasElement }) => {
    await expect(within(row(canvasElement, 'R-504')).queryByRole('button', { name: 'No-show' })).toBeNull();
    await userEvent.click(within(row(canvasElement, 'R-900')).getByRole('button', { name: 'No-show' }));
    await waitFor(() => expect(row(canvasElement, 'R-900').getAttribute('data-status')).toBe('no_show'));
    await expect(stat(canvasElement, 'no-shows')).toBe('2');
    await expect(within(row(canvasElement, 'R-900')).getByRole('button', { name: 'Restore' })).toBeTruthy();
  },
};

/**
 * **Cancel, and restore.** Blake's anniversary dinner is cancelled — its two covers leave the
 * day's count — then restored, table and all, because nobody else has taken Table 6 meanwhile.
 */
export const CancellingAndRestoring: Story = {
  render: () => <Screen edition="v1v2" initialState={listState()} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(row(canvasElement, 'R-507')).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(row(canvasElement, 'R-507').getAttribute('data-status')).toBe('cancelled'));
    await expect(stat(canvasElement, 'covers')).toBe('47');
    await userEvent.click(within(row(canvasElement, 'R-507')).getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(row(canvasElement, 'R-507').getAttribute('data-status')).toBe('booked'));
    await expect(within(row(canvasElement, 'R-507')).getByText('Table 6')).toBeTruthy();
  },
};

/**
 * **Making one.** *New reservation*: find David Kim on the roster by name — his name and phone
 * fill in, and the reservation is linked to his record — make it four at 7:30, give it Table 11,
 * and book. It lands in dinner with its table.
 */
export const MakingAReservation: Story = {
  render: () => <Screen edition="v1v2" initialState={listState()} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'New reservation' }));
    const dialog = within(await screen.findByRole('dialog'));
    await expect(dialog.getByRole('button', { name: 'Book' })).toBeDisabled();
    await userEvent.type(dialog.getByPlaceholderText('Name or phone'), 'kim dav');
    await userEvent.click(await dialog.findByText('Kim, David'));
    await expect(dialog.getByPlaceholderText('Last, First')).toHaveValue('Kim, David');
    await expect(dialog.getByPlaceholderText('(555) 555-0100')).toHaveValue('(555)400-0005');
    await userEvent.click(dialog.getByRole('button', { name: 'More guests' }));
    await userEvent.click(dialog.getByRole('button', { name: 'More guests' }));
    await userEvent.selectOptions(dialog.getByLabelText('Time'), '7:30 PM');
    await expect(dialog.getByRole('button', { name: 'Table 12' })).toBeDisabled();
    await userEvent.click(dialog.getByRole('button', { name: 'Table 11' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Book' }));
    await waitFor(() => expect(canvasElement.querySelector('[data-reservation="R-514"]')).not.toBeNull());
    const r = within(row(canvasElement, 'R-514'));
    await expect(r.getByText('7:30 PM')).toBeTruthy();
    await expect(r.getByText('Kim, David')).toBeTruthy();
    await expect(r.getByRole('button', { name: 'Table 11 — change table' })).toBeTruthy();
    await expect(stat(canvasElement, 'covers')).toBe('53');
  },
};

/**
 * **Moving through days.** The tee sheet's controls: the next day has nothing booked, and says
 * so with a way to book; *Today* comes back.
 */
export const MovingThroughDays: Story = {
  render: () => <Screen edition="v1v2" initialState={listState()} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByTitle('Next day'));
    await expect(await c.findByText('No reservations for this date.')).toBeTruthy();
    await expect(stat(canvasElement, 'covers')).toBe('0');
    await userEvent.click(c.getByTitle('Today'));
    await waitFor(() => expect(stat(canvasElement, 'covers')).toBe('49'));
  },
};
