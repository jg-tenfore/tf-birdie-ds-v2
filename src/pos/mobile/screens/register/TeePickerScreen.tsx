import { useState } from 'react';
import type { ReactNode } from 'react';
import { Box, ButtonBase, Chip, Typography } from '@mui/material';
import SyncAlt from '@mui/icons-material/SyncAlt';
import { md3, mobile, radius, shifts } from '../../../../theme/tokens';
import { DEMO_TODAY } from '../../../data/bookings';
import { TIMES, formatTimeLabel, toDateStr } from '../../../data/courses';
import { largestFit, slotsFree } from '../../../logic/bookings';
import * as cartLogic from '../../../logic/cart';
import { usePos } from '../../../state/PosProvider';
import type { CartTeeTime } from '../../../types';
import { Stack } from '../../../components/Stack';
import { MobileScreen, TopAppBar } from '../../chrome';
import { useMobileNav } from '../../navigation';
import type { ScreenProps } from '../types';
import { Callout, Subheader } from './parts';

/**
 * Choose a tee time for the round on the order — pushed from the order, and it pops back
 * to the order the moment a time is tapped. No confirm step: picking *is* the decision,
 * and the order shows the result (and lets you come back and change it).
 *
 * Date and course are chip rows under the top bar, so the scrolling body is only times.
 * Times are grouped by the tee sheet's own bands (early, peak, twilight) and only times
 * with room for the whole party are offered — same rule as the terminal.
 *
 * Eighteen holes is two picks on this screen rather than two screens: the back arrow
 * during the back-nine step returns to the front-nine step, not to the order, because
 * that's where the operator's attention is.
 */

const BANDS = [
  { key: 'early', ...shifts.early },
  { key: 'peak', ...shifts.peak },
  { key: 'twilight', ...shifts.twilight },
] as const;

const bandOf = (timeMin: number) => {
  const h = Math.floor(timeMin / 60);
  return h < 10 ? shifts.early.label : h < 14 ? shifts.peak.label : shifts.twilight.label;
};

/** The bookable window: demo today and the six days after. */
const DAYS = Array.from({ length: 7 }, (_, i) => {
  const d = DEMO_TODAY();
  d.setDate(d.getDate() + i);
  return d;
});

