import { useEffect } from 'react';
import { Box } from '@mui/material';
import { md3 } from '../../../theme/tokens';
import { tabById } from '../../state/restaurant';
import { usePos } from '../../state/PosProvider';
import { TabEditor } from './TabEditor';
import { TabList } from './TabList';

/**
 * Tabs (V1 → V2, Wave 2) — every open tab, and the seat-by-seat editor a tab opens into.
 *
 * v1 had the same two screens (`tf-birdie-ds-v1/app/src/screens/tabs.tsx`) on two routes. Here
 * they are one view: `state.activeTabId` decides which is showing, so a deep link
 * (`#/tabs?tab=T-1003`), the floor plan and seating a reservation all open a tab the same way —
 * by setting it — and Back is setting it to `null`.
 *
 * A tab that is no longer open (paid, or a stale link) falls back to the list, and the stale id
 * is cleared so the address bar stops naming it.
 */
export function TabsView() {
  const { state, dispatch } = usePos();
  const tab = tabById(state, state.activeTabId);
  const open = tab?.status === 'open' ? tab : undefined;

  useEffect(() => {
    if (state.activeTabId && !open) dispatch({ type: 'setActiveTab', tabId: null });
  }, [state.activeTabId, open, dispatch]);

  return (
    <Box
      data-restaurant-view="TabsView"
      data-tab-screen={open ? 'editor' : 'list'}
      sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', bgcolor: md3.surface }}
    >
      {/* Keyed by tab, so the active seat and the menu's place start fresh on each tab. */}
      {open ? <TabEditor key={open.id} tab={open} /> : <TabList />}
    </Box>
  );
}
