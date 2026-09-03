import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from '@mui/material';
import { md3 } from '../../theme/tokens';
import { TeeSheet } from '../../pos/components/TeeSheet';
import { venue, venueBookings } from '../../pos/data/venues';
import type { PosState } from '../../pos/state/pos-store';
import type { Booking, Course } from '../../pos/types';
import {
  PEAK,
  blocks,
  fullRow,
  league,
  memberMix,
  mk,
  openings,
  partySizes,
  payStates,
  withNotes,
  withSettings,
} from '../pos/tee-sheet-fixtures';

/**
 * Components / Layout & Structure / **Tee Sheet**
 *
 * The tee sheet in isolation: its toolbar and its grid, with none of the surrounding
 * application. No order panel, no dialogs, no summary drawer.
 *
 * ## What it is
 *
 * Courses × time. Each visible course is a column group `slots` wide, and a booking occupies
 * one cell per player starting at its slot — so a foursome renders as one wide chip and a
 * single renders narrow. The row reads as capacity without carrying a single number.
 *
 * ## How to read a chip
 *
 * Colour encodes **payment state**, not booking type:
 *
 * | | |
 * |---|---|
 * | Solid green | paid |
 * | White, green outline | unpaid |
 * | Hatched grey | no-show or rain check |
 * | Orange | refunded |
 * | Hatched slate | blocked (maintenance, ranger hold, shift change) |
 * | Violet | league or outing |
 *
 * That ordering is deliberate: the counter's first question is always who still owes money,
 * so money gets the strongest signal.
 *
 * ## Booking by party size
 *
 * The open cells in a row are a size picker. Clicking the **Nth** open cell books **N**
 * players, starting at that opening's first slot so the booking stays contiguous — the
 * rightmost cell is therefore the whole remaining opening. Openings are *contiguous runs*,
 * not a free-slot count: with slots 1 and 3 open and 2 taken, each is a run of one and
 * neither can seat a pair. See `src/pos/logic/openings.ts`.
 *
 * ## What isolation costs
 *
 * Clicks that would open a dialog update state but render nothing here, because the modal
 * host lives in the app shell. Those flows are under **POS Screens**; this is the surface,
 * not the wiring.
 */
const meta = {
  title: 'Components/Layout & Structure/Tee Sheet',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Dark ground so the fixed-size sheet reads as a terminal rather than a cropped page. */
function Frame({ state, height }: { state?: Partial<PosState>; height?: number }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: md3.scrim,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 1,
      }}
    >
      <TeeSheet state={state} height={height} />
    </Box>
  );
}

/** A club's courses with a hand-built booking set instead of the generated day. */
const only = (bookings: Booking[], extra: Partial<PosState> = {}): Partial<PosState> => ({
  bookings,
  ...extra,
});

// ═══════════════════════════════════════════════════════════════════════════
// The default
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The full day on the three-nines club: 6:00 AM to 6:00 PM at 8-minute intervals, 91 rows.
 *
 * Band tints (amber early, green peak, violet twilight) give the shape of the day while
 * scrolling, and the band separators name each one at its boundary. The red rule is the
 * current time.
 */
export const Default: Story = { render: () => <Frame /> };

// ═══════════════════════════════════════════════════════════════════════════
// Time — every instance the sheet can show
// ═══════════════════════════════════════════════════════════════════════════

/** Early morning only, 6–10am. Selecting a band narrows the grid to it. */
export const BandEarlyMorning: Story = { render: () => <Frame state={{ shift: 'early' }} /> };

/** Peak hours, 10am–2pm — the busiest stretch and the densest the sheet gets. */
export const BandPeak: Story = { render: () => <Frame state={{ shift: 'peak' }} /> };

/** Twilight, 2–6pm. */
export const BandTwilight: Story = { render: () => <Frame state={{ shift: 'twilight' }} /> };

/**
 * Compact rows: 30px instead of 46px, and the chip's meta line drops away.
 *
 * This is what fits a whole day on one screen. The name and the colour survive, which is
 * what an operator actually scans for.
 */
export const CompactRows: Story = {
  render: () => <Frame state={{ settings: withSettings({ compactMode: true }) }} />,
};

/** Rows with no booking on any course are hidden — the day's real shape, gaps removed. */
export const HideEmptyRows: Story = {
  render: () => <Frame state={{ settings: withSettings({ hideEmpty: true }) }} />,
};

/** A 7-minute interval — tighter tee times, more rows. */
export const Interval7Minutes: Story = {
  render: () => <Frame state={{ settings: withSettings({ intervalMins: 7 }) }} />,
};

/** A 10-minute interval. */
export const Interval10Minutes: Story = {
  render: () => <Frame state={{ settings: withSettings({ intervalMins: 10 }) }} />,
};

/**
 * A 15-minute interval — the loosest common spacing, and the case where the generated
 * bookings no longer land on a row, so most chips disappear.
 *
 * Worth keeping: it shows that the grid is built from the interval rather than from the
 * bookings, so a settings change can orphan data rather than move it.
 */