export function TeePickerScreen({ route }: ScreenProps<'teePicker'>) {
  const { state, dispatch, toast } = usePos();
  const nav = useMobileNav();
  const checkIn = state.cart.find((i) => i.isCheckIn && !i.is18HBack);
  const partySize = checkIn?.players?.length ?? 1;
  const wants18 = route.is18H ?? /18/.test(checkIn?.name ?? '');

  const [date, setDate] = useState(() => new Date(state.currentDate));
  const [front9, setFront9] = useState<CartTeeTime | null>(null);
  const step = wants18 && front9 ? 'back9' : 'front9';

  const courses = state.courses.filter((c) => c.visible && !c.locked && (!front9 || c.id !== front9.courseId));
  const [courseId, setCourseId] = useState<string>(() => checkIn?.teeTime?.courseId ?? courses[0]?.id ?? '');
  const course = courses.find((c) => c.id === courseId) ?? courses[0];

  const dateStr = toDateStr(date);
  const bookings = state.bookings.filter((b) => b.date === dateStr);
  const minTime = front9 ? front9.timeMin + 60 : 0;
  const open = course
    ? TIMES.filter((t) => t.totalMin >= minTime && largestFit(bookings, course, t.totalMin) >= partySize)
    : [];

  const pick = (timeMin: number) => {
    if (!course) return;
    const slot: CartTeeTime = {
      courseId: course.id,
      courseName: course.name,
      timeMin,
      label: formatTimeLabel(timeMin),
      shiftLabel: bandOf(timeMin),
    };
    if (wants18 && !front9) {
      setFront9(slot);
      // The crossover has to be on another course; start the back nine on the next one.
      setCourseId(courses.find((c) => c.id !== slot.courseId)?.id ?? '');
      return;
    }
    // Re-picking replaces any back nine already on the order rather than stacking another.
    state.cart
      .map((i, idx) => (i.is18HBack ? idx : -1))
      .filter((idx) => idx >= 0)
      .reverse()
      .forEach((index) => dispatch({ type: 'removeItem', index }));
    if (toDateStr(state.currentDate) !== dateStr) dispatch({ type: 'setDate', date });
    if (front9) {
      dispatch({ type: 'attachTeeTime', teeTime: front9, back9: slot });
      toast(`18 holes · ${front9.label} → ${slot.label} ${slot.courseName}`);
    } else {
      dispatch({ type: 'attachTeeTime', teeTime: slot });
      toast(`Tee time ${slot.label} · ${slot.courseName}`);
    }
    nav.pop();
  };

  const backFromStep = () => {
    if (front9) {
      setCourseId(front9.courseId);
      setFront9(null);
    } else nav.pop();
  };

  const title = !wants18 ? 'Choose tee time' : step === 'front9' ? 'Front nine' : 'Back nine';
  const subtitle = `${partySize} player${partySize === 1 ? '' : 's'} · ${
    wants18 ? `18 holes · step ${step === 'front9' ? 1 : 2} of 2` : '9 holes'
  }`;

  return (
    <MobileScreen
      topBar={
        <TopAppBar title={title} subtitle={subtitle} onBack={backFromStep}>
          <ChipRow>
            {DAYS.map((d) => {
              const on = toDateStr(d) === dateStr;
              return (
                <DayChip key={d.toISOString()} date={d} on={on} today={d.getTime() === DAYS[0].getTime()} onClick={() => setDate(d)} />
              );
            })}
          </ChipRow>
          <ChipRow>
            {courses.map((c) => (
              <Chip
                key={c.id}
                label={c.name}
                onClick={() => setCourseId(c.id)}
                variant={c.id === course?.id ? 'filled' : 'outlined'}
                sx={{
                  flexShrink: 0,
                  bgcolor: c.id === course?.id ? mobile.secondaryContainer : 'transparent',
                  color: c.id === course?.id ? mobile.onSecondaryContainer : md3.onSurfaceVariant,
                  borderColor: md3.outlineVariant,
                }}
              />
            ))}
          </ChipRow>
        </TopAppBar>
      }
    >
      {front9 && (
        <Box sx={{ px: 2, pt: 1 }}>
          <Callout tone="info" icon={<SyncAlt fontSize="small" />}>
            Front nine {front9.label} · {front9.courseName}. Pick a crossover on another course, an hour or more later.
          </Callout>
        </Box>
      )}
      {!course ? (
        <Typography sx={{ p: 2, color: md3.onSurfaceVariant }}>No open course to book.</Typography>
      ) : open.length === 0 ? (
        <Box sx={{ p: 2 }}>
          <Callout tone="warning">
            No time on {course.name} fits {partySize} players together on this day. Try another course or date.
          </Callout>
        </Box>
      ) : (
        BANDS.map((band) => {
          const times = open.filter((t) => bandOf(t.totalMin) === band.label);
          if (!times.length) return null;
          return (
            <Box key={band.key}>
              <Subheader action={<Typography variant="caption">{times.length} times</Typography>}>
                <Stack direction="row" alignItems="center" gap={1} component="span">
                  <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: band.iconColor }} />
                  {band.label}
                </Stack>
              </Subheader>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, px: 2, pb: 1 }}>
                {times.map((t) => {
                  const selected =
                    !front9 && checkIn?.teeTime?.timeMin === t.totalMin && checkIn.teeTime.courseId === course.id;
                  const free = slotsFree(bookings, course, t.totalMin);
                  return (
                    <ButtonBase
                      key={t.totalMin}
                      onClick={() => pick(t.totalMin)}
                      sx={{
                        flexDirection: 'column',
                        height: 56,
                        borderRadius: `${radius.sm}px`,
                        border: `1px solid ${selected ? md3.primary : md3.outlineVariant}`,
                        bgcolor: selected ? md3.primaryContainer : md3.surface,
                      }}
                    >
                      <Typography variant="subtitle2">{t.label}</Typography>
                      <Typography variant="caption">{free} open</Typography>
                    </ButtonBase>
                  );
                })}
              </Box>
            </Box>
          );
        })
      )}
      <Typography variant="caption" component="div" sx={{ px: 2, py: 2 }}>
        Showing times with {partySize} or more seats together · {cartLogic.money(checkIn?.unitPrice ?? 0)} per player
      </Typography>
    </MobileScreen>
  );
}

function ChipRow({ children }: { children: ReactNode }) {
  return (
    <Stack
      direction="row"
      gap={1}
      sx={{ px: 2, pb: 1.5, overflowX: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}
    >
      {children}
    </Stack>
  );
}

/** A date as a two-line chip: weekday over day-of-month. */
function DayChip({ date, on, today, onClick }: { date: Date; on: boolean; today: boolean; onClick: () => void }) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-pressed={on}
      sx={{
        flexShrink: 0,
        width: 52,
        height: 56,
        flexDirection: 'column',
        borderRadius: `${radius.sm}px`,
        border: `1px solid ${on ? 'transparent' : md3.outlineVariant}`,
        bgcolor: on ? mobile.secondaryContainer : 'transparent',
        color: on ? mobile.onSecondaryContainer : md3.onSurface,
      }}
    >
      <Typography variant="caption" sx={{ color: 'inherit', fontWeight: today ? 700 : 400 }}>
        {today ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' })}
      </Typography>
      <Typography variant="subtitle1" sx={{ lineHeight: 1.2 }}>
        {date.getDate()}
      </Typography>
    </ButtonBase>
  );
}
