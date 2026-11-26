import type { Meta, StoryObj } from '@storybook/react-vite';
import { withEdition } from '../../edition-decorator';
import { mobileMeta } from '../../pos-mobile/mobile-helpers';
import * as Archived from '../../pos-mobile/7-people/People.stories';

/**
 * Prototypes / Mobile / Customer Search / People
 *
 * The stories of **Archive › Original port › Mobile › People**, rendered in the current edition:
 * V1 → V2, Weston’s edits plus the restaurant (`CURRENT_EDITION.mobile`). Each one is that story, unchanged (same state, same
 * `play`); only the edition differs, so the two pages are a before and after of the same screen.
 * The notes under each story were written for the original port, so where this edition behaves
 * differently, the screen wins.
 */
const meta = {
  title: 'Prototypes/Mobile/Customer Search/People',
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
export const PeopleList: Story = { ...Archived.PeopleList };
export const MembersOnly: Story = { ...Archived.MembersOnly };
export const GolferDetailMember: Story = { ...Archived.GolferDetailMember };
export const GolferDetailGuest: Story = { ...Archived.GolferDetailGuest };
export const GolferPicker: Story = { ...Archived.GolferPicker };
export const NewCustomer: Story = { ...Archived.NewCustomer };
export const NewCustomerFromPicker: Story = { ...Archived.NewCustomerFromPicker };
export const CustomerAddedThisSession: Story = { ...Archived.CustomerAddedThisSession };
export const CustomerAddedThisSessionDetail: Story = { ...Archived.CustomerAddedThisSessionDetail };
