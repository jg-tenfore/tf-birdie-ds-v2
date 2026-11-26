import { useState } from 'react';
import { Box, Button, ButtonBase, Typography } from '@mui/material';
import EventSeatOutlined from '@mui/icons-material/EventSeatOutlined';
import { md3, mobile, radius } from '../../../../theme/tokens';
import { formatTimeLabel } from '../../../data/courses';
import { SERVICE_LABEL, byService, canMarkNoShow, canSeat, daySummary, relativeTo, tablesForReservation } from '../../../logic/dining';
import { tableLabel, type DiningReservation, type ReservationStatus } from '../../../logic/restaurant';
import { tableOf } from '../../../state/restaurant';
import { usePos } from '../../../state/PosProvider';
import { Stack } from '../../../components/Stack';
import { useLiveFloor } from '../../../components/restaurant/use-live-floor';
import { BottomSheet, DialogTopBar, MobileScreen, TopAppBar } from '../../chrome';
import { useMobileNav } from '../../navigation';
import type { ScreenProps } from '../types';
import { TableChoice } from './OpenTabScreen';
import { isRootRoute, nextTabId } from './restaurant-helpers';

const STATUS: Record<ReservationStatus, { label: string; bg: string; text: string }> = {
  booked: { label: 'Booked', bg: md3.primaryContainer, text: md3.onPrimaryContainer },
  seated: { label: 'Seated', bg: md3.primary, text: '#fff' },
  completed: { label: 'Paid', bg: md3.surfaceHighest, text: md3.onSurfaceVariant },
  no_show: { label: 'No-show', bg: '#ffdad6', text: md3.error },
  cancelled: { label: 'Cancelled', bg: md3.surfaceHighest, text: md3.outline },
};

/**
 * Reservations — today's book, as the host holds it (V1 → V2, handheld).
 *
 * The tablet's `ReservationsView` is any day, with a create/edit dialog. The handheld keeps
 * **today**, which is what a host on the floor is working: the day's covers at a glance
 * (`daySummary`), then lunch and dinner (`byService`), each party with its time, size, table and
 * status. A booked party opens a sheet to **seat** it — at its own table when that is free, else
 * on a table chosen from the ones that fit (`tablesForReservation`) — or, once its time has come,
 * mark it a **no-show**. Seating opens the tab, exactly as on the tablet: reservation → table → tab.
 *
 * Booking a new reservation stays on the tablet for now (an open question for the review).
 */
export function ReservationsScreen({ route }: ScreenProps<'reservations'>) {
  const { state } = usePos();
  const nav = useMobileNav();
  const ctx = useLiveFloor();
  const [openId, setOpenId] = useState<string | null>(null);
  const day = byService(state.diningReservations, ctx.date);
  const sum = daySummary(state.diningReservations, ctx.date);
  const open = state.diningReservations.find((r) => r.id === openId);

  return (
    <MobileScreen
      topBar={
        <TopAppBar
          title="Reservations"
          subtitle={`Today · ${formatTimeLabel(ctx.nowMin)}`}
          leading={isRootRoute(nav, route) ? 'none' : 'back'}
        />
      }
    >
      <Stack direction="row" gap={1} data-day-summary sx={{ px: 2, pb: 1, flexWrap: 'wrap' }}>
        <Figure label="Covers" value={sum.covers} />
        <Figure label="Seated" value={sum.seated} />
        <Figure label="To come" value={sum.toCome} />
        <Figure label="No table" value={sum.unassigned} warn={sum.unassigned > 0} />
      </Stack>
      {day.map((g) => (
        <Box key={g.service} component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
          <Typography component="li" variant="subtitle2" sx={{ px: 2, pt: 2, pb: 0.5, color: md3.primary }}>
            {SERVICE_LABEL[g.service]} · {g.reservations.filter((r) => r.status !== 'cancelled').reduce((n, r) => n + r.partySize, 0)}{' '}
            covers
          </Typography>
          {g.reservations.map((r) => (
            <li key={r.id}>
              <ReservationRow r={r} onClick={() => setOpenId(r.id)} />
            </li>
          ))}
        </Box>
      ))}
      <Box sx={{ height: 24 }} />
      <ReservationSheet r={open} onClose={() => setOpenId(null)} />
    </MobileScreen>
  );
}

function Figure({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <Box
      sx={{
        flex: '1 1 0',
        minWidth: 72,
        px: 1.25,
        py: 1,
        borderRadius: `${radius.md}px`,
        bgcolor: warn ? '#fef3c7' : mobile.surfaceContainerLow,
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 700, color: warn ? '#92400e' : md3.onSurface }}>
        {value}
      </Typography>
      <Typography variant="caption">{label}</Typography>
    </Box>
  );
}

