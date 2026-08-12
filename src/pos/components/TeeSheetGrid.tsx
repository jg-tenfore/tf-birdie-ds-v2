import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, ButtonBase, Tooltip, Typography } from '@mui/material';
import { grid as gridTokens, md3, noteColors, radius, shifts } from '../../theme/tokens';
import { DEMO_TODAY } from '../data/bookings';
import { TIMES, formatTimeLabel } from '../data/courses';
import { dayBookings, timeRowKey, visibleCourses } from '../state/pos-store';
import { usePos } from '../state/PosProvider';
import type { Booking, Course, TimeSlot } from '../types';
import { Icon, MemberDot } from './primitives';
import { Stack } from './Stack';

/**
 * The tee-sheet calendar grid.
 *
 * Structure is a time gutter plus one column *group* per visible course, each
 * `course.slots` cells wide. A booking occupies `players` consecutive cells
 * starting at `slot`, so a foursome renders as one wide chip and a single renders
 * narrow — the row reads as capacity at a glance without any numbers.
 *
 * Chip colour encodes payment state, not booking type: solid green is paid, white
 * with a green outline is unpaid, hatched grey is a no-show or rain check, orange
 * is refunded, hatched slate is a block, violet is a league event. That ordering
 * is deliberate — an operator working the counter needs "who still owes money"
 * before anything else.
 */
