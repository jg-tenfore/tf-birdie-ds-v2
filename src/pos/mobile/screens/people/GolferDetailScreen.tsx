import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Box, Button, ButtonBase, Divider, IconButton, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material';
import CallOutlined from '@mui/icons-material/CallOutlined';
import ChatOutlined from '@mui/icons-material/ChatOutlined';
import ChevronRight from '@mui/icons-material/ChevronRight';
import EditOutlined from '@mui/icons-material/EditOutlined';
import EmailOutlined from '@mui/icons-material/EmailOutlined';
import EventOutlined from '@mui/icons-material/EventOutlined';
import GolfCourse from '@mui/icons-material/GolfCourse';
import NotesOutlined from '@mui/icons-material/NotesOutlined';
import PointOfSale from '@mui/icons-material/PointOfSale';
import { md3, memberTypes, mobile, payBadges, radius } from '../../../../theme/tokens';
import { formatTimeLabel, toDateStr } from '../../../data/courses';
import { useGolferRoster, usePos } from '../../../state/PosProvider';
import type { Booking } from '../../../types';
import { Stack } from '../../../components/Stack';
import { MobileScreen, TopAppBar } from '../../chrome';
import { useMobileNav } from '../../navigation';
import type { ScreenProps } from '../types';
import { GolferAvatar, TierChip } from './parts';
import { bookingsFor, displayName } from './people-utils';

/**
 * One golfer. Pushed from the People list, so the back arrow returns to the list with its
 * search and scroll intact.
 *
 * The two actions that leave People — start an order, book a tee time — jump to the other
 * destination rather than stacking a register on top of a contact. Each destination owns
 * its own stack; the golfer rides along as the order's customer.
 */
