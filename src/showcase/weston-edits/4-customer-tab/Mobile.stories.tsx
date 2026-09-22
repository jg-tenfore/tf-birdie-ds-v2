import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { MobileStory, mobileMeta } from '../../pos-mobile/mobile-helpers';
import { adjustedParty, at18, growableParty, nameOnlyGuest, withBookings } from '../mobile-scenarios';

/**
 * Weston Edits / 4 · Customer Tab / Mobile
 *
 * Weston wanted to "open their customer profile" from the reservation. On the phone it's a
 * **Customer** tab on the reservation screen: a row of player chips across the top (a phone
 * shows one profile at a time), then that player's profile — tier, ID.me, handicap, other
 * upcoming rounds, contact, notes. **Open full profile** pushes People's Golfer Detail over
 * the reservation, and Back comes straight back. The player, like the tab, lives in the
 * route, so switching replaces and Back always leaves the booking.
 */
const meta = {
  title: 'Weston Edits/4 · Customer Tab/Mobile',
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const party = () => {
  const b = adjustedParty();
  return { b, state: at18(withBookings(b)) };
};

/** A linked customer — picked from People, ID.me verified — selected on the Customer tab. */
export const LinkedCustomer: Story = {
  render: () => {
    const { b, state } = party();
    return <MobileStory edition="weston" initialState={state} tab="tee" stack={[{ name: 'bookingDetail', bookingId: b.id, tab: 'customer', player: 1 }]} />;
  },
};

/**
 * The booker, the tab's default player. Resolved the way the tablet resolves them — linked
 * record, then the booking's phone (never the name) — so both show the same person.
 */
export const Booker: Story = {
  render: () => {
    const { b, state } = party();
    return <MobileStory edition="weston" initialState={state} tab="tee" stack={[{ name: 'bookingDetail', bookingId: b.id, tab: 'customer' }]} />;
  },
};

/**
 * An unnamed guest. No record to show, so the tab says so and offers **Link a customer**,
 * which opens the People picker for that seat.
 */
export const UnlinkedGuest: Story = {
  render: () => {
    const b = growableParty();
    return <MobileStory edition="weston" initialState={at18()} tab="tee" stack={[{ name: 'bookingDetail', bookingId: b.id, tab: 'customer', player: 1 }]} />;
  },
};

/** **Open full profile**: People's Golfer Detail, pushed over the reservation. Back returns to the tab. */
export const FullProfile: Story = {
  render: () => {
    const { b, state } = party();
    const id = b.guests?.[1]?.crmId ?? 'G001';
    return (
      <MobileStory
        edition="weston"
        initialState={state}
        tab="tee"
        stack={[
          { name: 'bookingDetail', bookingId: b.id, tab: 'customer', player: 1 },
          { name: 'golferDetail', golferId: id },
        ]}
      />
    );
  },
};

/**
 * A seat *named* "Kim, D." but not linked. No guessing: the tab suggests Kim, David with
 * **Link**, and the seat pays the booking's rate until someone links it.
 */
export const SuggestedProfile: Story = {
  render: () => {
    const b = nameOnlyGuest();
    return <MobileStory edition="weston" initialState={at18(withBookings(b))} tab="tee" stack={[{ name: 'bookingDetail', bookingId: b.id, tab: 'customer', player: 1 }]} />;
  },
  play: async ({ canvasElement }) => {
    const suggestion = within(await within(canvasElement).findByTestId('customer-suggestion'));
    await expect(suggestion.getByText('David Kim')).toBeTruthy();
    await expect(suggestion.getByRole('button', { name: 'Link' })).toBeTruthy();
  },
};
