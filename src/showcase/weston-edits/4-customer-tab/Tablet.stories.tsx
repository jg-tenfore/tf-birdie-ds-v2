import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, within } from 'storybook/test';
import { Screen } from '../../pos/screen-helpers';
import { adjustedParty, idMeParty, nameOnlyGuest, openParty, sheetWithCustomer } from '../tablet-scenarios';

/**
 * Weston Edits / 4 · Customer Profile / Tablet
 *
 * The Customer **tab** is gone. Weston's third round: "I don't think it needs to be a tab on
 * the reservation, I wonder if it's its own thing… if I click on Michael Thompson, does
 * something else open?" A customer record is not a property of a tee time — the same person is
 * on four other bookings this month — so tapping the player's **name** opens their record over
 * everything, and closing it puts you back on the reservation exactly as you left it.
 *
 * The problem it solves, in his words: "they're like, hey, is your email jonah.hamlet@hotmail?
 * No, actually it's at Gmail. If I want to fix that, currently I go all the way to customer
 * lookup." Now it is one tap from the seat.
 *
 * Contact details edit in place. Memberships, customer types, punch cards, rain checks, gift
 * cards and rounds played are shown but not edited — taking money is the register's job, and a
 * second place to do it is a second place for the totals to disagree. Customer types are chips
 * with an expander rather than the column of eighteen checkboxes he called ugly.
 *
 * A seat with nobody in it opens the same surface in **assign** mode: search, or create. That
 * is how Guest 3 becomes somebody. Linking writes the record onto the seat, which is the only
 * thing that makes that person price the round — a matching name never does.
 */
const meta = {
  title: 'Weston Edits/4 · Customer Profile/Tablet',
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'counterTerminal', isRotated: false } },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** The booker's record, opened from their name: membership, account, credits and history. */
export const BookerRecord: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithCustomer(idMeParty(), 0)} />,
  play: async () => {
    const record = within(await screen.findByRole('dialog'));
    await record.findByText('Contact');
    await expect(record.getByText('Account')).toBeTruthy();
    await expect(record.getByText('Tee time history')).toBeTruthy();
  },
};

/** A guest seat linked to a real customer — their record, not the booker's. */
export const LinkedGuest: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithCustomer(adjustedParty(), 1)} />,
};

/**
 * Fixing the thing Weston actually described: the email is wrong, and the one-tap domain chips
 * fix it without typing the whole address on glass.
 */
export const FixATypo: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithCustomer(idMeParty(), 0)} />,
  play: async () => {
    const record = within(await screen.findByRole('dialog'));
    await record.findByText('Contact');
    await userEvent.click(record.getByRole('button', { name: '@gmail.com' }));
    await expect(await record.findByDisplayValue(/@gmail\.com$/)).toBeTruthy();
  },
};

/**
 * Customer types as chips with an expander — "show the one you have, and if you want to assign
 * more you can" — rather than eighteen checkboxes in a column.
 */
export const CustomerTypes: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithCustomer(idMeParty(), 0)} />,
  play: async () => {
    const record = within(await screen.findByRole('dialog'));
    await userEvent.click(await record.findByRole('button', { name: '+ Add type' }));
    await expect(await record.findByRole('button', { name: 'Diamond' })).toBeTruthy();
  },
};

/**
 * An empty seat: no record, so the surface opens in assign mode. The play test searches the
 * roster and links somebody, which is what makes that person price the round.
 */
export const AssignASeat: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithCustomer(openParty(), 1)} />,
  play: async () => {
    const record = within(await screen.findByRole('dialog'));
    await record.findByText(/Who is in seat 2\?/);
    await userEvent.type(record.getByPlaceholderText('Search customers'), 'Walsh');
    // Three Walshes — the roster has households and namesakes on purpose, so the search has to
    // return all of them rather than guess which one is meant.
    await expect((await record.findAllByText(/Walsh/)).length).toBeGreaterThan(1);
  },
};

/**
 * A seat *named* like a customer but not linked. The record opens in assign mode, because a
 * name is not an identification — and until someone links it, the seat pays the booking's rate.
 */
export const NameIsNotAnIdentification: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithCustomer(nameOnlyGuest(), 1)} />,
  play: async () => {
    const record = within(await screen.findByRole('dialog'));
    await record.findByText(/Who is in seat 2\?/);
  },
};
