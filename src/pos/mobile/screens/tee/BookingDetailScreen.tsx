import { useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MoreVert from '@mui/icons-material/MoreVert';
import { md3, memberTypes, payBadges, radius } from '../../../../theme/tokens';
import { AP_CONFIGS, TRANSPORT_META } from '../../../data/config';
import { formatTimeLabel } from '../../../data/courses';
import { money, moneyShort } from '../../../logic/cart';
import { Icon } from '../../../components/primitives';
import { Stack } from '../../../components/Stack';
import { useGolferRoster, usePos } from '../../../state/PosProvider';
import { dayBookings } from '../../../state/pos-store';
import type { Booking, PlayerState, Transport } from '../../../types';
import { BottomActionBar, BottomSheet, MobileScreen, TopAppBar } from '../../chrome';
import type { BookingTab } from '../../navigation';
import { useMobileNav } from '../../navigation';
import type { ScreenProps } from '../types';
import { BookingGone, Callout, FilterChip, MemberBadge, PlayerAvatar, SectionHeader, Segmented, StatusBadge } from './parts';
import { balanceOf, checkedInCount, dayLabel, isSlotHolder, parseDateStr, playerName, plural, roundStepOf, seatMemberType } from './tee-helpers';
import { checkInPlayer } from '../../../logic/bookings';
import { useWestonEdits } from '../../../edition';
import { playerFee, playerHoles, playerIsAdjusted, playerTransport } from '../../../logic/reservation';
import { ReservationPlayersTab } from './ReservationPlayers';
import { partyHoles, partyTransport, reservationCharge, transportMeta, useRates } from './reservation-helpers';

const TABS: Array<{ id: BookingTab; label: string }> = [
  { id: 'players', label: 'Players' },
  { id: 'financial', label: 'Financial' },
  { id: 'notes', label: 'Notes' },
  { id: 'activity', label: 'Activity' },
];

/**
 * Weston Edits: the reservation's tabs.
 *
 * Four, not five. The Customer tab went in Weston's third round — "I don't think it needs to be
 * a tab on the reservation, I wonder if it's its own thing" — so tapping a player's name opens
 * their record as its own screen instead. That leaves this list identical to the base one, but
 * it is kept separate because the tabs render different bodies in each edition.
 */
const WESTON_TABS: Array<{ id: BookingTab; label: string }> = [
  { id: 'players', label: 'Players' },
  { id: 'financial', label: 'Financial' },
  { id: 'notes', label: 'Notes' },
  { id: 'activity', label: 'Activity' },
];

/**
 * Booking detail — pushed from the tee sheet, search, or the day summary.
 *
 * The terminal's five-tab dialog becomes a page with MD3 primary tabs. "Details" is gone
 * as a tab: the facts that identify a booking (time, course, confirmation, pay state) sit
 * in the header above the tabs, so they're visible whichever tab is open.
 *
 * The tab lives in the route (`route.tab`) and switching replaces the route rather than
 * pushing, so Back leaves the booking instead of stepping through tabs — MD3's rule that
 * tabs are not navigation history.
 */
export function BookingDetailScreen({ route }: ScreenProps<'bookingDetail'>) {
  const { state, dispatch, toast } = usePos();
  const nav = useMobileNav();
  const weston = useWestonEdits();
  const [sheet, setSheet] = useState<null | 'actions' | 'delete'>(null);
  const roster = useGolferRoster();
  const b = state.bookings.find((x) => x.id === route.bookingId);
  if (!b) return <BookingGone />;

  const course = state.courses.find((c) => c.id === b.course);
  const tab = route.tab ?? 'players';
  const tabs = weston ? WESTON_TABS : TABS;
  const holder = isSlotHolder(b);
  const unpaid = (b.playerStates ?? []).filter((p) => !p.paid && !p.noShow).length;
  // Bug fix (all editions): the button's amount is what the order will charge — fees,
  // transport and tax — not unpaid players × rate, which left out carts and tax.
  const due = reservationCharge(b, state).total;
  const closed = b.pay === 'no_show' || b.pay === 'refund';
  const memberType = seatMemberType(b, 0, roster);

  const checkInAndPay = () => {
    // Weston Edits: "Check in & pay" checks everyone in (no-shows aside), as the tablet
    // panel's does — the base edition's button only opens the order.
    const settled = b.playerStates.every((p) => p.paid || p.noShow);
    if (weston && !settled && !closed) {
      dispatch({
        type: 'patchBooking',
        bookingId: b.id,
        patch: { playerStates: b.playerStates.map((p) => (p.noShow ? p : checkInPlayer(p))) },
      });
    }
    dispatch({ type: 'loadBooking', bookingId: b.id });
    nav.openIn('register', { name: 'order' });
  };

  const bottomBar = holder ? undefined : weston ? (
    <ReservationActions booking={b} onCheckInAndPay={checkInAndPay} />
  ) : closed ? (
    <BottomActionBar>
      <Button variant="outlined" fullWidth onClick={checkInAndPay}>
        Open in Register
      </Button>
    </BottomActionBar>
  ) : unpaid > 0 ? (
    <BottomActionBar>
      {checkedInCount(b) < b.players && (
        <Button variant="outlined" sx={{ flexShrink: 0, whiteSpace: 'nowrap' }} onClick={() => nav.push({ name: 'bookingAction', bookingId: b.id, action: 'checkin' })}>
          Check in
        </Button>
      )}
      <Button variant="contained" disableElevation fullWidth onClick={checkInAndPay}>
        Check in & pay{due > 0 ? ` · ${money(due)}` : ''}
      </Button>
    </BottomActionBar>
  ) : (
    <BottomActionBar>
      <Button variant="outlined" sx={{ flexShrink: 0, whiteSpace: 'nowrap' }} onClick={checkInAndPay}>
        Register
      </Button>
      <Button
        variant="contained"
        disableElevation
        fullWidth
        disabled={checkedInCount(b) === b.players}
        onClick={() => nav.push({ name: 'bookingAction', bookingId: b.id, action: 'checkin' })}
      >
        {checkedInCount(b) === b.players ? 'All checked in' : 'Check in'}
      </Button>
    </BottomActionBar>
  );

  const sheetItems: Array<{ icon: string; label: string; destructive?: boolean; run: () => void; staysInSheet?: boolean }> = holder
    ? [{ icon: 'delete', label: b.pay === 'event' ? 'Delete league slot' : 'Remove block', destructive: true, staysInSheet: true, run: () => setSheet('delete') }]
    : [
        { icon: 'swap_horiz', label: 'Move tee time', run: () => nav.push({ name: 'movePlayers', bookingId: b.id }) },
        { icon: 'reply', label: 'Refund', run: () => nav.push({ name: 'bookingAction', bookingId: b.id, action: 'refund' }) },
        { icon: 'wb_cloudy', label: 'Issue rain check', run: () => nav.push({ name: 'bookingAction', bookingId: b.id, action: 'raincheck' }) },
        b.pay === 'no_show'
          ? {
              icon: 'restart_alt',
              label: 'Undo no-show',
              run: () => {
                dispatch({ type: 'patchBooking', bookingId: b.id, patch: { pay: unpaid ? 'open' : 'paid', playerStates: b.playerStates.map((p) => ({ ...p, noShow: false })) } });
                toast(`${b.name} · restored`);
              },
            }
          : {
              icon: 'person_off',
              label: 'Mark no-show',
              destructive: true,
              run: () => {
                dispatch({ type: 'patchBooking', bookingId: b.id, patch: { pay: 'no_show', playerStates: b.playerStates.map((p) => ({ ...p, noShow: true, step: -1 })) } });
                toast(`${b.name} · no-show`);
              },
            },
        { icon: 'delete', label: 'Delete booking', destructive: true, staysInSheet: true, run: () => setSheet('delete') },
      ];

  return (
    <MobileScreen
      topBar={
        <TopAppBar
          title={b.name}
          subtitle={`${formatTimeLabel(b.timeMin)} · ${course?.name ?? b.course}`}
          actions={
            <IconButton aria-label="More actions" onClick={() => setSheet('actions')}>
              <MoreVert />
            </IconButton>
          }
        >
          {/* "Next in line" — step to the next tee time without leaving the reservation. The
              phone is arguably where this matters most: you are walking the sheet, not standing
              at a counter with it in front of you. */}
          {weston && !holder && <NextInLine booking={b} />}
          <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap" sx={{ px: 2, pb: 1.5 }}>
            <StatusBadge pay={b.pay} />
            {memberType && <MemberBadge type={memberType} />}
            {!holder && (
              <Typography variant="body2" sx={{ color: md3.onSurfaceVariant }}>
                {plural(b.players, 'player')} · {weston ? partyHoles(b) : b.holes} · {weston ? partyTransport(b) : TRANSPORT_META[b.cart]?.label}
              </Typography>
            )}
          </Stack>
          {!holder && (
            <Tabs
              value={tab}
              variant="fullWidth"
              onChange={(_, v: BookingTab) => nav.replace({ ...route, tab: v })}
              sx={{
                borderBottom: `1px solid ${md3.outlineVariant}`,
                '& .MuiTab-root': { color: md3.onSurfaceVariant, px: weston ? 0.25 : 0.5, minWidth: 0, ...(weston && { fontSize: 13, letterSpacing: 0 }) },
                '& .MuiTab-root.Mui-selected': { color: md3.primary },
                '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
              }}
            >
              {tabs.map((t) => (
                <Tab key={t.id} value={t.id} label={t.label} />
              ))}
            </Tabs>
          )}
        </TopAppBar>
      }
      bottomBar={bottomBar}
    >
      {holder ? (
        <HolderBody booking={b} />
      ) : (
        <>
          {tab === 'players' && (weston ? <ReservationPlayersTab booking={b} /> : <PlayersTab booking={b} />)}
          {tab === 'financial' && <FinancialTab booking={b} />}
          {tab === 'notes' && <NotesTab key={b.id} booking={b} />}
          {tab === 'activity' && <ActivityTab booking={b} />}
        </>
      )}

      <BottomSheet open={sheet === 'actions'} onClose={() => setSheet(null)} title={b.name}>
        <List disablePadding>
          {sheetItems.map((it) => (
            <ListItemButton
              key={it.label}
              onClick={() => {
                if (!it.staysInSheet) setSheet(null);
                it.run();
              }}
              sx={{ color: it.destructive ? md3.error : md3.onSurface }}
            >
              <ListItemIcon>
                <Icon name={it.icon} size={24} color={it.destructive ? md3.error : md3.onSurfaceVariant} />
              </ListItemIcon>
              <ListItemText primary={it.label} />
            </ListItemButton>
          ))}
        </List>
      </BottomSheet>

      {/* Destructive confirmation stays in the sheet — no centred dialog on the phone. */}
      <BottomSheet open={sheet === 'delete'} onClose={() => setSheet(null)} title={holder ? 'Remove this slot?' : 'Delete this booking?'}>
        <Typography variant="body2" sx={{ px: 3, color: md3.onSurfaceVariant }}>
          {b.name} · {formatTimeLabel(b.timeMin)} · {course?.name}. The slot is released and this can't be undone.
        </Typography>
        <Stack direction="row" gap={1} sx={{ px: 3, pt: 3 }}>
          <Button variant="outlined" fullWidth onClick={() => setSheet(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disableElevation
            fullWidth
            onClick={() => {
              setSheet(null);
              nav.pop();
              dispatch({ type: 'deleteBookings', bookingIds: [b.id] });
              toast(holder ? 'Slot released' : 'Booking deleted');
            }}
          >
            Delete
          </Button>
        </Stack>
      </BottomSheet>
    </MobileScreen>
  );
}

// ─── Players ────────────────────────────────────────────────────────────────

const stepLabel = (p: PlayerState): string => (p.noShow ? 'No-show' : roundStepOf(p).label);

/**
 * The party, one row per seat. Each row pushes Player Detail — the per-player progress
 * rail and payment toggles were a dense strip in the terminal; on a phone they get a
 * page of their own rather than cramming five 28px step buttons into a list row.
 */
function PlayersTab({ booking: b }: { booking: Booking }) {
  const { state, dispatch, toast } = usePos();
  const roster = useGolferRoster();
  const nav = useMobileNav();
  const states = b.playerStates ?? [];
  const course = state.courses.find((c) => c.id === b.course);

  // Check-in never moves anyone backwards: a player already out on the course keeps their step.
  const checkInAll = () => {
    dispatch({ type: 'patchBooking', bookingId: b.id, patch: { playerStates: states.map(checkInPlayer) } });
    toast('All checked in');
  };

  const facts: Array<[string, string]> = [
    ['Date', dayLabel(parseDateStr(b.date), { weekday: 'long', month: 'short', day: 'numeric' })],
    ['Tee time', `${formatTimeLabel(b.timeMin)} · ${course?.name ?? b.course}`],
    ['Confirmation', b.conf],
    ['Rate', b.price ? `${money(b.price)} per player` : `Member · ${moneyShort(0)}`],
    ['Phone', b.phone || '—'],
  ];

  return (
    <Box sx={{ pb: 2 }}>
      {b.note && (
        <Callout tone="warning" icon="sticky_note_2" sx={{ mx: 2, mt: 2 }}>
          {b.note}
        </Callout>
      )}

      <SectionHeader
        action={
          b.pay !== 'no_show' &&
          b.pay !== 'refund' &&
          checkedInCount(b) < b.players && (
            <Button size="small" onClick={() => checkInAll()}>
              Check in all
            </Button>
          )
        }
      >
        {checkedInCount(b)}/{b.players} checked in · {states.filter((p) => p.paid).length} paid
      </SectionHeader>
      <List disablePadding>
        {states.map((p, i) => {
          const name = playerName(b, i);
          const mt = seatMemberType(b, i, roster);
          return (
            <ListItemButton key={i} onClick={() => nav.push({ name: 'playerDetail', bookingId: b.id, playerIndex: i })} sx={{ minHeight: 72, gap: 2 }}>
              <PlayerAvatar name={name} index={i} dim={p.noShow} />
              <ListItemText
                primary={
                  <Stack direction="row" alignItems="center" gap={0.75} component="span">
                    {mt && <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: memberTypes[mt].color, flexShrink: 0 }} />}
                    <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {name}
                    </Box>
                  </Stack>
                }
                secondary={stepLabel(p)}
              />
              <StatusBadge pay={p.noShow ? 'no_show' : p.paid ? 'paid' : 'open'} />
              <ChevronRightIcon sx={{ color: md3.onSurfaceVariant, mr: -1 }} />
            </ListItemButton>
          );
        })}
      </List>

      <SectionHeader>Transport</SectionHeader>
      <Box sx={{ px: 2 }}>
        <Segmented<Transport>
          ariaLabel="Transport"
          value={b.cart}
          options={[
            { value: 'walking', label: 'Walk' },
            { value: 'cart', label: 'Cart' },
            { value: 'push', label: 'Push' },
          ]}
          onChange={(v) => {
            dispatch({ type: 'patchBooking', bookingId: b.id, patch: { cart: v } });
            toast(`Transport · ${TRANSPORT_META[v]?.label}`);
          }}
        />
      </Box>

      <SectionHeader>Reservation</SectionHeader>
      <Box sx={{ px: 2 }}>
        {facts.map(([k, v]) => (
          <Stack key={k} direction="row" justifyContent="space-between" gap={2} sx={{ py: 1, borderBottom: `1px solid ${md3.outlineVariant}` }}>
            <Typography variant="body2" sx={{ color: md3.onSurfaceVariant }}>
              {k}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'right' }}>
              {v}
            </Typography>
          </Stack>
        ))}
      </Box>
    </Box>
  );
}

