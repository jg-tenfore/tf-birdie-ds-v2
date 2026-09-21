import { Box, LinearProgress, ListItemButton, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { md3, noteColors, payBadges, radius } from '../../../../theme/tokens';
import { formatTimeLabel, generateTimes } from '../../../data/courses';
import { money } from '../../../logic/cart';
import { Icon } from '../../../components/primitives';
import { Stack } from '../../../components/Stack';
import { dayBookings } from '../../../state/pos-store';
import { usePos } from '../../../state/PosProvider';
import { MobileScreen, TopAppBar } from '../../chrome';
import { useMobileNav } from '../../navigation';
import type { ScreenProps } from '../types';
import { BookingCard, SectionHeader } from './parts';
import { balanceOf, dayLabel, isSlotHolder, plural } from './tee-helpers';

function Stat({ value, label, icon, color }: { value: string | number; label: string; icon: string; color: string }) {
  return (
    <Box sx={{ p: 2, borderRadius: `${radius.md}px`, bgcolor: md3.surfaceContainer }}>
      <Stack direction="row" alignItems="center" gap={1}>
        <Icon name={icon} size={20} color={color} />
        <Typography variant="h4" sx={{ fontWeight: 500 }}>
          {value}
        </Typography>
      </Stack>
      <Typography variant="body2" sx={{ color: md3.onSurfaceVariant, mt: 0.5 }}>
        {label}
      </Typography>
    </Box>
  );
}

/**
 * Day summary — the terminal's right-hand sidebar as a pushed page. It answers what a
 * starter asks over the radio: how many out, how many carts, who hasn't paid.
 *
 * Everything on it drills somewhere: a course row pops back to the sheet scoped to that
 * course (the summary is *about* the sheet, so it returns to it rather than stacking a
 * second sheet), and a balance row pushes that booking's detail.
 */
export function DaySummaryScreen(_: ScreenProps<'daySummary'>) {
  const { state, dispatch } = usePos();
  const nav = useMobileNav();
  const all = dayBookings(state);
  const real = all.filter((b) => !isSlotHolder(b));
  const golfers = real.reduce((s, b) => s + b.players, 0);
  // A riding cart seats two, so four riders is two carts.
  const carts = real.filter((b) => b.cart === 'cart').reduce((s, b) => s + Math.ceil(b.players / 2), 0);
  const walkers = real.filter((b) => b.cart !== 'cart').reduce((s, b) => s + b.players, 0);
  const owing = real.filter((b) => balanceOf(b) > 0 && b.pay !== 'no_show').sort((a, b) => a.timeMin - b.timeMin);
  const outstanding = owing.reduce((s, b) => s + balanceOf(b), 0);
  const noShows = real.filter((b) => b.pay === 'no_show').length;
  const rows = generateTimes(state.settings).length;

  return (
    <MobileScreen
      topBar={
        <TopAppBar
          large
          title="Day summary"
          subtitle={`${dayLabel(state.currentDate, { weekday: 'long', month: 'long', day: 'numeric' })} · all courses`}
        />
      }
    >
      <Box sx={{ px: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
        <Stat value={golfers} label="Golfers" icon="group" color={md3.primary} />
        <Stat value={real.length} label="Tee times" icon="schedule" color={noteColors.blue.dot} />
        <Stat value={carts} label="Carts out" icon="directions_car" color={noteColors.yellow.dot} />
        <Stat value={walkers} label="Walking" icon="directions_walk" color={noteColors.purple.dot} />
      </Box>
      <Stack
        direction="row"
        alignItems="center"
        gap={1.5}
        sx={{ mx: 2, mt: 1, p: 2, borderRadius: `${radius.md}px`, bgcolor: outstanding ? noteColors.red.bg : payBadges.paid.bg }}
      >
        <Icon name="paid" size={24} color={outstanding ? md3.error : payBadges.paid.text} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 500, color: outstanding ? md3.error : payBadges.paid.text }}>
            {money(outstanding)}
          </Typography>
          <Typography variant="body2" sx={{ color: md3.onSurfaceVariant }}>
            outstanding across {plural(owing.length, 'tee time')}
            {noShows ? ` · ${noShows} no-show${noShows === 1 ? '' : 's'}` : ''}
          </Typography>
        </Box>
      </Stack>

      <SectionHeader>By course</SectionHeader>
      {state.courses
        .filter((c) => c.visible)
        .map((c) => {
          const list = all.filter((b) => b.course === c.id);
          const seated = list.reduce((s, b) => s + b.players, 0);
          const pct = Math.round((seated / (rows * c.slots)) * 100);
          return (
            <ListItemButton
              key={c.id}
              onClick={() => {
                dispatch({ type: 'patchListFilters', patch: { courses: [c.id] } });
                nav.pop();
              }}
              sx={{ gap: 2 }}
            >
              <Box sx={{ flex: 1, minWidth: 0, py: 1 }}>
                <Typography variant="body1">{c.name}</Typography>
                <Typography variant="body2" sx={{ color: md3.onSurfaceVariant }}>
                  {plural(list.filter((b) => !isSlotHolder(b)).length, 'tee time')} · {pct}% of slots filled
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, pct)}
                  sx={{ mt: 1, height: 6, borderRadius: 3, bgcolor: md3.surfaceHighest }}
                />
              </Box>
              <ChevronRightIcon sx={{ color: md3.onSurfaceVariant }} />
            </ListItemButton>
          );
        })}

      <SectionHeader>{owing.length ? 'Balances to collect' : 'Everyone has paid'}</SectionHeader>
      <Stack gap={1} sx={{ px: 2, pb: 3 }}>
        {owing.map((b) => (
          <BookingCard
            key={b.id}
            booking={b}
            course={state.courses.find((c) => c.id === b.course)}
            showTime={`${formatTimeLabel(b.timeMin)} · ${money(balanceOf(b))}`}
            onClick={() => nav.push({ name: 'bookingDetail', bookingId: b.id, tab: 'financial' })}
          />
        ))}
      </Stack>
    </MobileScreen>
  );
}