export function TeeSheetGrid() {
  const { state, dispatch } = usePos();
  const courses = visibleCourses(state);
  const bookings = dayBookings(state);
  const scrollRef = useRef<HTMLDivElement>(null);

  const shift = shifts[state.shift] ?? shifts.full;
  const shiftStart = shift.startH * 60 + shift.startM;
  const shiftEnd = shift.endH * 60 + shift.endM;
  const rowH = state.settings.compactMode ? gridTokens.rowHCompact : gridTokens.rowH;

  const times = useMemo(
    () => TIMES.filter((t) => t.totalMin >= shiftStart && t.totalMin < shiftEnd),
    [shiftStart, shiftEnd],
  );

  // Index bookings by course + time so each cell is an O(1) lookup rather than a
  // scan — at 91 rows × 3 courses × 4 slots that difference is visible.
  const byCell = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of bookings) {
      const key = `${b.course}:${b.timeMin}`;
      const list = map.get(key);
      if (list) list.push(b);
      else map.set(key, [b]);
    }
    return map;
  }, [bookings]);

  /**
   * Row tint. On the full-day view each band gets its own wash so the shape of the
   * day is legible while scrolling; a single-band view uses that band's tint.
   */
  const rowBg = (h: number): string | undefined => {
    if (state.shift === 'full') {
      if (h < 10) return 'rgba(245,158,11,.04)';
      if (h < 14) return 'rgba(22,163,74,.04)';
      return 'rgba(124,58,237,.04)';
    }
    return shift.bandBg ?? undefined;
  };

  /** Band separator rows, shown only on the full-day view at each band boundary. */
  const bandLabel = (h: number) => {
    if (state.shift !== 'full') return null;
    if (h === state.settings.gridStartHour && h < 10)
      return { label: 'Early Morning', icon: 'wb_twilight', color: '#f59e0b', sub: '6:00 AM – 10:00 AM' };
    if (h === 10)
      return { label: 'Peak Hours', icon: 'wb_sunny', color: '#16a34a', sub: '10:00 AM – 2:00 PM' };
    if (h === 14)
      return { label: 'Twilight', icon: 'nightlight', color: '#7c3aed', sub: '2:00 PM – 6:00 PM' };
    return null;
  };

  // Scroll to the current time on mount, so the sheet opens where work is
  // happening rather than at 6am. Only when the viewed day is the demo "today".
  const isToday = DEMO_TODAY().toDateString() === state.currentDate.toDateString();
  useEffect(() => {
    if (!state.settings.autoScrollNow || !isToday || !scrollRef.current) return;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const offset =
      ((nowMin - state.settings.gridStartHour * 60) / state.settings.intervalMins) * rowH - 180;
    scrollRef.current.scrollTop = Math.max(0, offset);
  }, [isToday, rowH, state.settings.autoScrollNow, state.settings.gridStartHour, state.settings.intervalMins]);

  return (
    <Box ref={scrollRef} sx={{ flex: 1, overflow: 'auto', position: 'relative' }}>
      <Box sx={{ position: 'relative', width: '100%' }}>
        {/* ── Sticky course headers ── */}
        <Stack
          direction="row"
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 15,
            bgcolor: '#fff',
            width: '100%',
            borderBottom: `1.5px solid ${md3.outlineVariant}`,
            boxShadow: '0 2px 4px rgba(0,0,0,.06)',
          }}
        >
          <Box
            sx={{
              width: gridTokens.timeGutterW,
              flexShrink: 0,
              borderRight: `1px solid ${md3.outlineVariant}`,
            }}
          />
          {courses.map((course, i) => (
            <CourseHeader
              key={course.id}
              course={course}
              bookings={bookings.filter((b) => b.course === course.id)}
              isLast={i === courses.length - 1}
            />
          ))}
        </Stack>

        {/* ── Time rows ── */}
        {times.map((t) => {
          const band = bandLabel(t.h);
          const noteKey = timeRowKey(state.currentDate, t.totalMin);
          const note = state.timeNotes[noteKey];
          const priceOverride = state.timePrices[noteKey];

          // "Hide empty rows" drops any row with no booking on any course.
          if (state.settings.hideEmpty) {
            const any = courses.some((c) => byCell.has(`${c.id}:${t.totalMin}`));
            if (!any) return null;
          }

          return (
            <Box key={t.totalMin}>
              {band && t.m === 0 && (
                <Stack
                  direction="row"
                  sx={{ height: 28, borderBottom: `1px solid ${md3.outlineVariant}`, width: '100%' }}
                >
                  <Box
                    sx={{
                      width: gridTokens.timeGutterW,
                      flexShrink: 0,
                      borderRight: `1px solid ${md3.outlineVariant}`,
                      bgcolor: '#fff',
                    }}
                  />
                  <Stack
                    direction="row"
                    alignItems="center"
                    gap={1}
                    sx={{
                      flex: 1,
                      px: 1.75,
                      bgcolor: rowBg(t.h),
                      borderTop: `2px solid ${band.color}22`,
                    }}
                  >
                    <Icon name={band.icon} size={14} color={band.color} />
                    <Typography
                      sx={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: band.color,
                        letterSpacing: '.4px',
                        textTransform: 'uppercase',
                      }}
                    >
                      {band.label}
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: md3.outline, fontWeight: 500 }}>
                      {band.sub}
                    </Typography>
                  </Stack>
                </Stack>
              )}

              {priceOverride && <PriceOverrideBanner timeMin={t.totalMin} />}

              <Stack
                direction="row"
                sx={{
                  height: rowH,
                  borderBottom: `1px solid ${md3.outlineVariant}`,
                  width: '100%',
                  bgcolor: rowBg(t.h),
                }}
              >
                <TimeLabel time={t} hasOverride={Boolean(priceOverride)} />
                {courses.map((course, ci) => (
                  <CourseGroup
                    key={course.id}
                    course={course}
                    timeMin={t.totalMin}
                    cellBookings={byCell.get(`${course.id}:${t.totalMin}`) ?? []}
                    isLast={ci === courses.length - 1}
                  />
                ))}
              </Stack>

              {note && <NoteBanner timeMin={t.totalMin} />}
            </Box>
          );
        })}

        {isToday && <NowLine rowH={rowH} />}
      </Box>

      {/* Read so the grid re-renders when the operator changes an unrelated setting. */}
      <Box sx={{ display: 'none' }}>{String(state.settings.colorblindMode)}</Box>
      <Box sx={{ display: 'none' }}>{String(dispatch.length)}</Box>
    </Box>
  );
}

// ─── Course header ──────────────────────────────────────────────────────────

/**
 * Course name, hole count, the day's load, and slot labels.
 *
 * The three stats are golfers / carts / walkers. Carts halve and round up because
 * a riding cart seats two — four riders is two carts, three riders is still two.
 */
