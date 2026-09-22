import { useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Box, Button, ButtonBase, IconButton, Typography } from '@mui/material';
import { keyframes } from '@emotion/react';
import ArrowDropDown from '@mui/icons-material/ArrowDropDown';
import ArrowDropUp from '@mui/icons-material/ArrowDropUp';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import { md3, mobile } from '../../../../theme/tokens';
import { DEMO_TODAY, demoRange, isInDemoRange } from '../../../data/bookings';
import { toDateStr } from '../../../data/courses';
import { Stack } from '../../../components/Stack';
import { clampToDemoRange, unfilledDemoDay } from '../../../state/demo-days';
import { usePos } from '../../../state/PosProvider';
import { BottomSheet } from '../../chrome';
import type { RouteOf } from '../../navigation';
import { dayLabel, isSlotHolder, plural } from './tee-helpers';

/**
 * Weston Edits — date navigation on the phone.
 *
 * Weston's round-two feedback: on the base phone the only ways off the day were one-day
 * ‹ › taps or a "Go to date" list of the demo's eleven days, so reaching June took a dozen
 * taps. The Weston edition replaces both with the MD3 patterns for it:
 *
 *  - `WeekStrip` — the week you're in, one tap per day; swipe (or the date row's ‹ ›)
 *    moves a week at a time.
 *  - `CalendarSheet` — the MD3 date picker as a frame-confined bottom sheet: a month grid,
 *    ‹ › by month, a month/year header that opens a year → month chooser for far jumps,
 *    and Today.
 *  - `useDemoDayFill` (`src/pos/state/use-demo-day-fill.ts`, shared with the tablet) — any date
 *    within a year of today gets a generated tee sheet.
 *
 * Every date is clamped to `demoRange()` (today ± 12 months); beyond it the calendar and
 * the strip grey days out.
 */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const sameDay = (a: Date, b: Date) => toDateStr(a) === toDateStr(b);
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** `YYYY-MM` → [year, month index]. */
function parseMonth(s: string): [number, number] {
  const [y, m] = s.split('-').map(Number);
  return [y, m - 1];
}

/**
 * Tee times per date, for dots: what's in state, else what the generator would give the
 * date (unless it was filled already — a cleared day has no dot), else nothing. Counts exclude blocks and league holds, like the old list's.
 */
function useDayCounts() {
  const { state } = usePos();
  const inState = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of state.bookings) m.set(b.date, (m.get(b.date) ?? 0) + (isSlotHolder(b) ? 0 : 1));
    return m;
  }, [state.bookings]);
  // The busiest a day gets: the full template, which is what today carries.
  const full = Math.max(1, inState.get(toDateStr(DEMO_TODAY())) ?? 1);
  const count = (ds: string): number =>
    inState.get(ds) ?? unfilledDemoDay(state, ds).filter((b) => !isSlotHolder(b)).length;
  /** 0 for no dot, else a dot opacity by how full the day is. */
  const dot = (ds: string): number => {
    const n = count(ds);
    if (!n) return 0;
    const r = n / full;
    return r < 0.45 ? 0.4 : r < 0.75 ? 0.7 : 1;
  };
  return { count, dot };
}

// ─── Week strip ─────────────────────────────────────────────────────────────

const slideFrom = (dx: number) => keyframes`from { transform: translateX(${dx}px); opacity: 0; } to { transform: none; opacity: 1; }`;
const fromRight = slideFrom(48);
const fromLeft = slideFrom(-48);

/**
 * The week containing the viewed date, Sunday first. Tap a day to view it; swipe left or
 * right to move a week (the same weekday, clamped to the demo range). Selected is filled,
 * today is outlined, and a dot marks days with tee times — fainter on quieter days.
 */
