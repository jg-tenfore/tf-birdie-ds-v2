import type { Meta, StoryObj } from '@storybook/react-vite';
import { withEdition } from '../../edition-decorator';
import { mobileMeta } from '../../pos-mobile/mobile-helpers';
import * as Archived from '../../pos-mobile/4-tee-selection/TeeSelection.stories';

/**
 * Prototypes / Mobile / Pro Shop / Tee time selection
 *
 * The stories of **Archive › Original port › Mobile › Tee Time Selection**, rendered in the
 * current edition: Weston Edits (`CURRENT_EDITION.mobile`). Each one is that story, unchanged
 * (same state, same `play`); only the edition differs, so the two pages are a before and after of
 * the same screen. The notes under each story were written for the original port, so where this
 * edition behaves differently, the screen wins.
 */
const meta = {
  title: 'Prototypes/Mobile/Pro Shop/Tee time selection',
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
export const TeePicker: Story = { ...Archived.TeePicker };
export const EighteenHolesFront: Story = { ...Archived.EighteenHolesFront };
export const EighteenHolesBack: Story = { ...Archived.EighteenHolesBack };
export const ReserveConfirmation: Story = { ...Archived.ReserveConfirmation };
export const ReserveAndCharge: Story = { ...Archived.ReserveAndCharge };
