import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { withEdition } from '../../../edition-decorator';
import { MobileStory, mobileMeta } from '../../../pos-mobile/mobile-helpers';
import { asServer } from '../restaurant-scenarios';

/**
 * Prototypes / Mobile / Tables / Floor on the handheld (V1 → V2, Nov 26)
 *
 * The live floor as a server holds it: `TablesScreen` (`src/pos/mobile/screens/restaurant/`), a
 * server's first destination (see **Global Nav › Menu by role**) and a manager's push from More.
 *
 * ## Same floor, sized for a hand
 *
 * The tablet draws the room as Table Chart laid it out. At 360dp that plan is a third of its size
 * and a two-top is 34px across, so the handheld keeps what the floor *says* and drops where tables
 * *are*: one room at a time (Dining Room · Patio · Bar, shared with the tablet through
 * `state.floorRoomId`), its tables as a three-column grid of 88dp tiles in number order.
 *
 * | | Tablet | Handheld |
 * |---|---|---|
 * | Layout | the saved plan, to scale | a grid in table-number order |
 * | Status | `tableStatus`, derived — free, reserved, seated, check, out of service | the same function, the same colours (`TABLE_STATUS_STYLE`) |
 * | On a seated table | server, guests, minutes sat | guests · server initials · minutes sat, and an amber dot when food is not sent |
 * | On a held table | who and when | the party's name and time |
 * | Tap | selects it; a side panel offers actions | opens a **bottom sheet** offering only what applies |
 *
 * The sheet keeps looking and doing apart, as the tablet's panel does: **Seat walk-in** (asks how
 * many and who is serving), **Seat** a reservation due that fits, **Seat Delgado** on the table
 * held for her — or *Seat a walk-in anyway*, knowingly — and on a seated table **Open tab**,
 * **Check requested** and **Move**. Out of service is the one status a person sets, and it is
 * floor data, so Table Chart sees it too.
 *
 * Every action is the store's (`openTab`, `seatReservation`, `patchTab`, `moveTab`, `saveFloor`),
 * so the chain is the tablet's: reservation → table → tab → kitchen → pay → the table is free.
 */
const meta = {
  title: 'Prototypes/Mobile/Tables/Floor on the handheld',
  id: 'prototypes-mobile-tables-floor-on-the-handheld',
  decorators: [withEdition('current-mobile')],
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const tile = (c: ReturnType<typeof within>, label: string) => c.findByRole('button', { name: new RegExp(`^${label}, `) });

/**
 * **Lunch at noon, in the dining room.** Tables 1 and 10 seated (10 asking for the check), Table 5
 * eating with dessert not yet fired, Table 3 held for Delgado's 12:30, the rest free.
 */
export const TheDiningRoom: Story = {
  render: () => <MobileStory initialState={asServer()} tab="tables" />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect((await tile(c, 'Table 10')).dataset.status).toBe('check');
    await expect((await tile(c, 'Table 1')).dataset.status).toBe('seated');
    await expect((await tile(c, 'Table 3')).dataset.status).toBe('reserved');
    await expect((await tile(c, 'Table 4')).dataset.status).toBe('free');
  },
};

/** **The bar**: eight stools and three high-tops, Okonkwo on B3. Rooms switch in place. */
export const TheBar: Story = {
  render: () => <MobileStory initialState={asServer({ floorRoomId: 'bar' })} tab="tables" />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect((await tile(c, 'B3')).dataset.status).toBe('seated');
  },
};

/**
 * **A seated table's sheet.** Who, how many, how long, what they owe and whether food is waiting
 * to go — then Open tab, Check requested and Move.
 */
export const ASeatedTable: Story = {
  render: () => <MobileStory initialState={asServer()} tab="tables" />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await tile(c, 'Table 5'));
    await expect(await c.findByText(/not sent/)).toBeTruthy();
    await expect(c.getByRole('button', { name: 'Open tab' })).toBeTruthy();
    await expect(c.getByRole('button', { name: 'Move to another table' })).toBeTruthy();
  },
};

/**
 * **A held table.** Table 3 is Delgado's at 12:30: the sheet leads with seating her, and offers a
 * walk-in only as *anyway*.
 */
export const AHeldTable: Story = {
  render: () => <MobileStory initialState={asServer()} tab="tables" />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await tile(c, 'Table 3'));
    await expect(await c.findByRole('button', { name: 'Seat Delgado' })).toBeTruthy();
    await expect(c.getByRole('button', { name: 'Seat a walk-in anyway' })).toBeTruthy();
  },
};

/**
 * **Seat a party.** A free four-top, a walk-in of three: the dialog asks how many and who serves
 * (the signed-in server by default), Seat opens the tab — one seat per guest — and the floor shows
 * the table seated.
 */
export const SeatAWalkIn: Story = {
  render: () => <MobileStory initialState={asServer()} tab="tables" />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await tile(c, 'Table 4'));
    await userEvent.click(await c.findByRole('button', { name: 'Seat walk-in' }));
    await userEvent.click(await c.findByRole('button', { name: 'Guests: one more' }));
    await userEvent.click(c.getByRole('button', { name: 'Seat' }));
    // The new tab: Table 4, three seats, nothing ordered yet.
    await expect(await c.findByText('Nothing ordered yet')).toBeTruthy();
    await expect(c.getByText(/3 guests/)).toBeTruthy();
    await userEvent.click(c.getByRole('button', { name: 'Back' }));
    await waitFor(async () => expect((await tile(c, 'Table 4')).dataset.status).toBe('seated'));
  },
};

/**
 * **Seat a reservation.** Delgado arrives for 12:30: one tap on her held table seats her — the tab
 * opens on Table 3 sized to her party of four, linked to the reservation.
 */
export const SeatAReservation: Story = {
  render: () => <MobileStory initialState={asServer()} tab="tables" />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await tile(c, 'Table 3'));
    await userEvent.click(await c.findByRole('button', { name: 'Seat Delgado' }));
    await expect(await c.findByText('Table 3 · Delgado')).toBeTruthy();
    await expect(c.getByText(/4 guests/)).toBeTruthy();
  },
};

/** **Seating a walk-in on a held table** says, before it is done, whose table it is taking. */
export const AWalkInOnAHeldTable: Story = {
  render: () => <MobileStory initialState={asServer()} tab="tables" stack={[{ name: 'openTab', tableId: 'd-3' }]} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(await c.findByText(/Held for Delgado, Ana/)).toBeTruthy();
    await expect(c.getByRole('button', { name: 'Seat anyway' })).toBeTruthy();
  },
};