// ─── Financial ──────────────────────────────────────────────────────────────

/**
 * Money on the booking. Refund and rain check each push their own full-screen dialog
 * rather than acting from a row icon — they move money, so they get a screen where the
 * operator picks players and reads back the amount before confirming.
 */
function FinancialTab({ booking: b }: { booking: Booking }) {
  const nav = useMobileNav();
  const weston = useWestonEdits();
  const rates = useRates();
  const states = b.playerStates ?? [];
  const owed = balanceOf(b, rates);
  const trail = b.financialActions ?? [];

  return (
    <Box sx={{ p: 2 }}>
      {weston ? (
        <ReservationMoney booking={b} />
      ) : (
      <Stack
        direction="row"
        alignItems="flex-end"
        justifyContent="space-between"
        sx={{ p: 2, borderRadius: `${radius.lg}px`, bgcolor: md3.surfaceContainer }}
      >
        <Box>
          <Typography variant="caption">Outstanding</Typography>
          <Typography variant="h3" sx={{ color: owed > 0 ? md3.error : payBadges.paid.text, fontWeight: 500 }}>
            {money(owed)}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="caption">Rate per player</Typography>
          <Typography variant="subtitle1">{money(b.price)}</Typography>
        </Box>
      </Stack>
      )}
      {b.paymentRecord && (
        <Typography variant="body2" sx={{ mt: 1, color: md3.onSurfaceVariant }}>
          Paid {money(b.paymentRecord.amount)} by {b.paymentRecord.method} at {b.paymentRecord.time}
        </Typography>
      )}

      <SectionHeader sx={{ px: 0 }}>Per player</SectionHeader>
      {states.map((p, i) => (
        <Stack key={i} direction="row" alignItems="center" gap={1.5} sx={{ minHeight: 48, borderBottom: `1px solid ${md3.outlineVariant}` }}>
          <PlayerAvatar name={playerName(b, i)} index={i} size={28} dim={p.noShow} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body1" noWrap>
              {playerName(b, i)}
            </Typography>
            {weston && (
              <Typography variant="caption" component="div" noWrap>
                {playerHoles(b, i)} holes · {transportMeta(playerTransport(b, i)).long}
                {playerIsAdjusted(b, i) ? ' · adjusted' : ''}
              </Typography>
            )}
          </Box>
          {(() => {
            const fee = playerFee(b, i, rates);
            return (
              <Typography variant="subtitle2" sx={{ color: p.noShow || (!p.paid && !fee) ? md3.outline : p.paid ? payBadges.paid.text : md3.error }}>
                {p.noShow ? 'No-show' : p.paid ? 'Paid' : fee ? money(fee) : 'No charge'}
              </Typography>
            );
          })()}
        </Stack>
      ))}

      <Stack direction="row" gap={1} sx={{ mt: 2 }}>
        <Button variant="outlined" fullWidth startIcon={<Icon name="wb_cloudy" size={18} />} onClick={() => nav.push({ name: 'bookingAction', bookingId: b.id, action: 'raincheck' })}>
          Rain check
        </Button>
        <Button variant="outlined" fullWidth startIcon={<Icon name="reply" size={18} />} onClick={() => nav.push({ name: 'bookingAction', bookingId: b.id, action: 'refund' })}>
          Refund
        </Button>
      </Stack>

      {trail.length > 0 && (
        <>
          <SectionHeader sx={{ px: 0 }}>Financial trail</SectionHeader>
          {trail.map((a, i) => {
            const cfg = a.type === 'refund' ? AP_CONFIGS.refund : AP_CONFIGS.raincheck;
            return (
              <Stack key={i} direction="row" alignItems="center" gap={1.5} sx={{ minHeight: 48 }}>
                <Icon name={cfg.icon} size={20} color={cfg.color} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body1">{a.label}</Typography>
                  <Typography variant="caption" component="div">
                    {a.player}
                  </Typography>
                </Box>
                <Typography variant="caption">{a.time}</Typography>
              </Stack>
            );
          })}
        </>
      )}
    </Box>
  );
}