function ReservationRow({ r, onClick }: { r: DiningReservation; onClick: () => void }) {
  const { state } = usePos();
  const at = tableOf(state, r.tableId);
  const st = STATUS[r.status];
  return (
    <ButtonBase
      data-reservation={r.id}
      onClick={onClick}
      sx={{
        width: '100%',
        minHeight: mobile.listItem.three,
        px: 2,
        gap: 1.5,
        textAlign: 'left',
        justifyContent: 'flex-start',
        borderBottom: `1px solid ${md3.outlineVariant}`,
        opacity: r.status === 'cancelled' ? 0.55 : 1,
      }}
    >
      <Box sx={{ width: 76, flexShrink: 0 }}>
        <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700 }}>
          {formatTimeLabel(r.timeMin)}
        </Typography>
        <Typography variant="caption">{r.partySize} guests</Typography>
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body1" noWrap>
          {r.name}
        </Typography>
        <Typography variant="body2" noWrap sx={{ color: r.tableId || r.status !== 'booked' ? md3.onSurfaceVariant : '#92400e' }}>
          {at ? `${tableLabel(at.table)} · ${at.room.name}` : 'No table yet'}
          {r.note ? ` · ${r.note}` : ''}
        </Typography>
      </Box>
      <Box
        sx={{
          px: 1,
          py: '2px',
          borderRadius: `${radius.sm}px`,
          bgcolor: st.bg,
          color: st.text,
          fontSize: 12,
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {st.label}
      </Box>
    </ButtonBase>
  );
}

function ReservationSheet({ r, onClose }: { r: DiningReservation | undefined; onClose: () => void }) {
  const { state, dispatch, toast } = usePos();
  const nav = useMobileNav();
  const ctx = useLiveFloor();
  if (!r) return null;
  const own =
    r.tableId && tablesForReservation(r, state.floor, ctx).some((o) => o.table.id === r.tableId) ? tableOf(state, r.tableId) : undefined;

  const seatAt = (tableId: string) => {
    onClose();
    const tabId = nextTabId(state);
    dispatch({ type: 'seatReservation', id: r.id, tableId, serverId: state.operatorId });
    nav.push({ name: 'tab', tabId });
  };

  return (
    <BottomSheet open onClose={onClose} title={r.name}>
      <Box sx={{ px: 3, pb: 1 }} data-reservation-sheet={r.id}>
        <Typography variant="body2" sx={{ color: md3.onSurfaceVariant }}>
          {formatTimeLabel(r.timeMin)} ({relativeTo(r.timeMin, ctx.nowMin)}) · party of {r.partySize} · {STATUS[r.status].label}
          {r.phone ? ` · ${r.phone}` : ''}
        </Typography>
        {r.note && (
          <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
            {r.note}
          </Typography>
        )}
        <Stack gap={1} sx={{ mt: 2 }}>
          {canSeat(r, ctx.date) &&
            (own ? (
              <Button variant="contained" size="large" fullWidth startIcon={<EventSeatOutlined />} onClick={() => seatAt(own.table.id)}>
                Seat at {tableLabel(own.table)}
              </Button>
            ) : (
              <Button
                variant="contained"
                size="large"
                fullWidth
                startIcon={<EventSeatOutlined />}
                onClick={() => {
                  onClose();
                  nav.push({ name: 'seatReservation', reservationId: r.id });
                }}
              >
                {r.tableId ? 'Seat at another table' : 'Choose a table and seat'}
              </Button>
            ))}
          {r.status === 'seated' && r.tabId && (
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={() => {
                onClose();
                nav.push({ name: 'tab', tabId: r.tabId! });
              }}
            >
              Open their tab
            </Button>
          )}
          {canMarkNoShow(r, ctx.date, ctx.nowMin) && (
            <Button
              variant="outlined"
              color="error"
              size="large"
              fullWidth
              sx={{ color: md3.error, borderColor: md3.error }}
              onClick={() => {
                dispatch({ type: 'patchReservation', id: r.id, patch: { status: 'no_show' } });
                toast(`${r.name}: no-show`);
                onClose();
              }}
            >
              Mark no-show
            </Button>
          )}
        </Stack>
      </Box>
    </BottomSheet>
  );
}

/**
 * Choose a table for a reservation and seat it — the tables that fit the party for its whole meal
 * (`tablesForReservation`), smallest first. Seating opens the tab and goes to it.
 */
export function SeatReservationScreen({ route }: ScreenProps<'seatReservation'>) {
  const { state, dispatch } = usePos();
  const nav = useMobileNav();
  const ctx = useLiveFloor();
  const r = state.diningReservations.find((x) => x.id === route.reservationId);
  const [tableId, setTableId] = useState<string | null>(null);
  if (!r) return null;
  const options = tablesForReservation(r, state.floor, ctx);

  const seat = () => {
    if (!tableId) return;
    const tabId = nextTabId(state);
    dispatch({ type: 'seatReservation', id: r.id, tableId, serverId: state.operatorId });
    nav.replace({ name: 'tab', tabId });
  };

  return (
    <MobileScreen
      topBar={<DialogTopBar title={`Seat ${r.name.split(',')[0]}`} confirmLabel="Seat" onConfirm={seat} confirmDisabled={!tableId} />}
    >
      <Box sx={{ px: 2, pb: 4 }}>
        <Typography variant="body2" sx={{ py: 1 }}>
          Party of {r.partySize} at {formatTimeLabel(r.timeMin)}. These tables are free for the whole meal.
        </Typography>
        {options.length === 0 && (
          <Typography variant="body1" sx={{ py: 2 }}>
            No table that fits is free right now.
          </Typography>
        )}
        {options.map((o) => (
          <TableChoice
            key={o.table.id}
            label={`${tableLabel(o.table)} · ${o.room.name}`}
            note={`Seats ${o.table.seats ?? 0}`}
            on={tableId === o.table.id}
            onClick={() => setTableId(o.table.id)}
          />
        ))}
      </Box>
    </MobileScreen>
  );
}
