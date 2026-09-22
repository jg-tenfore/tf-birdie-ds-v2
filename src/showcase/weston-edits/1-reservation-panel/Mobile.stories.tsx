import type { Meta, StoryObj } from '@storybook/react-vite';
import { MobileStory, mobileMeta } from '../../pos-mobile/mobile-helpers';
import { adjustedParty, at18, growableParty, withBookings } from '../mobile-scenarios';

/**
 * Weston Edits / 1 · Reservation Panel / Mobile
 *
 * The phone's equivalent of the tablet's slide-over. The phone was already golf-first —
 * tapping a booking pushes its detail rather than loading an order — so the change here is
 * what that screen *is*: the **reservation**, where the golf is worked before anything goes
 * to the register. It's a push over the tee sheet (Back returns to the same place on the
 * sheet), which is the phone's way of "not losing the context of the tee sheet".
 */
const meta = {
  title: 'Weston Edits/1 · Reservation Panel/Mobile',
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/**
 * The reservation for an unpaid party at the 18-hole club. Header facts on top (time,
 * course, pay state, party), then Players · Customer · Financial · Notes · Activity. Each
 * player row carries holes, tee fee and transport; the pinned action is **Check in & pay**
 * with the amount the register will charge. Weston: "it takes you to the details of the
 * golf first".
 */
export const Reservation: Story = {
  render: () => (
    <MobileStory
      edition="weston"
      initialState={at18()}
      tab="tee"
      stack={[{ name: 'bookingDetail', bookingId: growableParty().id }]}
    />
  ),
};

/**
 * The app, live, on the 18-hole tee sheet. Tap any booking: it opens the reservation, not
 * an order. Nothing reaches the register until **Check in & pay**.
 */
export const FromTheTeeSheet: Story = {
  render: () => <MobileStory edition="weston" initialState={at18()} tab="tee" />,
};

/**
 * A reservation after some massaging: two players picked from People (both ID.me
 * verified), one switched between 9 and 18 holes at the derived fee, the booker on a riding cart.
 * The header's party line now reads **9/18H · Mixed transport**, and adjusted rows are
 * outlined in primary — "you're still massaging the reservation before you submit it".
 */
export const AdjustedReservation: Story = {
  render: () => {
    const b = adjustedParty();
    return <MobileStory edition="weston" initialState={at18(withBookings(b))} tab="tee" stack={[{ name: 'bookingDetail', bookingId: b.id }]} />;
  },
};

/**
 * For comparison: the same booking in the base edition — four tabs, a group-level
 * transport control, and no per-player holes or fees. This is what Weston reviewed.
 */
export const BeforeWestonEdits: Story = {
  render: () => (
    <MobileStory edition="base" initialState={at18()} tab="tee" stack={[{ name: 'bookingDetail', bookingId: growableParty().id }]} />
  ),
};