/**
 * Weston Edits: what the register will charge for this reservation as it stands — the
 * adjusted fees, transport and tax, priced by the same functions the order uses, so the
 * Financial tab, the Check in & pay button and the order total are one number.
 */
function ReservationMoney({ booking: b }: { booking: Booking }) {
  const { state } = usePos();
  const m = reservationCharge(b, state);
  const row = (label: string, value: string, color?: string) => (
    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.25 }}>
      <Typography variant="body2" sx={{ color: md3.onSurfaceVariant }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, color }}>
        {value}
      </Typography>
    </Stack>
  );
  return (
    <Box sx={{ p: 2, borderRadius: `${radius.lg}px`, bgcolor: md3.surfaceContainer }}>
      <Stack direction="row" alignItems="flex-end" justifyContent="space-between">
        <Box>
          <Typography variant="caption">{m.total > 0 ? 'Due at check-in' : 'Nothing due'}</Typography>
          <Typography variant="h3" sx={{ color: m.total > 0 ? md3.error : payBadges.paid.text, fontWeight: 500 }}>
            {money(m.total)}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="caption">Booking rate</Typography>
          <Typography variant="subtitle1">{money(b.price)}</Typography>
        </Box>
      </Stack>
      {m.total > 0 && (
        <Box sx={{ mt: 1.5, pt: 1, borderTop: `1px solid ${md3.outlineVariant}` }}>
          {row('Tee fees & transport', money(m.subtotal))}
          {m.discount < 0 && row('Discounts', money(m.discount), md3.error)}
          {row('Tax', money(m.tax))}
        </Box>
      )}
    </Box>
  );
}

