import { Fragment, useMemo, useState } from 'react';
import { Badge, Box, Button, ButtonBase, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material';
import Add from '@mui/icons-material/Add';
import ArrowDropDown from '@mui/icons-material/ArrowDropDown';
import CalendarToday from '@mui/icons-material/CalendarToday';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import FilterList from '@mui/icons-material/FilterList';
import Insights from '@mui/icons-material/Insights';
import Lock from '@mui/icons-material/Lock';
import Search from '@mui/icons-material/Search';
import { md3, mobile, noteColors, radius } from '../../../../theme/tokens';
import { DEMO_TODAY } from '../../../data/bookings';
import { formatTimeLabel, generateTimes, toDateStr } from '../../../data/courses';
import { activeFilterCount, checkInPlayer, filterBookings, largestFit, slotsFree } from '../../../logic/bookings';
import { Icon } from '../../../components/primitives';
import { Stack } from '../../../components/Stack';
import { dayBookings, timeRowKey } from '../../../state/pos-store';
import { moneyShort } from '../../../logic/cart';
import { usePos } from '../../../state/PosProvider';
import type { Booking, Course } from '../../../types';
import { BottomSheet, MobileScreen, TopAppBar } from '../../chrome';
import { useMobileNav } from '../../navigation';
import type { ScreenProps } from '../types';
import { BookingCard, FilterChip } from './parts';
import { bandMeta, bandOf, checkedInCount, dayLabel, isSlotHolder, parseDateStr, plural, shortCourse, useLongPress } from './tee-helpers';

/**
 * Tee Sheet — the destination root.
 *
 * The terminal's 1366px courses × time grid does not shrink to a phone, so this is the
 * same day as a vertical time list: one row per tee time, bookings as cards, open
 * capacity as "Book" affordances. The course chips pick one course or all of them;
 * they write `listFilters.courses`, so the Filters dialog and this row can't disagree.
 *
 * Long-pressing a time (or tapping its label) opens the time's actions as a bottom sheet
 * — the phone version of the terminal's right-click menu. Long-pressing a booking opens
 * its quick actions. Both sheets are driven by `state.contextMenu`, the same slot the
 * terminal's menus use, so a story can open either declaratively.
 */
export function TeeSheetScreen(_: ScreenProps<'teeSheet'>) {
  const { state, dispatch } = usePos();
  const nav = useMobileNav();
  const [datesOpen, setDatesOpen] = useState(false);

  const f = state.listFilters;
  const filterCount = activeFilterCount(f);
  // Course scope is the chip row; everything else is "a real filter", which hides open slots.
  const narrowing = filterCount - (f.courses.length ? 1 : 0) > 0;
  const shownCourses = state.courses.filter((c) => c.visible && (!f.courses.length || f.courses.includes(c.id)));
  const single = shownCourses.length === 1 ? shownCourses[0] : null;

  const day = dayBookings(state);
  // Search lives in the Search screen; the sheet ignores it so a stale query can't empty it.
  const matches = filterBookings(day, { ...f, search: '' }).filter((b) => shownCourses.some((c) => c.id === b.course));
  const byTime = groupByTime(matches, state.courses);

  const times = generateTimes(state.settings)
    .map((t) => t.totalMin)
    .filter((t) => !narrowing || byTime.has(t));

  const golfers = matches.filter((b) => !isSlotHolder(b)).reduce((s, b) => s + b.players, 0);
  const isToday = toDateStr(state.currentDate) === toDateStr(DEMO_TODAY());
  const days = useMemo(() => [...new Set(state.bookings.map((b) => b.date))].sort(), [state.bookings]);

  const menu = state.contextMenu;
  const closeMenu = () => dispatch({ type: 'closeContextMenu' });
  const openTimeMenu = (timeMin: number) => dispatch({ type: 'openContextMenu', menu: { kind: 'timeLabel', timeMin, x: 0, y: 0 } });
  const openBookingMenu = (bookingId: string) => dispatch({ type: 'openContextMenu', menu: { kind: 'booking', bookingId, x: 0, y: 0 } });

  let lastBand = '';

  return (
    <MobileScreen
      topBar={
        <TopAppBar
          title="Tee Sheet"
          leading="none"
          actions={
            <>
              <IconButton aria-label="Search bookings" onClick={() => nav.push({ name: 'teeSheetSearch' })}>
                <Search />
              </IconButton>
              <IconButton aria-label="Filters" onClick={() => nav.push({ name: 'teeSheetFilters' })}>
                <Badge badgeContent={filterCount - (f.courses.length ? 1 : 0)} color="primary" invisible={!narrowing}>
                  <FilterList />
                </Badge>
              </IconButton>
              <IconButton aria-label="Day summary" onClick={() => nav.push({ name: 'daySummary' })}>
                <Insights />
              </IconButton>
            </>
          }
        >
          {/* Date navigation: prev / date chip / next. */}
          <Stack direction="row" alignItems="center" gap={0.5} sx={{ px: 1, pb: 1 }}>
            <IconButton aria-label="Previous day" onClick={() => dispatch({ type: 'shiftDate', days: -1 })}>
              <ChevronLeft />
            </IconButton>
            <ButtonBase
              onClick={() => setDatesOpen(true)}
              aria-label="Choose date"
              sx={{
                flex: 1,
                height: 40,
                gap: 1,
                borderRadius: `${radius.sm}px`,
                border: `1px solid ${md3.outlineVariant}`,
                typography: 'subtitle2',
              }}
            >
              <CalendarToday sx={{ fontSize: 18, color: md3.onSurfaceVariant }} />
              {isToday ? 'Today · ' : ''}
              {dayLabel(state.currentDate)}
              <ArrowDropDown sx={{ color: md3.onSurfaceVariant }} />
            </ButtonBase>
            <IconButton aria-label="Next day" onClick={() => dispatch({ type: 'shiftDate', days: 1 })}>
              <ChevronRight />
            </IconButton>
          </Stack>
          {/* Course scope: all, or exactly one. */}
          <Stack
            direction="row"
            gap={1}
            sx={{ px: 2, pb: 1.5, overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}
          >
            <FilterChip
              label="All courses"
              selected={!f.courses.length}
              onClick={() => dispatch({ type: 'patchListFilters', patch: { courses: [] } })}
            />
            {state.courses
              .filter((c) => c.visible)
              .map((c) => (
                <FilterChip
                  key={c.id}
                  label={shortCourse(c)}
                  selected={f.courses.includes(c.id)}
                  onClick={() => dispatch({ type: 'patchListFilters', patch: { courses: [c.id] } })}
                />
              ))}
          </Stack>
          <Box sx={{ borderBottom: `1px solid ${md3.outlineVariant}` }} />
        </TopAppBar>
      }
    >
      {narrowing && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ pl: 2, pr: 1, py: 0.5, bgcolor: mobile.secondaryContainer, color: mobile.onSecondaryContainer }}
        >
          <Typography variant="body2">
            {matches.length} {matches.length === 1 ? 'match' : 'matches'} · open times hidden
          </Typography>
          <Button size="small" onClick={() => dispatch({ type: 'patchListFilters', patch: { ...clearedKeepingCourses } })}>
            Clear filters
          </Button>
        </Stack>
      )}

      {!narrowing && (
        <Typography variant="caption" component="div" sx={{ px: 2, pt: 1.5 }}>
          {plural(golfers, 'golfer')} · {single ? single.name : plural(shownCourses.length, 'course')}
        </Typography>
      )}

      {times.length === 0 && (
        <Stack alignItems="center" gap={1} sx={{ p: 5, color: md3.onSurfaceVariant, textAlign: 'center' }}>
          <Icon name="search_off" size={40} />
          <Typography variant="body1">No tee times match these filters.</Typography>
        </Stack>
      )}

      {times.map((t) => {
        const band = bandOf(t);
        const header = band !== lastBand;
        lastBand = band;
        const meta = bandMeta(band);
        return (
          <Fragment key={t}>
            {header && (
              <Stack
                direction="row"
                alignItems="center"
                gap={1}
                sx={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                  height: 36,
                  px: 2,
                  bgcolor: meta.bg ?? md3.surface,
                  borderBottom: `1px solid ${md3.outlineVariant}`,
                }}
              >
                <Icon name={meta.icon} size={18} color={meta.iconColor} />
                <Typography variant="subtitle2">{meta.label}</Typography>
                <Typography variant="caption">{meta.hours}</Typography>
              </Stack>
            )}
            <TimeRow
              timeMin={t}
              bookings={byTime.get(t) ?? []}
              courses={shownCourses}
              showOpen={!narrowing}
              showCourse={!single}
              onTimeMenu={() => openTimeMenu(t)}
              onBookingMenu={openBookingMenu}
            />
          </Fragment>
        );
      })}
      <Box sx={{ height: 24 }} />

      <BottomSheet open={datesOpen} onClose={() => setDatesOpen(false)} title="Go to date">
        <List disablePadding>
          {days.map((ds) => {
            const d = parseDateStr(ds);
            const on = ds === toDateStr(state.currentDate);
            const count = state.bookings.filter((b) => b.date === ds && !isSlotHolder(b)).length;
            return (
              <ListItemButton
                key={ds}
                selected={on}
                onClick={() => {
                  dispatch({ type: 'setDate', date: d });
                  setDatesOpen(false);
                }}
              >
                <ListItemText
                  primary={`${ds === toDateStr(DEMO_TODAY()) ? 'Today · ' : ''}${dayLabel(d, { weekday: 'long', month: 'short', day: 'numeric' })}`}
                  secondary={plural(count, 'tee time')}
                />
              </ListItemButton>
            );
          })}
        </List>
      </BottomSheet>

      {menu?.kind === 'timeLabel' && (
        <TimeActionsSheet timeMin={menu.timeMin} course={single} onClose={closeMenu} />
      )}
      {menu?.kind === 'booking' && <BookingActionsSheet bookingId={menu.bookingId} onClose={closeMenu} />}
    </MobileScreen>
  );
}

