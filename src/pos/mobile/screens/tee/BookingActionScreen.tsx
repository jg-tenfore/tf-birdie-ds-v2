import { useState } from 'react';
import { Box, Button, Checkbox, List, ListItemButton, ListItemText, Typography } from '@mui/material';
import { md3, radius } from '../../../../theme/tokens';
import { AP_CONFIGS } from '../../../data/config';
import { formatTimeLabel } from '../../../data/courses';
import { money } from '../../../logic/cart';
import { Icon } from '../../../components/primitives';
import { Stack } from '../../../components/Stack';
import { usePos } from '../../../state/PosProvider';
import type { FinancialAction, PlayerState } from '../../../types';
import { DialogTopBar, MobileScreen } from '../../chrome';
import { useMobileNav } from '../../navigation';
import type { ScreenProps } from '../types';
import { BookingGone, Callout, PlayerAvatar, SectionHeader, StatusBadge } from './parts';
import { playerName, plural, roundStepOf, useBooking } from './tee-helpers';
import { checkInPlayer } from '../../../logic/bookings';
import { demoNow } from '../../../data/bookings';

/** Which seats each action starts with ticked — the likely answer, so one tap confirms. */
function initialPick(action: 'checkin' | 'refund' | 'raincheck', states: PlayerState[]): number[] {
  return states
    .map((p, i) => ({ p, i }))
    .filter(({ p }) =>
      action === 'checkin' ? p.step < 0 && !p.noShow : action === 'raincheck' ? !p.noShow : false,
    )
    .map(({ i }) => i);
}

/**
 * Check in / refund / rain check — a full-screen dialog over Booking Detail.
 *
 * A dialog rather than a push because it's an edit you can abandon: ✕ drops the selection
 * and returns to the booking unchanged; the confirm action in the top bar commits and
 * closes. The terminal's action panel picked one player from a day-wide search; here the
 * booking is already known (you came from it), so the dialog is just its seats — and
 * several can be ticked at once, because a foursome's rain check is one decision.
 */
export function BookingActionScreen({ route }: ScreenProps<'bookingAction'>) {
  const { dispatch, toast } = usePos();
  const nav = useMobileNav();
  const { booking: b, course } = useBooking(route.bookingId);
  const [picked, setPicked] = useState<number[]>(() => (b ? initialPick(route.action, b.playerStates ?? []) : []));
  if (!b) return <BookingGone />;

  const cfg = AP_CONFIGS[route.action];
  const states = b.playerStates ?? [];
  const toggle = (i: number) => setPicked(picked.includes(i) ? picked.filter((x) => x !== i) : [...picked, i].sort((x, y) => x - y));
  const refundTotal = picked.filter((i) => states[i]?.paid).length * b.price;

  const confirmLabel =
    route.action === 'checkin'
      ? picked.length ? `Check in ${picked.length}` : 'Check in'
      : route.action === 'refund'
        ? refundTotal ? `Refund ${money(refundTotal)}` : 'Refund'
        : 'Issue';

  const apply = () => {
    if (route.action === 'checkin') {
      dispatch({
        type: 'patchBooking',
        bookingId: b.id,
        patch: { playerStates: states.map((p, i) => (picked.includes(i) ? checkInPlayer(p) : p)) },
      });
      toast(`${plural(picked.length, 'player')} checked in · ${b.name}`);
    } else {
      const time = demoNow().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const whole = picked.length === states.length;
      const entries: FinancialAction[] = whole
        ? [{ time, label: route.action === 'refund' ? 'Refund (group)' : 'Rain check (all)', player: 'Entire group', type: route.action === 'refund' ? 'refund' : 'raincheck_all' }]
        : picked.map((i) => ({ time, label: route.action === 'refund' ? 'Refund' : 'Rain check', player: playerName(b, i), type: route.action === 'refund' ? 'refund' : 'raincheck' }));
      dispatch({
        type: 'patchBooking',
        bookingId: b.id,
        patch: {
          pay: route.action === 'refund' ? 'refund' : 'rain_chk',
          financialActions: [...(b.financialActions ?? []), ...entries],
        },
      });
      toast(`${cfg.title} · ${whole ? 'entire group' : plural(picked.length, 'player')}`);
    }
    nav.pop();
  };

  const eligible = (p: PlayerState) =>
    route.action === 'checkin' ? !p.noShow : route.action === 'refund' ? p.paid : !p.noShow;
  const eligibleIdx = states.flatMap((p, i) => (eligible(p) ? [i] : []));
  const allPicked = picked.length > 0 && picked.length === eligibleIdx.length;

  return (
    <MobileScreen
      topBar={<DialogTopBar title={cfg.title} confirmLabel={confirmLabel} confirmDisabled={!picked.length} onConfirm={apply} />}
    >
      <Stack direction="row" alignItems="center" gap={2} sx={{ mx: 2, mt: 1, p: 2, borderRadius: `${radius.lg}px`, bgcolor: md3.surfaceContainer }}>
        <Box sx={{ width: 40, height: 40, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: cfg.accent, flexShrink: 0 }}>
          <Icon name={cfg.icon} size={22} color={cfg.accentText} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" noWrap>
            {b.name}
          </Typography>
          <Typography variant="body2" sx={{ color: md3.onSurfaceVariant }} noWrap>
            {formatTimeLabel(b.timeMin)} · {course?.name} · {b.conf}
          </Typography>
        </Box>
        <StatusBadge pay={b.pay} />
      </Stack>

      <SectionHeader
        action={
          <Button size="small" onClick={() => setPicked(allPicked ? [] : eligibleIdx)}>
            {allPicked ? 'Clear' : 'Select all'}
          </Button>
        }
      >
        {route.action === 'checkin' ? 'Who is here?' : route.action === 'refund' ? 'Refund which players?' : 'Rain check which players?'}
      </SectionHeader>
      <List disablePadding>
        {states.map((p, i) => {
          const name = playerName(b, i);
          const ok = eligible(p);
          const secondary =
            route.action === 'checkin'
              ? p.noShow ? 'No-show' : roundStepOf(p).label
              : p.noShow
                ? 'No-show'
                : p.paid
                  ? `Paid ${money(b.price)}`
                  : route.action === 'refund'
                    ? 'Unpaid — nothing to refund'
                    : 'Unpaid';
          return (
            <ListItemButton key={i} disabled={!ok} onClick={() => toggle(i)} sx={{ gap: 2, minHeight: 72 }}>
              <PlayerAvatar name={name} index={i} dim={!ok} />
              <ListItemText primary={name} secondary={secondary} />
              <Checkbox edge="end" checked={picked.includes(i)} tabIndex={-1} />
            </ListItemButton>
          );
        })}
      </List>

      <Box sx={{ p: 2 }}>
        {route.action === 'checkin' ? (
          <Callout tone="info" icon="info">
            Checking in doesn't take payment. To settle a balance, use <b>Check in & pay</b> on the booking.
          </Callout>
        ) : (
          <Callout tone="warning" icon="warning">
            This records a {route.action === 'refund' ? 'refund' : 'rain check'} against the booking and appears in
            its financial trail.
            {route.action === 'refund' && refundTotal > 0 ? ` ${money(refundTotal)} returns to the original tender.` : ''}
          </Callout>
        )}
      </Box>
    </MobileScreen>
  );
}