export function WeekStrip() {
  const { state, dispatch } = usePos();
  const { dot, count } = useDayCounts();
  const today = DEMO_TODAY();
  const sel = state.currentDate;
  const sunday = addDays(sel, -sel.getDay());
  const days = Array.from({ length: 7 }, (_, i) => addDays(sunday, i));

  // Which way the last page went, so the new week slides in from that side.
  const [dir, setDir] = useState<1 | -1 | 0>(0);
  const shiftWeek = (n: 1 | -1) => {
    setDir(n);
    dispatch({ type: 'setDate', date: clampToDemoRange(addDays(sel, 7 * n)) });
  };

  // Swipe: a horizontal drag of 40px or more pages a week and swallows the tap.
  const drag = useRef<{ x: number; y: number; swiped: boolean } | null>(null);
  const onPointerDown = (e: ReactPointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, swiped: false };
  };
  const onPointerUp = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(e.clientY - d.y)) {
      d.swiped = true;
      shiftWeek(dx < 0 ? 1 : -1);
    }
  };
  const tapped = (fn: () => void) => () => {
    if (drag.current?.swiped) return;
    fn();
  };

  return (
    <Box
      role="group"
      aria-label={`Week of ${dayLabel(sunday, { month: 'long', day: 'numeric' })}`}
      data-testid="week-strip"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      sx={{ px: 1, pb: 1, touchAction: 'pan-y', userSelect: 'none', overflow: 'hidden' }}
    >
      <Box
        key={toDateStr(sunday)}
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          animation: dir ? `${dir > 0 ? fromRight : fromLeft} ${mobile.motion.push}ms ${mobile.motion.easing}` : undefined,
        }}
      >
        {days.map((d) => {
          const ds = toDateStr(d);
          const selected = sameDay(d, sel);
          const isToday = sameDay(d, today);
          const disabled = !isInDemoRange(ds);
          const n = disabled ? 0 : count(ds);
          const o = disabled ? 0 : dot(ds);
          return (
            <ButtonBase
              key={ds}
              disabled={disabled}
              onClick={tapped(() => {
                setDir(0);
                dispatch({ type: 'setDate', date: d });
              })}
              aria-label={`${DOW_LONG[d.getDay()]}, ${dayLabel(d, { month: 'long', day: 'numeric' })}${isToday ? ', today' : ''}, ${plural(n, 'tee time')}`}
              aria-pressed={selected}
              sx={{
                height: 64,
                minWidth: mobile.touchTarget,
                flexDirection: 'column',
                gap: 0.25,
                borderRadius: '16px',
                opacity: disabled ? 0.38 : 1,
              }}
            >
              <Typography variant="caption" sx={{ lineHeight: 1, color: selected ? md3.primary : md3.onSurfaceVariant, fontWeight: 500 }}>
                {DOW[d.getDay()]}
              </Typography>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  typography: 'subtitle2',
                  bgcolor: selected ? md3.primary : 'transparent',
                  color: selected ? md3.onPrimary : isToday ? md3.primary : md3.onSurface,
                  border: `1px solid ${isToday && !selected ? md3.primary : 'transparent'}`,
                }}
              >
                {d.getDate()}
              </Box>
              <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: md3.primary, opacity: o }} />
            </ButtonBase>
          );
        })}
      </Box>
    </Box>
  );
}

// ─── Calendar sheet ─────────────────────────────────────────────────────────

/** Where the calendar sheet opens — the tee sheet route's `calendar` param. */
export type CalendarOpen = NonNullable<RouteOf<'teeSheet'>['calendar']>;
type CalendarView = NonNullable<CalendarOpen['view']>;

/**
 * The MD3 date picker as a bottom sheet, inside the phone frame. Month grid with the
 * viewed date filled and today outlined, dots on days with tee times, ‹ › by month.
 * Tapping the month/year header opens the year chooser, then the month chooser, for jumps
 * across the year. Today and a day tap both set the date and close.
 */