/** Bookings keyed by tee time, each row in course order then slot order. */
function groupByTime(list: Booking[], courses: Course[]): Map<number, Booking[]> {
  const m = new Map<number, Booking[]>();
  for (const b of list) {
    const arr = m.get(b.timeMin);
    if (arr) arr.push(b);
    else m.set(b.timeMin, [b]);
  }
  const order = new Map(courses.map((c, i) => [c.id, i]));
  for (const arr of m.values()) arr.sort((a, b) => (order.get(a.course) ?? 0) - (order.get(b.course) ?? 0) || a.slot - b.slot);
  return m;
}

const clearedKeepingCourses = {
  status: 'all',
  guest: 'all',
  membership: 'all',
  holes: 'all',
  players: [] as string[],
  special: [] as string[],
};

// ─── Time row ───────────────────────────────────────────────────────────────

function TimeRow({
  timeMin,
  bookings,
  courses,
  showOpen,
  showCourse,
  onTimeMenu,
  onBookingMenu,
}: {
  timeMin: number;
  bookings: Booking[];
  courses: Course[];
  showOpen: boolean;
  showCourse: boolean;
  onTimeMenu: () => void;
  onBookingMenu: (id: string) => void;
}) {
  const { state } = usePos();
  const nav = useMobileNav();
  const press = useLongPress(onTimeMenu);
  const [hh, ap] = formatTimeLabel(timeMin).split(' ');

  const key = timeRowKey(state.currentDate, timeMin);
  const note = state.timeNotes[key];
  const price = state.timePrices[key];
  const day = dayBookings(state);

  // Open capacity per course, from the same run logic the terminal grid uses.
  const openings = showOpen
    ? courses
        .map((c) => ({ course: c, free: slotsFree(day, c, timeMin), fit: largestFit(day, c, timeMin) }))
        .filter((o) => o.free > 0)
    : [];

  return (
    <Stack direction="row" sx={{ borderBottom: `1px solid ${md3.outlineVariant}` }}>
      <ButtonBase
        {...press.handlers}
        onClick={press.tap(onTimeMenu)}
        aria-label={`${formatTimeLabel(timeMin)} actions`}
        sx={{ width: 64, flexShrink: 0, flexDirection: 'column', justifyContent: 'flex-start', pt: 1.25, pb: 1 }}
      >
        <Typography variant="subtitle1" sx={{ lineHeight: 1.2, fontWeight: 600 }}>
          {hh}
        </Typography>
        <Stack direction="row" alignItems="center" sx={{ color: md3.onSurfaceVariant }}>
          <Typography variant="caption">{ap}</Typography>
          <Icon name="more_vert" size={14} />
        </Stack>
      </ButtonBase>

      <Stack gap={0.75} sx={{ flex: 1, minWidth: 0, py: 1, pr: 2 }}>
        {(note || price) && (
          <Stack direction="row" gap={0.75} flexWrap="wrap">
            {note && (
              <Stack
                direction="row"
                alignItems="center"
                gap={0.5}
                sx={{
                  px: 1,
                  py: 0.25,
                  borderRadius: `${radius.sm / 2}px`,
                  bgcolor: noteColors[note.color].bg,
                  color: noteColors[note.color].text,
                  border: `1px solid ${noteColors[note.color].border}`,
                  fontSize: 12,
                  maxWidth: '100%',
                }}
              >
                <Icon name="sticky_note_2" size={14} color={noteColors[note.color].dot} />
                <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {note.text}
                </Box>
              </Stack>
            )}
            {price && (
              <Stack
                direction="row"
                alignItems="center"
                gap={0.5}
                sx={{ px: 1, py: 0.25, borderRadius: `${radius.sm / 2}px`, bgcolor: md3.primaryContainer, color: md3.onPrimaryContainer, fontSize: 12 }}
              >
                <Icon name="sell" size={14} />
                {price.label || 'Price override'}
                {price.fee != null ? ` · ${moneyShort(price.fee)}` : ''}
              </Stack>
            )}
          </Stack>
        )}

        {bookings.map((b) => (
          <BookingCard
            key={b.id}
            booking={b}
            course={showCourse ? courses.find((c) => c.id === b.course) : undefined}
            onClick={() =>
              b.pay === 'block'
                ? nav.push({ name: 'blockTime', timeMin: b.timeMin, courseId: b.course })
                : nav.push({ name: 'bookingDetail', bookingId: b.id })
            }
            onLongPress={() => onBookingMenu(b.id)}
          />
        ))}

        {openings.length > 0 &&
          (showCourse ? (
            <Stack direction="row" gap={0.75} flexWrap="wrap">
              {openings.map((o) => (
                <OpenSlot key={o.course.id} course={o.course} timeMin={timeMin} free={o.free} fit={o.fit} compact />
              ))}
            </Stack>
          ) : (
            openings.map((o) => <OpenSlot key={o.course.id} course={o.course} timeMin={timeMin} free={o.free} fit={o.fit} />)
          ))}
      </Stack>
    </Stack>
  );
}

