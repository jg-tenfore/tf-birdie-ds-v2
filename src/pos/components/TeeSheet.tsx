import { Box } from '@mui/material';
import { md3, radius, shell } from '../../theme/tokens';
import type { PosState } from '../state/pos-store';
import { PosProvider } from '../state/PosProvider';
import { TeeSheetView } from './TeeSheetView';

/**
 * The tee sheet as a standalone component: toolbar plus grid (or list view), with none of
 * the surrounding application.
 *
 * `TeeSheetView` is the same component the app renders — this only supplies the provider and
 * frame it needs, and deliberately leaves out the order panel, the modal host, the context
 * menus and the summary drawer. That makes it reviewable as a component rather than as a
 * screen: what you see is the sheet's own behaviour, not the app's.
 *
 * The consequence to know: interactions that would open a dialog (clicking an open slot,
 * right-clicking a chip) update state but render nothing, because the host that draws
 * dialogs isn't here. Those flows belong in the POS Screens stories, which mount the whole
 * app. This is the surface, not the wiring.
 */
export function TeeSheet({
  state,
  height = shell.height,
}: {
  /** Starting state. `venueId` picks the club; anything else pins a specific condition. */
  state?: Partial<PosState>;
  /** Frame height. The default matches the counter terminal the sheet is designed for. */
  height?: number;
}) {
  return (
    <PosProvider initialState={{ view: 'tee', leftPanelCollapsed: true, ...state }}>
      <Box
        sx={{
          width: shell.width,
          height,
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
        <TeeSheetView />
      </Box>
    </PosProvider>
  );
}

export default TeeSheet;
