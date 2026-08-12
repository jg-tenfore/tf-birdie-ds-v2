import type { Meta, StoryObj } from '@storybook/react-vite';
import { Screen, screenParams, withWalkInOrder } from '../screen-helpers';

/**
 * POS Screens / 4 · Tee Time Selection
 *
 * Choosing a slot for an order. Only slots with room for the *whole* party are offered —
 * a threesome never sees a time with two seats left, because splitting a group across
 * tee times is a different and deliberate operation.
 */
const meta = {
  title: 'POS Screens/4 · Tee Time Selection',
  parameters: screenParams,
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** The picker, filtered to slots that fit the party, grouped by course. */
export const TeePicker: Story = {
  render: () => <Screen initialState={withWalkInOrder({ modal: { kind: 'teePicker' } })} />,
};

/**
 * Eighteen holes runs the picker twice: front nine, then a crossover on a *different*
 * course at least an hour later. That's how this club sequences a full round across its
 * three nines.
 */
export const EighteenHoles: Story = {
  render: () => (
    <Screen initialState={withWalkInOrder({ modal: { kind: 'teePicker', is18H: true } })} />
  ),
};

/**
 * Reserve confirmation — the per-player total read back before the booking is written,
 * with no payment taken. The sheet will show it as an open balance.
 */
export const ReserveConfirmation: Story = {
  render: () => (
    <Screen
      initialState={withWalkInOrder({
        flowMode: 'reserve',
        modal: { kind: 'reserveConfirm', payMode: 'later' },
      })}
    />
  ),
};

/** Reserve and charge now, for a prepaid booking. */
export const ReserveAndCharge: Story = {
  render: () => (
    <Screen
      initialState={withWalkInOrder({
        flowMode: 'reserve',
        modal: { kind: 'reserveConfirm', payMode: 'now' },
      })}
    />
  ),
};