/**
 * Weston Edits: the pinned action. "Check in & pay" carries the amount the register will
 * charge for the reservation as adjusted; when nothing is due (paid in full, or a member at
 * $0) it doesn't ask for money at all — it checks the party in, with the register one tap
 * away for anything they buy.
 */
function ReservationActions({ booking: b, onCheckInAndPay }: { booking: Booking; onCheckInAndPay: () => void }) {
  const { state } = usePos();
  const nav = useMobileNav();
  const closed = b.pay === 'no_show' || b.pay === 'refund';
  const { total } = reservationCharge(b, state);
  const allIn = checkedInCount(b) === b.players;
  const checkIn = () => nav.push({ name: 'bookingAction', bookingId: b.id, action: 'checkin' });
  const settled = (b.playerStates ?? []).every((p) => p.paid || p.noShow);

  if (closed) {
    return (
      <BottomActionBar>
        <Button variant="outlined" fullWidth onClick={onCheckInAndPay}>
          Open in Register
        </Button>
      </BottomActionBar>
    );
  }
  if (total > 0) {
    return (
      <BottomActionBar>
        {!allIn && (
          <Button variant="outlined" sx={{ flexShrink: 0, whiteSpace: 'nowrap' }} onClick={checkIn}>
            Check in
          </Button>
        )}
        <Button variant="contained" disableElevation fullWidth onClick={onCheckInAndPay}>
          Check in & pay · {money(total)}
        </Button>
      </BottomActionBar>
    );
  }
  return (
    <BottomActionBar
      summary={
        <Typography variant="body2" sx={{ color: md3.onSurfaceVariant }}>
          {settled ? 'Paid in full — nothing to charge.' : 'No charge at this rate.'}
        </Typography>
      }
    >
      <Button variant="outlined" sx={{ flexShrink: 0, whiteSpace: 'nowrap' }} onClick={onCheckInAndPay}>
        Register
      </Button>
      <Button variant="contained" disableElevation fullWidth disabled={allIn} onClick={checkIn}>
        {allIn ? 'All checked in' : 'Check in'}
      </Button>
    </BottomActionBar>
  );
}

