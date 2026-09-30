import { taxRateOf } from '../../state/operations';
import { useState, type ReactNode } from 'react';
import { Box, ButtonBase, Divider, Typography } from '@mui/material';
import { grid as gridTokens, md3, radius } from '../../../theme/tokens';
import { formatTimeLabel } from '../../data/courses';
import type { FloorElement, Room } from '../../data/floor';
import { staffById } from '../../data/staff';
import { money } from '../../logic/cart';
import {
  formatSeated,
  initials,
  minutesSeated,
  relativeTo,
  reservationsToSeatAt,
  statusCounts,
  type FloorCtx,
} from '../../logic/dining';
import {
  HOLD_BEFORE_MIN,
  openTabOn,
  tabTotal,
  tableLabel,
  tableStatus,
  unsent,
  upcomingReservationFor,
  type TableStatus,
} from '../../logic/restaurant';
import { usePos } from '../../state/PosProvider';
import { canPayTab } from '../../state/restaurant';
import { Callout } from '../../modals/ModalFrame';
import { EmptyState, Icon, SectionLabel } from '../primitives';
import { Stack } from '../Stack';
import { FloorPlan } from './FloorPlan';
import { TABLE_STATUS_STYLE } from './floor-style';
import { HostButton, NoTableFlag, ServerSelect } from './HostControls';
import { useLiveFloor } from './use-live-floor';

/**
 * Tables (V1 → V2, Wave 2) — the live floor.
 *
 * ## What v1 did
 *
 * The room Table Chart laid out, with each table either warm (seated) or cool (anything else),
 * and a table's state stored on the table. Tapping a table did one thing whatever it was: opened
 * or started a check, with a hard-coded server, and dropped the operator into the seat editor.
 * The room switcher was eleven rooms in a dark sheet, eight of them empty.
 *
 * ## What was wrong with it
 *
 * - **Two states, and one of them stored.** "Not seated" covered free, held for the 12:30, and
 *   out of service — three different answers to "can I put this party here". And a status kept
 *   on the table could say seated while no check was open on it.
 * - **Nothing knew a reservation was coming.** v1's reservations had no tables, so a host could
 *   seat a walk-in on the table promised to the 12:30 and nothing would say a word.
 * - **One tap, one action.** Tapping a seated table to see how long it had been sat, or who its
 *   server was, opened its check — there was no way to look without doing.
 *
 * ## What this does
 *
 * Five statuses — free, reserved, seated, check, out of service — each **derived** from the tabs
 * and reservations by `tableStatus`, so the floor cannot disagree with them. The floor is live:
 * it reads the demo's clock, not the date the tee sheet is on. A legend counts each status in
 * the room, and seated tables carry the three things a manager scans for — server, guests,
 * minutes sat.
 *
 * Tapping a table **selects** it and the panel says what it is and offers what can be done to
 * it, so looking and doing are separate: open a tab on a free table or seat a reservation there;
 * seat a held table's party or, knowingly, a walk-in; open, move or pay a seated table's tab;
 * put a table back in service. Out of service is the one state a person sets, and it is floor
 * data — the saved plan — so Table Chart and this screen see the same thing.
 */
const PANEL_W = 360;

/** A table smaller than this, in floor units, is a bar stool: its number is all that fits. */
const BADGE_MIN = 70;

