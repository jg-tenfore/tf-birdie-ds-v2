import { useState } from 'react';
import { Box, Button, IconButton, ListItemButton, ListItemIcon, ListItemText, TextField, Typography } from '@mui/material';
import Check from '@mui/icons-material/Check';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Close from '@mui/icons-material/Close';
import Search from '@mui/icons-material/Search';
import { md3, radius } from '../../../../theme/tokens';
import { CATALOG } from '../../../data/catalog';
import { formatTimeLabel, toDateStr } from '../../../data/courses';
import { largestFit, runsAt } from '../../../logic/bookings';
import { money } from '../../../logic/cart';
import { Stack } from '../../../components/Stack';
import { dayBookings } from '../../../state/pos-store';
import { usePos } from '../../../state/PosProvider';
import type { Booking, Transport } from '../../../types';
import { DialogTopBar, MobileScreen } from '../../chrome';
import { useMobileNav } from '../../navigation';
import type { ScreenProps } from '../types';
import { Callout, FilterChip, MemberBadge, PlayerAvatar, SectionHeader, Segmented } from './parts';
import { dayLabel, plural } from './tee-helpers';

const RATES = CATALOG['CHECK IN'].items;
const ratesFor = (holes: 9 | 18) =>
  RATES.filter((r) => (holes === 18 ? /18/.test(r.n) : /\b9\b/.test(r.n)) || !/\b(9|18)\b/.test(r.n));

/**
 * New tee time — a full-screen dialog opened from an open slot on the tee sheet.
 *
 * The terminal walks three steps (type → rate → details) inside a centred dialog. On a
 * phone that becomes one scrolling form under an ✕ / "Book" bar: every answer stays
 * visible and editable, and ✕ abandons the lot without touching the sheet.
 *
 * Finding a customer pushes the People picker on top of this dialog (`golferPicker`,
 * target `booking`) rather than searching inline — one search screen for the whole app.
 * The picker writes `state.bookingGolfer`, which this form reads when you come back.
 *
 * Deliberately not `state.selectedGolfer`: that is the Register order's customer, and an
 * operator booking a tee time mid-sale must not re-address the order on the counter.
 * `bookingGolfer` is cleared when the tee time is booked and when ✕ abandons the dialog.
 */
