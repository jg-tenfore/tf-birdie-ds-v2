import type { Meta, StoryObj } from '@storybook/react-vite';
import { MEMBER_DB, findMemberByPhone } from '../../../pos/data/golfers';
import { TIMES } from '../../../pos/data/courses';
import { buildVenue, venue } from '../../../pos/data/venues';
import { largestFit } from '../../../pos/logic/bookings';
import { emptyListFilters } from '../../../pos/state/pos-store';
import type { Booking } from '../../../pos/types';
import {
  DEMO_BOOKINGS,
  MobileStory,
  findToday,
  mobileMeta,
  paidFoursome,
  todayBookings,
  withWalkInOrder,
} from '../mobile-helpers';

/**
 * Mobile Screens / 3 · Booking & Check-in
 *
 * The booking record and the flows that change it, one level below the tee sheet.
 * Booking Detail is a **push** (a place you drill into, Back returns to the list); the
 * things you do *to* a booking — check in, refund, rain check, move, book a new one —
 * are **full-screen dialogs** that rise over it with ✕ and a confirm action, so abandoning
 * one never changes the sheet. Nothing is a centred dialog.
 *
 * Player state is per-person throughout, because a foursome routinely arrives in twos
 * and pays separately.
 */
const meta = {
  title: 'Mobile Screens/3 · Booking & Check-in',
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

// ─── Scenario helpers ───────────────────────────────────────────────────────

/** An unpaid, paying party that hasn't arrived — the canonical "check in and settle" case. */
const awaitingArrival = (): Booking =>
  findToday((b) => b.pay === 'open' && b.price > 0 && b.players >= 2 && b.playerStates.every((p) => p.step < 0 && !p.noShow));

/** The first time on the paid foursome's course with room for three together. */
function openSlot() {
  const course = venue(buildVenue()).courses.find((c) => c.id === paidFoursome().course)!;
  const day = todayBookings();
  const t = TIMES.find((x) => largestFit(day, course, x.totalMin) >= 3) ?? TIMES[0];
  return { courseId: course.id, timeMin: t.totalMin, players: largestFit(day, course, t.totalMin) };
}

/** The paid foursome with its guests named — seat 2 picked from the CRM, seat 3 typed in. */
function withNamedGuests(): { booking: Booking; bookings: Booking[] } {
  const b = paidFoursome();
  const crm = MEMBER_DB.find((g) => g.memberType === 'seasonal')!;
  const named: Booking = {
    ...b,
    guests: [
      { name: b.name },
      { name: crm.name, phone: crm.phone, email: crm.email, hcp: crm.hcp, memberType: crm.memberType, crmId: crm.id },
      { name: 'Ruiz, Dana', phone: '(555) 310-7788' },
      { name: 'Guest 4' },
    ],
    playerNotes: { 1: 'Left-handed rental set' },
  };
  return { booking: named, bookings: DEMO_BOOKINGS.map((x) => (x.id === b.id ? named : x)) };
}

// ─── Booking detail ─────────────────────────────────────────────────────────

/**
 * Booking Detail · Players. Pushed from the sheet, so it has a back arrow and the
 * navigation bar is gone. The identifying facts sit above the MD3 primary tabs, visible
 * on every tab. Each player row pushes Player Detail. The pinned bottom bar carries the
 * primary action for the booking's state.
 */
export const DetailPlayers: Story = {
  render: () => {
    const { booking, bookings } = withNamedGuests();
    return <MobileStory tab="tee" initialState={{ bookings }} stack={[{ name: 'bookingDetail', bookingId: booking.id }]} />;
  },
};

/**
 * Booking Detail · Financial, on an unpaid booking — so the bottom bar leads with
 * **Check in & pay · $amount**, which loads the order and jumps to the Register
 * destination. Refund and rain check push their own dialogs.
 */
export const DetailFinancial: Story = {
  render: () => (
    <MobileStory tab="tee" stack={[{ name: 'bookingDetail', bookingId: awaitingArrival().id, tab: 'financial' }]} />
  ),
};

/**
 * Booking Detail · Notes. Tags apply as you tap; the text fields save together. The tab
 * lives in the route and switching *replaces* it, so Back leaves the booking rather than
 * stepping back through tabs.
 */
export const DetailNotes: Story = {
  render: () => {
    const { booking, bookings } = withNamedGuests();
    return <MobileStory tab="tee" initialState={{ bookings }} stack={[{ name: 'bookingDetail', bookingId: booking.id, tab: 'notes' }]} />;
  },
};

/** Booking Detail · Activity — the audit trail, seeded from the booking's state so it's never empty. */
export const DetailActivity: Story = {
  render: () => (
    <MobileStory tab="tee" stack={[{ name: 'bookingDetail', bookingId: paidFoursome().id, tab: 'activity' }]} />
  ),
};

/**
 * A member booking — the member tier shows in the header, and the rate is $0, so the
 * primary action reads plain **Check in & pay** with no amount.
 */
export const DetailMember: Story = {
  render: () => {
    // A member booking whose phone matches a CRM record, so the tier resolves.
    const b = findToday((x) => x.status === 'member' && Boolean(findMemberByPhone(x.phone)));
    return <MobileStory tab="tee" stack={[{ name: 'bookingDetail', bookingId: b.id }]} />;
  },
};

/**
 * A no-show. The card on the sheet is struck through and dimmed; here the players read
 * No-show and the only bottom action left is opening it in the Register. Undo lives in
 * the ⋮ sheet.
 */
export const DetailNoShow: Story = {
  render: () => (
    <MobileStory tab="tee" stack={[{ name: 'bookingDetail', bookingId: findToday((b) => b.pay === 'no_show').id }]} />
  ),
};

/** A refunded booking on its Financial tab. */
export const DetailRefunded: Story = {
  render: () => (
    <MobileStory
      tab="tee"
      stack={[{ name: 'bookingDetail', bookingId: findToday((b) => b.pay === 'refund').id, tab: 'financial' }]}
    />
  ),
};

/**
 * A block, opened from its card's long-press "Details". Blocks hold a slot but have no
 * party, so there are no tabs — just what holds it, and a way into the Operations dialog
 * that edits it. (A plain tap on a block card goes straight to that dialog.)
 */
export const DetailBlock: Story = {
  render: () => (
    <MobileStory tab="tee" stack={[{ name: 'bookingDetail', bookingId: findToday((b) => b.pay === 'block').id }]} />
  ),
};

// ─── Player detail ──────────────────────────────────────────────────────────

/**
 * Player Detail — pushed from a row on the Players tab, two levels below the sheet; Back
 * returns to the party. The terminal's five-dot progress rail becomes a vertical radio
 * list with real touch targets, and every step is still directly selectable.
 */
export const PlayerDetail: Story = {
  render: () => {
    const b = paidFoursome();
    return (
      <MobileStory
        tab="tee"
        stack={[
          { name: 'bookingDetail', bookingId: b.id },
          { name: 'playerDetail', bookingId: b.id, playerIndex: 0 },
        ]}
      />
    );
  },
};

/**
 * A guest picked from the CRM. The seat links on to the customer's profile in People —
 * pushed onto this same stack, so Back comes straight back to the player.
 */
export const PlayerDetailLinked: Story = {
  render: () => {
    const { booking, bookings } = withNamedGuests();
    return (
      <MobileStory
        tab="tee"
        initialState={{ bookings }}
        stack={[
          { name: 'bookingDetail', bookingId: booking.id },
          { name: 'playerDetail', bookingId: booking.id, playerIndex: 1 },
        ]}
      />
    );
  },
};

// ─── Actions (full-screen dialogs) ──────────────────────────────────────────

/**
 * Check in — a full-screen dialog over Booking Detail. Seats not yet arrived start ticked,
 * so the common case is one tap on **Check in N**. ✕ returns to the booking unchanged.
 */
export const CheckIn: Story = {
  render: () => {
    const b = awaitingArrival();
    return (
      <MobileStory
        tab="tee"
        stack={[
          { name: 'bookingDetail', bookingId: b.id },
          { name: 'bookingAction', bookingId: b.id, action: 'checkin' },
        ]}
      />
    );
  },
};

/**
 * Refund — nothing starts ticked, because money is moving; the confirm label carries the
 * amount so the operator reads it back before committing. Unpaid seats can't be picked.
 */
export const Refund: Story = {
  render: () => {
    const b = paidFoursome();
    return (
      <MobileStory
        tab="tee"
        stack={[
          { name: 'bookingDetail', bookingId: b.id, tab: 'financial' },
          { name: 'bookingAction', bookingId: b.id, action: 'refund' },
        ]}
      />
    );
  },
};

/** Rain check — the whole party starts ticked, since weather sends everyone in at once. */
export const RainCheck: Story = {
  render: () => {
    const b = paidFoursome();
    return (
      <MobileStory
        tab="tee"
        stack={[
          { name: 'bookingDetail', bookingId: b.id, tab: 'financial' },
          { name: 'bookingAction', bookingId: b.id, action: 'raincheck' },
        ]}
      />
    );
  },
};

/**
 * New tee time — tapped from an open slot, so it rises straight over the sheet. The
 * terminal's three steps become one form: every answer stays visible, ✕ abandons the lot.
 * "Find a customer" pushes the People picker on top of this dialog.
 */
export const NewTeeTime: Story = {
  render: () => <MobileStory tab="tee" stack={[{ name: 'newTeeTime', ...openSlot() }]} />,
};

/**
 * New tee time after a customer was picked. The picker (opened with target `booking`)
 * writes `state.bookingGolfer` and pops; the dialog reads it, so the golfer shows here
 * with an ✕ to clear it. Booking, or ✕ on the dialog, clears it again.
 */
export const NewTeeTimeWithGolfer: Story = {
  render: () => (
    <MobileStory
      tab="tee"
      initialState={{ bookingGolfer: MEMBER_DB.find((g) => g.memberType === 'annual') ?? null }}
      stack={[{ name: 'newTeeTime', ...openSlot() }]}
    />
  ),
};

/**
 * Booking a tee time while a Register order is open. The order's customer
 * (`selectedGolfer`, a seasonal member here) and the tee time's golfer (`bookingGolfer`,
 * an annual member) are separate slots, so booking — or abandoning — this tee time leaves
 * the order on the counter addressed to whoever it was. The Register tab keeps its badge;
 * switch to it after **Book** and the order still names its original golfer.
 */
export const NewTeeTimeDuringOrder: Story = {
  render: () => (
    <MobileStory
      tab="tee"
      initialState={withWalkInOrder({
        selectedGolfer: MEMBER_DB.find((g) => g.memberType === 'seasonal') ?? null,
        bookingGolfer: MEMBER_DB.find((g) => g.memberType === 'annual') ?? null,
      })}
      stack={[{ name: 'newTeeTime', ...openSlot() }]}
    />
  ),
};

/**
 * Move tee time — a full-screen dialog from the booking's ⋮ sheet. Only times with room
 * for the whole party side by side are offered; nothing is moved until **Move**.
 */
export const MoveTeeTime: Story = {
  render: () => {
    const b = awaitingArrival();
    return (
      <MobileStory
        tab="tee"
        stack={[
          { name: 'bookingDetail', bookingId: b.id },
          { name: 'movePlayers', bookingId: b.id },
        ]}
      />
    );
  },
};

/** Today's movable parties by time — blocks and league holds excluded, as they never move. */
function movableByTime(): Array<[number, Booking[]]> {
  const byTime = new Map<number, Booking[]>();
  for (const b of todayBookings()) {
    if (b.pay === 'block' || b.pay === 'event' || b.status === 'block') continue;
    byTime.set(b.timeMin, [...(byTime.get(b.timeMin) ?? []), b]);
  }
  return [...byTime.entries()].sort((x, y) => x[0] - y[0]);
}
const playersIn = (l: Booking[]) => l.reduce((s, b) => s + b.players, 0);

/**
 * The multi-course row with the fewest players — the lightest "whole time" to move. A
 * single-nine club has no multi-course rows, so there it falls back to the lightest row
 * with two or more parties (the mobile prototype renders every story at all three clubs).
 */
function lightestRow(): number {
  const all = movableByTime();
  const multiCourse = all.filter(([, l]) => new Set(l.map((b) => b.course)).size > 1);
  const rows = multiCourse.length ? multiCourse : all.filter(([, l]) => l.length > 1);
  const pick = [...(rows.length ? rows : all)].sort((x, y) => playersIn(x[1]) - playersIn(y[1]) || x[0] - y[0])[0];
  return pick?.[0] ?? all[0]?.[0] ?? 480;
}

/** The first course-and-time holding two or more parties that together fit one course row. */
function movableCourseRow(): { timeMin: number; courseId: string } {
  for (const [timeMin, l] of movableByTime()) {
    for (const courseId of new Set(l.map((b) => b.course))) {
      const here = l.filter((b) => b.course === courseId);
      if (here.length >= 2 && playersIn(here) <= 4) return { timeMin, courseId };
    }
  }
  const [timeMin, l] = movableByTime()[0];
  return { timeMin, courseId: l[0].course };
}

/**
 * Move everyone — the whole tee time, from the time's actions sheet with every course in
 * view. Every party at the time is listed and starts ticked (untick any that stay); blocks
 * and leagues are left where they are.
 *
 * With every course in view it defaults to **Keep courses**: the whole row moves to the new
 * time and each party stays on its own course, so a time is offered when every course has
 * room. That's the one departure from the terminal, whose rule — everyone onto one course —
 * almost never fits a busy multi-course row. Picking a course chip applies that rule.
 */
export const MoveEveryone: Story = {
  render: () => <MobileStory tab="tee" stack={[{ name: 'movePlayers', timeMin: lightestRow() }]} />,
};

/**
 * Move everyone with the sheet scoped to one course (the course chip picked). The sheet
 * passes its `courseId`, so only that course's parties at the time are moved and the
 * destination starts on the same course.
 */
export const MoveEveryoneOneCourse: Story = {
  render: () => {
    const { timeMin, courseId } = movableCourseRow();
    return (
      <MobileStory
        tab="tee"
        initialState={{ listFilters: { ...emptyListFilters, courses: [courseId] } }}
        stack={[{ name: 'movePlayers', timeMin, courseId }]}
      />
    );
  },
};
