import { useState } from 'react';
import { Box, ButtonBase, Divider, Typography } from '@mui/material';
import { grid as gridTokens, md3, radius } from '../../../theme/tokens';
import { DEMO_TODAY } from '../../data/bookings';
import { formatTimeLabel, toDateStr } from '../../data/courses';
import {
  SERVICE_LABEL,
  blockerText,
  byService,
  canMarkNoShow,
  canSeat,
  daySummary,
  tableBlocker,
  tableOptionsFor,
  type FloorCtx,
} from '../../logic/dining';
import { HOLD_BEFORE_MIN, tableLabel, type DiningReservation, type ReservationStatus } from '../../logic/restaurant';
import { usePos } from '../../state/PosProvider';
import { tabById, tableOf } from '../../state/restaurant';
import { DatePickerPopover } from '../DatePickerPopover';
import { ToolbarButton } from '../TeeSheetView';
import { EmptyState, Icon } from '../primitives';
import { Stack } from '../Stack';
import { HostButton, NoTableFlag } from './HostControls';
import { TablePicker } from './TablePicker';
import { useLiveFloor } from './use-live-floor';

/**
 * Reservations (V1 → V2, Wave 2) — a day of the dining room's bookings.
 *
 * ## What v1 did
 *
 * A slate date band and a six-column table: Time, Party, First Name, Last Name, Email, Phone.
 * The rows could not be tapped. There was no status — a party that had arrived, one that never
 * came and one that cancelled looked the same — and, in v1's own words, "there is nothing here
 * about tables… seating is entirely a matter of the host remembering".
 *
 * ## What this does
 *
 * The same day, as the host works it:
 *
 * - **Grouped by service**, lunch and dinner, each in time order, with the day's covers summed
 *   at the top — booked, seated, still to come, no-shows — because "how busy is tonight" is the
 *   first question anyone asks a host.
 * - **Every reservation shows its table**, or a flag that it has none yet. Tap the table to
 *   assign or change it; only tables that fit and are free **for the whole meal** are offered, and
 *   a table another party has at an overlapping time is shown with who (`logic/dining.ts`,
 *   `MEAL_MIN`). Two parties can't be promised one table.
 * - **Seat** opens a tab on the table with a seat per guest, linked to the reservation — the join
 *   v1 never made — and offers to go straight to it.
 * - **Status** — booked, seated, paid, no-show, cancelled — with the actions each allows. A
 *   no-show can only be marked once its time has come; a cancel or a no-show can be restored.
 *
 * The date controls are the tee sheet's, so moving between the sheets does not move the controls
 * under the host's hand. Email is gone: v1 collected it and did nothing with it.
 */
