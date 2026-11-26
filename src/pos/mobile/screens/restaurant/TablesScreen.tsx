import { pricingOf } from '../../../state/checkout';
import { useState } from 'react';
import { Box, Button, ButtonBase, Typography } from '@mui/material';
import EventSeatOutlined from '@mui/icons-material/EventSeatOutlined';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import SwapHorizOutlined from '@mui/icons-material/SwapHorizOutlined';
import { md3, mobile, radius } from '../../../../theme/tokens';
import { formatTimeLabel } from '../../../data/courses';
import type { FloorElement } from '../../../data/floor';
import { staffById } from '../../../data/staff';
import { money } from '../../../logic/cart';
import { formatSeated, initials, minutesSeated, relativeTo, reservationsToSeatAt, statusCounts } from '../../../logic/dining';
import { openTabOn, tabTotal, tableLabel, tableStatus, unsent, upcomingReservationFor, type TableStatus } from '../../../logic/restaurant';
import { usePos } from '../../../state/PosProvider';
import { Stack } from '../../../components/Stack';
import { TABLE_STATUS_STYLE } from '../../../components/restaurant/floor-style';
import { useLiveFloor } from '../../../components/restaurant/use-live-floor';
import { BottomSheet, MobileScreen, TopAppBar } from '../../chrome';
import { useMobileNav } from '../../navigation';
import type { ScreenProps } from '../types';
import { Pill, ScrollRow } from './parts';
import { isRootRoute, nextTabId } from './restaurant-helpers';

/**
 * Tables — the live floor, as a server holds it (V1 → V2, handheld).
 *
 * The tablet draws the room Table Chart laid out (`TablesView`). At 360dp that plan is a third of
 * its size and a two-top is 34px across, under a fingertip; so the handheld keeps everything the
 * floor *says* and drops where things *are*: one room at a time, its tables as a grid of 48dp+
 * tiles in table-number order, each in its status colour (`TABLE_STATUS_STYLE`, the tablet's) with
 * the three things a server scans for — guests, server, minutes sat — or who it is held for.
 *
 * Status is **derived** by `tableStatus` from the tabs and reservations, as on the tablet, and the
 * floor is live to the demo's clock, so this screen and the tablet's can never disagree about a
 * table. Rooms are `state.floorRoomId`, shared with the tablet, so switching room on one is where
 * the other opens.
 *
 * Looking and doing stay separate, as on the tablet: a tap opens the table's **sheet**, which says
 * what it is and offers only what can be done to it — seat a walk-in or a reservation on a free
 * table, seat the party a held table is waiting for (or, knowingly, a walk-in), open or move a
 * seated table's tab, or put a table back in service.
 */
export function TablesScreen({ route }: ScreenProps<'tables'>) {
  const { state, dispatch } = usePos();
  const nav = useMobileNav();
  const ctx = useLiveFloor();
  const [sheetId, setSheetId] = useState<string | null>(null);
  const room = state.floor.find((r) => r.id === state.floorRoomId) ?? state.floor[0];
  const tables = room.elements.filter((e) => e.kind === 'table');
  const statusOf = (t: FloorElement): TableStatus => tableStatus(t, ctx);
  const counts = statusCounts(tables, statusOf);
  const sheetTable = sheetId ? tables.find((t) => t.id === sheetId) : undefined;
  const root = isRootRoute(nav, route);

  return (
    <MobileScreen
      topBar={
        <TopAppBar title="Tables" subtitle={`Live · ${formatTimeLabel(ctx.nowMin)}`} leading={root ? 'none' : 'back'}>
          <ScrollRow label="Rooms" sx={{ pb: 1 }}>
            {state.floor.map((r) => {
              const busy = r.elements.filter((e) => e.kind === 'table' && openTabOn(e.id, ctx.tabs)).length;
              return (
                <Pill
                  key={r.id}
                  label={`${r.name}${busy ? ` · ${busy}` : ''}`}
                  active={r.id === room.id}
                  onClick={() => dispatch({ type: 'setFloorRoom', roomId: r.id })}
                />
              );
            })}
          </ScrollRow>
        </TopAppBar>
      }
    >
      <Stack direction="row" gap={1.5} data-floor-legend sx={{ px: 2, py: 1, flexWrap: 'wrap' }}>
        {(Object.keys(TABLE_STATUS_STYLE) as TableStatus[])
          .filter((s) => counts[s] > 0)
          .map((s) => (
            <Stack key={s} direction="row" alignItems="center" gap={0.75} data-legend={s}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '4px',
                  bgcolor: TABLE_STATUS_STYLE[s].bg,
                  border: `2px solid ${TABLE_STATUS_STYLE[s].border}`,
                }}
              />
              <Typography variant="body2">
                {counts[s]} {TABLE_STATUS_STYLE[s].label.toLowerCase()}
              </Typography>
            </Stack>
          ))}
      </Stack>

      <Box data-floor-room={room.id} sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1, px: 2, pb: 3 }}>
        {tables.map((t) => (
          <TableTile key={t.id} table={t} status={statusOf(t)} onClick={() => setSheetId(t.id)} />
        ))}
      </Box>

      <TableSheet table={sheetTable} roomName={room.name} onClose={() => setSheetId(null)} />
    </MobileScreen>
  );
}