/**
 * Open capacity at a time. Single-course view gets a full-width dashed "Book" target;
 * the all-courses view gets one compact chip per course so a row stays one line tall.
 */
function OpenSlot({ course, timeMin, free, fit, compact }: { course: Course; timeMin: number; free: number; fit: number; compact?: boolean }) {
  const nav = useMobileNav();
  const locked = course.locked;
  const label = compact ? `${shortCourse(course)} · ${free}` : `Book · ${plural(free, 'slot')} open`;
  return (
    <ButtonBase
      disabled={locked}
      onClick={() => nav.push({ name: 'newTeeTime', courseId: course.id, timeMin, players: fit })}
      aria-label={`Book ${formatTimeLabel(timeMin)} on ${course.name}, ${free} open`}
      sx={{
        height: compact ? 32 : 44,
        px: compact ? 1.25 : 2,
        gap: 0.75,
        width: compact ? 'auto' : '100%',
        justifyContent: compact ? 'center' : 'flex-start',
        borderRadius: `${radius.sm}px`,
        border: `1px dashed ${md3.outline}`,
        color: locked ? md3.outline : md3.primary,
        typography: 'subtitle2',
      }}
    >
      {locked ? <Lock sx={{ fontSize: 16 }} /> : <Add sx={{ fontSize: 18 }} />}
      {locked ? `${shortCourse(course)} locked` : label}
    </ButtonBase>
  );
}