export function ReservationsView() {
  const { state, dispatch } = usePos();
  const ctx = useLiveFloor();
  const date = toDateStr(state.currentDate);
  const groups = byService(state.diningReservations, date);
  const summary = daySummary(state.diningReservations, date);
  const [placing, setPlacing] = useState<string | null>(null);

  const newReservation = () => dispatch({ type: 'openModal', modal: { kind: 'reservation', date } });

  return (
    <Stack data-restaurant-view="ReservationsView" sx={{ flex: 1, minWidth: 0, height: '100%', bgcolor: md3.surface }}>
      <Toolbar onNew={newReservation} />

      {/* ── The day, summed. ── */}
      <Stack direction="row" gap={1.25} sx={{ px: 2, py: 1.5, flexShrink: 0 }} data-day-summary>
        <Stat label="Covers booked" value={summary.covers} stat="covers" />
        <Stat label="Seated" value={summary.seated} stat="seated" />
        <Stat label="Still to come" value={summary.toCome} stat="to-come" />
        <Stat label="No-shows" value={summary.noShows} stat="no-shows" tone={summary.noShows ? md3.error : undefined} />
        <Stat label="Without a table" value={summary.unassigned} stat="unassigned" tone={summary.unassigned ? '#b45309' : undefined} />
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 2, pb: 2 }}>
        {groups.length === 0 ? (
          <Stack alignItems="center" justifyContent="center" gap={1.5} sx={{ height: '100%' }}>
            <EmptyState icon="event" label="No reservations for this date." sx={{ height: 'auto' }} />
            <HostButton tone="primary" icon="add" onClick={newReservation}>
              New reservation
            </HostButton>
          </Stack>
        ) : (
          groups.map((g) => (
            <Box key={g.service} component="section" aria-label={SERVICE_LABEL[g.service]} data-service={g.service} sx={{ mb: 2 }}>
              <Stack
                direction="row"
                alignItems="baseline"
                gap={1}
                sx={{ position: 'sticky', top: 0, zIndex: 1, bgcolor: md3.surface, py: 1 }}
              >
                <Icon name={g.service === 'lunch' ? 'wb_sunny' : 'nightlight'} size={16} color={md3.onSurfaceVariant} />
                <Typography sx={{ fontSize: 14, fontWeight: 800 }}>{SERVICE_LABEL[g.service]}</Typography>
                <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant }}>
                  {g.reservations.length} {g.reservations.length === 1 ? 'reservation' : 'reservations'} ·{' '}
                  {g.reservations.filter((r) => r.status !== 'cancelled').reduce((n, r) => n + r.partySize, 0)} covers
                </Typography>
              </Stack>
              <Stack gap={0.75}>
                {g.reservations.map((r) => (
                  <Row
                    key={r.id}
                    r={r}
                    ctx={ctx}
                    placing={placing === r.id}
                    onPlace={() => setPlacing(placing === r.id ? null : r.id)}
                    onPlaced={() => setPlacing(null)}
                  />
                ))}
              </Stack>
            </Box>
          ))
        )}
      </Box>
    </Stack>
  );
}

/** The tee sheet's date controls, as `ResourceToolbar` reuses them. */
function Toolbar({ onNew }: { onNew: () => void }) {
  const { state, dispatch } = usePos();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const dateLabel = state.currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={0.75}
      sx={{
        height: gridTokens.topbarH,
        bgcolor: '#fff',
        borderBottom: `1px solid ${md3.outlineVariant}`,
        px: 1.75,
        flexShrink: 0,
        position: 'relative',
        zIndex: 40,
      }}
    >
      <Typography sx={{ fontSize: 16, fontWeight: 800, mr: 0.5 }}>Reservations</Typography>
      <Divider orientation="vertical" flexItem sx={{ my: 1.25, mx: 0.25 }} />
      <ToolbarButton icon="chevron_left" onClick={() => dispatch({ type: 'shiftDate', days: -1 })} title="Previous day" />
      <Box sx={{ position: 'relative' }}>
        <ButtonBase
          onClick={(e) => setAnchor(anchor ? null : e.currentTarget)}
          data-reservations-date
          sx={{ fontSize: 16, fontWeight: 700, px: 0.5, whiteSpace: 'nowrap', borderRadius: `${radius.sm}px`, '&:hover': { bgcolor: md3.surfaceContainer } }}
        >
          {dateLabel}
          <Icon name="expand_more" size={18} color={md3.outline} />
        </ButtonBase>
        {anchor && <DatePickerPopover onClose={() => setAnchor(null)} />}
      </Box>
      <ToolbarButton icon="chevron_right" onClick={() => dispatch({ type: 'shiftDate', days: 1 })} title="Next day" />
      <ToolbarButton label="Today" onClick={() => dispatch({ type: 'setDate', date: DEMO_TODAY() })} />
      <Box sx={{ flex: 1 }} />
      <HostButton tone="primary" icon="add" onClick={onNew}>
        New reservation
      </HostButton>
    </Stack>
  );
}

function Stat({ label, value, stat, tone }: { label: string; value: number; stat: string; tone?: string }) {
  return (
    <Box
      data-stat={stat}
      sx={{ flex: 1, bgcolor: '#fff', border: `1px solid ${md3.outlineVariant}`, borderRadius: `${radius.md}px`, px: 1.75, py: 1.25 }}
    >
      <Typography sx={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1, color: tone ?? md3.onSurface }} data-stat-value>
        {value}
      </Typography>
      <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant, fontWeight: 600 }}>{label}</Typography>
    </Box>
  );
}