// ─── Notes ──────────────────────────────────────────────────────────────────

const ALL_TAGS = ['VIP', 'Rain check', 'Accessibility', 'Birthday', 'Corporate'];

/** Tags apply immediately; the text fields save together, like the terminal's tab. */
function NotesTab({ booking: b }: { booking: Booking }) {
  const { dispatch, toast } = usePos();
  const [groupNote, setGroupNote] = useState(b.groupNote ?? b.note ?? '');
  const [playerNotes, setPlayerNotes] = useState<Record<number, string>>(b.playerNotes ?? {});
  const tags = b.tags ?? [];
  const dirty = groupNote !== (b.groupNote ?? b.note ?? '') || JSON.stringify(playerNotes) !== JSON.stringify(b.playerNotes ?? {});

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ color: md3.primary, mb: 1 }}>
        Tags
      </Typography>
      <Stack direction="row" gap={1} flexWrap="wrap">
        {ALL_TAGS.map((t) => (
          <FilterChip
            key={t}
            label={t}
            selected={tags.includes(t)}
            onClick={() =>
              dispatch({ type: 'patchBooking', bookingId: b.id, patch: { tags: tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t] } })
            }
          />
        ))}
      </Stack>

      <TextField
        label="Group note"
        multiline
        minRows={2}
        value={groupNote}
        onChange={(e) => setGroupNote(e.target.value)}
        placeholder="Anything the starter or counter should know"
        helperText="Shown on the tee sheet card and the order"
        sx={{ mt: 3, '& .MuiInputBase-multiline': { p: 0 } }}
      />

      <Typography variant="subtitle2" sx={{ color: md3.primary, mt: 3, mb: 1.5 }}>
        Player notes
      </Typography>
      <Stack gap={2}>
        {Array.from({ length: b.players }, (_, i) => (
          <TextField
            key={i}
            label={playerName(b, i)}
            value={playerNotes[i] ?? ''}
            onChange={(e) => setPlayerNotes({ ...playerNotes, [i]: e.target.value })}
            placeholder="No note"
            slotProps={{ inputLabel: { shrink: true } }}
          />
        ))}
      </Stack>
      <Button
        variant="contained"
        disableElevation
        fullWidth
        disabled={!dirty}
        sx={{ mt: 3 }}
        onClick={() => {
          dispatch({ type: 'patchBooking', bookingId: b.id, patch: { groupNote, note: groupNote, playerNotes } });
          toast('Notes saved');
        }}
      >
        Save notes
      </Button>
    </Box>
  );
}