export const Interval15Minutes: Story = {
  render: () => <Frame state={{ settings: withSettings({ intervalMins: 15 }) }} />,
};

/** Extended hours, 5am to 8pm — the widest window the settings panel offers. */
export const ExtendedHours: Story = {
  render: () => (
    <Frame state={{ settings: withSettings({ gridStartHour: 5, gridEndHour: 20 }) }} />
  ),
};

/**
 * The first and last rows of the day, on an empty sheet.
 *
 * The window is inclusive of its closing hour: a 6→18 setting ends on a 6:00 PM row, not
 * 5:52. Easiest to confirm with nothing else on the grid.
 */
export const DayBoundaries: Story = {
  render: () => <Frame state={only([], { settings: withSettings({ autoScrollNow: false }) })} />,
};

/**
 * A past day. No now-line, and the generated state is settled — paid rounds, a few no-shows
 * and refunds, nothing pending.
 */
export const PastDay: Story = {
  render: () => <Frame state={{ currentDate: new Date(2026, 4, 18) }} />,
};

/** A future day: mostly unpaid, since balances are settled at check-in. */
export const FutureDay: Story = {
  render: () => <Frame state={{ currentDate: new Date(2026, 4, 24) }} />,
};

/** A weekend — the busiest generated day, for comparison against a midweek one. */
export const Weekend: Story = {
  render: () => <Frame state={{ currentDate: new Date(2026, 4, 23) }} />,
};

// ═══════════════════════════════════════════════════════════════════════════
// Bookings
// ═══════════════════════════════════════════════════════════════════════════

/** Nothing booked. Every cell is an opening, which is the picker at its widest. */
export const EmptyDay: Story = {
  render: () => <Frame state={only([], { shift: 'peak' })} />,
};

/** A single booking on an otherwise empty sheet. */
export const SingleBooking: Story = {
  render: () => (
    <Frame
      state={only(
        [mk({ course: 'ponds', timeMin: PEAK, players: 2, name: 'Harrison, T.', pay: 'paid' })],
        { shift: 'peak' },
      )}
    />
  ),
};

/**
 * One booking of each party size, stacked.
 *
 * A chip's width *is* its player count — one cell per player — so a single and a foursome
 * are told apart without reading anything.
 */
export const PartySizes: Story = {
  render: () => <Frame state={only(partySizes(), { shift: 'early' })} />,
};

/**
 * Every payment state on consecutive rows.
 *
 * The last pair is the interesting one: a group where some players have paid and some
 * haven't still reads as unpaid, because money outstanding is what the operator must not
 * miss.
 */
export const PaymentStates: Story = {
  render: () => <Frame state={only(payStates(), { shift: 'early' })} />,
};

/**
 * Openings of every size, top to bottom: four, three, two, one, none — then a split row.
 *
 * The split row is why openings are *runs* rather than a count: its free cells are the
 * first and the last, with the middle two taken. Two cells are free and neither can seat a
 * pair, so the row offers "1 player" twice rather than a single "2 players".
 */
export const Openings: Story = {
  render: () => <Frame state={only(openings(), { shift: 'early' })} />,
};

/** Every slot on every course taken at one time — the row with nothing available. */
export const FullRow: Story = {
  render: () => (
    <Frame state={only(fullRow(['ponds', 'valley', 'rolling']), { shift: 'peak' })} />
  ),
};

/**
 * Blocked slots: a single maintenance hold, and a shift change closing every course for two
 * consecutive rows.
 *
 * A block spans the course's full width, which is what makes a closed row read as closed
 * rather than as a large booking.
 */
export const BlocksAndHolds: Story = {
  render: () => (
    <Frame state={only(blocks(['ponds', 'valley', 'rolling']), { shift: 'peak' })} />
  ),
};

/** A league across two courses on consecutive rows — violet, and not individually bookable. */
export const LeagueEvent: Story = {
  render: () => <Frame state={only(league('ponds', 'valley'), { shift: 'twilight' })} />,
};

/** Bookings carrying operator notes, shown as a corner icon with the text on hover. */
export const BookingNotes: Story = {
  render: () => <Frame state={only(withNotes(), { shift: 'early' })} />,
};

/**
 * Members and guests together. The coloured dot is the membership tier, resolved from the
 * CRM by phone number — it's how staff spot a member without opening the booking.
 */
export const MembershipDots: Story = {
  render: () => <Frame state={only(memberMix(), { shift: 'early' })} />,
};

// ═══════════════════════════════════════════════════════════════════════════
// Course states
// ═══════════════════════════════════════════════════════════════════════════

const courseSet = (patch: Array<Partial<Course>>): Course[] =>
  venue('three-nines').courses.map((c, i) => ({ ...c, ...patch[i] }));

