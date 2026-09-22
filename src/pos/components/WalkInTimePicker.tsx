import { useState } from 'react';
import { ButtonBase, Menu, MenuItem, Typography } from '@mui/material';
import { md3, radius } from '../../theme/tokens';
import { demoNow, minutesOfDay } from '../data/bookings';
import { formatTimeLabel } from '../data/courses';
import { bookingHoles } from '../logic/reservation';
import { moveWalkIn, openTeeTimes, walkInCourses } from '../logic/walk-in';
import { usePos } from '../state/PosProvider';
import type { Booking } from '../types';
import { Icon } from './primitives';
import { Stack } from './Stack';

/**
 * The walk-in's tee time, changeable in place (Weston Edits · reservation panel).
 *
 * A walk-in lands at the next open tee time; when that one isn't wanted — the party wants
 * to wait for friends, or play the back nine — staff pick another here rather than leaving
 * the panel for Move Players. Only open times that fit the whole party are offered, after
 * the demo "now", on the courses the round can start on; the current one is ticked.
 * Shown while nobody on the walk-in has checked in or paid.
 */
export function WalkInTimePicker({ booking: b }: { booking: Booking }) {
  const { state, dispatch, toast } = usePos();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const courses = walkInCourses(state.courses, bookingHoles(b));
  const options = anchor
    ? openTeeTimes(state.bookings, courses, {
        date: b.date,
        afterMin: minutesOfDay(demoNow()),
        players: b.players,
        ignoreId: b.id,
        limit: 12,
      })
    : [];
  const courseName = (id: string) => state.courses.find((c) => c.id === id)?.name ?? id;

  return (
    <>
      <ButtonBase
        aria-label="Change walk-in tee time"
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{
          mt: 0.75,
          gap: 0.5,
          px: 1,
          py: 0.375,
          borderRadius: `${radius.sm}px`,
          border: `1px solid ${md3.outlineVariant}`,
          fontSize: 11.5,
          fontWeight: 600,
          color: md3.primary,
          '&:hover': { bgcolor: md3.primaryContainer, borderColor: md3.primary },
        }}
      >
        <Icon name="directions_walk" size={14} color={md3.primary} />
        Walk-in · next open tee time
        <Typography component="span" sx={{ fontSize: 11.5, fontWeight: 700, color: md3.onSurface }}>
          · Change
        </Typography>
        <Icon name="expand_more" size={15} color={md3.primary} />
      </ButtonBase>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} slotProps={{ paper: { sx: { maxHeight: 360 } } }}>
        {options.length === 0 && <MenuItem disabled>No other open tee times today</MenuItem>}
        {options.map((o) => {
          const current = o.course.id === b.course && o.timeMin === b.timeMin;
          return (
            <MenuItem
              key={`${o.course.id}:${o.timeMin}`}
              selected={current}
              onClick={() => {
                setAnchor(null);
                if (current) return;
                dispatch({ type: 'patchBooking', bookingId: b.id, patch: moveWalkIn(b, o, state) });
                toast(`Walk-in moved · ${formatTimeLabel(o.timeMin)} · ${courseName(o.course.id)}`);
              }}
              sx={{ gap: 1.5, fontSize: 13, minWidth: 240 }}
            >
              <Stack direction="row" alignItems="center" gap={1} sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, width: 64 }}>{formatTimeLabel(o.timeMin)}</Typography>
                <Typography sx={{ fontSize: 12.5, color: md3.onSurfaceVariant }}>{courseName(o.course.id)}</Typography>
              </Stack>
              {current && <Icon name="check" size={16} color={md3.primary} />}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}