// ─── Activity ───────────────────────────────────────────────────────────────

/** The audit trail, seeded from the booking's state when there's no explicit log. */
function ActivityTab({ booking: b }: { booking: Booking }) {
  const states = b.playerStates ?? [];
  const logged = [
    ...(b.activityLog ?? []),
    ...(b.financialActions ?? []).map((a) => {
      const cfg = a.type === 'refund' ? AP_CONFIGS.refund : AP_CONFIGS.raincheck;
      return { time: a.time, label: a.label, detail: a.player, icon: cfg.icon, color: cfg.color };
    }),
  ];
  const entries = logged.length
    ? logged
    : [
        { time: formatTimeLabel(Math.max(0, b.timeMin - 240)), label: 'Booking created', detail: `${b.conf} · ${plural(b.players, 'player')}`, icon: 'event_available', color: md3.primary },
        ...(states.some((p) => p.paid)
          ? [{ time: formatTimeLabel(Math.max(0, b.timeMin - 30)), label: 'Payment taken', detail: `${money(b.price)} per player`, icon: 'paid', color: payBadges.paid.text }]
          : []),
        ...(states.some((p) => p.step >= 0)
          ? [{ time: formatTimeLabel(Math.max(0, b.timeMin - 15)), label: 'Checked in', detail: `${checkedInCount(b)} of ${b.players}`, icon: 'how_to_reg', color: AP_CONFIGS.raincheck.color }]
          : []),
        ...(b.pay === 'no_show'
          ? [{ time: formatTimeLabel(b.timeMin + 10), label: 'Marked no-show', detail: 'Party did not arrive', icon: 'person_off', color: md3.error }]
          : []),
      ];

  return (
    <Box sx={{ p: 2 }}>
      {entries.map((e, i) => (
        <Stack key={i} direction="row" gap={2} sx={{ position: 'relative', pb: 2.5 }}>
          {i < entries.length - 1 && (
            <Box sx={{ position: 'absolute', left: 19, top: 40, bottom: 0, width: 2, bgcolor: md3.outlineVariant }} />
          )}
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              flexShrink: 0,
              display: 'grid',
              placeItems: 'center',
              bgcolor: `${e.color ?? md3.primary}1f`,
            }}
          >
            <Icon name={e.icon ?? 'circle'} size={20} color={e.color ?? md3.primary} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0, pt: 0.25 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={1}>
              <Typography variant="subtitle2">{e.label}</Typography>
              <Typography variant="caption">{e.time}</Typography>
            </Stack>
            {e.detail && <Typography variant="body2" sx={{ color: md3.onSurfaceVariant }}>{e.detail}</Typography>}
          </Box>
        </Stack>
      ))}
    </Box>
  );
}

