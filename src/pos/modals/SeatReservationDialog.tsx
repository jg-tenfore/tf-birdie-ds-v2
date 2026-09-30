import { useState } from 'react';
import { formatTimeLabel } from '../data/courses';
import { allTables } from '../data/floor';
import { ServerSelect } from '../components/restaurant/HostControls';
import { TablePicker } from '../components/restaurant/TablePicker';
import { useLiveFloor } from '../components/restaurant/use-live-floor';
import { Stack } from '../components/Stack';
import { canSeat, occupiedNote, relativeTo } from '../logic/dining';
import { openTabOn, tableLabel, tablesFor, upcomingReservationFor } from '../logic/restaurant';
import { usePos } from '../state/PosProvider';
import { tabById, tableOf, type RestaurantModal } from '../state/restaurant';
import { Callout, FilledButton, ModalFrame, OutlineButton } from './ModalFrame';

/**
 * Seat a reservation (V1 → V2, Wave 2) — the join v1 never made.
 *
 * v1's reservations list had no tables in it at all; its own note: "seating is entirely a matter
 * of the host remembering". Seating here is one act with three effects: the reservation is
 * seated, a tab opens **on the table** with a seat per guest, and the two are linked — so paying
 * that tab later completes the reservation and frees the table.
 *
 * The table it was given ahead is chosen for it, if it can still take them. If it can't —
 * someone is still sitting there, it is out of service — the dialog says so first, rather than
 * letting Seat be refused. The offer is `tablesFor`: tables free right now, or held for this
 * reservation. Tables that fit but are taken are shown with why, so a host scanning for "the
 * other window four-top" sees it is occupied instead of wondering where it went.
 *
 * Seated, the dialog offers the tab rather than jumping to it: the host who seats is not always
 * the server who orders.
 */
export function SeatReservationDialog({ m }: { m: Extract<RestaurantModal, { kind: 'seatReservation' }> }) {
  const { state, dispatch } = usePos();
  const ctx = useLiveFloor();
  const r = state.diningReservations.find((x) => x.id === m.id);
  const available = r ? new Set(tablesFor(r.partySize, state.floor, ctx, r.id).map((t) => t.table.id)) : new Set<string>();
  const [tableId, setTableId] = useState<string>(r?.tableId && available.has(r.tableId) ? r.tableId : '');
  const [serverId, setServerId] = useState(state.operatorId);
  const [seated, setSeated] = useState(false);
  const close = () => dispatch({ type: 'closeModal' });

  if (!r) {
    return (
      <ModalFrame title="Seat reservation" onClose={close} actions={<OutlineButton onClick={close}>Close</OutlineButton>}>
        <Callout tone="info">This reservation no longer exists.</Callout>
      </ModalFrame>
    );
  }

  const subtitle = `${formatTimeLabel(r.timeMin)} · party of ${r.partySize}`;

  if (seated && r.tabId) {
    const tab = tabById(state, r.tabId);
    const at = tableOf(state, tab?.tableId)?.table;
    return (
      <ModalFrame
        title={`${r.name} is seated`}
        subtitle={subtitle}
        icon="check_circle"
        onClose={close}
        actions={
          <>
            <OutlineButton onClick={close}>Stay here</OutlineButton>
            <FilledButton
              onClick={() => {
                dispatch({ type: 'setActiveTab', tabId: r.tabId! });
                dispatch({ type: 'setView', view: 'tabs' });
                close();
              }}
            >
              Open tab
            </FilledButton>
          </>
        }
      >
        <Callout tone="success">
          A tab is open on <b>{tableLabel(at)}</b> with {r.partySize} seats — <b>{tab?.name}</b>.
        </Callout>
      </ModalFrame>
    );
  }

  const today = ctx.date;
  if (!canSeat(r, today)) {
    return (
      <ModalFrame title={`Seat ${r.name}`} subtitle={subtitle} icon="event_seat" onClose={close} actions={<OutlineButton onClick={close}>Close</OutlineButton>}>
        <Callout tone="info">
          {r.status !== 'booked'
            ? `This reservation is ${r.status.replace('_', '-')}, so there is no one to seat.`
            : 'This reservation is for another day. Seating opens a tab, so it can only be done on the day.'}
        </Callout>
      </ModalFrame>
    );
  }

  const assigned = r.tableId ? tableOf(state, r.tableId)?.table : undefined;
  const assignedTab = assigned ? openTabOn(assigned.id, ctx.tabs) : undefined;
  const fitting = allTables(state.floor).filter(({ table }) => (table.seats ?? 0) >= r.partySize);

  const reason = (id: string): string | undefined => {
    const t = tableOf(state, id)?.table;
    if (!t) return undefined;
    if (t.outOfService) return 'Out of service';
    const tab = openTabOn(id, ctx.tabs);
    if (tab) return occupiedNote(tab);
    const held = upcomingReservationFor(id, ctx);
    if (held) return `Held · ${held.name.split(',')[0]} ${formatTimeLabel(held.timeMin)}`;
    return undefined;
  };

  const seat = () => {
    if (!tableId) return;
    dispatch({ type: 'seatReservation', id: r.id, tableId, serverId });
    setSeated(true);
  };

  return (
    <ModalFrame
      title={`Seat ${r.name}`}
      subtitle={`${subtitle} · ${relativeTo(r.timeMin, ctx.nowMin)}`}
      icon="event_seat"
      width={640}
      tall
      onClose={close}
      actions={
        <>
          <OutlineButton onClick={close}>Cancel</OutlineButton>
          <FilledButton onClick={seat} disabled={!tableId}>
            {tableId ? `Seat at ${tableLabel(tableOf(state, tableId)?.table)}` : 'Choose a table'}
          </FilledButton>
        </>
      }
    >
      <Stack gap={1.5}>
        {assigned && !available.has(assigned.id) && (
          <Callout tone="warning" icon="warning_amber">
            <span data-seat-refusal>
              <b>{tableLabel(assigned)}</b> was set aside for them, but{' '}
              {assignedTab
                ? `it is occupied — ${assignedTab.name} is still open`
                : assigned.outOfService
                  ? 'it is out of service'
                  : 'it is held for another party'}.
              Choose another table.
            </span>
          </Callout>
        )}
        {r.note && <Callout tone="info" icon="notes">{r.note}</Callout>}
        <ServerSelect value={serverId} onChange={setServerId} />
        <TablePicker
          value={tableId}
          onChange={(id) => setTableId(id ?? '')}
          items={fitting.map(({ room, table }) => ({
            room,
            table,
            disabled: !available.has(table.id),
            note: available.has(table.id)
              ? table.id === r.tableId
                ? 'Set aside for them'
                : undefined
              : reason(table.id),
          }))}
        />
      </Stack>
    </ModalFrame>
  );
}
