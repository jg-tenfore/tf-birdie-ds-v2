import type { Meta, StoryObj } from '@storybook/react-vite';
import { withEdition } from '../../edition-decorator';
import { mobileMeta } from '../../pos-mobile/mobile-helpers';
import * as Archived from '../../pos-mobile/2-tee-sheet/TeeSheet.stories';

/**
 * Prototypes / Mobile / Tee Sheet / Sheet views
 *
 * The stories of **Archive › Original port › Mobile › Tee Sheet**, rendered in the current
 * edition: V1 → V2, Weston’s edits plus the restaurant (`CURRENT_EDITION.mobile`). Each one is that story, unchanged (same
 * state, same `play`); only the edition differs, so the two pages are a before and after of the
 * same screen. The notes under each story were written for the original port, so where this
 * edition behaves differently, the screen wins.
 */
const meta = {
  title: 'Prototypes/Mobile/Tee Sheet/Sheet views',
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
export const Default: Story = { ...Archived.Default };
export const OneCourse: Story = { ...Archived.OneCourse };
export const Filtered: Story = { ...Archived.Filtered };
export const AnnotatedRows: Story = { ...Archived.AnnotatedRows };
export const TimeActionsSheet: Story = { ...Archived.TimeActionsSheet };
export const BookingActionsSheet: Story = { ...Archived.BookingActionsSheet };
export const Filters: Story = { ...Archived.Filters };
export const SearchEmpty: Story = { ...Archived.SearchEmpty };
export const SearchResults: Story = { ...Archived.SearchResults };
export const DaySummary: Story = { ...Archived.DaySummary };