export function NewTeeTimeScreen({ route }: ScreenProps<'newTeeTime'>) {
  const { state, dispatch, toast } = usePos();
  const nav = useMobileNav();
  const course = state.courses.find((c) => c.id === route.courseId);
  const day = dayBookings(state);
  const cap = course ? largestFit(day, course, route.timeMin) : 0;

  const [type, setType] = useState<'walkin' | 'reservation'>('reservation');
  const [holes, setHoles] = useState<9 | 18>(18);
  const [rate, setRate] = useState(() => ratesFor(18)[1] ?? RATES[0]);
  const [players, setPlayers] = useState(Math.max(1, Math.min(route.players ?? cap, cap || 1)));
  const [transport, setTransport] = useState<Transport>('cart');
  const [typed, setTyped] = useState('');

  const golfer = state.bookingGolfer;
  const name = golfer?.name ?? typed.trim();
  const total = rate.p * players;
  // A member picked from the CRM usually plays on their tier's rate; offer it, don't force it.
  const memberRate = golfer?.memberType ? ratesFor(holes).find((r) => r.memberType === golfer.memberType) : undefined;

  const book = () => {
    if (!course || !name || players > cap) return;
    const runs = [...runsAt(day, course, route.timeMin).values()];
    const startSlot = runs.find((r) => r.size >= players)?.start ?? 0;
    const isMember = Boolean(rate.memberType);
    const seq = state.bookings.length + 1;
    const booking: Booking = {
      id: `m-${course.id}-${route.timeMin}-${seq}`,
      date: toDateStr(state.currentDate),
      course: course.id,
      slot: startSlot,
      timeMin: route.timeMin,
      name,
      players,
      cart: transport,
      status: isMember ? 'member' : type === 'walkin' ? 'walkin' : 'booked',
      phone: golfer?.phone ?? '—',
      // A walk-in's code says so (`W-`); `R-` is a reservation booked ahead.
      conf: `${isMember ? 'M' : type === 'walkin' ? 'W' : 'R'}-${5000 + seq}`,
      pay: type === 'walkin' ? 'paid' : 'open',
      price: rate.p,
      holes: holes === 18 ? '18H' : '9H',
      playerStates: Array.from({ length: players }, () => ({ paid: type === 'walkin', step: type === 'walkin' ? 0 : -1, noShow: false })),
      guests: Array.from({ length: players }, (_, i) =>
        i === 0 ? { name, phone: golfer?.phone, memberType: golfer?.memberType ?? null, crmId: golfer?.id } : { name: `Guest ${i + 1}` },
      ),
    };
    dispatch({ type: 'addBookings', bookings: [booking] });
    if (golfer) dispatch({ type: 'setBookingGolfer', golfer: null });
    nav.pop();
    toast(`${name} booked · ${formatTimeLabel(route.timeMin)} · ${course.name}`);
  };

  const close = () => {
    if (golfer) dispatch({ type: 'setBookingGolfer', golfer: null });
    nav.pop();
  };

  return (
    <MobileScreen
      topBar={<DialogTopBar title="New tee time" confirmLabel="Book" confirmDisabled={!name || cap === 0} onConfirm={book} onClose={close} />}
    >
      {/* What's being booked. */}
      <Stack direction="row" alignItems="center" gap={2} sx={{ mx: 2, mt: 1, p: 2, borderRadius: `${radius.lg}px`, bgcolor: md3.primaryContainer, color: md3.onPrimaryContainer }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h4" sx={{ color: 'inherit' }}>
            {formatTimeLabel(route.timeMin)}
          </Typography>
          <Typography variant="body2" sx={{ color: 'inherit' }}>
            {course?.name} · {dayLabel(state.currentDate)}
          </Typography>
        </Box>
        <Typography variant="subtitle2" sx={{ color: 'inherit', textAlign: 'right' }}>
          {plural(cap, 'slot')}
          <br />
          together
        </Typography>
      </Stack>

      {cap === 0 && (
        <Callout tone="danger" icon="block" sx={{ mx: 2, mt: 2 }}>
          Nothing is open at this time any more. Close this and pick another slot.
        </Callout>
      )}

      <SectionHeader>Booking</SectionHeader>
      <Box sx={{ px: 2 }}>
        <Segmented
          ariaLabel="Booking type"
          value={type}
          options={[
            { value: 'reservation', label: 'Reservation' },
            { value: 'walkin', label: 'Walk-in' },
          ]}
          onChange={setType}
        />
        <Typography variant="caption" component="div" sx={{ mt: 0.75, px: 1 }}>
          {type === 'walkin' ? 'Golfer is at the counter — paid now and checked in.' : 'Booked ahead — balance settled at check-in.'}
        </Typography>
      </Box>

      <SectionHeader>Golfer</SectionHeader>
      {golfer ? (
        <Stack direction="row" alignItems="center" gap={2} sx={{ px: 2, minHeight: 72 }}>
          <PlayerAvatar name={golfer.name} index={0} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body1" noWrap>
              {golfer.name}
            </Typography>
            <Stack direction="row" alignItems="center" gap={0.75}>
              {golfer.memberType && <MemberBadge type={golfer.memberType} />}
              <Typography variant="caption">{golfer.phone}</Typography>
            </Stack>
          </Box>
          <IconButton aria-label="Remove golfer" onClick={() => dispatch({ type: 'setBookingGolfer', golfer: null })}>
            <Close />
          </IconButton>
        </Stack>
      ) : (
        <>
          <ListItemButton onClick={() => nav.push({ name: 'golferPicker', target: 'booking' })}>
            <ListItemIcon>
              <Search sx={{ color: md3.primary }} />
            </ListItemIcon>
            <ListItemText primary="Find a customer" secondary="Search members and past guests" />
            <ChevronRightIcon sx={{ color: md3.onSurfaceVariant }} />
          </ListItemButton>
          <Box sx={{ px: 2, pt: 1 }}>
            <TextField label="Or enter a name" placeholder="Last, First" value={typed} onChange={(e) => setTyped(e.target.value)} helperText="Books a walk-up with no customer record" />
          </Box>
        </>
      )}

      <SectionHeader>Party</SectionHeader>
      <Stack gap={1.5} sx={{ px: 2 }}>
        <Segmented
          ariaLabel="Players"
          value={players}
          options={Array.from({ length: Math.max(cap, 1) }, (_, i) => ({ value: i + 1, label: String(i + 1), disabled: cap === 0 }))}
          onChange={setPlayers}
        />
        <Segmented<Transport>
          ariaLabel="Transport"
          value={transport}
          options={[
            { value: 'cart', label: 'Cart' },
            { value: 'walking', label: 'Walk' },
            { value: 'push', label: 'Push' },
          ]}
          onChange={setTransport}
        />
      </Stack>

      <SectionHeader>Rate</SectionHeader>
      <Box sx={{ px: 2 }}>
        <Segmented
          ariaLabel="Holes"
          value={holes}
          options={[
            { value: 9, label: '9 holes' },
            { value: 18, label: '18 holes' },
          ]}
          onChange={(h) => {
            setHoles(h);
            setRate(ratesFor(h)[0]);
          }}
        />
        {memberRate && rate.n !== memberRate.n && (
          <Button size="small" startIcon={<Check />} onClick={() => setRate(memberRate)} sx={{ mt: 1 }}>
            Use {memberRate.n} · {memberRate.p ? money(memberRate.p) : 'Free'}
          </Button>
        )}
        <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1.5 }}>
          {ratesFor(holes).map((r) => (
            <FilterChip
              key={r.n}
              label={`${r.n.replace(/\s*\d+ Holes$/, '')} · ${r.p ? money(r.p) : 'Free'}`}
              selected={rate.n === r.n}
              onClick={() => setRate(r)}
            />
          ))}
        </Stack>
      </Box>

      <Box sx={{ p: 2 }}>
        <Callout tone={type === 'walkin' ? 'success' : 'info'} icon={type === 'walkin' ? 'paid' : 'event_available'}>
          {rate.n} · {plural(players, 'player')} × {money(rate.p)} = <b>{money(total)}</b> ·{' '}
          {type === 'walkin' ? 'paid now' : 'due at check-in'}
        </Callout>
      </Box>
    </MobileScreen>
  );
}
