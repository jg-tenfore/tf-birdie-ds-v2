import { useMemo, useState } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { elevation, md3, radius } from '../../theme/tokens';
import { DEMO_TODAY } from '../data/bookings';
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
 */
export function DatePickerPopover({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = usePos();
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
            sx={{ width: 28, height: 28, borderRadius: '50%', '&:hover': { bgcolor: md3.surfaceContainer } }}
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
            sx={{ width: 28, height: 28, borderRadius: '50%', '&:hover': { bgcolor: md3.surfaceContainer } }}
          >
            <Icon name="chevron_right" size={18} />
          </ButtonBase>
        </Stack>

        {yearPickerOpen ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0.75 }}>
            {Array.from({ length: 9 }, (_, i) => viewYear - 4 + i).map((y) => (
              <ButtonBase
                key={y}
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
                const hasBookings = datesWithBookings.has(dateStr);

                return (
                  <ButtonBase
                    key={i}
                    onClick={() => pick(c.y, c.m, c.day)}
                    sx={{
                      height: 34,
                      flexDirection: 'column',
                      gap: '2px',
                      borderRadius: '50%',
                      fontSize: 12.5,
                      fontWeight: isSelected || isToday ? 800 : 500,
                      opacity: c.inMonth ? 1 : 0.34,
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
                        bgcolor: hasBookings ? (isSelected ? '#fff' : md3.primary) : 'transparent',
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