// ─── Sheets ─────────────────────────────────────────────────────────────────

type SheetItem = { icon: string; label: string; secondary?: string; destructive?: boolean; run: () => void };

function SheetList({ items }: { items: SheetItem[] }) {
  return (
    <List disablePadding>
      {items.map((it) => (
        <ListItemButton key={it.label} onClick={it.run} sx={{ color: it.destructive ? md3.error : md3.onSurface }}>
          <ListItemIcon>
            <Icon name={it.icon} size={24} color={it.destructive ? md3.error : md3.onSurfaceVariant} />
          </ListItemIcon>
          <ListItemText primary={it.label} secondary={it.secondary} />
        </ListItemButton>
      ))}
    </List>
  );
}

/**
 * Actions on a whole time row. The four Operations dialogs (block, note, price, league)
 * belong to the More destination's flows but are *reached* from here, because the time
 * is the thing the operator is looking at — so they push onto this stack and ✕ returns
 * to the sheet's row.
 *
 * Row-wide actions (check in, mark paid, move everyone) appear only when the row has
 * parties, and act on the parties in view: every course, or just the one the chips
 * scope to — "Move everyone" passes that `courseId` on to Move players.
 */
function TimeActionsSheet({ timeMin, course, onClose }: { timeMin: number; course: Course | null; onClose: () => void }) {
  const { state, dispatch, toast } = usePos();
  const nav = useMobileNav();
  const atTime = dayBookings(state).filter((b) => b.timeMin === timeMin && !isSlotHolder(b) && (!course || b.course === course.id));
  const golfers = atTime.reduce((s, b) => s + b.players, 0);
  const hasNote = Boolean(state.timeNotes[timeRowKey(state.currentDate, timeMin)]);
  const go = (fn: () => void) => () => {
    onClose();
    fn();
  };
  const bookable = course && !course.locked ? largestFit(dayBookings(state), course, timeMin) : 0;

  const items: SheetItem[] = [
    ...(bookable > 0 && course
      ? [{ icon: 'add_circle', label: `Book on ${shortCourse(course)}`, secondary: `${plural(bookable, 'slot')} together`, run: go(() => nav.push({ name: 'newTeeTime', courseId: course.id, timeMin, players: bookable })) }]
      : []),
    { icon: 'block', label: 'Block this time', secondary: course ? shortCourse(course) : 'All courses', run: go(() => nav.push({ name: 'blockTime', timeMin, courseId: course?.id })) },
    { icon: 'sticky_note_2', label: hasNote ? 'Edit note' : 'Add note', run: go(() => nav.push({ name: 'timeNote', timeMin })) },
    { icon: 'sell', label: 'Override price', run: go(() => nav.push({ name: 'priceOverride', timeMin })) },
    { icon: 'groups', label: 'Create league / outing', run: go(() => nav.push({ name: 'league', timeMin })) },
    ...(atTime.length
      ? [
          {
            icon: 'how_to_reg',
            label: 'Check in row',
            secondary: plural(golfers, 'golfer'),
            run: go(() => {
              atTime.forEach((b) =>
                dispatch({ type: 'patchBooking', bookingId: b.id, patch: { playerStates: b.playerStates.map(checkInPlayer) } }),
              );
              toast(`${formatTimeLabel(timeMin)} · checked in`);
            }),
          },
          {
            icon: 'paid',
            label: 'Mark row paid',
            secondary: plural(atTime.length, 'tee time'),
            run: go(() => {
              atTime.forEach((b) =>
                dispatch({ type: 'patchBooking', bookingId: b.id, patch: { pay: 'paid', playerStates: b.playerStates.map((p) => ({ ...p, paid: true })) } }),
              );
              toast(`${formatTimeLabel(timeMin)} · ${atTime.length} marked paid`);
            }),
          },
          {
            icon: 'swap_horiz',
            label: 'Move everyone',
            secondary: `${plural(atTime.length, 'tee time')} · pick a new time`,
            run: go(() => nav.push({ name: 'movePlayers', timeMin, courseId: course?.id })),
          },
        ]
      : []),
  ];

  return (
    <BottomSheet open onClose={onClose} title={formatTimeLabel(timeMin)}>
      <Typography variant="body2" sx={{ px: 3, mt: -0.5, mb: 1, color: md3.onSurfaceVariant }}>
        {dayLabel(state.currentDate)} · {course ? `${shortCourse(course)} · ` : ''}{plural(golfers, 'golfer')} across {plural(atTime.length, 'tee time')}
      </Typography>
      <SheetList items={items} />
    </BottomSheet>
  );
}