// ─── Blocks & events ────────────────────────────────────────────────────────

/** A block or league slot has no party to manage — just what holds it and where. */
function HolderBody({ booking: b }: { booking: Booking }) {
  const nav = useMobileNav();
  const cfg = payBadges[b.pay] ?? payBadges.block;
  return (
    <Box sx={{ p: 2 }}>
      <Callout tone={b.pay === 'event' ? 'info' : 'warning'} icon={b.pay === 'event' ? 'groups' : 'block'}>
        {b.note || b.groupNote || (b.pay === 'event' ? 'League / outing slot' : 'This slot is not bookable')}
      </Callout>
      <Button
        variant="outlined"
        fullWidth
        sx={{ mt: 2, color: cfg.text }}
        onClick={() =>
          nav.push(b.pay === 'event' ? { name: 'league', timeMin: b.groupMeta?.startMin ?? b.timeMin } : { name: 'blockTime', timeMin: b.timeMin, courseId: b.course })
        }
      >
        {b.pay === 'event' ? 'Edit league' : 'Edit block'}
      </Button>
      <Typography variant="caption" component="div" sx={{ mt: 2, textAlign: 'center' }}>
        {b.conf}
      </Typography>
    </Box>
  );
}

/**
 * ‹ n of m › through the day's bookings, in tee-time order.
 *
 * Justin's idea on the call, which Weston took: after working one reservation you are usually
 * going to work the next, and backing out to the sheet to tap a card two rows down buys
 * nothing. Blocks and league holds are skipped — there is nothing to open — and the arrows stop
 * at the ends rather than wrapping, because a silent jump back to the morning is disorienting
 * when you are moving fast.
 */