/**
 * One table. The number, and in its corner *when* — minutes sat, or the time it is held for; then
 * the status, and *who* — guests and the server's initials, the party it is held for, or its seats.
 * Two short lines rather than one long one, so nothing is cut off on a 104dp tile.
 */
function TableTile({ table, status, onClick }: { table: FloorElement; status: TableStatus; onClick: () => void }) {
  const { state } = usePos();
  const ctx = useLiveFloor();
  const style = TABLE_STATUS_STYLE[status];
  const tab = openTabOn(table.id, ctx.tabs);
  const held = status === 'reserved' ? upcomingReservationFor(table.id, ctx) : undefined;
  const seated = tab ? minutesSeated(tab, ctx.date, ctx.nowMin) : null;
  const server = tab ? staffById(tab.serverId, state.staffRoster) : undefined;
  const when = tab ? (seated != null ? formatSeated(seated) : '') : held ? formatTimeLabel(held.timeMin) : '';
  const who =
    status === 'blocked'
      ? `Seats ${table.seats ?? 0}`
      : tab
        ? `${tab.guests} · ${initials(server?.name)}`
        : held
          ? held.name.split(',')[0]
          : `Seats ${table.seats ?? 0}`;
  return (
    <ButtonBase
      data-table-tile={table.id}
      data-status={status}
      aria-label={`${tableLabel(table)}, ${style.label}`}
      onClick={onClick}
      sx={{
        minHeight: 88,
        p: 1,
        borderRadius: `${radius.md}px`,
        border: `2px solid ${style.border}`,
        bgcolor: style.bg,
        color: style.text,
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'space-between',
        textAlign: 'left',
        minWidth: 0,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={0.5}>
        <Typography sx={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1, color: 'inherit' }}>{table.num}</Typography>
        <Stack direction="row" alignItems="center" gap={0.5} sx={{ minWidth: 0 }}>
          {tab && unsent(tab.lines).length > 0 && (
            <Box
              data-unsent-dot
              aria-hidden
              sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#fbbf24', border: '2px solid #fff', flexShrink: 0 }}
            />
          )}
          {when && (
            <Typography noWrap sx={{ fontSize: 12, fontWeight: 600, color: 'inherit', opacity: 0.9 }}>
              {when}
            </Typography>
          )}
        </Stack>
      </Stack>
      <Box sx={{ minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: 12, fontWeight: 700, color: 'inherit', textTransform: 'uppercase', letterSpacing: '.3px' }}>
          {status === 'check' ? 'Check' : style.label}
        </Typography>
        <Typography noWrap sx={{ fontSize: 13, color: 'inherit', opacity: 0.9 }}>
          {who}
        </Typography>
      </Box>
    </ButtonBase>
  );
}

/** What a table is, and only what can be done to it. */
function TableSheet({ table, roomName, onClose }: { table: FloorElement | undefined; roomName: string; onClose: () => void }) {
  const { state, dispatch } = usePos();
  const nav = useMobileNav();
  const ctx = useLiveFloor();
  if (!table) return null;
  const status = tableStatus(table, ctx);
  const tab = openTabOn(table.id, ctx.tabs);
  const held = upcomingReservationFor(table.id, ctx);
  const due = status === 'free' ? reservationsToSeatAt(table, ctx).filter((r) => !r.tableId || r.tableId === table.id) : [];
  const server = tab ? staffById(tab.serverId, state.staffRoster) : undefined;
  const seated = tab ? minutesSeated(tab, ctx.date, ctx.nowMin) : null;

  const go = (fn: () => void) => () => {
    onClose();
    fn();
  };
  const seatReservation = (id: string) =>
    go(() => {
      const tabId = nextTabId(state);
      dispatch({ type: 'seatReservation', id, tableId: table.id, serverId: state.operatorId });
      nav.push({ name: 'tab', tabId });
    });
  const setService = (outOfService: boolean) =>
    go(() =>
      dispatch({
        type: 'saveFloor',
        rooms: state.floor.map((r) => ({ ...r, elements: r.elements.map((e) => (e.id === table.id ? { ...e, outOfService } : e)) })),
      }),
    );

  return (
    <BottomSheet open onClose={onClose} title={`${tableLabel(table)} · seats ${table.seats ?? 0}`}>
      <Box data-table-sheet={table.id} sx={{ px: 3, pb: 1 }}>
        <Typography variant="body2" sx={{ color: md3.onSurfaceVariant }}>
          {roomName} · {status === 'check' ? 'Check requested' : TABLE_STATUS_STYLE[status].label}
        </Typography>

        {tab && (
          <Box sx={{ mt: 2, p: 2, borderRadius: `${radius.lg}px`, bgcolor: mobile.surfaceContainerLow }}>
            <Typography variant="subtitle1">{tab.name}</Typography>
            <Typography variant="body2" sx={{ color: md3.onSurfaceVariant }}>
              {tab.guests} guest{tab.guests === 1 ? '' : 's'} · {server?.name ?? 'Unassigned'}
              {seated != null ? ` · ${formatSeated(seated)}` : ''}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 600 }}>
              {money(tabTotal(tab, pricingOf(state)))}
              {unsent(tab.lines).length ? ` · ${unsent(tab.lines).length} not sent` : ''}
            </Typography>
          </Box>
        )}

        {held && (status === 'reserved' || status === 'free') && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2">
              Held for <b>{held.name}</b>, party of {held.partySize}, at {formatTimeLabel(held.timeMin)} (
              {relativeTo(held.timeMin, ctx.nowMin)}).
            </Typography>
            <Button
              variant="contained"
              size="large"
              fullWidth
              sx={{ mt: 1.5 }}
              startIcon={<EventSeatOutlined />}
              onClick={seatReservation(held.id)}
            >
              Seat {held.name.split(',')[0]}
            </Button>
          </Box>
        )}

        <Stack gap={1} sx={{ mt: 2 }}>
          {tab ? (
            <>
              <Button
                variant="contained"
                size="large"
                fullWidth
                startIcon={<ReceiptLongOutlined />}
                onClick={go(() => nav.push({ name: 'tab', tabId: tab.id }))}
              >
                Open tab
              </Button>
              <Button
                variant="outlined"
                size="large"
                fullWidth
                aria-pressed={Boolean(tab.checkRequested)}
                onClick={go(() => dispatch({ type: 'patchTab', tabId: tab.id, patch: { checkRequested: !tab.checkRequested } }))}
              >
                {tab.checkRequested ? 'Clear check requested' : 'Check requested'}
              </Button>
              <Button
                variant="text"
                fullWidth
                startIcon={<SwapHorizOutlined />}
                onClick={go(() => nav.push({ name: 'moveTab', tabId: tab.id }))}
              >
                Move to another table
              </Button>
            </>
          ) : status === 'blocked' ? (
            <Button variant="contained" size="large" fullWidth onClick={setService(false)}>
              Put back in service
            </Button>
          ) : (
            <>
              <Button
                variant={held ? 'outlined' : 'contained'}
                size="large"
                fullWidth
                onClick={go(() => nav.push({ name: 'openTab', tableId: table.id }))}
              >
                {held ? 'Seat a walk-in anyway' : 'Seat walk-in'}
              </Button>
              {status === 'free' && !held && (
                <Button variant="text" fullWidth onClick={setService(true)}>
                  Mark out of service
                </Button>
              )}
            </>
          )}
        </Stack>

        {due.length > 0 && (
          <Box sx={{ mt: 2.5 }}>
            <Typography variant="subtitle2" sx={{ color: md3.primary, mb: 1 }}>
              Reservations due that fit
            </Typography>
            {due.slice(0, 3).map((r) => (
              <ButtonBase
                key={r.id}
                data-seat-reservation={r.id}
                onClick={seatReservation(r.id)}
                sx={{
                  width: '100%',
                  minHeight: mobile.listItem.two,
                  justifyContent: 'space-between',
                  gap: 1,
                  borderBottom: `1px solid ${md3.outlineVariant}`,
                  textAlign: 'left',
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body1" noWrap>
                    {r.name} · {r.partySize}
                  </Typography>
                  <Typography variant="body2" noWrap sx={{ color: md3.onSurfaceVariant }}>
                    {formatTimeLabel(r.timeMin)} · {relativeTo(r.timeMin, ctx.nowMin)}
                    {r.note ? ` · ${r.note}` : ''}
                  </Typography>
                </Box>
                <Typography variant="button" sx={{ color: md3.primary, flexShrink: 0 }}>
                  Seat here
                </Typography>
              </ButtonBase>
            ))}
          </Box>
        )}
      </Box>
    </BottomSheet>
  );
}
