import { Box, Snackbar } from '@mui/material';
import { elevation, md3, radius, shell } from '../theme/tokens';
import { ContextMenus } from './components/ContextMenus';
import { LeftPanel } from './components/LeftPanel';
import { PosView } from './components/PosView';
import { TeeSheetSidebar } from './components/TeeSheetSidebar';
import { TeeSheetView } from './components/TeeSheetView';
import { ModalHost } from './modals/ModalHost';
import type { PosState } from './state/pos-store';
import { PosProvider, usePos } from './state/PosProvider';
import { useUrlSync } from './state/useUrlSync';

/**
 * The Birdie POS prototype.
 *
 * Two views inside one fixed device frame: the register (left panel + catalog) and the
 * tee sheet (left panel + grid or list). The left panel is shared and persistent —
 * that's the whole interaction model, because an operator moves between "who's on the
 * sheet" and "what are they buying" constantly, and losing the order in between would
 * be the single most costly thing this design could do.
 *
 * The frame is fixed at 1366×840 rather than responsive. This is a counter terminal
 * with known hardware, and the prototype it's ported from assumes those dimensions
 * throughout — a fluid layout would be a different design, not the same one scaled.
 */

/** The device frame. Exported so Storybook screen stories can reuse it. */
export function PosShell({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        width: shell.width,
        height: shell.height,
        maxWidth: '100%',
        bgcolor: md3.surface,
        borderRadius: `${radius.lg}px`,
        display: 'flex',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,.4)',
        position: 'relative',
        color: md3.onSurface,
      }}
    >
      {children}
    </Box>
  );
}

/**
 * Mounts the URL sync. A component rather than a call in `PosAppBody` because hooks can't
 * be conditional, and only the hosted prototype wants this — Storybook owns its own URL,
 * and a story rewriting the hash would fight the addressbar it already uses to track which
 * story is open.
 */
function UrlSync() {
  const { state, dispatch } = usePos();
  useUrlSync(state, dispatch);
  return null;
}

/** Everything inside the frame — assumes a `PosProvider` above it. */
export function PosAppBody({ syncUrl }: { syncUrl?: boolean } = {}) {
  const { state, dispatch } = usePos();

  return (
    <PosShell>
      {syncUrl && <UrlSync />}
      <LeftPanel />
      {state.view === 'pos' ? <PosView /> : <TeeSheetView />}

      <ModalHost />
      <ContextMenus />
      <TeeSheetSidebar />

      <Snackbar
        open={Boolean(state.toast)}
        message={state.toast ?? ''}
        onClose={() => dispatch({ type: 'toast', message: null })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{
          position: 'absolute',
          '& .MuiSnackbarContent-root': {
            bgcolor: md3.scrim,
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            borderRadius: `${radius.sm}px`,
            boxShadow: elevation.e3,
            minWidth: 'auto',
          },
        }}
      />
    </PosShell>
  );
}

/**
 * The prototype, provider included.
 *
 * `initialState` lets a story or a deep link open the app in a specific condition — a
 * loaded booking, the tee sheet on a busy Saturday, a dialog already open.
 *
 * `syncUrl` mirrors state into the address bar and honours Back/Forward. The hosted
 * prototype turns it on; stories leave it off.
 */
export function PosApp({
  initialState,
  syncUrl,
}: {
  initialState?: Partial<PosState>;
  syncUrl?: boolean;
}) {
  return (
    <PosProvider initialState={initialState}>
      <PosAppBody syncUrl={syncUrl} />
    </PosProvider>
  );
}

export default PosApp;