function CourseHeader({
  course,
  bookings,
  isLast,
}: {
  course: Course;
  bookings: Booking[];
  isLast: boolean;
}) {
  const { dispatch } = usePos();
  const real = bookings.filter((b) => b.pay !== 'block' && b.pay !== 'event');
  const total = real.reduce((s, b) => s + b.players, 0);
  const riders = real.filter((b) => b.cart === 'cart').reduce((s, b) => s + b.players, 0);
  const walkers = real.filter((b) => b.cart !== 'cart').reduce((s, b) => s + b.players, 0);

  return (
    <Stack
      sx={{
        flex: 1,
        minWidth: 0,
        borderRight: isLast ? 'none' : `2px solid ${md3.outlineVariant}`,
        opacity: course.locked ? 0.72 : 1,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ p: '7px 11px 3px', borderBottom: `1px solid ${md3.surfaceContainer}` }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" alignItems="center" gap={0.5}>
            {course.locked && <Icon name="lock" size={12} color={md3.outline} />}
            <Typography sx={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }}>
              {course.name}
            </Typography>
          </Stack>
          <Typography
            sx={{ fontSize: 10, fontWeight: 600, color: md3.onSurfaceVariant, letterSpacing: '.4px' }}
          >
            {course.holes}
          </Typography>
        </Box>
        <Stack direction="row" gap={0.375} sx={{ flexShrink: 0 }}>
          <ButtonBase
            title="Tee time prices"
            onClick={() =>
              dispatch({ type: 'openModal', modal: { kind: 'courseRates', courseId: course.id } })
            }
            sx={{ p: 0.375, borderRadius: '50%', color: md3.onSurfaceVariant, '&:hover': { bgcolor: md3.surfaceContainer } }}
          >
            <Icon name="info" size={17} />
          </ButtonBase>
          <CourseMenuButton course={course} />
        </Stack>
      </Stack>

      {course.note && (
        <Box
          sx={{
            px: 1.375,
            py: 0.375,
            fontSize: 10,
            bgcolor: '#fffbeb',
            borderBottom: '1px solid #fde68a',
            color: '#92400e',
          }}
        >
          📌 {course.note}
        </Box>
      )}

      <Stack direction="row" alignItems="center" gap={1.25} sx={{ p: '4px 11px 5px' }}>
        {[
          [total, 'person'],
          [Math.ceil(riders / 2) || 0, 'directions_car'],
          [walkers, 'directions_walk'],
        ].map(([n, icon]) => (
          <Stack key={icon as string} direction="row" alignItems="center" gap={0.375}>
            <Typography sx={{ fontSize: 12, fontWeight: 800 }}>{n as number}</Typography>
            <Icon name={icon as string} size={13} color={md3.onSurfaceVariant} />
          </Stack>
        ))}
      </Stack>

      <Stack direction="row">
        {Array.from({ length: course.slots }, (_, i) => (
          <Box
            key={i}
            sx={{
              flex: 1,
              height: gridTokens.slotHeaderH,
              borderRight: i === course.slots - 1 ? 'none' : `1px solid ${md3.surfaceContainer}`,
              fontSize: 9,
              fontWeight: 700,
              color: md3.outline,
              letterSpacing: '.3px',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Slot {i + 1}
          </Box>
        ))}
      </Stack>
    </Stack>
  );
}

/** The per-course ⋮ menu: locking, notes, intervals, focus, hide. */
function CourseMenuButton({ course }: { course: Course }) {
  const { state, dispatch, toast } = usePos();
  const items = [
    { section: 'Course' },
    {
      icon: course.locked ? 'lock' : 'lock',
      label: course.locked ? 'Unlock course' : 'Lock course',
      sub: course.locked ? 'Allow new bookings' : 'Prevent new bookings',
      active: course.locked,
      run: () => {
        dispatch({ type: 'patchCourse', courseId: course.id, patch: { locked: !course.locked } });
        toast(course.locked ? `${course.name} unlocked` : `${course.name} locked`);
      },
    },
    {
      icon: 'sticky_note_2',
      label: 'Add note',
      sub: course.note || 'No note set',
      run: () => {
        const note = window.prompt(`Note for ${course.name}:`, course.note ?? '');
        if (note === null) return;
        dispatch({ type: 'patchCourse', courseId: course.id, patch: { note } });
        toast(note ? 'Note saved' : 'Note cleared');
      },
    },
    {
      icon: 'schedule',
      label: 'Time settings',
      sub: `${state.settings.intervalMins} min · ${formatTimeLabel(state.settings.gridStartHour * 60)}–${formatTimeLabel(state.settings.gridEndHour * 60)}`,
      run: () =>
        dispatch({ type: 'openModal', modal: { kind: 'courseTimeSettings', courseId: course.id } }),
    },
    {
      icon: 'sell',
      label: 'Tee time prices',
      sub: 'By time band & rate',
      run: () => dispatch({ type: 'openModal', modal: { kind: 'courseRates', courseId: course.id } }),
    },
    { section: 'View' },
    {
      icon: 'bar_chart',
      label: 'Course summary',
      sub: 'Stats & bookings panel',
      run: () => dispatch({ type: 'openSidebar', courseId: course.id }),
    },
    {
      icon: 'fullscreen',
      label: 'Focus this course',
      sub: 'Hide other courses',
      run: () => {
        dispatch({ type: 'focusCourse', courseId: course.id });
        toast(`Showing ${course.name} only`);
      },
    },
    {
      icon: 'view_column',
      label: 'Show all courses',
      sub: 'Reset to all visible',
      run: () => dispatch({ type: 'showAllCourses' }),
    },
    { section: 'Danger' },
    {
      icon: 'visibility_off',
      label: 'Hide course',
      sub: 'Remove from tee sheet',
      destructive: true,
      run: () => {
        if (state.courses.filter((c) => c.visible).length <= 1)
          return toast('At least one course must stay visible');
        dispatch({ type: 'patchCourse', courseId: course.id, patch: { visible: false } });
        toast(`${course.name} hidden`);
      },
    },
  ];

  return <MenuPopover items={items} icon="more_vert" />;
}

/**
 * A lightweight popover menu with section headers and two-line items.
 *
 * MUI's `Menu` renders one line per item; the prototype's course and context
 * menus need a label plus a sub-label, so this keeps that shape.
 */
export function MenuPopover({
  items,
  icon,
  width = 224,
}: {
  items: Array<
    | { section: string }
    | { icon: string; label: string; sub?: string; destructive?: boolean; active?: boolean; run: () => void }
  >;
  icon: string;
  width?: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ButtonBase
        onClick={() => setOpen(!open)}
        sx={{ p: 0.375, borderRadius: '50%', color: md3.onSurfaceVariant, '&:hover': { bgcolor: md3.surfaceContainer } }}
      >
        <Icon name={icon} size={17} />
      </ButtonBase>
      {open && (
        <>
          <Box
            onClick={() => setOpen(false)}
            sx={{ position: 'fixed', inset: 0, zIndex: 199 }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              right: 0,
              width,
              bgcolor: '#fff',
              border: `1.5px solid ${md3.outlineVariant}`,
              borderRadius: `${radius.md}px`,
              boxShadow: '0 4px 8px 3px rgba(0,0,0,.1),0 1px 3px rgba(0,0,0,.12)',
              zIndex: 200,
              overflow: 'hidden',
              textAlign: 'left',
            }}
          >
            {items.map((item, i) =>
              'section' in item ? (
                <Box
                  key={`s${i}`}
                  sx={{
                    p: '5px 14px 3px',
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: '.7px',
                    textTransform: 'uppercase',
                    color: md3.outline,
                    borderTop: i === 0 ? 'none' : `1px solid ${md3.surfaceContainer}`,
                  }}
                >
                  {item.section}
                </Box>
              ) : (
                <Stack
                  key={item.label}
                  direction="row"
                  alignItems="center"
                  gap={1.25}
                  onClick={() => {
                    setOpen(false);
                    item.run();
                  }}
                  sx={{
                    p: '11px 14px',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: item.active ? 700 : 500,
                    color: item.destructive ? md3.error : item.active ? md3.primary : md3.onSurface,
                    borderBottom: `1px solid ${md3.surfaceContainer}`,
                    '&:last-of-type': { borderBottom: 'none' },
                    '&:hover': { bgcolor: item.destructive ? '#fff0ee' : md3.surfaceContainer },
                  }}
                >
                  <Icon
                    name={item.icon}
                    size={17}
                    color={item.destructive ? md3.error : item.active ? md3.primary : md3.outline}
                  />
                  <Box>
                    <Box>{item.label}</Box>
                    {item.sub && (
                      <Box sx={{ fontSize: 10, color: md3.outline, mt: '1px', fontWeight: 400 }}>
                        {item.sub}
                      </Box>
                    )}
                  </Box>
                </Stack>
              ),
            )}
          </Box>
        </>
      )}
    </>
  );
}

// ─── Time label ─────────────────────────────────────────────────────────────

/**
 * The time gutter cell. Clicking it opens the row menu — block the slot, note it,
 * price it, start a league, or move players out of it.
 */
function TimeLabel({ time, hasOverride }: { time: TimeSlot; hasOverride: boolean }) {
  const { dispatch } = usePos();
  return (
    <ButtonBase
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        dispatch({
          type: 'openContextMenu',
          menu: { kind: 'timeLabel', timeMin: time.totalMin, x: r.right + 6, y: r.top },
        });
      }}
      sx={{
        width: gridTokens.timeGutterW,
        flexShrink: 0,
        flexDirection: 'column',
        gap: '1px',
        fontSize: 10,
        fontWeight: 700,
        color: md3.outline,
        borderRight: `1px solid ${md3.outlineVariant}`,
        bgcolor: '#fff',
        position: 'sticky',
        left: 0,
        zIndex: 5,
        userSelect: 'none',
        '&:hover': { bgcolor: md3.surfaceContainer, color: md3.primary },
      }}
    >
      {time.label}
      {hasOverride && (
        <Box
          component="span"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 14,
            height: 14,
            px: '3px',
            borderRadius: '7px',
            bgcolor: '#16a34a',
            color: '#fff',
            fontSize: 9,
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          $
        </Box>
      )}
    </ButtonBase>
  );
}