function NextInLine({ booking: b }: { booking: Booking }) {
  const { state } = usePos();
  const nav = useMobileNav();
  const day = dayBookings(state)
    .filter((x) => x.pay !== 'block' && x.pay !== 'event')
    .sort((x, y) => x.timeMin - y.timeMin || x.course.localeCompare(y.course) || x.slot - y.slot);
  const at = day.findIndex((x) => x.id === b.id);
  if (at < 0 || day.length < 2) return null;

  const go = (delta: 1 | -1) => {
    const next = day[at + delta];
    if (next) nav.replace({ name: 'bookingDetail', bookingId: next.id });
  };

  return (
    <Stack direction="row" alignItems="center" justifyContent="center" gap={0.5} sx={{ pb: 0.5 }}>
      <IconButton aria-label="Previous tee time" disabled={at === 0} onClick={() => go(-1)} size="small">
        <ChevronLeftIcon fontSize="small" />
      </IconButton>
      <Typography variant="caption" sx={{ color: md3.onSurfaceVariant, minWidth: 64, textAlign: 'center' }}>
        {at + 1} of {day.length}
      </Typography>
      <IconButton
        aria-label="Next tee time"
        disabled={at === day.length - 1}
        onClick={() => go(1)}
        size="small"
      >
        <ChevronRightIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}