const STATUS_LOOK: Record<ReservationStatus, { label: string; bg: string; fg: string }> = {
  booked: { label: 'Booked', bg: md3.surfaceContainer, fg: md3.onSurfaceVariant },
  seated: { label: 'Seated', bg: md3.primaryContainer, fg: md3.onPrimaryContainer },
  completed: { label: 'Paid', bg: '#e0e7ff', fg: '#3730a3' },
  no_show: { label: 'No-show', bg: '#ffdad6', fg: md3.error },
  cancelled: { label: 'Cancelled', bg: '#e5e7eb', fg: '#4b5563' },
};

function Row({
  r,
  ctx,
  placing,
  onPlace,
  onPlaced,
}: {
  r: DiningReservation;
  ctx: FloorCtx;
  placing: boolean;
  onPlace: () => void;
  onPlaced: () => void;
}) {
  const { state, dispatch, toast } = usePos();
  const look = STATUS_LOOK[r.status];
  const tab = tabById(state, r.tabId);
  // Once seated, the party is where its tab is — a tab can be moved after seating.
  const tableId = r.status === 'seated' && tab?.tableId ? tab.tableId : r.tableId;
  const table = tableOf(state, tableId)?.table;
  const gone = r.status === 'cancelled' || r.status === 'no_show';
  const patch = (p: Partial<DiningReservation>) => dispatch({ type: 'patchReservation', id: r.id, patch: p });

  const restore = () => {
    // The table may have been promised to someone else meanwhile; restore without it rather than double-book.
    const t = tableOf(state, r.tableId)?.table;
    const clash = t ? tableBlocker(t, r, ctx) : null;
    patch({ status: 'booked', ...(clash ? { tableId: undefined } : {}) });
    toast(clash && t ? `${r.name} restored — ${tableLabel(t)} is taken (${blockerText(clash)}), so no table yet` : `${r.name} restored`);
  };

  return (
    <Box
      data-reservation={r.id}
      data-status={r.status}
      sx={{ bgcolor: '#fff', border: `1px solid ${placing ? md3.primary : md3.outlineVariant}`, borderRadius: `${radius.md}px`, opacity: gone ? 0.7 : 1 }}
    >
      <Stack direction="row" alignItems="center" gap={1.5} sx={{ px: 1.75, py: 1.25, minHeight: 64 }}>
        <Box sx={{ width: 82, flexShrink: 0 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 800, textDecoration: r.status === 'cancelled' ? 'line-through' : 'none' }}>
            {formatTimeLabel(r.timeMin)}
          </Typography>
          <Box
            component="span"
            data-reservation-status
            sx={{ display: 'inline-block', mt: 0.25, px: 0.875, py: '2px', borderRadius: `${radius.xl}px`, bgcolor: look.bg, color: look.fg, fontSize: 10, fontWeight: 800, letterSpacing: '.03em', textTransform: 'uppercase' }}
          >
            {look.label}
          </Box>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" gap={0.75}>
            <Typography sx={{ fontSize: 14.5, fontWeight: 800 }} noWrap>
              {r.name}
            </Typography>
            {r.customerId && <Icon name="person_check" size={15} color={md3.primary} />}
          </Stack>
          <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant }} noWrap>
            {[r.phone, r.note].filter(Boolean).join(' · ') || '—'}
          </Typography>
        </Box>

        <Stack direction="row" alignItems="center" gap={0.5} sx={{ width: 56, flexShrink: 0 }} aria-label={`Party of ${r.partySize}`}>
          <Icon name="people" size={17} color={md3.onSurfaceVariant} />
          <Typography sx={{ fontSize: 15, fontWeight: 800 }}>{r.partySize}</Typography>
        </Stack>

        <Box sx={{ width: 132, flexShrink: 0 }}>
          {r.status === 'booked' ? (
            <ButtonBase
              onClick={onPlace}
              aria-label={table ? `${tableLabel(table)} — change table` : 'No table yet — assign a table'}
              aria-expanded={placing}
              data-table-chip
              sx={{
                minHeight: 44,
                px: 1.25,
                gap: 0.5,
                borderRadius: `${radius.md}px`,
                border: `1.5px ${table ? 'solid' : 'dashed'} ${table ? md3.outlineVariant : '#d97706'}`,
                bgcolor: table ? '#fff' : '#fffbeb',
              }}
            >
              {table ? (
                <>
                  <Icon name="table_restaurant" size={16} color={md3.onSurfaceVariant} />
                  <Typography sx={{ fontSize: 13, fontWeight: 800 }}>{tableLabel(table)}</Typography>
                </>
              ) : (
                <NoTableFlag />
              )}
              <Icon name={placing ? 'expand_less' : 'expand_more'} size={16} color={md3.outline} />
            </ButtonBase>
          ) : (
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: md3.onSurfaceVariant }}>{table ? tableLabel(table) : '—'}</Typography>
          )}
        </Box>

        <Stack direction="row" gap={0.75} sx={{ width: 380, flexShrink: 0, justifyContent: 'flex-end' }}>
          {r.status === 'booked' && (
            <>
              {canSeat(r, ctx.date) && (
                <HostButton
                  // Green only for the parties due now — a column of green Seat buttons down tonight's dinner says nothing.
                  tone={r.timeMin - ctx.nowMin <= HOLD_BEFORE_MIN ? 'primary' : 'outline'}
                  icon="event_seat"
                  onClick={() => dispatch({ type: 'openModal', modal: { kind: 'seatReservation', id: r.id } })}
                >
                  Seat
                </HostButton>
              )}
              {canMarkNoShow(r, ctx.date, ctx.nowMin) && (
                <HostButton icon="person_off" onClick={() => { patch({ status: 'no_show' }); toast(`${r.name} marked no-show`); }}>
                  No-show
                </HostButton>
              )}
              <HostButton icon="edit" onClick={() => dispatch({ type: 'openModal', modal: { kind: 'reservation', id: r.id } })}>
                Edit
              </HostButton>
              <HostButton tone="danger" onClick={() => { patch({ status: 'cancelled' }); toast(`${r.name} cancelled`); }}>
                Cancel
              </HostButton>
            </>
          )}
          {r.status === 'seated' && tab && (
            <HostButton
              tone="filled"
              icon="receipt_long"
              onClick={() => {
                dispatch({ type: 'setActiveTab', tabId: tab.id });
                dispatch({ type: 'setView', view: 'tabs' });
              }}
            >
              Open tab
            </HostButton>
          )}
          {gone && (
            <HostButton icon="undo" onClick={restore}>
              Restore
            </HostButton>
          )}
        </Stack>
      </Stack>

      {placing && r.status === 'booked' && <PlaceTable r={r} ctx={ctx} onDone={onPlaced} />}
    </Box>
  );
}

