import type { Meta, StoryObj } from '@storybook/react-vite';
import { MobileStory, mobileMeta } from '../../pos-mobile/mobile-helpers';
import { adjustedParty, at18, loadedOrder, withBookings } from '../mobile-scenarios';

/**
 * Weston Edits / 3 · ID.me Badge / Mobile
 *
 * Weston asked to see ID.me status on the reservation. For now it is a **badge only** — a
 * shield and the verified group (Military, Veteran, First responder, Nurse, Teacher), in a
 * neutral blue so it reads as identity rather than payment or membership. It's drawn at the
 * phone's 22dp badge height so it lines up with the pay and member badges, and appears
 * wherever the player does: the reservation row, Player Detail, the Customer tab and the
 * order's golf summary. The verify flow waits on how Birdie presents it today.
 */
const meta = {
  title: 'Weston Edits/3 · ID.me Badge/Mobile',
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

/** On the player rows: compact (the shield stands for "ID.me"), beside the round status. */
export const OnPlayerRows: Story = {
  render: () => {
    const { b, state } = party();
    return <MobileStory edition="weston" initialState={state} tab="tee" stack={[{ name: 'bookingDetail', bookingId: b.id }]} />;
  },
};

/** On Player Detail: the full "ID.me · Veteran" badge under the player's name. */
export const OnPlayerDetail: Story = {
  render: () => {
    const { b, state } = party();
    return (
      <MobileStory
        edition="weston"
        initialState={state}
        tab="tee"
        stack={[
          { name: 'bookingDetail', bookingId: b.id },
          { name: 'playerDetail', bookingId: b.id, playerIndex: 1 },
        ]}
      />
    );
  },
};

/** On the Customer tab, beside the membership tier. */
export const OnCustomerTab: Story = {
  render: () => {
    const { b, state } = party();
    return <MobileStory edition="weston" initialState={state} tab="tee" stack={[{ name: 'bookingDetail', bookingId: b.id, tab: 'customer', player: 1 }]} />;
  },
};

/** On the order's golf summary, so the counter sees who is verified when taking payment. */
export const OnOrderSummary: Story = {
  render: () => <MobileStory edition="weston" initialState={loadedOrder(adjustedParty())} tab="register" stack={[{ name: 'order' }]} />,
};