// ─── Cells and chips ────────────────────────────────────────────────────────

/**
 * One course's slot cells for a single time row.
 *
 * Walks the slots left to right. A booking claims `players` cells, so the walk
 * skips ahead by its span; cells covered by an earlier booking are marked occupied
 * and never rendered as empty. Empty cells are add-affordances.
 */
function CourseGroup({
  course,
  timeMin,
  cellBookings,
  isLast,
}: {
  course: Course;
  timeMin: number;
  cellBookings: Booking[];
  isLast: boolean;
}) {
  const { state, dispatch } = usePos();

  const occupied = new Set<number>();
  for (const b of cellBookings) {
    for (let s = b.slot + 1; s < b.slot + b.players && s < course.slots; s++) occupied.add(s);
  }

  const cells: React.ReactNode[] = [];
  let si = 0;
  while (si < course.slots) {
    if (occupied.has(si)) {
      si++;
      continue;
    }
    const booking = cellBookings.find((b) => b.slot === si);
    if (booking) {
      const span = Math.min(booking.players, course.slots - si);
      cells.push(
        <Box
          key={`b${si}`}
          sx={{ flex: span, position: 'relative', minWidth: 0, cursor: 'pointer' }}
          onClick={() => {
            if (state.multiSelectActive)
              return dispatch({ type: 'toggleMultiSelect', bookingId: booking.id });
            dispatch({ type: 'loadBooking', bookingId: booking.id });
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            dispatch({
              type: 'openContextMenu',
              menu: { kind: 'booking', bookingId: booking.id, x: e.clientX, y: e.clientY },
            });
          }}
        >
          <BookingChip booking={booking} compact={state.settings.compactMode} />
        </Box>,
      );
      si += span;
    } else {
      const locked = course.locked;
      cells.push(
        <ButtonBase
          key={`e${si}`}
          disabled={locked}
          onClick={() =>
            dispatch({
              type: 'openModal',
              modal: { kind: 'newBooking', courseId: course.id, timeMin, startSlot: si },
            })
          }
          sx={{
            flex: 1,
            minWidth: 0,
            height: '100%',
            borderRight: `1px solid ${md3.surfaceContainer}`,
            '&:hover': { bgcolor: 'rgba(23,163,74,.05)', '& svg': { transform: 'scale(1.12)', color: md3.primary } },
          }}
        >
          {!locked && (
            <Icon name="add_circle" size={20} color={md3.outlineVariant} sx={{ transition: 'all .1s' }} />
          )}
        </ButtonBase>,
      );
      si++;
    }
  }

  return (
    <Stack
      direction="row"
      sx={{
        flex: 1,
        minWidth: 0,
        borderRight: isLast ? 'none' : `2px solid ${md3.outlineVariant}`,
      }}
    >
      {cells}
    </Stack>
  );
}

