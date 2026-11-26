import type { Meta, StoryObj } from '@storybook/react-vite';
import { withEdition } from '../../edition-decorator';
import { screenParams } from '../../pos/screen-helpers';
import * as Archived from '../../pos/7-people/People.stories';

/**
 * Prototypes / Tablet / Customer Search / People
 *
 * The stories of **Archive › Original port › Tablet › People**, rendered in the current edition:
 * V1 → V2 (`CURRENT_EDITION.tablet`). Each one is that story, unchanged (same state, same
 * `play`); only the edition differs, so the two pages are a before and after of the same screen.
 * The notes under each story were written for the original port, so where this edition behaves
 * differently, the screen wins.
 *
 * Left out, because the current design replaced the screen:
 *
 * - **GuestDetail**: Guest Details on a golf line: removed in round 1; an empty seat opens the
 *   customer record in assign mode instead (Customer profile).
 * - **WalkIn**: the register-first walk-in fast path: in the current tablet a walk-in books the
 *   next open tee time and opens its reservation (Check in & pay).
 */
const meta = {
  title: 'Prototypes/Tablet/Customer Search/People',
  decorators: [withEdition('current-tablet')],
  parameters: { ...screenParams },
} satisfies Meta;

export default meta;
type Story = StoryObj;

// Copies, not the archived objects themselves: Storybook annotates each export it indexes, and
// sharing the object would let this file's annotations overwrite the archive's.
export const MemberLookup: Story = { ...Archived.MemberLookup };
export const MemberLookupStudent: Story = { ...Archived.MemberLookupStudent };
export const GolferSearch: Story = { ...Archived.GolferSearch };
export const NewCustomer: Story = { ...Archived.NewCustomer };
export const GolferSearchSessionCustomer: Story = { ...Archived.GolferSearchSessionCustomer };
export const RefundPanel: Story = { ...Archived.RefundPanel };
export const RainCheckPanel: Story = { ...Archived.RainCheckPanel };