export function TablesView() {
  const { state, dispatch } = usePos();
  const ctx = useLiveFloor();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const room = state.floor.find((r) => r.id === state.floorRoomId) ?? state.floor[0];
  const statusOf = (t: FloorElement): TableStatus => tableStatus(t, ctx);
  const tables = room ? room.elements.filter((e) => e.kind === 'table') : [];
  const counts = statusCounts(tables, statusOf);
  const selected = selectedId ? tables.find((t) => t.id === selectedId) : undefined;

  const goToRoom = (roomId: string, tableId: string | null = null) => {
    if (roomId !== room?.id) dispatch({ type: 'setFloorRoom', roomId });
    setSelectedId(tableId);
  };

  return (
    <Stack direction="row" data-restaurant-view="TablesView" sx={{ flex: 1, minWidth: 0, height: '100%', bgcolor: md3.surface }}>
      <Stack sx={{ flex: 1, minWidth: 0 }}>
        {/* ── Title, rooms, the clock the floor is live to. ── */}
        <Stack
          direction="row"
          alignItems="center"
          gap={1}
          sx={{ height: gridTokens.topbarH, bgcolor: '#fff', borderBottom: `1px solid ${md3.outlineVariant}`, px: 1.75, flexShrink: 0 }}
        >
          <Typography sx={{ fontSize: 16, fontWeight: 800, mr: 0.5 }}>Tables</Typography>
          <Divider orientation="vertical" flexItem sx={{ my: 1.25, mx: 0.25 }} />
          <Stack direction="row" gap={0.75} role="group" aria-label="Rooms">
            {state.floor.map((r) => (
              <RoomButton key={r.id} room={r} ctx={ctx} active={r.id === room?.id} onClick={() => goToRoom(r.id)} />
            ))}
          </Stack>
          <Box sx={{ flex: 1 }} />
          <Stack direction="row" alignItems="center" gap={0.75} data-floor-clock>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#dc2626' }} />
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: md3.onSurfaceVariant }}>
              Live · {formatTimeLabel(ctx.nowMin)}
            </Typography>
          </Stack>
        </Stack>

        {/* ── The legend: every status, and how many of the room's tables are in it. ── */}
        <Stack direction="row" gap={2} sx={{ px: 2, py: 1.25, flexShrink: 0, flexWrap: 'wrap' }} data-floor-legend>
          {(Object.keys(TABLE_STATUS_STYLE) as TableStatus[]).map((s) => {
            const tone = TABLE_STATUS_STYLE[s];
            return (
              <Stack key={s} direction="row" alignItems="center" gap={0.75} data-legend={s}>
                <Box sx={{ width: 16, height: 16, borderRadius: '5px', bgcolor: tone.bg, border: `2px solid ${tone.border}` }} />
                <Typography sx={{ fontSize: 12.5, color: md3.onSurfaceVariant }}>
                  {tone.label} <b data-legend-count>{counts[s]}</b>
                </Typography>
              </Stack>
            );
          })}
        </Stack>

        {/* ── The floor. ── */}
        <Box sx={{ flex: 1, minHeight: 0, px: 2, pb: 2 }}>
          {room && tables.length > 0 ? (
            <FloorPlan
              room={room}
              statusOf={statusOf}
              selectedId={selectedId}
              onTableClick={(t) => setSelectedId(t.id === selectedId ? null : t.id)}
              badgeOf={(t) => <TableBadge table={t} status={statusOf(t)} ctx={ctx} />}
            />
          ) : (
            <Stack alignItems="center" justifyContent="center" gap={1.5} sx={{ height: '100%' }}>
              <EmptyState icon="table_restaurant" label={`${room?.name ?? 'This room'} has no tables laid out.`} sx={{ height: 'auto' }} />
              <HostButton icon="edit" onClick={() => dispatch({ type: 'setView', view: 'tablechart' })}>
                Lay it out in Table Chart
              </HostButton>
            </Stack>
          )}
        </Box>
      </Stack>

      {/* ── The panel: the selected table, or what needs the host right now. ── */}
      <Box
        component="aside"
        aria-label={selected ? `${tableLabel(selected)} details` : 'Right now'}
        data-table-panel={selected?.id ?? 'overview'}
        sx={{ width: PANEL_W, flexShrink: 0, borderLeft: `1px solid ${md3.outlineVariant}`, bgcolor: '#fff', overflowY: 'auto' }}
      >
        {selected && room ? (
          <TablePanel key={selected.id} table={selected} room={room} status={statusOf(selected)} ctx={ctx} onClose={() => setSelectedId(null)} />
        ) : (
          <Overview ctx={ctx} onPick={goToRoom} />
        )}
      </Box>
    </Stack>
  );
}

