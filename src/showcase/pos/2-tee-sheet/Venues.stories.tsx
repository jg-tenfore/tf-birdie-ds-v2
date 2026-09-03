import type { Meta, StoryObj } from '@storybook/react-vite';
import { Screen, atVenue, screenParams } from '../screen-helpers';

/**
 * POS Screens / 2 · Tee Sheet — Club layouts
 *
 * The same application against three shapes of club. Each is published as its own prototype
 * (`/prototype/`, `/prototype-18/`, `/prototype-9/`), but they are one codebase: the tee
 * sheet renders one column group per course, so a club's shape is entirely its `courses`
 * array. See `src/pos/data/venues.ts`.
 *
 * Worth comparing side by side, because grid density is the thing that changes most between
 * them — and density is what the sheet's whole design is tuned around.
 */
const meta = {
  title: 'POS Screens/2 · Tee Sheet/Club Layouts',
  parameters: screenParams,
} satisfies Meta;

export default meta;
type Story = StoryObj;

/**
 * **Three nines** — the original club and the default. Ponds, Valley and Rolling run as
 * independent nine-hole tracks: three column groups, twelve bookable cells per time row.
 * This is the densest case and the one the grid was designed around.
 */
export const ThreeNines: Story = {
  render: () => <Screen initialState={atVenue('three-nines')} />,
};

/**
 * **One 18-hole course**, split into its two nines. Front and back are separate column
 * groups because a golfer can be sent off either — crossovers, shotgun starts and
 * back-nine twilight all need somewhere on the sheet to live.
 *
 * A round here is 18 holes whichever tee it starts from, which is why both groups carry
 * `holeCount: 18`: the nine is where you *begin*, not what you play.
 */
export const EighteenHole: Story = {
  render: () => <Screen initialState={atVenue('eighteen')} />,
};

/**
 * **A single nine** — one column group, four cells a row. Deliberately sparse: that is the
 * honest picture of a nine-hole operation, and it is the case that shows how the sheet reads
 * when there is very little on it.
 */
export const SingleNine: Story = {
  render: () => <Screen initialState={atVenue('nine')} />,
};

/** The 18-hole club in list view — the same bookings, grouped and filterable. */
export const EighteenHoleList: Story = {
  render: () => <Screen initialState={atVenue('eighteen', { teeSheetMode: 'list' })} />,
};

/** The single nine at its busiest band, where even the sparse layout fills up. */
export const SingleNinePeak: Story = {
  render: () => <Screen initialState={atVenue('nine', { shift: 'peak' })} />,
};

/** The 18-hole club's register — the top bar names the club. */
export const EighteenHoleRegister: Story = {
  render: () => (
    <Screen initialState={atVenue('eighteen', { view: 'pos', leftPanelCollapsed: false })} />
  ),
};
