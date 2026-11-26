import type { Meta, StoryObj } from '@storybook/react-vite';
import { withEdition } from '../../edition-decorator';
import { mobileMeta } from '../../pos-mobile/mobile-helpers';
import * as Archived from '../../pos-mobile/1-register/Register.stories';

/**
 * Prototypes / Mobile / Pro Shop / Register & order
 *
 * The stories of **Archive › Original port › Mobile › Register & Order**, rendered in the current
 * edition: Weston Edits (`CURRENT_EDITION.mobile`). Each one is that story, unchanged (same
 * state, same `play`); only the edition differs, so the two pages are a before and after of the
 * same screen. The notes under each story were written for the original port, so where this
 * edition behaves differently, the screen wins.
 */
const meta = {
  title: 'Prototypes/Mobile/Pro Shop/Register & order',
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
export const EmptyRegister: Story = { ...Archived.EmptyRegister };
export const SearchItems: Story = { ...Archived.SearchItems };
export const OrderInProgress: Story = { ...Archived.OrderInProgress };
export const CategoryItems: Story = { ...Archived.CategoryItems };
export const CheckInRates: Story = { ...Archived.CheckInRates };
export const MemberRateSheet: Story = { ...Archived.MemberRateSheet };
export const RateTilesLocked: Story = { ...Archived.RateTilesLocked };
export const ModifiersNeedARound: Story = { ...Archived.ModifiersNeedARound };
export const ModifierToPlayersSheet: Story = { ...Archived.ModifierToPlayersSheet };
export const OrderWalkIn: Story = { ...Archived.OrderWalkIn };
export const OrderLoadedTeeTime: Story = { ...Archived.OrderLoadedTeeTime };
export const OrderMemberCheckIn: Story = { ...Archived.OrderMemberCheckIn };
export const OrderRetail: Story = { ...Archived.OrderRetail };
export const OrderEmpty: Story = { ...Archived.OrderEmpty };
export const OrderNeedsTeeTime: Story = { ...Archived.OrderNeedsTeeTime };
export const OrderReservation: Story = { ...Archived.OrderReservation };
export const OrderOverflowMenu: Story = { ...Archived.OrderOverflowMenu };
export const PlayerModifiers: Story = { ...Archived.PlayerModifiers };
export const PlayerUnnamedSeat: Story = { ...Archived.PlayerUnnamedSeat };
