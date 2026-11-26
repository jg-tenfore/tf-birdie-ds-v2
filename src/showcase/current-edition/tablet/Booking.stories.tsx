import type { Meta, StoryObj } from '@storybook/react-vite';
import { withEdition } from '../../edition-decorator';
import { screenParams } from '../../pos/screen-helpers';
import * as Archived from '../../pos/3-booking/Booking.stories';

/**
 * Prototypes / Tablet / Tee Sheet / Booking & check-in
 *
 * The stories of **Archive › Original port › Tablet › Booking & Check-in**, rendered in the
 * current edition: V1 → V2 (`CURRENT_EDITION.tablet`). Each one is that story, unchanged (same
 * state, same `play`); only the edition differs, so the two pages are a before and after of the
 * same screen. The notes under each story were written for the original port, so where this
 * edition behaves differently, the screen wins.
 *
 * Left out, because the current design replaced the screen:
 *
 * - **BookingDetail**: the Booking Detail dialog: in the current tablet a booking opens the
 *   reservation panel (see Reservation panel, and Financial, notes & activity).
 * - **PlayersAndStatus**: the Booking Detail dialog: in the current tablet a booking opens the
 *   reservation panel (see Reservation panel, and Financial, notes & activity).
 * - **PlayersRoundProgress**: the Booking Detail dialog: in the current tablet a booking opens
 *   the reservation panel (see Reservation panel, and Financial, notes & activity).
 * - **Financial**: the Booking Detail dialog: in the current tablet a booking opens the
 *   reservation panel (see Reservation panel, and Financial, notes & activity).
 * - **GroupNotes**: the Booking Detail dialog: in the current tablet a booking opens the
 *   reservation panel (see Reservation panel, and Financial, notes & activity).
 * - **Activity**: the Booking Detail dialog: in the current tablet a booking opens the
 *   reservation panel (see Reservation panel, and Financial, notes & activity).
 */
const meta = {
  title: 'Prototypes/Tablet/Tee Sheet/Booking & check-in',
  decorators: [withEdition('current-tablet')],
  parameters: { ...screenParams },
} satisfies Meta;

export default meta;
type Story = StoryObj;

// Copies, not the archived objects themselves: Storybook annotates each export it indexes, and
// sharing the object would let this file's annotations overwrite the archive's.
export const NewTeeTimeType: Story = { ...Archived.NewTeeTimeType };
export const ChipContextMenu: Story = { ...Archived.ChipContextMenu };
export const CheckInPanel: Story = { ...Archived.CheckInPanel };
export const BookOnePlayer: Story = { ...Archived.BookOnePlayer };
export const BookThreePlayers: Story = { ...Archived.BookThreePlayers };
export const BookFourPlayers: Story = { ...Archived.BookFourPlayers };
