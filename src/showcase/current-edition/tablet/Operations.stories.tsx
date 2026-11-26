import type { Meta, StoryObj } from '@storybook/react-vite';
import { withEdition } from '../../edition-decorator';
import { screenParams } from '../../pos/screen-helpers';
import * as Archived from '../../pos/6-operations/Operations.stories';

/**
 * Prototypes / Tablet / Tee Sheet / Operations
 *
 * The stories of **Archive › Original port › Tablet › Operations**, rendered in the current
 * edition: V1 → V2 (`CURRENT_EDITION.tablet`). Each one is that story, unchanged (same state,
 * same `play`); only the edition differs, so the two pages are a before and after of the same
 * screen. The notes under each story were written for the original port, so where this edition
 * behaves differently, the screen wins.
 */
const meta = {
  title: 'Prototypes/Tablet/Tee Sheet/Operations',
  decorators: [withEdition('current-tablet')],
  parameters: { ...screenParams },
} satisfies Meta;

export default meta;
type Story = StoryObj;

// Copies, not the archived objects themselves: Storybook annotates each export it indexes, and
// sharing the object would let this file's annotations overwrite the archive's.
export const TimeRowMenu: Story = { ...Archived.TimeRowMenu };
export const BlockTime: Story = { ...Archived.BlockTime };
export const TimeNote: Story = { ...Archived.TimeNote };
export const PriceOverride: Story = { ...Archived.PriceOverride };
export const LeagueNineHole: Story = { ...Archived.LeagueNineHole };
export const LeagueEighteenHole: Story = { ...Archived.LeagueEighteenHole };
export const MovePlayers: Story = { ...Archived.MovePlayers };
export const CourseTimeSettings: Story = { ...Archived.CourseTimeSettings };
export const RateCard: Story = { ...Archived.RateCard };
export const FindTeeTime: Story = { ...Archived.FindTeeTime };
export const DestructiveConfirm: Story = { ...Archived.DestructiveConfirm };
