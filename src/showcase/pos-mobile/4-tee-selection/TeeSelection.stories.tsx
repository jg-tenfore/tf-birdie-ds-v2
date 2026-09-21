import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';
import type { PosState } from '../../../pos/state/pos-store';
import { DEMO_BOOKINGS, MobileStory, mobileMeta, withWalkInOrder } from '../mobile-helpers';

/**
 * Mobile Screens / 4 · Tee Time Selection
 *
 * Choosing a slot for the round on the order, and confirming a reservation. Both are
 * pushed from the order and pop back to it: the tee time is a property of the order, so
 * the order is always where you return to see the result.
 *
 * Same rule as the terminal — only times with room for the *whole* party together are
 * offered.
 */
const meta = {
  title: 'Mobile Screens/4 · Tee Time Selection',
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** A nine-hole walk-in for two with no tee time yet. */
const nineHoleNoTime = (extra: Partial<PosState> = {}): Partial<PosState> => ({
  bookings: DEMO_BOOKINGS,
  flowMode: 'walkin',
  cart: [
    {
      name: 'Guest Rate 9 Holes',
      unitPrice: 35,
      price: 70,
      qty: 2,
      isCheckIn: true,
      players: [
        { name: 'Chen, Emily', transport: 'walking', modifierTags: [] },
        { name: 'Guest 2', transport: 'walking', modifierTags: [] },
      ],
    },
  ],
  ...extra,
});

const toPicker = [{ name: 'order' as const }, { name: 'teePicker' as const }];

/**
 * The picker, pushed from the order's "Choose tee time". Date and course are chip rows
 * pinned under the top bar, so the body is nothing but times, grouped into the tee
 * sheet's early / peak / twilight bands. Tapping a time attaches it and pops straight
 * back to the order — the pick *is* the confirmation.
 */
export const TeePicker: Story = {
  render: () => <MobileStory initialState={nineHoleNoTime()} tab="register" stack={toPicker} />,
};

/**
 * Eighteen holes, step 1: the front nine. The rate on the order decides this — no
 * separate 18-hole entry point. The subtitle says "step 1 of 2" so the operator knows
 * a second pick follows.
 */
export const EighteenHolesFront: Story = {
  render: () => <MobileStory initialState={withWalkInOrder()} tab="register" stack={toPicker} />,
};

/**
 * Eighteen holes, step 2: the back-nine crossover, on a *different* course at least an
 * hour later. It's the same screen in a second state, not a second push — so back here
 * returns to the front-nine step, not the order.
 */
export const EighteenHolesBack: Story = {
  render: () => <MobileStory initialState={withWalkInOrder()} tab="register" stack={toPicker} />,
  play: async ({ canvasElement }) => {
    const [first] = await within(canvasElement).findAllByText(/\d open$/);
    await userEvent.click(first);
  },
};

/**
 * Reserve, pay at the counter. Pushed from the order's "Pay later"; back returns to the
 * order with nothing written. Confirming writes the booking to the tee sheet as an open
 * balance, clears the order and pops to the register root.
 */
export const ReserveConfirmation: Story = {
  render: () => (
    <MobileStory
      initialState={withWalkInOrder({ flowMode: 'reserve' })}
      tab="register"
      stack={[{ name: 'order' }, { name: 'reserveConfirm', payMode: 'later' }]}
    />
  ),
};

/**
 * Reserve and charge now. Confirming continues into checkout rather than writing the
 * booking here — it's written as paid only when the payment is approved, so a declined
 * card never leaves a paid-looking reservation on the sheet.
 */
export const ReserveAndCharge: Story = {
  render: () => (
    <MobileStory
      initialState={withWalkInOrder({ flowMode: 'reserve' })}
      tab="register"
      stack={[{ name: 'order' }, { name: 'reserveConfirm', payMode: 'now' }]}
    />
  ),
};
