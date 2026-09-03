import type { Meta, StoryObj } from '@storybook/react-vite';
import { venue } from '../../pos/data/venues';
import { Exhibit, T0, actionParams, afterShows, mk, row } from './action-helpers';

/**
 * Tee Sheet Actions / **6 · Course**
 *
 * The per-column menu in each course header. These change the *columns*, not the bookings —
 * a locked or hidden course keeps every tee time it had, which is the whole point: closing
 * a nine for maintenance must not lose the day already booked on it.
 *
 * That makes this the one group where the change list mostly reports course state rather
 * than tee times, and where the two panes differ in shape rather than in content.
 */
const meta = {
  title: 'Tee Sheet Actions/6 · Course',
  parameters: actionParams,
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** The club's columns with Valley already locked — the starting point for unlocking it. */
const lockedValley = () =>
  venue('three-nines').courses.map((c) => ({ ...c, locked: c.id === 'valley' }));

/** All three nines, each carrying a booking, so a column change is obvious. */
const threeNines = () => ({
  venueId: 'three-nines' as const,
  shift: 'early' as const,
  bookings: [
    mk({ id: 'c1', course: 'ponds', timeMin: T0, slot: 0, players: 4, name: 'Ponds Four', pay: 'paid' }),
    mk({ id: 'c2', course: 'valley', timeMin: T0, slot: 0, players: 2, name: 'Valley Pair', pay: 'open' }),
    mk({ id: 'c3', course: 'rolling', timeMin: row(1), slot: 0, players: 3, name: 'Rolling Three', pay: 'paid' }),
  ],
});

/**
 * **Lock course.**
 *
 * The column stays, its bookings stay, and its open cells stop accepting clicks. This is
 * the state for a nine that is closed to new play but still has groups on it — the common
 * case during afternoon maintenance, and the reason lock and hide are different actions.
 */
export const LockCourse: Story = {
  render: () => (
    <Exhibit
      note="Valley is locked. Its pair is still there and still checkable-in; its empty cells no longer offer a booking."
      before={threeNines()}
      apply={[{ type: 'patchCourse', courseId: 'valley', patch: { locked: true } }]}
    />
  ),
  play: afterShows({ has: [/Valley Pair\|2\|open/, /Ponds Four\|4\|paid/] }),
};

/**
 * **Unlock course.**
 *
 * The inverse. Open cells become bookable again and the party-size picker returns with them.
 */
export const UnlockCourse: Story = {
  render: () => (
    <Exhibit
      note="Maintenance is finished and Valley reopens for booking."
      before={{ ...threeNines(), courses: lockedValley() }}
      apply={[{ type: 'patchCourse', courseId: 'valley', patch: { locked: false } }]}
    />
  ),
  play: afterShows({ has: [/Valley Pair\|2\|open/] }),
};

/**
 * **Hide course.**
 *
 * The column disappears and the remaining courses widen to fill the space. The bookings are
 * still in state — they are simply not drawn — so hiding is a view decision and reversible
 * without consequence. Compare with Lock, which keeps the column visible on purpose.
 */
export const HideCourse: Story = {
  render: () => (
    <Exhibit
      note="Rolling is hidden. Ponds and Valley widen; Rolling's threesome is untouched in state and just off screen."
      before={threeNines()}
      apply={[{ type: 'patchCourse', courseId: 'rolling', patch: { visible: false } }]}
    />
  ),
  play: afterShows({ has: [/Ponds Four\|4\|paid/], lacks: [/Rolling Three/] }),
};

/**
 * **Focus this course** — hide the others.
 *
 * One column across the full width. This is how staff work a single nine during an outing on
 * the other two, and it is a shortcut for hiding every other course rather than a separate
 * kind of state.
 */
export const FocusCourse: Story = {
  render: () => (
    <Exhibit
      note="Ponds takes the whole sheet. Its four slots are far easier to read at full width."
      before={threeNines()}
      apply={[{ type: 'focusCourse', courseId: 'ponds' }]}
    />
  ),
  play: afterShows({ has: [/Ponds Four\|4\|paid/], lacks: [/Valley Pair/, /Rolling Three/] }),
};

/**
 * **Show all courses.**
 *
 * Undoes a focus or any set of hides in one action, which is why it sits in the menu of
 * every column rather than only the focused one — the operator who needs it is usually
 * looking at the wrong column to fix it.
 */
export const ShowAllCourses: Story = {
  render: () => (
    <Exhibit
      note="Starting focused on Ponds; Show all courses brings Valley and Rolling back."
      before={threeNines()}
      apply={[{ type: 'focusCourse', courseId: 'ponds' }, { type: 'showAllCourses' }]}
    />
  ),
  play: afterShows({ has: [/Ponds Four/, /Valley Pair/, /Rolling Three/] }),
};

/**
 * **Course note.**
 *
 * A standing note on the column header, as opposed to a time-row note: this is a fact about
 * the course for the whole day — cart path only, temporary greens — rather than about one
 * tee time.
 */
export const CourseNote: Story = {
  render: () => (
    <Exhibit
      note="Cart-path-only recorded against Rolling for the day."
      before={threeNines()}
      apply={[
        {
          type: 'patchCourse',
          courseId: 'rolling',
          patch: { note: 'Cart path only — wet conditions on 4 and 7' },
        },
      ]}
    />
  ),
  play: afterShows({ has: [/Rolling Three\|3\|paid/] }),
};