/** Payment-state-derived chip styling. Exported so list view can reuse it. */
export function chipStyle(booking: Booking) {
  const allPaid = booking.playerStates?.length
    ? booking.playerStates.every((p) => p.paid)
    : booking.pay === 'paid';

  if (booking.pay === 'block')
    return {
      bg: 'repeating-linear-gradient(135deg,#475569 0px,#475569 8px,#334155 8px,#334155 16px)',
      border: '#334155',
      name: '#fff',
      meta: 'rgba(255,255,255,.8)',
      status: 'BLOCKED',
    };
  if (booking.pay === 'event')
    return { bg: '#7c3aed', border: '#6d28d9', name: '#fff', meta: 'rgba(255,255,255,.85)', status: 'EVENT' };
  if (booking.pay === 'no_show' || booking.pay === 'rain_chk')
    return {
      bg: 'repeating-linear-gradient(45deg,#e8ece8 0px,#e8ece8 5px,#d0d4d0 5px,#d0d4d0 10px)',
      border: '#b0b8b0',
      name: '#888',
      meta: '#aaa',
      status: booking.pay === 'no_show' ? 'NO SHOW' : 'RAIN CHK',
    };
  if (booking.pay === 'refund')
    return { bg: '#ea580c', border: '#c2410c', name: '#fff', meta: 'rgba(255,255,255,.75)', status: 'REFUNDED' };
  if (allPaid || booking.pay === 'paid')
    return { bg: md3.primary, border: md3.primary, name: '#fff', meta: 'rgba(255,255,255,.75)', status: '' };
  return { bg: '#fff', border: md3.primary, name: md3.onSurface, meta: md3.onSurfaceVariant, status: '' };
}