function RoomButton({ room, ctx, active, onClick }: { room: Room; ctx: FloorCtx; active: boolean; onClick: () => void }) {
  const tables = room.elements.filter((e) => e.kind === 'table');
  const busy = tables.filter((t) => openTabOn(t.id, ctx.tabs)).length;
  return (
    <ButtonBase
      onClick={onClick}
      aria-pressed={active}
      data-room={room.id}
      sx={{
        minHeight: 40,
        px: 1.75,
        gap: 0.75,
        borderRadius: `${radius.xl}px`,
        border: `1.5px solid ${active ? md3.primary : md3.outlineVariant}`,
        bgcolor: active ? md3.primaryContainer : 'transparent',
        color: active ? md3.onPrimaryContainer : md3.onSurfaceVariant,
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      {room.name}
      <Box component="span" sx={{ fontSize: 11, fontWeight: 600, opacity: 0.75 }} aria-label={`${busy} of ${tables.length} seated`}>
        {busy}/{tables.length}
      </Box>
    </ButtonBase>
  );
}

/** What a table carries on the floor: server, guests and minutes once sat; the time it is held for. */
function TableBadge({ table, status, ctx }: { table: FloorElement; status: TableStatus; ctx: FloorCtx }) {
  const { state } = usePos();
  if (table.w < BADGE_MIN || table.h < BADGE_MIN) return null;
  const color = TABLE_STATUS_STYLE[status].text;
  const line = (children: ReactNode, strong = false) => (
    <Typography sx={{ fontSize: 10, lineHeight: 1.25, fontWeight: strong ? 800 : 600, color, opacity: strong ? 1 : 0.9 }} noWrap>
      {children}
    </Typography>
  );
  if (status === 'seated' || status === 'check') {
    const tab = openTabOn(table.id, ctx.tabs);
    if (!tab) return null;
    const min = minutesSeated(tab, ctx.date, ctx.nowMin);
    return (
      <Box sx={{ mt: 0.25, textAlign: 'center' }} data-table-badge={table.id}>
        {line(`${initials(staffById(tab.serverId, state.staffRoster)?.name)} · ${tab.guests}`)}
        {line(status === 'check' ? `CHECK${min != null ? ` · ${min}m` : ''}` : min != null ? `${min}m` : '', status === 'check')}
      </Box>
    );
  }
  if (status === 'reserved') {
    const held = upcomingReservationFor(table.id, ctx);
    if (!held) return null;
    return (
      <Box sx={{ mt: 0.25, textAlign: 'center' }} data-table-badge={table.id}>
        {line(formatTimeLabel(held.timeMin), true)}
        {line(`${held.name.split(',')[0]} · ${held.partySize}`)}
      </Box>
    );
  }
  return null;
}

// ─── The panel ──────────────────────────────────────────────────────────────

function TablePanel({
  table,
  room,
  status,
  ctx,
  onClose,
}: {
  table: FloorElement;
  room: Room;
  status: TableStatus;
  ctx: FloorCtx;
  onClose: () => void;
}) {
  const { state, dispatch, toast } = usePos();
  const [serverId, setServerId] = useState(state.operatorId);
  const tone = TABLE_STATUS_STYLE[status];
  const tab = openTabOn(table.id, ctx.tabs);
  const held = upcomingReservationFor(table.id, ctx);

  /** Out of service is floor data: write the saved plan back with this one element changed. */
  const setOutOfService = (on: boolean) => {
    dispatch({
      type: 'saveFloor',
      rooms: state.floor.map((r) =>
        r.elements.some((e) => e.id === table.id)
          ? { ...r, elements: r.elements.map((e) => (e.id === table.id ? { ...e, outOfService: on || undefined } : e)) }
          : r,
      ),
    });
    toast(on ? `${tableLabel(table)} is out of service` : `${tableLabel(table)} is back in service`);
  };

  const seat = (reservationId: string) => dispatch({ type: 'seatReservation', id: reservationId, tableId: table.id, serverId });

  const openTab = (tabId: string) => {
    dispatch({ type: 'setActiveTab', tabId });
    dispatch({ type: 'setView', view: 'tabs' });
  };

  return (
    <Stack>
      <Stack direction="row" alignItems="flex-start" gap={1} sx={{ p: '16px 16px 14px', borderBottom: `1px solid ${md3.outlineVariant}` }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" gap={1}>
            <Typography sx={{ fontSize: 20, fontWeight: 800 }}>{tableLabel(table)}</Typography>
            <Box
              data-panel-status={status}
              sx={{
                px: 1,
                py: '3px',
                borderRadius: `${radius.xl}px`,
                bgcolor: tone.bg,
                border: `1.5px solid ${tone.border}`,
                color: tone.text,
                fontSize: 10.5,
                fontWeight: 800,
                letterSpacing: '.04em',
                textTransform: 'uppercase',
              }}
            >
              {tone.label}
            </Box>
          </Stack>
          <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant, mt: 0.25 }}>
            {room.name} · {table.seats ?? 0} seats
          </Typography>
        </Box>
        <ButtonBase aria-label="Close table" onClick={onClose} sx={{ width: 44, height: 44, borderRadius: '50%', color: md3.onSurfaceVariant }}>
          <Icon name="close" size={20} />
        </ButtonBase>
      </Stack>

      <Stack gap={2} sx={{ p: 2 }}>
        {status === 'blocked' && (
          <>
            <Callout tone="info" icon="block">
              Out of service. Nothing can be opened or seated here until it is back.
            </Callout>
            <HostButton tone="filled" icon="check_circle" fullWidth onClick={() => setOutOfService(false)}>
              Put back in service
            </HostButton>
          </>
        )}

        {(status === 'seated' || status === 'check') && tab && <SeatedDetail tabId={tab.id} ctx={ctx} onOpen={() => openTab(tab.id)} />}

        {status === 'reserved' && held && (
          <>
            <Box>
              <SectionLabel color={md3.outline}>Held for</SectionLabel>
              <Typography sx={{ fontSize: 16, fontWeight: 800, mt: 0.5 }}>{held.name}</Typography>
              <Typography sx={{ fontSize: 13, color: md3.onSurfaceVariant }}>
                {held.partySize} guests · {formatTimeLabel(held.timeMin)} · {relativeTo(held.timeMin, ctx.nowMin)}
              </Typography>
              {held.phone && <Typography sx={{ fontSize: 12.5, color: md3.onSurfaceVariant }}>{held.phone}</Typography>}
              {held.note && (
                <Box sx={{ mt: 1 }}>
                  <Callout tone="info" icon="notes">
                    {held.note}
                  </Callout>
                </Box>
              )}
            </Box>
            <ServerSelect value={serverId} onChange={setServerId} />
            <HostButton tone="primary" icon="event_seat" fullWidth onClick={() => seat(held.id)}>
              Seat {held.name.split(',')[0]} now
            </HostButton>
            <HostButton icon="person_add" fullWidth onClick={() => dispatch({ type: 'openModal', modal: { kind: 'openTab', tableId: table.id } })}>
              Seat a walk-in instead…
            </HostButton>
            <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant, lineHeight: 1.45 }}>
              A table is held from {HOLD_BEFORE_MIN} minutes before its reservation until 15 minutes after.
            </Typography>
          </>
        )}

        {status === 'free' && (
          <>
            <HostButton
              tone="filled"
              icon="receipt_long"
              fullWidth
              onClick={() => dispatch({ type: 'openModal', modal: { kind: 'openTab', tableId: table.id } })}
            >
              Open a tab
            </HostButton>
            <SeatHere table={table} ctx={ctx} serverId={serverId} onServer={setServerId} onSeat={seat} />
            <Divider />
            <HostButton icon="block" fullWidth onClick={() => setOutOfService(true)}>
              Take out of service
            </HostButton>
          </>
        )}
      </Stack>
    </Stack>
  );
}

