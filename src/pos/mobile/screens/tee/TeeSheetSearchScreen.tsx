import { Box, IconButton, InputBase, Typography } from '@mui/material';
import Close from '@mui/icons-material/Close';
import { md3 } from '../../../../theme/tokens';
import { DEMO_TODAY } from '../../../data/bookings';
import { formatTimeLabel, toDateStr } from '../../../data/courses';
import { Icon } from '../../../components/primitives';
import { Stack } from '../../../components/Stack';
import { usePos } from '../../../state/PosProvider';
import type { Booking } from '../../../types';
import { MobileScreen, TopAppBar } from '../../chrome';
import { useMobileNav } from '../../navigation';
import type { ScreenProps } from '../types';
import { BookingCard } from './parts';
import { dayLabel, isSlotHolder, parseDateStr, plural } from './tee-helpers';

/**
 * Search every booking in the schedule — a pushed page, MD3's full-screen search view:
 * the back arrow and the field share the top bar, results fill the screen.
 *
 * A push rather than a dialog because it's a place you look things up, not an edit;
 * opening a result pushes Booking Detail on top, so Back from the booking lands on the
 * same results (the next name on the list is often the next call). The query is kept in
 * `listFilters.search`, so returning to Search shows the last query, like Android's
 * search views do — the tee sheet itself ignores it.
 */
export function TeeSheetSearchScreen(_: ScreenProps<'teeSheetSearch'>) {
  const { state, dispatch } = usePos();
  const nav = useMobileNav();
  const query = state.listFilters.search;
  const q = query.trim().toLowerCase();

  const results = q
    ? state.bookings
        .filter((b) => !isSlotHolder(b) && (b.name.toLowerCase().includes(q) || b.conf.toLowerCase().includes(q) || b.phone.includes(q)))
        .sort((a, b) => a.date.localeCompare(b.date) || a.timeMin - b.timeMin)
        .slice(0, 60)
    : [];

  const byDate = new Map<string, Booking[]>();
  for (const b of results) byDate.set(b.date, [...(byDate.get(b.date) ?? []), b]);
  const today = toDateStr(DEMO_TODAY());

  const open = (b: Booking) => {
    // The booking's own day becomes the sheet's day, so Back to the sheet shows it in place.
    dispatch({ type: 'setDate', date: parseDateStr(b.date) });
    nav.push({ name: 'bookingDetail', bookingId: b.id });
  };

  return (
    <MobileScreen
      topBar={
        <TopAppBar
          title={
            <InputBase
              autoFocus
              fullWidth
              placeholder="Name, confirmation, or phone"
              value={query}
              onChange={(e) => dispatch({ type: 'patchListFilters', patch: { search: e.target.value } })}
              inputProps={{ 'aria-label': 'Search bookings' }}
              sx={{ fontSize: 16 }}
            />
          }
          actions={
            query && (
              <IconButton aria-label="Clear search" onClick={() => dispatch({ type: 'patchListFilters', patch: { search: '' } })}>
                <Close />
              </IconButton>
            )
          }
        >
          <Box sx={{ borderBottom: `1px solid ${md3.outlineVariant}` }} />
        </TopAppBar>
      }
    >
      {!q && (
        <Stack alignItems="center" gap={1.5} sx={{ p: 5, color: md3.onSurfaceVariant, textAlign: 'center' }}>
          <Icon name="search" size={40} />
          <Typography variant="body1">Search every day in the schedule</Typography>
          <Typography variant="body2">Opening a result moves the tee sheet to that day.</Typography>
        </Stack>
      )}
      {q && results.length === 0 && (
        <Stack alignItems="center" gap={1.5} sx={{ p: 5, color: md3.onSurfaceVariant, textAlign: 'center' }}>
          <Icon name="search_off" size={40} />
          <Typography variant="body1">Nothing matches “{query.trim()}”</Typography>
        </Stack>
      )}
      {q && results.length > 0 && (
        <Typography variant="caption" component="div" sx={{ px: 2, pt: 1.5 }}>
          {plural(results.length, 'booking')}
          {results.length === 60 ? ' (first 60)' : ''}
        </Typography>
      )}
      {[...byDate.entries()].map(([date, list]) => (
        <Box key={date}>
          <Typography
            variant="subtitle2"
            sx={{ position: 'sticky', top: 0, zIndex: 1, bgcolor: md3.surface, color: md3.primary, px: 2, py: 1.5 }}
          >
            {date === today ? 'Today · ' : ''}
            {dayLabel(parseDateStr(date), { weekday: 'long', month: 'short', day: 'numeric' })}
          </Typography>
          <Stack gap={1} sx={{ px: 2, pb: 1 }}>
            {list.map((b) => (
              <BookingCard
                key={b.id}
                booking={b}
                course={state.courses.find((c) => c.id === b.course)}
                showTime={formatTimeLabel(b.timeMin)}
                onClick={() => open(b)}
              />
            ))}
          </Stack>
        </Box>
      ))}
      <Box sx={{ height: 16 }} />
    </MobileScreen>
  );
}