/**
 * The booking chip. Name on top, then either a status word or the load summary
 * (players · transport · holes). Compact mode drops the meta line and keeps the
 * name, which is what fits in a 30px row.
 */
function BookingChip({ booking, compact }: { booking: Booking; compact: boolean }) {
  const { state } = usePos();
  const s = chipStyle(booking);
  const isSelected = state.selectedBookingId === booking.id;
  const isMultiSelected = state.multiSelectIds.includes(booking.id);
  const isBlock = booking.pay === 'block';
  const isEvent = booking.pay === 'event';

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: '2px',
        borderRadius: `${radius.sm}px`,
        p: '3px 7px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '1px',
        overflow: 'hidden',
        zIndex: 2,
        background: s.bg,
        border: `1.5px solid ${s.border}`,
        transition: 'filter .1s, transform .1s',
        ...(isSelected && { outline: `2.5px solid ${md3.onSurface}`, outlineOffset: '1px' }),
        ...(isMultiSelected && {
          outline: '3px solid #2563eb',
          outlineOffset: '2px',
          boxShadow: '0 0 0 5px rgba(37,99,235,.18)',
        }),
        ...(state.multiSelectActive && !isMultiSelected && { opacity: 0.82 }),
        '&:hover': { filter: 'brightness(.92)', transform: 'scale(1.03)' },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        gap="2px"
        sx={{
          fontSize: 9,
          fontWeight: 800,
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          lineHeight: 1.2,
          color: s.name,
        }}
      >
        {!isBlock && !isEvent && <MemberDot phone={booking.phone} size={6} />}
        {isBlock && <Icon name="block" size={11} />}
        {isEvent && <Icon name="emoji_events" size={11} />}
        <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {booking.name}
        </Box>
      </Stack>

      {!compact && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ fontSize: 9, fontWeight: 600, color: s.meta }}
        >
          <Stack direction="row" alignItems="center" gap="3px">
            {s.status ? (
              <Box component="span" sx={{ fontSize: 7.5, fontWeight: 800, letterSpacing: '.3px' }}>
                {s.status}
              </Box>
            ) : (
              <>
                <span>{booking.players}P</span>
                <Icon name={booking.cart === 'cart' ? 'directions_car' : 'directions_walk'} size={11} />
                {booking.holes && (
                  <Box component="span" sx={{ fontSize: 8, fontWeight: 800, opacity: 0.85 }}>
                    {booking.holes}
                  </Box>
                )}
              </>
            )}
          </Stack>
          {!s.status && booking.note && (
            <Tooltip title={booking.note}>
              <Icon name="sticky_note_2" size={11} sx={{ opacity: 0.8 }} />
            </Tooltip>
          )}
        </Stack>
      )}
    </Box>
  );
}

