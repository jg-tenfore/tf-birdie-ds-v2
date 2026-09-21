import { useState } from 'react';
import { Box, ButtonBase, Checkbox, List, ListItemButton, ListItemText, Typography } from '@mui/material';
import { md3, mobile, radius } from '../../../../theme/tokens';
import { formatTimeLabel, generateTimes, toDateStr } from '../../../data/courses';
import { largestFit, planMove } from '../../../logic/bookings';
import { Stack } from '../../../components/Stack';
import { dayBookings } from '../../../state/pos-store';
import { usePos } from '../../../state/PosProvider';
import type { Booking, Course } from '../../../types';
import { DialogTopBar, MobileScreen } from '../../chrome';
import { useMobileNav } from '../../navigation';
import type { ScreenProps } from '../types';
import { BookingCard, BookingGone, Callout, FilterChip, SectionHeader, Segmented, StatusBadge } from './parts';
import { bandMeta, bandOf, isSlotHolder, plural, shortCourse } from './tee-helpers';

/**
 * Move players — a full-screen dialog with two entry points, like the terminal's one
 * dialog reached from two menus:
 *
 * - **One booking** (`bookingId`), from Booking Detail's ⋮ or a booking's long-press sheet —
 *   that's what you're holding when you decide to move a party.
 * - **A whole tee time** (`timeMin`, optional `courseId`), from the time's actions sheet —
 *   "Move everyone". Every party at that time moves (just that course's when the sheet is
 *   scoped to one course), all ticked; untick any that should stay.
 *
 * The rules are the terminal's (`MovePlayers` in `modals/TimeRow.tsx`): blocks and league
 * holds never move (they're edited from their own dialogs), everyone who moves lands on
 * one course at one time, and a destination is offered only if `planMove` says the
 * movers plus whoever is already there fit the course's slots. Movers are seated in a
 * run, one party after another, before or after the existing occupants. A single party is
 * additionally never split: its time list also requires that many open slots side by side
 * (`largestFit`), as the sheet's own Book affordance does.
 */
/** Destination "course" meaning: each party stays on the course it's on. */
const KEEP = '__keep__';

/**
 * One exception to the terminal's one-course rule: moving a whole tee time from the
 * all-courses view defaults to **Keep courses** — every party moves to the new time on its
 * own course. A busy row across three courses holds more players than any single course
 * does, so the one-course rule would almost never fit; picking a course still applies it.
 */
