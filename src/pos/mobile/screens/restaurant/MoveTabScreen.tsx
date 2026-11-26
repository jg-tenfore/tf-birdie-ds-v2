import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { choiceItem, tableChoicesNow } from '../../../logic/dining';
import { tableLabel } from '../../../logic/restaurant';
import { tabById } from '../../../state/restaurant';
import { usePos } from '../../../state/PosProvider';
import { useLiveFloor } from '../../../components/restaurant/use-live-floor';
import { DialogTopBar, MobileScreen } from '../../chrome';
import { useMobileNav } from '../../navigation';
import type { ScreenProps } from '../types';
import { TableChoice } from './OpenTabScreen';

/**
 * Move a tab to another table (V1 → V2, handheld) — the tablet's `MoveTabDialog`.
 *
 * The tables are `tableChoicesNow` for the party's size: one with somebody at it can't be chosen,
 * one held for a reservation or a chair short says so and can. The table the tab is on now is
 * listed as the current choice. Save moves it (`moveTab`, which the store refuses onto an occupied
 * table) and goes back.
 */
export function MoveTabScreen({ route }: ScreenProps<'moveTab'>) {
  const { state, dispatch, toast } = usePos();
  const nav = useMobileNav();
  const ctx = useLiveFloor();
  const tab = tabById(state, route.tabId);
  const [tableId, setTableId] = useState<string | null>(tab?.tableId ?? null);
  if (!tab) return null;
  const choices = tableChoicesNow(tab.guests, state.floor, ctx, tab.id).map(choiceItem);

  const save = () => {
    if (tableId !== (tab.tableId ?? null)) {
      dispatch({ type: 'moveTab', tabId: tab.id, tableId });
      const to = choices.find((c) => c.table.id === tableId);
      toast(to ? `${tab.name} → ${tableLabel(to.table)}` : `${tab.name}: no table`);
    }
    nav.pop();
  };

  return (
    <MobileScreen topBar={<DialogTopBar title={`Move ${tab.name}`} confirmLabel="Move" onConfirm={save} />}>
      <Box sx={{ px: 2, pb: 4 }}>
        <Typography variant="body2" sx={{ py: 1 }}>
          {tab.guests} guest{tab.guests === 1 ? '' : 's'}. Tables with someone at them can’t be chosen.
        </Typography>
        <TableChoice label="No table" note="Keep the tab, free the table" on={tableId === null} onClick={() => setTableId(null)} />
        {choices.map((c) => (
          <TableChoice
            key={c.table.id}
            label={`${tableLabel(c.table)} · ${c.room.name}`}
            note={c.table.id === tab.tableId ? 'Here now' : (c.note ?? `Seats ${c.table.seats ?? 0}`)}
            warn={c.warn}
            disabled={c.disabled}
            on={tableId === c.table.id}
            onClick={() => setTableId(c.table.id)}
          />
        ))}
      </Box>
    </MobileScreen>
  );
}