/** A locked course takes no new bookings; its open cells lose the add affordance. */
export const LockedCourse: Story = {
  render: () => (
    <Frame
      state={{
        courses: courseSet([{}, { locked: true, note: 'Aerating greens — closed until Monday' }, {}]),
      }}
    />
  ),
};

/** A course note pinned to its header, for something the whole day needs to know. */
export const CourseNote: Story = {
  render: () => (
    <Frame state={{ courses: courseSet([{ note: 'Cart path only — wet conditions' }, {}, {}]) }} />
  ),
};

/** One course, others hidden — the wide view for working a single busy track. */
export const FocusedCourse: Story = {
  render: () => (
    <Frame state={{ courses: courseSet([{}, { visible: false }, { visible: false }]) }} />
  ),
};

// ═══════════════════════════════════════════════════════════════════════════
// Annotations and modes
// ═══════════════════════════════════════════════════════════════════════════

/** An operator note pinned to a time row — a frost delay, a lightning hold. */
export const TimeRowNote: Story = {
  render: () => (
    <Frame
      state={{
        shift: 'early',
        timeNotes: { '2026-5-21_480': { text: 'Frost delay — first tee held', color: 'yellow' } },
      }}
    />
  ),
};

/** A price override on a span of rows, shown as a banner above the first affected row. */
export const PriceOverride: Story = {
  render: () => (
    <Frame
      state={{
        shift: 'early',
        timePrices: {
          '2026-5-21_480': { label: 'Shoulder-season rate', fee: 34, cart: 14, rangeEnd: 512 },
        },
      }}
    />
  ),
};

/**
 * Multi-select. Entered from a chip's context menu, it repurposes clicking as selection —
 * so the bar is dark and unmistakably a different mode from the toolbar above it.
 */
export const MultiSelect: Story = {
  render: () => {
    const ids = venueBookings('three-nines')
      .filter((b) => b.pay === 'open')
      .slice(0, 6)
      .map((b) => b.id);
    return <Frame state={{ multiSelectActive: true, multiSelectIds: ids }} />;
  },
};

/**
 * List view — the same day as filterable cards.
 *
 * The grid answers "what does the day look like"; this answers "find me the ones that need
 * something", so it leads with payment-status chips carrying live counts.
 */
export const ListView: Story = { render: () => <Frame state={{ teeSheetMode: 'list' }} /> };

/** List view narrowed to unpaid tee times — the settle-up worklist. */
export const ListViewUnpaid: Story = {
  render: () => (
    <Frame
      state={{
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
      }}
    />
  ),
};

// ═══════════════════════════════════════════════════════════════════════════
// Club layouts
// ═══════════════════════════════════════════════════════════════════════════

/** Three independent nine-hole tracks — twelve bookable cells a row. */
export const ClubThreeNines: Story = { render: () => <Frame state={{ venueId: 'three-nines' }} /> };

/**
 * One 18-hole course split into its two nines — eight cells a row.
 *
 * Front and back are separate groups because a golfer can be sent off either one. A round is
 * 18 holes whichever tee it starts from.
 */
export const ClubEighteenHole: Story = {
  render: () => (
    <Frame state={{ venueId: 'eighteen', bookings: venueBookings('eighteen'), courses: venue('eighteen').courses }} />
  ),
};

/** A single nine — four cells a row, the sparsest layout. */
export const ClubSingleNine: Story = {
  render: () => (
    <Frame state={{ venueId: 'nine', bookings: venueBookings('nine'), courses: venue('nine').courses }} />
  ),
};

// ═══════════════════════════════════════════════════════════════════════════
// Frame sizes
// ═══════════════════════════════════════════════════════════════════════════

/**
 * A short frame, to check the sticky course headers and the scroll behaviour.
 *
 * The headers stay pinned while the rows move, which is what keeps the columns identifiable
 * 60 rows into a day.
 */
export const ShortFrame: Story = { render: () => <Frame height={420} /> };

/** Combined: compact rows, empty rows hidden, and a single band — the densest useful view. */
export const DensestView: Story = {
  render: () => (
    <Frame
      state={{ shift: 'peak', settings: withSettings({ compactMode: true, hideEmpty: true }) }}
    />
  ),
};

/** A time with nothing but blocks and a league — no bookable capacity at all. */
export const NothingBookable: Story = {
  render: () => (
    <Frame
      state={only([...blocks(['ponds', 'valley', 'rolling']), ...league('ponds', 'valley')], {
        shift: 'peak',
      })}
    />
  ),
};

/** Every fixture at once, to see how the treatments read against each other. */
export const Everything: Story = {
  render: () => (
    <Frame
      state={only([
        ...partySizes('ponds'),
        ...payStates('valley'),
        ...withNotes('rolling'),
        ...blocks(['ponds', 'valley', 'rolling']),
        ...league('ponds', 'valley'),
        ...memberMix('rolling'),
      ])}
    />
  ),
};
