import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { withEdition } from '../../../edition-decorator';
import { MobileStory, mobileMeta } from '../../../pos-mobile/mobile-helpers';
import { asHost } from '../restaurant-scenarios';

/**
 * Prototypes / Mobile / Reservations / Today on the handheld (V1 → V2, Nov 26)
 *
 * The host's book for today: `ReservationsScreen` (`src/pos/mobile/screens/restaurant/`), a host's
 * second destination and everyone else's push from More.
 *
 * The tablet's Reservations is any day, with booking and editing. The handheld keeps **today**,
 * which is what a host on the floor is working: covers, seated, to come and *no table* at a glance
 * (`daySummary`), then lunch and dinner (`byService`). A booked party's sheet **seats** it — at its
 * own table when that is free for the meal, else on a table chosen from those that fit
 * (`tablesForReservation`) — and, once its time has come, marks a **no-show** (`canMarkNoShow`: a
 * party can't fail to arrive for a time that hasn't come). Seating opens the tab and goes to it.
 *
 * Booking and editing reservations stay on the tablet in this pass.
 */
const meta = {
  title: 'Prototypes/Mobile/Reservations/Today on the handheld',
  id: 'prototypes-mobile-reservations-today-on-the-handheld',
  decorators: [withEdition('current-mobile')],
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const q = (root: ParentNode, sel: string) => root.querySelector<HTMLElement>(sel);

/** **Today's book**: lunch half seated, a no-show, and the evening's dinners, some still without a table. */
export const TodaysBook: Story = {
  render: () => <MobileStory initialState={asHost()} tab="reservations" />,
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelectorAll('[data-reservation]').length).toBe(13));
    await expect(q(canvasElement, '[data-day-summary]')).not.toBeNull();
  },
};

/**
 * **Seat a party with no table.** Walsh, a two at 1:00 with no table yet: the sheet offers to choose
 * one, the list is the tables free for her whole meal, and Seat opens her tab.
 */
export const SeatAPartyWithNoTable: Story = {
  render: () => <MobileStory initialState={asHost()} tab="reservations" />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await waitFor(() => q(canvasElement, '[data-reservation="R-505"]')!));
    await userEvent.click(await c.findByRole('button', { name: 'Choose a table and seat' }));
    await userEvent.click((await c.findAllByRole('radio'))[0]);
    await userEvent.click(c.getByRole('button', { name: 'Seat' }));
    await expect(await c.findByText(/· Walsh$/)).toBeTruthy();
  },
};

/** **A party already seated** opens its tab from the book. */
export const ASeatedParty: Story = {
  render: () => <MobileStory initialState={asHost()} tab="reservations" />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await waitFor(() => q(canvasElement, '[data-reservation="R-501"]')!));
    await userEvent.click(await c.findByRole('button', { name: 'Open their tab' }));
    await expect(await c.findByText('Table 1 · Kim')).toBeTruthy();
  },
};