// ─── Row banners ────────────────────────────────────────────────────────────

/** The operator note pinned under a time row. */
function NoteBanner({ timeMin }: { timeMin: number }) {
  const { state, dispatch } = usePos();
  const key = timeRowKey(state.currentDate, timeMin);
  const note = state.timeNotes[key];
  if (!note) return null;
  const c = noteColors[note.color] ?? noteColors.yellow;

  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={1}
      onClick={() => dispatch({ type: 'openModal', modal: { kind: 'timeNote', timeMin } })}
      sx={{
        px: 1.75,
        py: 0.625,
        bgcolor: c.bg,
        borderBottom: `1px solid ${c.border}`,
        cursor: 'pointer',
        fontSize: 11,
        color: c.text,
      }}
    >
      <Icon name="sticky_note_2" size={13} color={c.dot} />
      <Box component="span" sx={{ fontWeight: 800 }}>
        {formatTimeLabel(timeMin).replace(/\s+/g, '')}
      </Box>
      <Box component="span" sx={{ flex: 1 }}>
        {note.text}
      </Box>
      <Icon name="edit" size={12} />
    </Stack>
  );
}

/** The price-override banner shown above its anchor row. */
function PriceOverrideBanner({ timeMin }: { timeMin: number }) {
  const { state, dispatch } = usePos();
  const key = timeRowKey(state.currentDate, timeMin);
  const entry = state.timePrices[key];
  if (!entry) return null;

  const start = formatTimeLabel(timeMin).replace(/\s+/g, '');
  const end = entry.rangeEnd ? formatTimeLabel(entry.rangeEnd).replace(/\s+/g, '') : null;
  const range = end && entry.rangeEnd !== timeMin ? `${start}–${end}` : start;

  const parts = [
    entry.fee != null && `Fee $${entry.fee}`,
    entry.walking != null && `Walk $${entry.walking}`,
    entry.cart != null && `Cart $${entry.cart}`,
    entry.walkingCart != null && `W+C $${entry.walkingCart}`,
  ].filter(Boolean);

  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={1}
      onClick={() => dispatch({ type: 'openModal', modal: { kind: 'timePrice', timeMin } })}
      sx={{
        px: 1.75,
        py: 0.625,
        bgcolor: '#f0fdf4',
        borderBottom: '1px solid #bbf7d0',
        cursor: 'pointer',
        fontSize: 11,
        color: '#166534',
      }}
    >
      <Icon name="sell" size={13} color="#16a34a" />
      <Box component="span" sx={{ fontWeight: 800 }}>
        {range}
      </Box>
      {entry.label && <Box component="span" sx={{ fontWeight: 700 }}>{entry.label}</Box>}
      <Box component="span" sx={{ flex: 1, opacity: 0.85 }}>
        {parts.join(' · ')}
      </Box>
      <Icon name="edit" size={12} />
    </Stack>
  );
}

/** The red "now" rule, positioned by wall-clock time against the grid geometry. */
function NowLine({ rowH }: { rowH: number }) {
  const { state } = usePos();
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const startMin = state.settings.gridStartHour * 60;
  const endMin = state.settings.gridEndHour * 60;
  if (nowMin < startMin || nowMin > endMin) return null;

  const top = ((nowMin - startMin) / state.settings.intervalMins) * rowH;

  return (
    <Box
      sx={{
        position: 'absolute',
        left: gridTokens.timeGutterW,
        right: 0,
        top,
        height: 2,
        bgcolor: '#dc2626',
        zIndex: 10,
        pointerEvents: 'none',
        '&::before': {
          content: '""',
          position: 'absolute',
          left: -4,
          top: -3,
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: '#dc2626',
        },
      }}
    />
  );
}
