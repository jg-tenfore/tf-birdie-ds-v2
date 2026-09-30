import { useState } from 'react';
import { formatTimeLabel } from '../data/courses';
import { TablePicker } from '../components/restaurant/TablePicker';
import { useLiveFloor } from '../components/restaurant/use-live-floor';
import { Stack } from '../components/Stack';
import { choiceItem, tableChoicesNow } from '../logic/dining';
import { tableLabel } from '../logic/restaurant';
import { usePos } from '../state/PosProvider';
import { tabById, tableOf, type RestaurantModal } from '../state/restaurant';
import { Callout, FilledButton, ModalFrame, OutlineButton } from './ModalFrame';

/**
 * Move a tab to another table (V1 → V2, Wave 2) — the party asked for the window, or a four-top
 * is needed for the six who just walked in.
 *
 * v1 had no move at all: a tab *was* its table ("Table Detached 27699"), so the only way to move
 * a party was to close one check and re-ring everything on another. Here a tab is on a table, and
 * moving it changes that one fact — its dishes, seats, server and what the kitchen has all go
 * with it, and the old table is free the moment it lands.
 *
 * Every table is shown with its state, so the host sees the room rather than a list. Tables with
 * a tab on them can't be chosen (one tab per table — the store refuses it too); a table held for
 * a reservation or too small for the party can, with a warning, because the host is the one
 * looking at the room. *No table* takes it off the floor — a party that moved to the bar.
 */
export function MoveTabDialog({ m }: { m: Extract<RestaurantModal, { kind: 'moveTab' }> }) {
  const { state, dispatch, toast } = usePos();
  const ctx = useLiveFloor();
  const tab = tabById(state, m.tabId);
  /** `undefined` until the host picks; `null` is the "no table" choice. */
  const [target, setTarget] = useState<string | null | undefined>(undefined);
  const close = () => dispatch({ type: 'closeModal' });

  if (!tab || tab.status !== 'open') {
    return (
      <ModalFrame title="Move tab" onClose={close} actions={<OutlineButton onClick={close}>Close</OutlineButton>}>
        <Callout tone="info">This tab is closed — there is nothing to move.</Callout>
      </ModalFrame>
    );
  }

  const here = tab.tableId ? tableOf(state, tab.tableId)?.table : undefined;
  const choices = tableChoicesNow(tab.guests, state.floor, ctx, tab.id);
  const chosen = target ? choices.find((c) => c.table.id === target) : undefined;
  const destination = target === null ? 'no table' : chosen ? tableLabel(chosen.table) : undefined;

  const move = () => {
    if (target === undefined) return;
    dispatch({ type: 'moveTab', tabId: tab.id, tableId: target });
    toast(target ? `${tab.name} moved to ${destination}` : `${tab.name} is off the floor`);
    close();
  };

  return (
    <ModalFrame
      title={`Move ${tab.name}`}
      subtitle={`${here ? `On ${tableLabel(here)}` : 'No table'} · ${tab.guests} ${tab.guests === 1 ? 'guest' : 'guests'}`}
      icon="swap_horiz"
      width={640}
      tall
      onClose={close}
      actions={
        <>
          <OutlineButton onClick={close}>Cancel</OutlineButton>
          <FilledButton onClick={move} disabled={target === undefined}>
            {destination ? (target === null ? 'Take off the floor' : `Move to ${destination}`) : 'Move'}
          </FilledButton>
        </>
      }
    >
      <Stack gap={1.5}>
        {chosen?.held && (
          <Callout tone="warning" icon="warning_amber">
            {tableLabel(chosen.table)} is held for <b>{chosen.held.name}</b> ({chosen.held.partySize}) at{' '}
            {formatTimeLabel(chosen.held.timeMin)}. They will need another table.
          </Callout>
        )}
        {chosen?.tooSmall && (
          <Callout tone="warning">
            {tableLabel(chosen.table)} seats {chosen.table.seats}; this tab has {tab.guests} guests.
          </Callout>
        )}
        <TablePicker
          value={target === undefined ? '' : target}
          onChange={setTarget}
          none={here ? { label: 'No table', note: 'Off the floor — a bar tab' } : undefined}
          items={choices.map((c) =>
            c.table.id === here?.id ? { ...choiceItem(c), disabled: true, warn: false, note: 'Here now' } : choiceItem(c),
          )}
        />
      </Stack>
    </ModalFrame>
  );
}
