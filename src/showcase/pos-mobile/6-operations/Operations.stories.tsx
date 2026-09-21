import type { Meta, StoryObj } from '@storybook/react-vite';
import { DEMO_TODAY } from '../../../pos/data/bookings';
import { timeRowKey } from '../../../pos/state/pos-store';
import { MobileStory, mobileMeta, onTeeSheet } from '../mobile-helpers';

/**
 * Mobile Screens / 6 · Operations
 *
 * Time-row operations and course configuration. The terminal opens these as centred
 * dialogs from the time gutter; on the phone every one that edits something is a
 * full-screen dialog (✕ + Save) rising over whatever opened it, and every read-and-adjust
 * page is a push with a back arrow.
 *
 * Row operations normally open from a time row on the tee sheet, so most stories here
 * sit on the Tee Sheet destination — close returns to the sheet. The More destination
 * lists them too, starting at the first tee time, for when there's no row to hand.
 */
const meta = {
  title: 'Mobile Screens/6 · Operations',
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const AT = 9 * 60 + 20; // 9:20 AM — mid-morning, so the row has real bookings on it
const sheet = onTeeSheet();

/**
 * The More destination: venue and operator up top, then day operations, configuration and
 * the session. Row operations have no chevron — they open dialogs, not pages. Order-level
 * tools (split, promo, refund) are absent on purpose: they belong to an open order.
 */
export const MoreRoot: Story = {
  render: () => <MobileStory initialState={sheet} tab="more" />,
};

/**
 * Block time, opened from the 9:20 row. The conflict notice names what Save will remove,
 * because a block spans the whole course and clears what was booked there.
 */
export const BlockTime: Story = {
  render: () => <MobileStory initialState={sheet} tab="tee" stack={[{ name: 'blockTime', timeMin: AT }]} />,
};

/** Block time from one course column: only that course starts selected. */
export const BlockTimeOneCourse: Story = {
  render: () => (
    <MobileStory initialState={sheet} tab="tee" stack={[{ name: 'blockTime', timeMin: AT, courseId: 'valley' }]} />
  ),
};

/** Block time from More: no row context, so it opens at the first tee time with the start editable. */
export const BlockTimeFromMore: Story = {
  render: () => <MobileStory initialState={sheet} tab="more" stack={[{ name: 'blockTime', timeMin: 360 }]} />,
};

/** A note on a row, with a colour chosen from the note palette and a live preview of the row. */
export const TimeNote: Story = {
  render: () => <MobileStory initialState={sheet} tab="tee" stack={[{ name: 'timeNote', timeMin: AT }]} />,
};

/** An existing note opens pre-filled; Delete sits at the foot of the form, away from Save. */
export const TimeNoteEditing: Story = {
  render: () => (
    <MobileStory
      initialState={onTeeSheet({
        timeNotes: { [timeRowKey(DEMO_TODAY(), AT)]: { text: 'Frost delay — first groups off at 9:40', color: 'blue' } },
      })}
      tab="tee"
      stack={[{ name: 'timeNote', timeMin: AT }]}
    />
  ),
};

/** Override a row's price. Blank fields keep the published rate; Save stays off until one is set. */
export const PriceOverride: Story = {
  render: () => <MobileStory initialState={sheet} tab="tee" stack={[{ name: 'priceOverride', timeMin: AT }]} />,
};

/**
 * League or outing — the longest form, as one scrolling full-screen dialog rather than a
 * wizard. The plan card restates what Create will write; Create stays off until the group
 * has a name and fits.
 */
export const League: Story = {
  render: () => <MobileStory initialState={sheet} tab="tee" stack={[{ name: 'league', timeMin: AT }]} />,
};

/** The published rate card: a read-only push from More. Bands are tabs; courses are chips. */
export const RateCard: Story = {
  render: () => <MobileStory initialState={sheet} tab="more" stack={[{ name: 'rateCard' }]} />,
};

/**
 * Tee sheet & courses overview, pushed from More. Switches apply immediately — the Android
 * settings convention — so there's no Save. A course row pushes the same route one level deeper.
 */
export const CourseSettings: Story = {
  render: () => <MobileStory initialState={sheet} tab="more" stack={[{ name: 'courseSettings' }]} />,
};

/** One course's settings, two levels below More. Back returns to the overview. */
export const CourseSettingsCourse: Story = {
  render: () => (
    <MobileStory
      initialState={sheet}
      tab="more"
      stack={[{ name: 'courseSettings' }, { name: 'courseSettings', courseId: 'ponds' }]}
    />
  ),
};