/** Quick actions on one booking — the long-press shortcut to what Booking Detail offers. */
function BookingActionsSheet({ bookingId, onClose }: { bookingId: string; onClose: () => void }) {
  const { state, dispatch, toast } = usePos();
  const nav = useMobileNav();
  const b = state.bookings.find((x) => x.id === bookingId);
  if (!b) return null;
  const course = state.courses.find((c) => c.id === b.course);
  const go = (fn: () => void) => () => {
    onClose();
    fn();
  };

  const items: SheetItem[] = isSlotHolder(b)
    ? [
        { icon: 'open_in_full', label: 'Details', run: go(() => nav.push({ name: 'bookingDetail', bookingId: b.id })) },
        { icon: 'edit', label: b.pay === 'event' ? 'Edit league' : 'Edit block', run: go(() => nav.push(b.pay === 'event' ? { name: 'league', timeMin: b.groupMeta?.startMin ?? b.timeMin } : { name: 'blockTime', timeMin: b.timeMin, courseId: b.course })) },
      ]
    : [
        { icon: 'open_in_full', label: 'Booking details', run: go(() => nav.push({ name: 'bookingDetail', bookingId: b.id })) },
        {
          icon: 'point_of_sale',
          label: 'Check in & pay',
          secondary: 'Opens the order in Register',
          run: go(() => {
            dispatch({ type: 'loadBooking', bookingId: b.id });
            nav.openIn('register', { name: 'order' });
          }),
        },
        {
          icon: 'how_to_reg',
          label: 'Check in all players',
          secondary: `${checkedInCount(b)}/${b.players} in`,
          run: go(() => {
            dispatch({ type: 'patchBooking', bookingId: b.id, patch: { playerStates: b.playerStates.map(checkInPlayer) } });
            toast(`${b.name} · all checked in`);
          }),
        },
        { icon: 'swap_horiz', label: 'Move tee time', run: go(() => nav.push({ name: 'movePlayers', bookingId: b.id })) },
        {
          icon: 'person_off',
          label: 'Mark no-show',
          destructive: true,
          run: go(() => {
            dispatch({ type: 'patchBooking', bookingId: b.id, patch: { pay: 'no_show', playerStates: b.playerStates.map((p) => ({ ...p, noShow: true, step: -1 })) } });
            toast(`${b.name} · no-show`);
          }),
        },
      ];

  return (
    <BottomSheet open onClose={onClose} title={b.name}>
      <Typography variant="body2" sx={{ px: 3, mt: -0.5, mb: 1, color: md3.onSurfaceVariant }}>
        {formatTimeLabel(b.timeMin)} · {course?.name} · {b.conf}
      </Typography>
      <SheetList items={items} />
    </BottomSheet>
  );
}
