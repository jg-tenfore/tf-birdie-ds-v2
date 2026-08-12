import type { Meta, StoryObj } from '@storybook/react-vite';
import { DEMO_BOOKINGS, Screen, onTeeSheet, screenParams } from '../screen-helpers';

/**
 * POS Screens / 2 · Tee Sheet
 *
 * The sheet is courses × time. A booking spans one cell per player, so a row reads as
 * capacity without any numbers on it.
 *
 * Chip colour encodes **payment state**, not booking type — solid green is paid, white
 * with a green outline is unpaid, hatched grey is a no-show or rain check, orange is
 * refunded, hatched slate is a block, violet is a league. That ordering is deliberate:
 * the counter's first question is always who still owes money.
 */
const meta = {
  title: 'POS Screens/2 · Tee Sheet',
  parameters: screenParams,
} satisfies Meta;

export default meta;
type Story = StoryObj;

/**
 * The full day. Three nine-hole tracks, four slots each, 8-minute intervals from 6am to
 * 6pm — 91 rows. Band tints (amber / green / violet) give the shape of the day while
 * scrolling.
 */
export const CalendarGrid: Story = {
  render: () => <Screen initialState={onTeeSheet()} />,
};

/**
 * Compact rows: 30px instead of 46px, name only. This is what fits a full day on one
 * screen — the meta line goes, but the name and the chip colour survive, which is what
 * an operator scans for.
 */
export const CompactRows: Story = {
  render: () => (
    <Screen
      initialState={onTeeSheet({
        settings: {
          slots: 4,
          compactMode: true,
          hideEmpty: false,
          intervalMins: 8,
          gridStartHour: 6,
          gridEndHour: 18,
          autoScrollNow: false,
          colorblindMode: false,
        },
      })}
    />
  ),
};

/**
 * A single time band. Selecting Peak Hours narrows both the grid and the list to
 * 10am–2pm, so the two views always agree about what "now" means.
 */
export const PeakBandOnly: Story = {
  render: () => <Screen initialState={onTeeSheet({ shift: 'peak' })} />,
};

/**
 * Blocks and events. A block spans the course's full slot width in hatched slate — the
 * demo day carries greens maintenance, a ranger hold, and an all-course staff shift
 * change from 11:52 to 12:08.
 */
export const BlocksAndEvents: Story = {
  render: () => <Screen initialState={onTeeSheet({ shift: 'peak' })} />,
};

/**
 * The order panel expanded alongside the sheet. This is the state that makes the shared
 * panel worth its width: the operator can pick a chip and see it land in the register
 * without leaving the sheet.
 */
export const WithOrderPanel: Story = {
  render: () => <Screen initialState={onTeeSheet({ leftPanelCollapsed: false })} />,
};

/**
 * List view — the same day as filterable cards. The grid answers "what does the day look
 * like"; this answers "find me the ones that need something", so it leads with
 * payment-status chips carrying live counts and surfaces the outstanding balance per card.
 */
export const ListView: Story = {
  render: () => <Screen initialState={onTeeSheet({ teeSheetMode: 'list' })} />,
};

/** List view filtered to unpaid tee times — the settle-up worklist. */
export const UnpaidWorklist: Story = {
  render: () => (
    <Screen
      initialState={onTeeSheet({
        teeSheetMode: 'list',
        listFilters: {
          status: 'open',
          guest: 'all',
          membership: 'all',
          courses: [],
          holes: 'all',
          players: [],
          special: [],
          sort: 'time',
          search: '',
        },
      })}
    />
  ),
};

/** List view grouped by status rather than time. */
export const GroupedByStatus: Story = {
  render: () => (
    <Screen
      initialState={onTeeSheet({
        teeSheetMode: 'list',
        listFilters: {
          status: 'all',
          guest: 'all',
          membership: 'all',
          courses: [],
          holes: 'all',
          players: [],
          special: [],
          sort: 'status',
          search: '',
        },
      })}
    />
  ),
};

/**
 * The day summary drawer: the questions a starter asks over the radio — how many out,
 * how many carts, how many still owe — then the day in time order to work down.
 */
export const DaySummary: Story = {
  render: () => <Screen initialState={onTeeSheet({ sidebarOpen: true, sidebarCourse: null })} />,
};

/** The same drawer scoped to one course. */
export const CourseSummary: Story = {
  render: () => (
    <Screen initialState={onTeeSheet({ sidebarOpen: true, sidebarCourse: 'ponds' })} />
  ),
};

/**
 * Multi-select. Entered from a chip's context menu, it repurposes clicking as selection
 * — so the bar is dark and unmistakably a different mode from the toolbar above it.
 */
export const MultiSelect: Story = {
  render: () => {
    const ids = DEMO_BOOKINGS.filter((b) => b.pay === 'open').slice(0, 5).map((b) => b.id);
    return <Screen initialState={onTeeSheet({ multiSelectActive: true, multiSelectIds: ids })} />;
  },
};

/** A single course, other columns hidden — the wide view for a busy track. */
export const FocusedCourse: Story = {
  render: () => (
    <Screen
      initialState={onTeeSheet({
        courses: [
          { id: 'ponds', name: 'Ponds (to Woods)', holes: '9 HOLES', slots: 4, visible: true, locked: false, note: '', indScroll: false },
          { id: 'valley', name: 'Front Valley', holes: '9 HOLES', slots: 4, visible: false, locked: false, note: '', indScroll: false },
          { id: 'rolling', name: 'Rolling', holes: '9 HOLES', slots: 4, visible: false, locked: false, note: '', indScroll: false },
        ],
      })}
    />
  ),
};

/** A locked course with an operator note — no new bookings, reason visible in the header. */
export const LockedCourse: Story = {
  render: () => (
    <Screen
      initialState={onTeeSheet({
        courses: [
          { id: 'ponds', name: 'Ponds (to Woods)', holes: '9 HOLES', slots: 4, visible: true, locked: false, note: '', indScroll: false },
          { id: 'valley', name: 'Front Valley', holes: '9 HOLES', slots: 4, visible: true, locked: true, note: 'Aerating greens — closed until Monday', indScroll: false },
          { id: 'rolling', name: 'Rolling', holes: '9 HOLES', slots: 4, visible: true, locked: false, note: '', indScroll: false },
        ],
      })}
    />
  ),
};