/**
 * Assign or change a reservation's table, in the row. Inline rather than a popover: on a tablet a
 * popover is one more thing to dismiss, and the row stays visible so the host can see whose table
 * they are choosing.
 */
function PlaceTable({ r, ctx, onDone }: { r: DiningReservation; ctx: FloorCtx; onDone: () => void }) {
  const { state, dispatch, toast } = usePos();
  const options = tableOptionsFor(r, state.floor, ctx);
  const choose = (tableId: string | null) => {
    dispatch({ type: 'patchReservation', id: r.id, patch: { tableId: tableId ?? undefined } });
    const t = tableOf(state, tableId ?? undefined)?.table;
    toast(t ? `${r.name} → ${tableLabel(t)}` : `${r.name} has no table`);
    onDone();
  };
  return (
    <Box sx={{ borderTop: `1px solid ${md3.outlineVariant}`, px: 1.75, py: 1.5 }} data-place-table={r.id}>
      <Typography sx={{ fontSize: 12.5, color: md3.onSurfaceVariant, mb: 1.25 }}>
        Tables for {r.partySize} or more, free from {formatTimeLabel(r.timeMin)} for the meal. Taken tables say who has them.
      </Typography>
      <TablePicker
        value={r.tableId ?? null}
        onChange={choose}
        none={{ label: 'No table yet', note: 'Decide when seating' }}
        items={options.map((o) => ({
          room: o.room,
          table: o.table,
          disabled: Boolean(o.blocker),
          note: o.blocker ? blockerText(o.blocker) : undefined,
        }))}
      />
    </Box>
  );
}
