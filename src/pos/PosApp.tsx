import { Suspense, lazy } from 'react';
import { Box, Snackbar } from '@mui/material';
import { elevation, md3, radius, shell } from '../theme/tokens';
import { ContextMenus } from './components/ContextMenus';
import { LeftPanel } from './components/LeftPanel';
import { TeeSheetSidebar } from './components/TeeSheetSidebar';
import { TeeSheetView } from './components/TeeSheetView';
import { ModalHost } from './modals/ModalHost';

/**
 * The register, split out of the first load.
 *
 * The terminal opens on the tee sheet — the register is a place you go, not the place you
 * land, and in Weston's edition you now reach it through the reservation rather than by
 * clicking a tee time. It brings the item catalog, the modifier tables and the product imagery
 * with it, none of which the tee sheet touches. A story or a deep link that opens straight on
 * the register pays one fetch for it instead of every load paying for it up front.
 */
const PosView = lazy(() => import('./components/PosView').then((m) => ({ default: m.PosView })));
import { ReservationPanel } from './components/ReservationPanel';
import { CustomerModal } from './components/CustomerModal';
import { CartSignoutModal } from './components/CartSignout';
import type { PosState } from './state/pos-store';
import { PosProvider, usePos } from './state/PosProvider';
import { useUrlSync } from './state/useUrlSync';
import { useDemoDayFill } from './state/use-demo-day-fill';
import { EditionProvider, useWestonEdits } from './edition';
import type { Edition } from './edition';

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
      data-pos-shell
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
  // Weston Edits: any date within a year of today gets a generated tee sheet. Here rather
  // than in the tee sheet so everything that reads the viewed day — grid, list, the day
  // summary, the register's tee-time picker — sees the same filled day.
  useDemoDayFill(useWestonEdits());

  // A scrimmed reservation panel is modal: nothing behind it is usable until an action on the
  // panel itself dismisses it. The scrim alone only stops the mouse — Tab still walks straight
  // into the tee sheet behind it — so the background is marked `inert`, which takes it out of
  // the tab order, out of the accessibility tree and out of pointer events together.
  const panel = state.reservationPanel;
  const panelIsModal = Boolean(panel) && panel?.presentation !== 'modal' && panel?.backdrop === 'scrim';

  return (
    <PosShell>
      {syncUrl && <UrlSync />}
      {/* `display: contents` so marking the background inert costs it no layout. */}
      <Box component="div" inert={panelIsModal || undefined} sx={{ display: 'contents' }}>
        <LeftPanel />
        {state.view === 'pos' ? (
          // The fallback is a plain surface, not a spinner: the register's chunk resolves in a
          // frame or two off a warm cache, and a spinner that flashes reads worse than nothing.
          <Suspense fallback={<Box sx={{ flex: 1, bgcolor: md3.surface }} />}>
            <PosView />
          </Suspense>
        ) : (
          <TeeSheetView />
        )}
        <TeeSheetSidebar />
      </Box>

      <ReservationPanel />
      {/* The customer record layers over everything, including the reservation. */}
      <CustomerModal />
      <CartSignoutModal />
      <ModalHost />
      <ContextMenus />

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
  edition,
}: {
  initialState?: Partial<PosState>;
  syncUrl?: boolean;
  /** Which edition renders — see `edition.tsx`. Defaults to the build's own. */
  edition?: Edition;
}) {
  return (
    <EditionProvider edition={edition}>
      <PosProvider initialState={initialState}>
        <PosAppBody syncUrl={syncUrl} />
      </PosProvider>
    </EditionProvider>
  );
}

export default PosApp;
