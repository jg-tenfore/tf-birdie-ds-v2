import type { Meta, StoryObj } from '@storybook/react-vite';
import { withEdition } from '../../edition-decorator';
import { screenParams } from '../../pos/screen-helpers';
import * as Archived from '../../pos/2-tee-sheet/TeeSheet.stories';

/**
 * Prototypes / Tablet / Tee Sheet / Sheet views
 *
 * The stories of **Archive › Original port › Tablet › Tee Sheet**, rendered in the current
 * edition: V1 → V2 (`CURRENT_EDITION.tablet`). Each one is that story, unchanged (same state,
 * same `play`); only the edition differs, so the two pages are a before and after of the same
 * screen. The notes under each story were written for the original port, so where this edition
 * behaves differently, the screen wins.
 */
const meta = {
  title: 'Prototypes/Tablet/Tee Sheet/Sheet views',
  decorators: [withEdition('current-tablet')],
  parameters: { ...screenParams },
} satisfies Meta;

export default meta;
type Story = StoryObj;

// Copies, not the archived objects themselves: Storybook annotates each export it indexes, and
// sharing the object would let this file's annotations overwrite the archive's.
export const CalendarGrid: Story = { ...Archived.CalendarGrid };
export const CompactRows: Story = { ...Archived.CompactRows };
export const PeakBandOnly: Story = { ...Archived.PeakBandOnly };
export const BlocksAndEvents: Story = { ...Archived.BlocksAndEvents };
export const WithOrderPanel: Story = { ...Archived.WithOrderPanel };
export const ListView: Story = { ...Archived.ListView };
export const UnpaidWorklist: Story = { ...Archived.UnpaidWorklist };
export const GroupedByStatus: Story = { ...Archived.GroupedByStatus };
export const DaySummary: Story = { ...Archived.DaySummary };
export const CourseSummary: Story = { ...Archived.CourseSummary };
export const MultiSelect: Story = { ...Archived.MultiSelect };
export const FocusedCourse: Story = { ...Archived.FocusedCourse };
export const LockedCourse: Story = { ...Archived.LockedCourse };