export function MovePlayersScreen({ route }: ScreenProps<'movePlayers'>) {
  const { state, dispatch, toast } = usePos();
  const nav = useMobileNav();
  const dateStr = toDateStr(state.currentDate);
  const whole = route.bookingId == null;
  const single = route.bookingId != null ? state.bookings.find((x) => x.id === route.bookingId) : undefined;
  const fromTime = single?.timeMin ?? route.timeMin ?? 0;
  const source: Booking[] = whole
    ? dayBookings(state).filter(
        (b) => b.timeMin === fromTime && !isSlotHolder(b) && (!route.courseId || b.course === route.courseId),
      )
    : single
      ? [single]
      : [];

  const [selected, setSelected] = useState<string[]>(() => source.map((b) => b.id));
  // Only meaningful with more than one course to keep — a single nine has nothing to choose.
  const canKeep = whole && !route.courseId && state.courses.filter((c) => c.visible && !c.locked).length > 1;
  const [destCourse, setDestCourse] = useState(
    route.courseId ??
      (canKeep ? KEEP : undefined) ??
      source[0]?.course ??
      state.courses.find((c) => c.visible && !c.locked)?.id ??
      '',
  );
  const [destTime, setDestTime] = useState<number | null>(null);
  const [placement, setPlacement] = useState<'before' | 'after'>('after');
  if (!whole && !single) return <BookingGone />;

  const keep = destCourse === KEEP;
  const course = keep ? undefined : state.courses.find((c) => c.id === destCourse);
  const moving = source.filter((b) => selected.includes(b.id));
  // Keep courses: the movers grouped by the course they're on, each planned on its own.
  const groups = state.courses
    .map((c) => ({ course: c, list: moving.filter((b) => b.course === c.id) }))
    .filter((g) => g.list.length > 0);
  const fitsKeep = (t: number) =>
    moving.length > 0 &&
    t !== fromTime &&
    groups.every((g) => planMove(state.bookings, g.list, g.course, dateStr, t, 'after') != null);
  const movingPlayers = moving.reduce((s, b) => s + (b.players || 1), 0);
  const others = state.bookings.filter((x) => x.date === dateStr && !moving.includes(x));
  const fits = (c: Course, t: number) =>
    moving.length > 0 &&
    // Not a no-op: somebody has to actually go somewhere.
    !moving.every((b) => b.course === c.id && b.timeMin === t) &&
    planMove(state.bookings, moving, c, dateStr, t, 'after') != null &&
    (whole || largestFit(others, c, t) >= movingPlayers);
  const allTimes = generateTimes(state.settings).map((t) => t.totalMin);
  const times = keep ? allTimes.filter(fitsKeep) : course ? allTimes.filter((t) => fits(course, t)) : [];
  const plan =
    course && destTime != null && moving.length ? planMove(state.bookings, moving, course, dateStr, destTime, placement) : null;
  const keepPlans =
    keep && destTime != null && moving.length
      ? groups.map((g) => ({ ...g, plan: planMove(state.bookings, g.list, g.course, dateStr, destTime, placement) }))
      : null;
  const ready = keep ? Boolean(keepPlans?.every((g) => g.plan)) : Boolean(plan);
  const occupants = keep ? (keepPlans ?? []).flatMap((g) => g.plan?.occupants ?? []) : (plan?.occupants ?? []);

  const apply = () => {
    if (keep) {
      if (!keepPlans || destTime == null || !ready) return;
      for (const g of keepPlans) {
        let cursor = g.plan!.startSlot;
        for (const b of g.list) {
          dispatch({ type: 'patchBooking', bookingId: b.id, patch: { timeMin: destTime, slot: cursor } });
          cursor += b.players || 1;
        }
      }
      nav.pop();
      toast(`${plural(moving.length, 'tee time')} moved to ${formatTimeLabel(destTime)} · courses kept`);
      return;
    }
    if (!plan || destTime == null || !course) return;
    let cursor = plan.startSlot;
    for (const b of moving) {
      dispatch({ type: 'patchBooking', bookingId: b.id, patch: { course: course.id, timeMin: destTime, slot: cursor } });
      cursor += b.players || 1;
    }
    nav.pop();
    toast(
      moving.length === 1
        ? `${moving[0].name} moved to ${formatTimeLabel(destTime)} · ${course.name}`
        : `${plural(moving.length, 'tee time')} moved to ${formatTimeLabel(destTime)} · ${course.name}`,
    );
  };
  const toggle = (id: string) => {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };
  const who = moving.length === 1 ? moving[0].name : plural(moving.length, 'tee time');

  let lastBand = '';

  return (
    <MobileScreen topBar={<DialogTopBar
          title={whole ? `Move ${formatTimeLabel(fromTime)}` : 'Move tee time'}
          confirmLabel={whole && moving.length ? `Move ${moving.length}` : 'Move'}
          confirmDisabled={!ready}
          onConfirm={apply}
        />}>
      {whole ? (
        <>
          <SectionHeader>{`Moving from ${formatTimeLabel(fromTime)} · ${plural(movingPlayers, 'player')}`}</SectionHeader>
          {source.length === 0 ? (
            <Box sx={{ px: 2 }}>
              <Callout tone="info" icon="info">
                Nothing movable at {formatTimeLabel(fromTime)}
                {route.courseId ? ` on ${shortCourse(state.courses.find((c) => c.id === route.courseId))}` : ''}. Blocks and leagues are
                edited from their own dialogs.
              </Callout>
            </Box>
          ) : (
            <List disablePadding>
              {source.map((b) => (
                <ListItemButton key={b.id} onClick={() => toggle(b.id)} sx={{ gap: 2, minHeight: 72 }}>
                  <ListItemText
                    primary={b.name}
                    secondary={`${shortCourse(state.courses.find((c) => c.id === b.course))} · ${plural(b.players, 'player')} · slot ${b.slot + 1}`}
                  />
                  <StatusBadge pay={b.pay} />
                  <Checkbox edge="end" checked={selected.includes(b.id)} tabIndex={-1} />
                </ListItemButton>
              ))}
            </List>
          )}
        </>
      ) : (
        single && (
          <>
            <SectionHeader>Moving</SectionHeader>
            <Box sx={{ px: 2 }}>
              <BookingCard
                booking={single}
                course={state.courses.find((c) => c.id === single.course)}
                showTime={formatTimeLabel(single.timeMin)}
                onClick={() => {}}
              />
            </Box>
          </>
        )
      )}

      <SectionHeader>To course</SectionHeader>
      <Stack direction="row" gap={1} flexWrap="wrap" sx={{ px: 2 }}>
        {canKeep && (
          <FilterChip
            label="Keep courses"
            selected={keep}
            onClick={() => {
              setDestCourse(KEEP);
              setDestTime(null);
            }}
          />
        )}
        {state.courses
          .filter((c) => c.visible && !c.locked)
          .map((c) => (
            <FilterChip
              key={c.id}
              label={shortCourse(c)}
              selected={destCourse === c.id}
              onClick={() => {
                setDestCourse(c.id);
                setDestTime(null);
              }}
            />
          ))}
      </Stack>

      <SectionHeader>{`To time · ${plural(times.length, 'time')} fit ${plural(movingPlayers, 'player')}`}</SectionHeader>
      <Box sx={{ px: 2, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
        {times.map((t) => {
          const band = bandOf(t);
          const header = band !== lastBand;
          lastBand = band;
          const on = destTime === t;
          return (
            <Box key={t} sx={{ display: 'contents' }}>
              {header && (
                <Typography variant="caption" sx={{ gridColumn: '1 / -1', mt: 1 }}>
                  {bandMeta(band).label}
                </Typography>
              )}
              <ButtonBase
                onClick={() => setDestTime(t)}
                aria-pressed={on}
                sx={{
                  height: 44,
                  borderRadius: `${radius.sm}px`,
                  border: `1px solid ${on ? mobile.secondaryContainer : md3.outlineVariant}`,
                  bgcolor: on ? mobile.secondaryContainer : 'transparent',
                  color: on ? mobile.onSecondaryContainer : md3.onSurface,
                  typography: 'subtitle2',
                }}
              >
                {formatTimeLabel(t).replace(' ', ' ')}
              </ButtonBase>
            </Box>
          );
        })}
      </Box>

      {ready && occupants.length > 0 && (
        <>
          <SectionHeader>Starting order</SectionHeader>
          <Box sx={{ px: 2 }}>
            <Segmented
              ariaLabel="Placement"
              value={placement}
              options={[
                { value: 'before', label: 'Before others' },
                { value: 'after', label: 'After others' },
              ]}
              onChange={setPlacement}
            />
          </Box>
        </>
      )}

      <Box sx={{ p: 2 }}>
        {destTime == null && moving.length > 0 && times.length === 0 ? (
          <Callout tone="warning" icon="warning">
            {keep
              ? 'No time has room for every party on its own course. Untick a party, or pick one course.'
              : `No time on ${course?.name} has room for ${plural(movingPlayers, 'player')}${
                  whole ? ' together. Untick a party, or try another course.' : ' side by side. Try another course.'
                }`}
          </Callout>
        ) : destTime == null ? (
          <Callout tone="info" icon="swap_horiz">
            {moving.length === 0
              ? 'Tick at least one tee time to move.'
              : keep
                ? 'Pick a time. Each party keeps its course, so only times with room on every one of them are listed.'
                : whole
                ? `Pick a time. Everyone ticked lands together at one time on one course, so only times with room for ${plural(movingPlayers, 'player')} are listed.`
                : `Pick a time. The party stays together, so only times with ${plural(movingPlayers, 'open slot')} side by side are listed.`}
          </Callout>
        ) : keep && ready ? (
          <Callout tone="success" icon="check_circle">
            {who} · {plural(movingPlayers, 'player')} → {formatTimeLabel(destTime)}, each on its own course
            {occupants.length ? `, ${placement} ${occupants.map((o) => o.name).join(', ')}` : ''}.
          </Callout>
        ) : plan ? (
          <Callout tone="success" icon="check_circle">
            {who} · {plural(movingPlayers, 'player')} → {formatTimeLabel(destTime)} on {course?.name}
            {plan.occupants.length ? `, ${placement} ${plan.occupants.map((o) => o.name).join(', ')}` : ''}.
          </Callout>
        ) : (
          <Callout tone="danger" icon="block">
            Not enough room at {formatTimeLabel(destTime)}{keep ? ' on every course' : ` on ${course?.name}`}.
          </Callout>
        )}
      </Box>
    </MobileScreen>
  );
}