/** A seated table's tab, summarised — and what to do with it. */
function SeatedDetail({ tabId, ctx, onOpen }: { tabId: string; ctx: FloorCtx; onOpen: () => void }) {
  const { state, dispatch } = usePos();
  const tab = state.tabs.find((t) => t.id === tabId);
  if (!tab) return null;
  const min = minutesSeated(tab, ctx.date, ctx.nowMin);
  const dishes = tab.lines.filter((l) => !l.dish?.voided);
  const waiting = unsent(tab.lines).length;
  const payable = canPayTab(state, tab.id);
  const total = tabTotal(tab, taxRateOf(state));

  const row = (label: string, value: ReactNode) => (
    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.5 }}>
      <Typography sx={{ fontSize: 13, color: md3.onSurfaceVariant }}>{label}</Typography>
      <Typography component="div" sx={{ fontSize: 13, fontWeight: 700 }}>
        {value}
      </Typography>
    </Stack>
  );

  return (
    <>
      <Box data-tab-summary={tab.id}>
        <Typography sx={{ fontSize: 16, fontWeight: 800, mb: 0.75 }}>{tab.name}</Typography>
        {row('Server', staffById(tab.serverId, state.staffRoster)?.name ?? '—')}
        {row('Guests', tab.guests)}
        {row('Seated', min != null ? `${formatSeated(min)} · since ${tab.openedAt}` : tab.openedAt)}
        {row('Dishes', waiting ? `${dishes.length} · ${waiting} not sent` : dishes.length)}
        {row('Total', <span data-tab-total>{money(total)}</span>)}
      </Box>
      {tab.checkRequested && (
        <Callout tone="warning" icon="receipt_long">
          The table has asked for its check.
        </Callout>
      )}
      <HostButton tone="filled" icon="receipt_long" fullWidth onClick={onOpen}>
        Open tab
      </HostButton>
      <Stack direction="row" gap={1}>
        <Box sx={{ flex: 1 }}>
          <HostButton icon="swap_horiz" fullWidth onClick={() => dispatch({ type: 'openModal', modal: { kind: 'moveTab', tabId: tab.id } })}>
            Move
          </HostButton>
        </Box>
        <Box sx={{ flex: 1 }}>
          <HostButton tone="primary" icon="payments" fullWidth disabled={!payable || dishes.length === 0} onClick={() => dispatch({ type: 'payTab', tabId: tab.id })}>
            Pay {money(total)}
          </HostButton>
        </Box>
      </Stack>
      {!payable && (
        <Callout tone="warning" icon="point_of_sale">
          <span data-pay-refusal>Another order is on the register. Finish or clear it there before paying this tab.</span>
        </Callout>
      )}
      <HostButton fullWidth onClick={() => dispatch({ type: 'patchTab', tabId: tab.id, patch: { checkRequested: !tab.checkRequested } })}>
        {tab.checkRequested ? 'Clear check request' : 'Check requested'}
      </HostButton>
    </>
  );
}