export function GolferDetailScreen({ route }: ScreenProps<'golferDetail'>) {
  const nav = useMobileNav();
  const { state, dispatch, toast } = usePos();
  const roster = useGolferRoster();
  const golfer =
    roster.find((g) => g.id === route.golferId) ??
    (state.selectedGolfer?.id === route.golferId ? state.selectedGolfer : null);

  const today = toDateStr(state.currentDate);
  const times = useMemo(() => {
    if (!golfer) return { upcoming: [], recent: [] };
    const all = bookingsFor(golfer, state.bookings).sort(
      (a, b) => a.date.localeCompare(b.date) || a.timeMin - b.timeMin,
    );
    return {
      upcoming: all.filter((b) => b.date >= today).slice(0, 5),
      recent: all.filter((b) => b.date < today).reverse().slice(0, 3),
    };
  }, [golfer, state.bookings, today]);

  if (!golfer) {
    return (
      <MobileScreen topBar={<TopAppBar title="Not found" />}>
        <Typography sx={{ p: 3, color: md3.onSurfaceVariant }}>No customer with id {route.golferId}.</Typography>
      </MobileScreen>
    );
  }

  const tier = golfer.memberType ? memberTypes[golfer.memberType] : null;
  const since = golfer.joined
    ? new Date(`${golfer.joined}-01T12:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null;

  const startOrder = () => {
    dispatch({ type: 'selectGolfer', golfer });
    nav.openIn('register', { name: 'order' });
    toast(`Order started for ${displayName(golfer.name)}`);
  };
  const bookTime = () => {
    dispatch({ type: 'selectGolfer', golfer });
    nav.selectTab('tee');
    toast(`Pick a time for ${displayName(golfer.name)}`);
  };

  return (
    <MobileScreen
      topBar={
        <TopAppBar
          title=""
          actions={
            <IconButton aria-label="Edit customer" onClick={() => toast('Editing customers comes in a later pass')}>
              <EditOutlined />
            </IconButton>
          }
        />
      }
    >
      {/* Header */}
      <Stack alignItems="center" gap={1} sx={{ px: 2, pt: 1, pb: 2.5, textAlign: 'center' }}>
        <GolferAvatar golfer={golfer} size={88} />
        <Typography variant="h4" sx={{ mt: 1 }}>
          {displayName(golfer.name)}
        </Typography>
        <TierChip memberType={golfer.memberType} />
        <Typography variant="body2" sx={{ color: md3.onSurfaceVariant }}>
          {tier ? (since ? `Member since ${since}` : 'Member · join date not on file') : 'Guest — no membership on file'} · #{golfer.id}
        </Typography>
      </Stack>

      {/* Quick contact actions, the Android contacts pattern */}
      <Stack direction="row" justifyContent="center" gap={3} sx={{ pb: 2.5 }}>
        <QuickAction icon={<CallOutlined />} label="Call" onClick={() => toast(`Calling ${golfer.phone}`)} />
        <QuickAction icon={<ChatOutlined />} label="Text" onClick={() => toast(`Texting ${golfer.phone}`)} />
        <QuickAction icon={<EmailOutlined />} label="Email" onClick={() => toast(`Emailing ${golfer.email}`)} />
      </Stack>

      {/* Primary actions */}
      <Stack direction="row" gap={1.5} sx={{ px: 2, pb: 2.5 }}>
        <Button variant="contained" startIcon={<PointOfSale />} onClick={startOrder} sx={{ flex: 1 }}>
          Start order
        </Button>
        <Button
          variant="contained"
          startIcon={<GolfCourse />}
          onClick={bookTime}
          sx={{ flex: 1, bgcolor: mobile.secondaryContainer, color: mobile.onSecondaryContainer, boxShadow: 'none', '&:hover': { bgcolor: mobile.secondaryContainer, boxShadow: 'none' } }}
        >
          Book tee time
        </Button>
      </Stack>

      {/* Stats */}
      <Stack
        direction="row"
        sx={{ mx: 2, mb: 1, borderRadius: `${radius.md}px`, bgcolor: mobile.surfaceContainerLow, border: `1px solid ${md3.outlineVariant}` }}
      >
        <Stat label="Handicap" value={String(golfer.hcp)} />
        <Divider orientation="vertical" flexItem />
        <Stat label="Upcoming" value={String(times.upcoming.length)} />
        <Divider orientation="vertical" flexItem />
        <Stat label="Type" value={tier ? tier.label.replace(' Member', '') : 'Guest'} />
      </Stack>

      <SectionTitle>Contact</SectionTitle>
      <InfoItem icon={<CallOutlined />} primary={golfer.phone} secondary="Mobile" />
      <InfoItem icon={<EmailOutlined />} primary={golfer.email || '—'} secondary="Email" />
      <InfoItem
        icon={<NotesOutlined />}
        primary={golfer.notes || 'No notes'}
        secondary="Notes"
        muted={!golfer.notes}
      />

      <SectionTitle>Upcoming tee times</SectionTitle>
      {times.upcoming.length ? (
        times.upcoming.map((b) => <TeeTimeItem key={b.id} booking={b} />)
      ) : (
        <Empty>Nothing booked. Use “Book tee time” to find a slot.</Empty>
      )}

      {times.recent.length > 0 && (
        <>
          <SectionTitle>Recent</SectionTitle>
          {times.recent.map((b) => (
            <TeeTimeItem key={b.id} booking={b} />
          ))}
        </>
      )}
      <Box sx={{ height: 24 }} />
    </MobileScreen>
  );
}

/** A booking row. Opens the booking on the Tee Sheet destination — its natural home. */
function TeeTimeItem({ booking }: { booking: Booking }) {
  const nav = useMobileNav();
  const { state } = usePos();
  const course = state.courses.find((c) => c.id === booking.course);
  const badge = payBadges[booking.pay];
  const date = new Date(`${booking.date}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  return (
    <ListItemButton
      onClick={() => nav.openIn('tee', { name: 'bookingDetail', bookingId: booking.id })}
      sx={{ minHeight: mobile.listItem.two }}
    >
      <ListItemIcon>
        <EventOutlined />
      </ListItemIcon>
      <ListItemText
        primary={`${date} · ${formatTimeLabel(booking.timeMin)}`}
        secondary={`${course?.name ?? booking.course} · ${booking.players} player${booking.players === 1 ? '' : 's'} · ${booking.holes}`}
      />
      <Box
        component="span"
        sx={{ px: 1, py: 0.25, borderRadius: 1, fontSize: 11, fontWeight: 700, bgcolor: badge.bg, color: badge.text, ml: 1, flexShrink: 0 }}
      >
        {badge.label}
      </Box>
      <ChevronRight sx={{ color: md3.onSurfaceVariant, ml: 0.5 }} />
    </ListItemButton>
  );
}

function QuickAction({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <ButtonBase onClick={onClick} sx={{ flexDirection: 'column', gap: 0.75, borderRadius: 2, p: 0.5 }}>
      <Box
        sx={{ width: 48, height: 48, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: mobile.secondaryContainer, color: mobile.onSecondaryContainer }}
      >
        {icon}
      </Box>
      <Typography variant="caption" sx={{ color: md3.onSurface, fontWeight: 500 }}>
        {label}
      </Typography>
    </ButtonBase>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ flex: 1, py: 1.5, textAlign: 'center', minWidth: 0 }}>
      <Typography variant="h5" noWrap>
        {value}
      </Typography>
      <Typography variant="caption">{label}</Typography>
    </Box>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Typography variant="subtitle2" sx={{ color: md3.primary, px: 2, pt: 2.5, pb: 0.5 }}>
      {children}
    </Typography>
  );
}

export function InfoItem({ icon, primary, secondary, muted }: { icon: ReactNode; primary: string; secondary: string; muted?: boolean }) {
  return (
    <Stack direction="row" alignItems="center" gap={2} sx={{ px: 2, minHeight: mobile.listItem.two }}>
      <Box sx={{ color: md3.onSurfaceVariant, display: 'flex' }}>{icon}</Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body1" sx={{ color: muted ? md3.onSurfaceVariant : md3.onSurface, overflowWrap: 'anywhere' }}>
          {primary}
        </Typography>
        <Typography variant="caption">{secondary}</Typography>
      </Box>
    </Stack>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <Typography variant="body2" sx={{ px: 2, py: 1.5, color: md3.onSurfaceVariant }}>
      {children}
    </Typography>
  );
}
