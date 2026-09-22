import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Screen } from '../../pos/screen-helpers';
import { playerFee } from '../../../pos/logic/reservation';
import { adjustedParty, idMeParty, nameOnlyGuest, openParty, sheetWithPanel } from '../tablet-scenarios';

/**
 * Weston Edits / 4 · Customer Tab / Tablet
 *
 * "…then you can add carts from there, adjust their tee fees, open their customer profile."
 * The profile belongs to a *player*, so the tab follows the panel's selected seat (chips
 * across the top; clicking a name on the Players tab lands here too). It shows the record —
 * name, member tier, handicap, contact, notes, ID.me — and the customer's visits across the
 * booking window, drawn from the bookings themselves.
 *
 * A seat with no customer ("Guest 3") offers **Link a customer**: a roster search, the same
 * roster Find Golfer uses (`useGolferRoster`), that names the seat on pick. A linked player
 * can be **swapped** the same way.
 *
 * A seat is a customer only when one is **linked** (or, for the booker, by the booking's
 * phone) — never by name. A seat whose name looks like a record gets a **Suggested profile**
 * with a Link action; until it's linked, the seat pays the booking's rate.
 */
const meta = {
  title: 'Weston Edits/4 · Customer Tab/Tablet',
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'counterTerminal', isRotated: false } },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** The booker's record: a member, verified with ID.me, with their visits this window. */
export const BookerProfile: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(idMeParty(), 'customer')} />,
};

/** A guest seat linked to a real customer — their profile, not the booker's. */
export const LinkedGuest: Story = {
  render: () => (
    <Screen edition="weston" initialState={sheetWithPanel(adjustedParty(), 'customer', { panel: { playerIndex: 1 } })} />
  ),
};

/**
 * An unnamed seat: no record, so the tab is the roster search. The play test searches and
 * links a customer, and checks the seat took their name.
 */
export const LinkACustomer: Story = {
  render: () => (
    <Screen edition="weston" initialState={sheetWithPanel(openParty(), 'customer', { panel: { playerIndex: 1 } })} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText(/No customer linked to Guest 2/);
    await userEvent.type(canvas.getByPlaceholderText('Search name or phone…'), 'Walsh');
    await userEvent.click(await canvas.findByText('Walsh, Patricia'));
    await expect(await canvas.findByRole('button', { name: /Walsh, Patricia/ })).toBeTruthy();
    await expect(canvas.queryByText(/No customer linked/)).toBeNull();
  },
};

/**
 * A seat *named* "Kim, D." but not linked. The tab doesn't guess: it suggests Kim, David
 * (a member) with **Link**, and the seat stays on the booking's rate until linked — then
 * the member rate applies. The play test checks both sides of that.
 */
export const SuggestedProfile: Story = {
  render: () => (
    <Screen edition="weston" initialState={sheetWithPanel(nameOnlyGuest(), 'customer', { panel: { playerIndex: 1 } })} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const b = nameOnlyGuest();
    await expect(playerFee(b, 1)).toBe(b.price);
    const suggestion = within(await canvas.findByTestId('customer-suggestion'));
    await expect(suggestion.getByText('Kim, David')).toBeTruthy();
    await expect(canvas.getByText(/No customer linked to Kim, D\./)).toBeTruthy();
    await userEvent.click(suggestion.getByRole('button', { name: 'Link' }));
    await expect(await canvas.findByText('HCP 8')).toBeTruthy();
    await expect(canvas.queryByTestId('customer-suggestion')).toBeNull();
  },
};
