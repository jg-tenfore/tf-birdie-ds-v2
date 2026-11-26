import type { Meta, StoryObj } from '@storybook/react-vite';
import { withEdition } from '../../edition-decorator';
import { mobileMeta } from '../../pos-mobile/mobile-helpers';
import * as Archived from '../../pos-mobile/3-booking/Booking.stories';

/**
 * Prototypes / Mobile / Tee Sheet / Booking & check-in
 *
 * The stories of **Archive › Original port › Mobile › Booking & Check-in**, rendered in the
 * current edition: V1 → V2, Weston’s edits plus the restaurant (`CURRENT_EDITION.mobile`). Each one is that story, unchanged
 * (same state, same `play`); only the edition differs, so the two pages are a before and after of
 * the same screen. The notes under each story were written for the original port, so where this
 * edition behaves differently, the screen wins.
 */
const meta = {
  title: 'Prototypes/Mobile/Tee Sheet/Booking & check-in',
  decorators: [withEdition('current-mobile')],
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

// Copies, not the archived objects themselves: Storybook annotates each export it indexes, and
// sharing the object would let this file's annotations overwrite the archive's.
export const DetailPlayers: Story = { ...Archived.DetailPlayers };
export const DetailFinancial: Story = { ...Archived.DetailFinancial };
export const DetailNotes: Story = { ...Archived.DetailNotes };
export const DetailActivity: Story = { ...Archived.DetailActivity };
export const DetailMember: Story = { ...Archived.DetailMember };
export const DetailNoShow: Story = { ...Archived.DetailNoShow };
export const DetailRefunded: Story = { ...Archived.DetailRefunded };
export const DetailBlock: Story = { ...Archived.DetailBlock };
export const PlayerDetail: Story = { ...Archived.PlayerDetail };
export const PlayerDetailLinked: Story = { ...Archived.PlayerDetailLinked };
export const CheckIn: Story = { ...Archived.CheckIn };
export const Refund: Story = { ...Archived.Refund };
export const RainCheck: Story = { ...Archived.RainCheck };
export const NewTeeTime: Story = { ...Archived.NewTeeTime };
export const NewTeeTimeWithGolfer: Story = { ...Archived.NewTeeTimeWithGolfer };
export const NewTeeTimeDuringOrder: Story = { ...Archived.NewTeeTimeDuringOrder };
export const MoveTeeTime: Story = { ...Archived.MoveTeeTime };
export const MoveEveryone: Story = { ...Archived.MoveEveryone };
export const MoveEveryoneOneCourse: Story = { ...Archived.MoveEveryoneOneCourse };