/** A free table: today's bookings that would fit it, to seat here now. */
function SeatHere({
  table,
  ctx,
  serverId,
  onServer,
  onSeat,
}: {
  table: FloorElement;
  ctx: FloorCtx;
  serverId: string;
  onServer: (id: string) => void;
  onSeat: (reservationId: string) => void;
}) {
  const { state } = usePos();
  const list = reservationsToSeatAt(table, ctx).slice(0, 5);
  return (
    <Box>
      <SectionLabel color={md3.outline}>Seat a reservation here</SectionLabel>
      {list.length === 0 ? (
        <Typography sx={{ fontSize: 12.5, color: md3.onSurfaceVariant, mt: 0.75 }}>
          No booked party that fits is due in the next three hours.
        </Typography>
      ) : (
        <Stack gap={1} sx={{ mt: 1 }}>
          <ServerSelect value={serverId} onChange={onServer} />
          {list.map((r) => {
            const elsewhere = r.tableId && r.tableId !== table.id ? state.floor.flatMap((x) => x.elements).find((e) => e.id === r.tableId) : undefined;
            return (
              <Stack
                key={r.id}
                direction="row"
                alignItems="center"
                gap={1}
                data-seat-here={r.id}
                sx={{ p: '8px 8px 8px 12px', borderRadius: `${radius.md}px`, border: `1px solid ${md3.outlineVariant}` }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 800 }} noWrap>
                    {r.name}
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant }} noWrap>
                    {formatTimeLabel(r.timeMin)} · {r.partySize} · {relativeTo(r.timeMin, ctx.nowMin)}
                    {elsewhere ? ` · set aside ${tableLabel(elsewhere)}` : ''}
                  </Typography>
                </Box>
                <HostButton tone="primary" onClick={() => onSeat(r.id)}>
                  Seat
                </HostButton>
              </Stack>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}

/** Nothing selected: the tables waiting on their check, and who arrives in the next hold window. */
function Overview({ ctx, onPick }: { ctx: FloorCtx; onPick: (roomId: string, tableId: string) => void }) {
  const { state } = usePos();
  const where = (tableId: string | undefined) => {
    for (const room of state.floor) {
      const t = room.elements.find((e) => e.id === tableId);
      if (t) return { room, table: t };
    }
    return undefined;
  };
  const checks = ctx.tabs.filter((t) => t.status === 'open' && t.checkRequested && t.tableId);
  const arriving = ctx.reservations
    .filter((r) => r.date === ctx.date && r.status === 'booked' && r.timeMin - ctx.nowMin <= HOLD_BEFORE_MIN && ctx.nowMin - r.timeMin <= 60)
    .sort((a, b) => a.timeMin - b.timeMin);

  const item = (key: string, primary: string, secondary: string, onClick?: () => void, flag?: ReactNode) => (
    <ButtonBase
      key={key}
      onClick={onClick}
      disabled={!onClick}
      sx={{
        width: '100%',
        minHeight: 52,
        px: 1.5,
        py: 1,
        gap: 1,
        justifyContent: 'flex-start',
        textAlign: 'left',
        borderRadius: `${radius.md}px`,
        border: `1px solid ${md3.outlineVariant}`,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 800 }} noWrap>
          {primary}
        </Typography>
        <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant }} noWrap>
          {secondary}
        </Typography>
      </Box>
      {flag}
    </ButtonBase>
  );

  return (
    <Stack gap={2.5} sx={{ p: 2 }} data-floor-overview>
      <Box>
        <Typography sx={{ fontSize: 17, fontWeight: 800 }}>Right now</Typography>
        <Typography sx={{ fontSize: 12.5, color: md3.onSurfaceVariant }}>Tap a table to see it and act on it.</Typography>
      </Box>
      <Box>
        <SectionLabel color={md3.outline}>Waiting on the check</SectionLabel>
        <Stack gap={0.75} sx={{ mt: 1 }}>
          {checks.length === 0 && <Typography sx={{ fontSize: 12.5, color: md3.onSurfaceVariant }}>No one.</Typography>}
          {checks.map((t) => {
            const w = where(t.tableId);
            const min = minutesSeated(t, ctx.date, ctx.nowMin);
            return item(
              t.id,
              t.name,
              `${w?.room.name ?? ''} · ${money(tabTotal(t, taxRateOf(state)))}${min != null ? ` · sat ${formatSeated(min)}` : ''}`,
              w ? () => onPick(w.room.id, w.table.id) : undefined,
            );
          })}
        </Stack>
      </Box>
      <Box>
        <SectionLabel color={md3.outline}>Arriving soon</SectionLabel>
        <Stack gap={0.75} sx={{ mt: 1 }}>
          {arriving.length === 0 && <Typography sx={{ fontSize: 12.5, color: md3.onSurfaceVariant }}>No one in the next {HOLD_BEFORE_MIN} minutes.</Typography>}
          {arriving.map((r) => {
            const w = where(r.tableId);
            return item(
              r.id,
              r.name,
              `${formatTimeLabel(r.timeMin)} · ${r.partySize} · ${relativeTo(r.timeMin, ctx.nowMin)}`,
              w ? () => onPick(w.room.id, w.table.id) : undefined,
              w ? (
                <Typography sx={{ fontSize: 12, fontWeight: 800 }}>{tableLabel(w.table)}</Typography>
              ) : (
                <NoTableFlag />
              ),
            );
          })}
        </Stack>
      </Box>
    </Stack>
  );
}
