import { Box, ButtonBase, Drawer, Typography } from '@mui/material';
import { md3, radius } from '../../theme/tokens';
import { TRANSPORT_META } from '../data/config';
import { formatTimeLabel } from '../data/courses';
import { dayBookings } from '../state/pos-store';
import { usePos } from '../state/PosProvider';
import { Icon, MemberDot, PayBadge, SectionLabel } from './primitives';
import { Stack } from './Stack';

/**
 * The day / course summary drawer.
 *
 * Opened either for the whole day (from the toolbar) or for one course (from its ⋮
 * menu). It answers the questions a starter asks over the radio: how many out, how
 * many carts, who hasn't paid — then lists the day in time order so staff can work
 * down it.
 */
export function TeeSheetSidebar() {
  const { state, dispatch } = usePos();
  const course = state.sidebarCourse
    ? state.courses.find((c) => c.id === state.sidebarCourse)
    : null;

  const all = dayBookings(state);
  const scoped = course ? all.filter((b) => b.course === course.id) : all;
  const real = scoped.filter((b) => b.pay !== 'block' && b.pay !== 'event');

  const golfers = real.reduce((s, b) => s + b.players, 0);
  const teeTimes = real.length;
  // A riding cart seats two, so four riders is two carts.
  const carts = real
    .filter((b) => b.cart === 'cart')
    .reduce((s, b) => s + Math.ceil(b.players / 2), 0);
  const walkers = real.filter((b) => b.cart !== 'cart').reduce((s, b) => s + b.players, 0);
  const unpaid = real.filter((b) => (b.playerStates ?? []).some((p) => !p.paid && !p.noShow)).length;

  const sorted = [...scoped].sort((a, b) => a.timeMin - b.timeMin);
  const dateLabel = state.currentDate
    .toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric', year: 'numeric' })
    .toUpperCase();

  return (
    <Drawer
      anchor="right"
      open={state.sidebarOpen}
      onClose={() => dispatch({ type: 'closeSidebar' })}
      slotProps={{ paper: { sx: { width: 400, borderLeft: `1px solid ${md3.outlineVariant}` } } }}
    >
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        sx={{ p: '16px 20px', borderBottom: `1px solid ${md3.outlineVariant}`, flexShrink: 0 }}
      >
        <Box>
          <Typography sx={{ fontSize: 16, fontWeight: 800 }}>
            {course ? course.name : 'Day summary'}
          </Typography>
          <Typography sx={{ fontSize: 11, color: md3.outline, letterSpacing: '.4px', mt: '2px' }}>
            {dateLabel}
            {course ? ` · ${course.holes}` : ' · All courses'}
          </Typography>
        </Box>
        <ButtonBase onClick={() => dispatch({ type: 'closeSidebar' })} sx={{ p: 0.75, borderRadius: '50%' }}>
          <Icon name="close" size={18} />
        </ButtonBase>
      </Stack>

      {/* ── Stats ── */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2,1fr)',
          gap: 1.25,
          p: 2.5,
          borderBottom: `1px solid ${md3.outlineVariant}`,
          flexShrink: 0,
        }}
      >
        <Stat value={golfers} label="Golfers" icon="group" color={md3.primary} />
        <Stat value={teeTimes} label="Tee times" icon="schedule" color="#2563eb" />
        <Stat value={carts} label="Carts out" icon="directions_car" color="#d97706" />
        <Stat value={walkers} label="Walking" icon="directions_walk" color="#7c3aed" />
        {unpaid > 0 && (
          <Box sx={{ gridColumn: '1 / -1' }}>
            <Stat value={unpaid} label="Tee times with a balance" icon="paid" color={md3.error} wide />
          </Box>
        )}
      </Box>

      {/* ── Bookings ── */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 2.5, py: 1.5 }}>
        <SectionLabel color={md3.outline} sx={{ mb: 1.25 }}>
          {sorted.length} booking{sorted.length === 1 ? '' : 's'}
        </SectionLabel>
        <Stack gap={1}>
          {sorted.map((b) => {
            const bCourse = state.courses.find((c) => c.id === b.course);
            return (
              <Stack
                key={b.id}
                direction="row"
                alignItems="center"
                gap={1.25}
                onClick={() => {
                  dispatch({ type: 'closeSidebar' });
                  dispatch({ type: 'loadBooking', bookingId: b.id });
                }}
                sx={{
                  p: '9px 11px',
                  borderRadius: `${radius.md}px`,
                  bgcolor: md3.surfaceContainer,
                  cursor: 'pointer',
                  opacity: b.pay === 'no_show' ? 0.6 : 1,
                  '&:hover': { bgcolor: md3.surfaceHigh },
                }}
              >
                <Typography
                  sx={{ fontSize: 11, fontWeight: 800, color: md3.primary, minWidth: 54, flexShrink: 0 }}
                >
                  {formatTimeLabel(b.timeMin)}
                </Typography>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" alignItems="center" gap={0.5}>
                    <MemberDot phone={b.phone} size={6} />
                    <Typography
                      sx={{
                        fontSize: 12,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {b.name}
                    </Typography>
                  </Stack>
                  <Stack
                    direction="row"
                    alignItems="center"
                    gap={0.5}
                    sx={{ fontSize: 10, color: md3.outline, mt: '1px' }}
                  >
                    {b.players}P
                    <Icon name={TRANSPORT_META[b.cart]?.icon ?? 'directions_walk'} size={11} />
                    {!course && bCourse?.name}
                    {b.holes && ` · ${b.holes}`}
                  </Stack>
                </Box>
                <PayBadge pay={b.pay} size="sm" />
              </Stack>
            );
          })}
        </Stack>
      </Box>
    </Drawer>
  );
}

function Stat({
  value,
  label,
  icon,
  color,
  wide,
}: {
  value: number;
  label: string;
  icon: string;
  color: string;
  wide?: boolean;
}) {
  return (
    <Stack
      direction={wide ? 'row' : 'column'}
      alignItems={wide ? 'center' : 'flex-start'}
      gap={wide ? 1.25 : 0.25}
      sx={{
        p: '12px 14px',
        borderRadius: `${radius.md}px`,
        bgcolor: md3.surfaceContainer,
        borderLeft: `3px solid ${color}`,
      }}
    >
      <Stack direction="row" alignItems="center" gap={0.75}>
        <Icon name={icon} size={16} color={color} />
        <Typography sx={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{value}</Typography>
      </Stack>
      <Typography sx={{ fontSize: 11, fontWeight: 600, color: md3.onSurfaceVariant }}>
        {label}
      </Typography>
    </Stack>
  );
}
