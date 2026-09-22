import { useMemo, useState } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { elevation, md3, radius } from '../../theme/tokens';
import { DEMO_TODAY, demoRange, isInDemoRange } from '../data/bookings';
import { useWestonEdits } from '../edition';
import { unfilledDemoDay } from '../state/demo-days';
import { usePos } from '../state/PosProvider';
import { Icon } from './primitives';
import { Stack } from './Stack';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * The tee sheet's date picker.
 *
 * A hand-built month grid rather than MUI X's `DateCalendar`, for one reason: days
 * that have bookings get a dot. That's the operator's cue for which days are worth
 * opening, and it's the whole point of the control — a stock calendar would hide it.
 *
 * Tapping the month header swaps in a year grid, which is how the prototype lets
 * staff jump a season ahead without twelve taps.
 *
 * Weston Edits: the tee sheet has a (generated) day for every date within a year of today,
 * so in-range days are dotted from the generator too — the same count the phone uses — and
 * days, months and years outside `demoRange()` are greyed and can't be picked. A generated
 * day that has since been cleared has no dot. The base calendar is unchanged.
 */
export function DatePickerPopover({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = usePos();
  const weston = useWestonEdits();
  const [viewYear, setViewYear] = useState(state.currentDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(state.currentDate.getMonth());
  const [yearPickerOpen, setYearPickerOpen] = useState(false);

  const today = DEMO_TODAY();
  const selected = state.currentDate;

  /** Dates that have at least one booking, so the grid can dot them. */
  const datesWithBookings = useMemo(
    () => new Set(state.bookings.map((b) => b.date)),
    [state.bookings],
  );
  const hasBookings = (dateStr: string) =>
    datesWithBookings.has(dateStr) || (weston && unfilledDemoDay(state, dateStr).length > 0);
  /** Weston Edits: outside the demo's year either side of today. */
  const outOfRange = (dateStr: string) => weston && !isInDemoRange(dateStr);
  const range = demoRange();
  const monthKey = (y: number, m: number) => y * 12 + m;
  const atStart = weston && monthKey(viewYear, viewMonth) <= monthKey(range.start.getFullYear(), range.start.getMonth());
  const atEnd = weston && monthKey(viewYear, viewMonth) >= monthKey(range.end.getFullYear(), range.end.getMonth());
  const yearOutOfRange = (y: number) => weston && (y < range.start.getFullYear() || y > range.end.getFullYear());

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();

  const shiftMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y--;
    } else if (m > 11) {
      m = 0;
      y++;
    }
    setViewMonth(m);
    setViewYear(y);
  };

  const pick = (y: number, m: number, d: number) => {
    dispatch({ type: 'setDate', date: new Date(y, m, d) });
    onClose();
  };

  // Leading blanks, then the month, then trailing blanks to complete the last week.
  const cells: Array<{ day: number; inMonth: boolean; y: number; m: number }> = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: daysInPrev - i, inMonth: false, y: viewMonth === 0 ? viewYear - 1 : viewYear, m: (viewMonth + 11) % 12 });
  }
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, inMonth: true, y: viewYear, m: viewMonth });
  const trailing = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
  for (let d = 1; d <= trailing; d++) {
    cells.push({ day: d, inMonth: false, y: viewMonth === 11 ? viewYear + 1 : viewYear, m: (viewMonth + 1) % 12 });
  }

  return (
    <>
      <Box onClick={onClose} sx={{ position: 'fixed', inset: 0, zIndex: 399 }} />
      <Box
        sx={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          left: 0,
          zIndex: 400,
          bgcolor: '#fff',
          border: `1.5px solid ${md3.outlineVariant}`,
          borderRadius: `${radius.lg}px`,
          boxShadow: elevation.e3,
          p: 2,
          width: 296,
          userSelect: 'none',
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.25 }}>
          <ButtonBase
            onClick={() => shiftMonth(-1)}
            disabled={atStart}
            aria-label={weston ? 'Previous month' : undefined}
            sx={{ width: 28, height: 28, borderRadius: '50%', opacity: atStart ? 0.34 : 1, '&:hover': { bgcolor: md3.surfaceContainer } }}
          >
            <Icon name="chevron_left" size={18} />
          </ButtonBase>
          <ButtonBase
            onClick={() => setYearPickerOpen(!yearPickerOpen)}
            sx={{ gap: 0.25, px: 1, py: 0.5, borderRadius: `${radius.sm}px`, '&:hover': { bgcolor: md3.surfaceContainer } }}
          >
            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
              {MONTHS[viewMonth]} {viewYear}
            </Typography>
            <Icon name="arrow_drop_down" size={16} />
          </ButtonBase>
          <ButtonBase
            onClick={() => shiftMonth(1)}
            disabled={atEnd}
            aria-label={weston ? 'Next month' : undefined}
            sx={{ width: 28, height: 28, borderRadius: '50%', opacity: atEnd ? 0.34 : 1, '&:hover': { bgcolor: md3.surfaceContainer } }}
          >
            <Icon name="chevron_right" size={18} />
          </ButtonBase>
        </Stack>

        {yearPickerOpen ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0.75 }}>
            {Array.from({ length: 9 }, (_, i) => viewYear - 4 + i).map((y) => (
              <ButtonBase
                key={y}
                disabled={yearOutOfRange(y)}
                onClick={() => {
                  setViewYear(y);
                  setYearPickerOpen(false);
                }}
                sx={{
                  py: 1,
                  borderRadius: `${radius.sm}px`,
                  fontSize: 13,
                  fontWeight: y === viewYear ? 800 : 500,
                  color: y === viewYear ? md3.primary : md3.onSurface,
                  bgcolor: y === viewYear ? md3.primaryContainer : 'transparent',
                  opacity: yearOutOfRange(y) ? 0.34 : 1,
                  '&:hover': { bgcolor: md3.surfaceContainer },
                }}
              >
                {y}
              </ButtonBase>
            ))}
          </Box>
        ) : (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', mb: 0.5 }}>
              {DOW.map((d, i) => (
                <Box
                  key={i}
                  sx={{
                    textAlign: 'center',
                    fontSize: 10,
                    fontWeight: 800,
                    color: md3.outline,
                    textTransform: 'uppercase',
                  }}
                >
                  {d}
                </Box>
              ))}
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px' }}>
              {cells.map((c, i) => {
                const isToday =
                  c.inMonth &&
                  c.y === today.getFullYear() &&
                  c.m === today.getMonth() &&
                  c.day === today.getDate();
                const isSelected =
                  c.inMonth &&
                  c.y === selected.getFullYear() &&
                  c.m === selected.getMonth() &&
                  c.day === selected.getDate();
                const dateStr = `${c.y}-${String(c.m + 1).padStart(2, '0')}-${String(c.day).padStart(2, '0')}`;
                const dotted = hasBookings(dateStr);
                const disabled = outOfRange(dateStr);

                return (
                  <ButtonBase
                    key={i}
                    disabled={disabled}
                    aria-label={
                      weston
                        ? `${new Date(c.y, c.m, c.day).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}${dotted ? ', has tee times' : ''}`
                        : undefined
                    }
                    onClick={() => pick(c.y, c.m, c.day)}
                    sx={{
                      height: 34,
                      flexDirection: 'column',
                      gap: '2px',
                      borderRadius: '50%',
                      fontSize: 12.5,
                      fontWeight: isSelected || isToday ? 800 : 500,
                      opacity: disabled ? (c.inMonth ? 0.3 : 0.15) : c.inMonth ? 1 : 0.34,
                      color: isSelected ? '#fff' : isToday ? md3.primary : md3.onSurface,
                      bgcolor: isSelected ? md3.primary : 'transparent',
                      border: isToday && !isSelected ? `1.5px solid ${md3.primary}` : '1.5px solid transparent',
                      '&:hover': { bgcolor: isSelected ? md3.primary : md3.surfaceContainer },
                    }}
                  >
                    {c.day}
                    <Box
                      sx={{
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        bgcolor: dotted && !disabled ? (isSelected ? '#fff' : md3.primary) : 'transparent',
                      }}
                    />
                  </ButtonBase>
                );
              })}
            </Box>
          </>
        )}
      </Box>
    </>
  );
}
