import { useState } from 'react';
import { Box } from '@mui/material';
import { formatTimeLabel } from '../data/courses';
import { CountStepper, ServerSelect } from '../components/restaurant/HostControls';
import { TablePicker } from '../components/restaurant/TablePicker';
import { useLiveFloor } from '../components/restaurant/use-live-floor';
import { Stack } from '../components/Stack';
import { choiceItem, relativeTo, tableChoicesNow } from '../logic/dining';
import { openTabOn, tableLabel, upcomingReservationFor } from '../logic/restaurant';
import { usePos } from '../state/PosProvider';
import { tableOf, type RestaurantModal } from '../state/restaurant';
import { Callout, Field, FilledButton, ModalFrame, ModalSection, OutlineButton } from './ModalFrame';

/**
 * Open a tab (V1 → V2, Wave 2) — on a table from the floor, or with no table from Tabs.
 *
 * ## What v1 did
 *
 * Tapping a free table opened a tab on it immediately, with the table's seat count as its guests
 * and a hard-coded server ("Kyler Brooksby"), and dropped the operator into the seat editor. The
 * one question the host actually has to answer — *how many are sitting down* — was never asked,
 * so a two-top of one had two seats to order against. And because v1's tables had no idea they
 * were held, a walk-in could be put on the table a 12:30 was coming for with no hint of it.
 *
 * ## What this does
 *
 * Asks the two things that matter — guests and server — with sensible defaults, so it is still
 * one tap for the common case. The tab opens with a seat per guest. What the host is taking on is
 * said before they commit, not after:
 *
 * - **Held for someone:** the table is still offered — the host may be about to move the
 *   reservation — but the button says *Seat walk-in anyway*, above who is coming and when.
 * - **Already has a tab:** there is nothing to open; the dialog offers that table's tab instead.
 *   The store would do the same (one tab per table), but silently.
 * - **Out of service:** refused, with why.
 *
 * With no table given (the Tabs screen's *New tab*), the table is optional — a bar tab or a
 * group's running tab has none — and the picker shows every table's state the same way.
 */
export function OpenTabDialog({ m }: { m: Extract<RestaurantModal, { kind: 'openTab' }> }) {
  const { state, dispatch } = usePos();
  const ctx = useLiveFloor();
  const fixed = m.tableId ? tableOf(state, m.tableId)?.table : undefined;
  const [tableId, setTableId] = useState<string | null>(m.tableId ?? null);
  const [guests, setGuests] = useState(Math.min(2, fixed?.seats ?? 2));
  const [serverId, setServerId] = useState(state.operatorId);
  const [name, setName] = useState('');

  const close = () => dispatch({ type: 'closeModal' });
  const table = tableId ? tableOf(state, tableId)?.table : undefined;
  const existing = table ? openTabOn(table.id, ctx.tabs) : undefined;
  const held = table ? upcomingReservationFor(table.id, ctx) : undefined;
  const blocked = Boolean(table?.outOfService);

  const goToTab = (tabId: string) => {
    dispatch({ type: 'setActiveTab', tabId });
    dispatch({ type: 'setView', view: 'tabs' });
    close();
  };

  const open = () => {
    dispatch({ type: 'openTab', name: name.trim() || undefined, tableId: table?.id, guests, serverId });
    dispatch({ type: 'setView', view: 'tabs' });
    close();
  };

  const title = fixed ? `Open a tab on ${tableLabel(fixed)}` : 'Open a tab';

  // A table with a tab on it has nothing to open — say so, and offer the tab that is there.
  if (existing && fixed) {
    return (
      <ModalFrame
        title={title}
        icon="receipt_long"
        onClose={close}
        actions={
          <>
            <OutlineButton onClick={close}>Close</OutlineButton>
            <FilledButton onClick={() => goToTab(existing.id)}>Open that tab</FilledButton>
          </>
        }
      >
        <Callout tone="info">
          {tableLabel(fixed)} already has a tab open — <b>{existing.name}</b>. A table carries one tab at a time.
        </Callout>
      </ModalFrame>
    );
  }

  const choices = tableChoicesNow(guests, state.floor, ctx);

  return (
    <ModalFrame
      title={title}
      subtitle={fixed ? `${fixed.seats ?? 0} seats` : 'On a table, or with none — a bar or group tab'}
      icon="receipt_long"
      width={fixed ? 480 : 620}
      tall={!fixed}
      onClose={close}
      actions={
        <>
          <OutlineButton onClick={close}>Cancel</OutlineButton>
          <FilledButton onClick={open} disabled={blocked || Boolean(existing)}>
            {held ? 'Seat walk-in anyway' : 'Open tab'}
          </FilledButton>
        </>
      }
    >
      <Stack gap={2}>
        {blocked && table && (
          <Callout tone="danger" icon="block">
            {tableLabel(table)} is out of service. Put it back in service on the floor first.
          </Callout>
        )}
        {held && table && (
          <Callout tone="warning" icon="warning_amber">
            <b>
              {tableLabel(table)} is held for {held.name} ({held.partySize}) at {formatTimeLabel(held.timeMin)}
            </b>{' '}
            — {relativeTo(held.timeMin, ctx.nowMin)}. Seating a walk-in here means finding {held.name.split(',')[0]} another
            table before {formatTimeLabel(held.timeMin)}.
          </Callout>
        )}
        {existing && table && !fixed && (
          <Callout tone="info">
            {tableLabel(table)} already has a tab — <b>{existing.name}</b>. Choose another table.
          </Callout>
        )}

        <Stack direction="row" gap={2} alignItems="flex-end">
          <CountStepper label="Guests" unit="guests" value={guests} onChange={setGuests} />
          <Box sx={{ flex: 1 }}>
            <ServerSelect value={serverId} onChange={setServerId} />
          </Box>
        </Stack>
        {table && guests > (table.seats ?? 0) && (
          <Callout tone="warning">
            {tableLabel(table)} seats {table.seats}; this tab is for {guests}. Pull up chairs, or choose a bigger table.
          </Callout>
        )}

        <Field
          label="Tab name (optional)"
          value={name}
          onChange={setName}
          placeholder={table ? tableLabel(table) : `Tab ${state.restaurantSeq.tab + 1}`}
        />

        {!fixed && (
          <ModalSection title="Table" hint="Optional">
            <TablePicker
              value={tableId}
              onChange={setTableId}
              none={{ label: 'No table', note: 'Bar or group tab' }}
              items={choices.map(choiceItem)}
            />
          </ModalSection>
        )}
      </Stack>
    </ModalFrame>
  );
}
