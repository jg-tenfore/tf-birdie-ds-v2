import type { Meta, StoryObj } from '@storybook/react-vite';
import { withEdition } from '../../edition-decorator';
import { mobileMeta } from '../../pos-mobile/mobile-helpers';
import * as Archived from '../../pos-mobile/6-operations/Operations.stories';

/**
 * Prototypes / Mobile / Tee Sheet / Operations
 *
 * The stories of **Archive › Original port › Mobile › Operations**, rendered in the current
 * edition: V1 → V2, Weston’s edits plus the restaurant (`CURRENT_EDITION.mobile`). Each one is that story, unchanged (same
 * state, same `play`); only the edition differs, so the two pages are a before and after of the
 * same screen. The notes under each story were written for the original port, so where this
 * edition behaves differently, the screen wins.
 */
const meta = {
  title: 'Prototypes/Mobile/Tee Sheet/Operations',
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
export const MoreRoot: Story = { ...Archived.MoreRoot };
export const BlockTime: Story = { ...Archived.BlockTime };
export const BlockTimeOneCourse: Story = { ...Archived.BlockTimeOneCourse };
export const BlockTimeFromMore: Story = { ...Archived.BlockTimeFromMore };
export const TimeNote: Story = { ...Archived.TimeNote };
export const TimeNoteEditing: Story = { ...Archived.TimeNoteEditing };
export const PriceOverride: Story = { ...Archived.PriceOverride };
export const League: Story = { ...Archived.League };
export const RateCard: Story = { ...Archived.RateCard };
export const CourseSettings: Story = { ...Archived.CourseSettings };
export const CourseSettingsCourse: Story = { ...Archived.CourseSettingsCourse };
