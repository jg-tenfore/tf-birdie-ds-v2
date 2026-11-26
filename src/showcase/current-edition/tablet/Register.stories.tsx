import type { Meta, StoryObj } from '@storybook/react-vite';
import { withEdition } from '../../edition-decorator';
import { screenParams } from '../../pos/screen-helpers';
import * as Archived from '../../pos/1-register/Register.stories';

/**
 * Prototypes / Tablet / Pro Shop / Register & order
 *
 * The stories of **Archive › Original port › Tablet › Register & Order**, rendered in the current
 * edition: V1 → V2 (`CURRENT_EDITION.tablet`). Each one is that story, unchanged (same state,
 * same `play`); only the edition differs, so the two pages are a before and after of the same
 * screen. The notes under each story were written for the original port, so where this edition
 * behaves differently, the screen wins.
 *
 * Left out, because the current design replaced the screen:
 *
 * - **WalkInOrder**: the register-first walk-in being built line by line: in the current tablet a
 *   walk-in books the next open tee time and opens its reservation, and golf reaches the order as
 *   a read-only summary (Register golf summary).
 * - **PerPlayerModifiers**: the per-player modifier picker on a golf line: Weston Edits removed +
 *   modifier from golf lines (Register golf summary).
 */
const meta = {
  title: 'Prototypes/Tablet/Pro Shop/Register & order',
  decorators: [withEdition('current-tablet')],
  parameters: { ...screenParams },
} satisfies Meta;

export default meta;
type Story = StoryObj;

// Copies, not the archived objects themselves: Storybook annotates each export it indexes, and
// sharing the object would let this file's annotations overwrite the archive's.
export const EmptyRegister: Story = { ...Archived.EmptyRegister };
export const CategoryAndItems: Story = { ...Archived.CategoryAndItems };
export const RateTilesLocked: Story = { ...Archived.RateTilesLocked };
export const LoadedTeeTime: Story = { ...Archived.LoadedTeeTime };
export const LoadedPaidTeeTime: Story = { ...Archived.LoadedPaidTeeTime };
export const MemberCheckIn: Story = { ...Archived.MemberCheckIn };
export const OpenItem: Story = { ...Archived.OpenItem };
