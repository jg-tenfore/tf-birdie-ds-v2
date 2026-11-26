import type { Meta, StoryObj } from '@storybook/react-vite';
import { withEdition } from '../../edition-decorator';
import { screenParams } from '../../pos/screen-helpers';
import * as Archived from '../../pos/2-tee-sheet/Venues.stories';

/**
 * Prototypes / Tablet / Tee Sheet / Club layouts
 *
 * The stories of **Archive › Original port › Tablet › Tee Sheet › Club Layouts**, rendered in the
 * current edition: V1 → V2 (`CURRENT_EDITION.tablet`). Each one is that story, unchanged (same
 * state, same `play`); only the edition differs, so the two pages are a before and after of the
 * same screen. The notes under each story were written for the original port, so where this
 * edition behaves differently, the screen wins.
 */
const meta = {
  title: 'Prototypes/Tablet/Tee Sheet/Club layouts',
  decorators: [withEdition('current-tablet')],
  parameters: { ...screenParams },
} satisfies Meta;

export default meta;
type Story = StoryObj;

// Copies, not the archived objects themselves: Storybook annotates each export it indexes, and
// sharing the object would let this file's annotations overwrite the archive's.
export const ThreeNines: Story = { ...Archived.ThreeNines };
export const EighteenHole: Story = { ...Archived.EighteenHole };
export const SingleNine: Story = { ...Archived.SingleNine };
export const EighteenHoleList: Story = { ...Archived.EighteenHoleList };
export const SingleNinePeak: Story = { ...Archived.SingleNinePeak };
export const EighteenHoleRegister: Story = { ...Archived.EighteenHoleRegister };
