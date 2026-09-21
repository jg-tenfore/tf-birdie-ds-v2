import { Box, List, ListItemButton, ListItemIcon, ListItemText, Radio, Switch, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { md3, payBadges } from '../../../../theme/tokens';
import { formatTimeLabel } from '../../../data/courses';
import { findMemberByPhone } from '../../../data/golfers';
import { money } from '../../../logic/cart';
import { Icon } from '../../../components/primitives';
import { Stack } from '../../../components/Stack';
import { useGolferRoster, usePos } from '../../../state/PosProvider';
import type { PlayerState } from '../../../types';
import { MobileScreen, TopAppBar } from '../../chrome';
import { useMobileNav } from '../../navigation';
import type { ScreenProps } from '../types';
import { BookingGone, Callout, MemberBadge, PlayerAvatar, SectionHeader } from './parts';
import { ROUND_STEPS, playerName, roundStepOf, seatMemberType, useBooking } from './tee-helpers';

/**
 * One seat on a booking — pushed from the Players tab, so Back returns to the party.
 *
 * The terminal draws each player's round as a five-dot rail inside a list row. On a phone
 * that rail becomes a vertical radio list, one 56dp row per step: every step is still
 * directly selectable (staff correct mis-taps and jump groups to Finished after the
 * fact), but each is now a real touch target.
 *
 * A seat linked to a CRM record links on to the customer's profile in People — a push
 * into another destination's screen, kept on this stack so Back comes straight here.
 */
export function PlayerDetailScreen({ route }: ScreenProps<'playerDetail'>) {
  const { dispatch, toast } = usePos();
  const nav = useMobileNav();
  const { booking: b, course } = useBooking(route.bookingId);
  const roster = useGolferRoster();
  if (!b) return <BookingGone />;

  const i = route.playerIndex;
  const p: PlayerState = b.playerStates[i] ?? { paid: false, step: -1, noShow: false };
  const name = playerName(b, i);
  const guest = b.guests?.[i];
  const mt = seatMemberType(b, i, roster);
  // The booker is matched to the CRM by phone; a guest only when they were picked from it.
  const crm = guest?.crmId
    ? roster.find((g) => g.id === guest.crmId)
    : i === 0
      ? findMemberByPhone(b.phone, roster)
      : undefined;
  const crmId = guest?.crmId ?? crm?.id;

  const patch = (next: Partial<PlayerState>, msg?: string) => {
    dispatch({
      type: 'patchBooking',
      bookingId: b.id,
      patch: { playerStates: b.playerStates.map((s, k) => (k === i ? { ...s, ...next } : s)) },
    });
    if (msg) toast(msg);
  };

  const contact: Array<[string, string, string]> = [
    ['phone', 'Phone', guest?.phone ?? crm?.phone ?? (i === 0 ? b.phone : '') ?? ''],
    ['mail', 'Email', guest?.email ?? crm?.email ?? ''],
    ['golf_course', 'Handicap', String(guest?.hcp ?? crm?.hcp ?? '')],
  ];
  const note = b.playerNotes?.[i];
  const current = roundStepOf(p);

  return (
    <MobileScreen topBar={<TopAppBar title={name} subtitle={`Player ${i + 1} of ${b.players} · ${b.name}`} />}>
      <Stack alignItems="center" gap={1} sx={{ pt: 2, pb: 2.5, px: 2 }}>
        <PlayerAvatar name={name} index={i} size={72} dim={p.noShow} />
        <Typography variant="h4" sx={{ textAlign: 'center' }}>
          {name}
        </Typography>
        <Stack direction="row" gap={0.75} alignItems="center">
          {mt ? <MemberBadge type={mt} /> : <Typography variant="body2" sx={{ color: md3.onSurfaceVariant }}>Guest</Typography>}
          <Typography variant="body2" sx={{ color: md3.onSurfaceVariant }}>
            · {formatTimeLabel(b.timeMin)} · {course?.name}
          </Typography>
        </Stack>
      </Stack>

      {note && (
        <Callout tone="warning" icon="sticky_note_2" sx={{ mx: 2, mb: 1 }}>
          {note}
        </Callout>
      )}

      <SectionHeader>Round status</SectionHeader>
      <List disablePadding sx={{ opacity: p.noShow ? 0.45 : 1 }}>
        {ROUND_STEPS.map((r) => {
          const on = !p.noShow && current.step === r.step;
          const done = !p.noShow && current.step > r.step;
          return (
            <ListItemButton key={r.label} disabled={p.noShow} onClick={() => patch({ step: r.step, noShow: false }, `${name} · ${r.label}`)}>
              <ListItemIcon>
                <Icon name={r.icon} size={24} color={done || on ? md3.primary : md3.onSurfaceVariant} />
              </ListItemIcon>
              <ListItemText primary={r.label} />
              {done ? <Icon name="check_circle" size={24} color={md3.primary} sx={{ mr: 1.25 }} /> : <Radio edge="end" checked={on} tabIndex={-1} />}
            </ListItemButton>
          );
        })}
      </List>

      <SectionHeader>Payment</SectionHeader>
      <List disablePadding>
        <ListItemButton onClick={() => patch({ paid: !p.paid }, p.paid ? `${name} · unpaid` : `${name} · paid`)}>
          <ListItemIcon>
            <Icon name="paid" size={24} color={p.paid ? payBadges.paid.text : md3.onSurfaceVariant} />
          </ListItemIcon>
          <ListItemText primary="Paid" secondary={p.paid ? 'Settled' : `${money(b.price)} due`} />
          <Switch edge="end" checked={p.paid} tabIndex={-1} />
        </ListItemButton>
        <ListItemButton onClick={() => patch({ noShow: !p.noShow, step: -1 }, p.noShow ? `${name} · restored` : `${name} · no-show`)}>
          <ListItemIcon>
            <Icon name="person_off" size={24} color={p.noShow ? md3.error : md3.onSurfaceVariant} />
          </ListItemIcon>
          <ListItemText primary="No-show" secondary="Did not arrive for the round" />
          <Switch edge="end" color="error" checked={p.noShow} tabIndex={-1} />
        </ListItemButton>
      </List>

      <SectionHeader>Contact</SectionHeader>
      <List disablePadding>
        {contact.map(([icon, label, value]) => (
          <Stack key={label} direction="row" alignItems="center" sx={{ minHeight: 56, px: 2, gap: 2 }}>
            <Icon name={icon} size={24} color={md3.onSurfaceVariant} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body1" noWrap sx={{ color: value ? md3.onSurface : md3.outline }}>
                {value || 'Not recorded'}
              </Typography>
              <Typography variant="caption">{label}</Typography>
            </Box>
          </Stack>
        ))}
        {crmId ? (
          <ListItemButton onClick={() => nav.push({ name: 'golferDetail', golferId: crmId })}>
            <ListItemIcon>
              <Icon name="manage_accounts" size={24} color={md3.primary} />
            </ListItemIcon>
            <ListItemText primary="Customer profile" secondary="History, membership, and notes in People" />
            <ChevronRightIcon sx={{ color: md3.onSurfaceVariant }} />
          </ListItemButton>
        ) : (
          <Box sx={{ px: 2, pb: 2 }}>
            <Callout tone="info" icon="info">
              Not linked to a customer record. Guests named at the counter are kept on this booking only.
            </Callout>
          </Box>
        )}
      </List>
      <Box sx={{ height: 16 }} />
    </MobileScreen>
  );
}