export function CalendarSheet({ initial, onClose }: { initial?: CalendarOpen; onClose: () => void }) {
  const { state, dispatch } = usePos();
  const { dot, count } = useDayCounts();
  const today = DEMO_TODAY();
  const sel = state.currentDate;
  const { start, end } = demoRange();

  const [[y, m], setMonth] = useState<[number, number]>(() =>
    initial?.month ? parseMonth(initial.month) : [sel.getFullYear(), sel.getMonth()],
  );
  const [view, setView] = useState<CalendarView>(initial?.view ?? 'days');

  const ym = (yy: number, mm: number) => yy * 12 + mm;
  const minYm = ym(start.getFullYear(), start.getMonth());
  const maxYm = ym(end.getFullYear(), end.getMonth());
  const canPrev = ym(y, m) > minYm;
  const canNext = ym(y, m) < maxYm;
  const page = (n: number) => {
    const t = ym(y, m) + n;
    setMonth([Math.floor(t / 12), t % 12]);
  };

  const pick = (d: Date) => {
    dispatch({ type: 'setDate', date: clampToDemoRange(d) });
    onClose();
  };

  const firstDow = new Date(y, m, 1).getDay();
  const daysIn = new Date(y, m + 1, 0).getDate();
  const cells: Array<Date | null> = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysIn }, (_, i) => new Date(y, m, i + 1)),
  ];
  while (cells.length < 42) cells.push(null); // Six rows always, so ‹ › doesn't jump the sheet.

  const years = Array.from({ length: end.getFullYear() - start.getFullYear() + 1 }, (_, i) => start.getFullYear() + i);

  return (
    <BottomSheet open onClose={onClose} title="Select date">
      <Typography variant="h4" component="div" sx={{ px: 3, pb: 1.5 }} aria-live="polite">
        {dayLabel(sel, { weekday: 'short', month: 'short', day: 'numeric' })}
      </Typography>
      <Box sx={{ borderBottom: `1px solid ${md3.outlineVariant}` }} />

      {/* Month / year header and month paging. */}
      <Stack direction="row" alignItems="center" sx={{ pl: 2, pr: 1, height: 56 }}>
        <ButtonBase
          onClick={() => setView(view === 'days' ? 'years' : 'days')}
          aria-label={view === 'days' ? `${MONTHS[m]} ${y}, choose year and month` : 'Back to days'}
          aria-expanded={view !== 'days'}
          sx={{ height: 48, px: 1, gap: 0.5, borderRadius: '24px', typography: 'subtitle2', color: md3.onSurfaceVariant }}
        >
          {MONTHS[m]} {y}
          {view === 'days' ? <ArrowDropDown /> : <ArrowDropUp />}
        </ButtonBase>
        <Box sx={{ flex: 1 }} />
        {view === 'days' && (
          <>
            <IconButton aria-label="Previous month" disabled={!canPrev} onClick={() => page(-1)}>
              <ChevronLeft />
            </IconButton>
            <IconButton aria-label="Next month" disabled={!canNext} onClick={() => page(1)}>
              <ChevronRight />
            </IconButton>
          </>
        )}
      </Stack>

      {view === 'days' && (
        <Box sx={{ px: 1.5 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', height: 32, alignItems: 'center' }}>
            {DOW.map((d, i) => (
              <Typography key={i} variant="caption" sx={{ textAlign: 'center', color: md3.onSurface }} aria-hidden>
                {d}
              </Typography>
            ))}
          </Box>
          <Box role="grid" aria-label={`${MONTHS[m]} ${y}`} sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {cells.map((d, i) => {
              if (!d) return <Box key={i} sx={{ height: mobile.touchTarget }} />;
              const ds = toDateStr(d);
              const selected = sameDay(d, sel);
              const isToday = sameDay(d, today);
              const disabled = !isInDemoRange(ds);
              const o = disabled ? 0 : dot(ds);
              return (
                <ButtonBase
                  key={i}
                  role="gridcell"
                  disabled={disabled}
                  onClick={() => pick(d)}
                  aria-label={`${DOW_LONG[d.getDay()]}, ${MONTHS[m]} ${d.getDate()}, ${y}${isToday ? ', today' : ''}${disabled ? ', unavailable' : `, ${plural(count(ds), 'tee time')}`}`}
                  aria-selected={selected}
                  sx={{ height: mobile.touchTarget, borderRadius: '50%', opacity: disabled ? 0.38 : 1 }}
                >
                  <Box
                    sx={{
                      position: 'relative',
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      typography: 'body2',
                      bgcolor: selected ? md3.primary : 'transparent',
                      color: selected ? md3.onPrimary : isToday ? md3.primary : md3.onSurface,
                      border: `1px solid ${isToday && !selected ? md3.primary : 'transparent'}`,
                    }}
                  >
                    {d.getDate()}
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 5,
                        left: '50%',
                        ml: '-2px',
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        bgcolor: selected ? md3.onPrimary : md3.primary,
                        opacity: o,
                      }}
                    />
                  </Box>
                </ButtonBase>
              );
            })}
          </Box>
        </Box>
      )}

      {view === 'years' && (
        <Box role="listbox" aria-label="Year" sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, px: 2, py: 1, minHeight: 32 + 6 * mobile.touchTarget }}>
          {years.map((yy) => (
            <Chooser
              key={yy}
              label={String(yy)}
              selected={yy === y}
              current={yy === today.getFullYear()}
              onClick={() => {
                // Keep the month when it's in range in the chosen year, else the nearest end.
                const t = Math.min(maxYm, Math.max(minYm, ym(yy, m)));
                setMonth([Math.floor(t / 12), t % 12]);
                setView('months');
              }}
            />
          ))}
        </Box>
      )}

      {view === 'months' && (
        <Box role="listbox" aria-label={`Month in ${y}`} sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, px: 2, py: 1, minHeight: 32 + 6 * mobile.touchTarget }}>
          {MONTHS_SHORT.map((label, mm) => {
            const out = ym(y, mm) < minYm || ym(y, mm) > maxYm;
            return (
              <Chooser
                key={label}
                label={label}
                ariaLabel={`${MONTHS[mm]} ${y}`}
                selected={mm === m}
                current={y === today.getFullYear() && mm === today.getMonth()}
                disabled={out}
                onClick={() => {
                  setMonth([y, mm]);
                  setView('days');
                }}
              />
            );
          })}
        </Box>
      )}

      <Stack direction="row" alignItems="center" sx={{ px: 1.5, pt: 1 }}>
        <Button onClick={() => pick(DEMO_TODAY())} aria-label={`Today, ${dayLabel(today, { month: 'long', day: 'numeric' })}`}>
          Today
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>Cancel</Button>
      </Stack>
    </BottomSheet>
  );
}

/** A year or month in the chooser: a 48dp pill, filled when selected, outlined when current. */
function Chooser({
  label,
  ariaLabel,
  selected,
  current,
  disabled,
  onClick,
}: {
  label: string;
  ariaLabel?: string;
  selected: boolean;
  current: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <ButtonBase
      role="option"
      aria-selected={selected}
      aria-label={ariaLabel ?? label}
      disabled={disabled}
      onClick={onClick}
      sx={{
        height: mobile.touchTarget,
        borderRadius: '24px',
        typography: 'body1',
        opacity: disabled ? 0.38 : 1,
        bgcolor: selected ? md3.primary : 'transparent',
        color: selected ? md3.onPrimary : current ? md3.primary : md3.onSurface,
        border: `1px solid ${current && !selected ? md3.primary : 'transparent'}`,
      }}
    >
      {label}
    </ButtonBase>
  );
}
