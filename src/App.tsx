import { Box } from '@mui/material';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { md3 } from './theme/tokens';
import { PosApp } from './pos/PosApp';
import { readUrl } from './pos/state/url-state';
import { DeviceProvider, useTabletFrame } from './pos/device-context';
import { fitScale } from './pos/devices';
import { ModalContainerProvider } from './pos/modals/modal-container';
import { DevicePresenter } from './presenter/DevicePresenter';
import { usePrototypeDevice, useWindowSize } from './presenter/use-prototype-device';

/**
 * The hosted prototype.
 *
 * The POS in its device frame, centred on the dark ground the prototype uses so the frame
 * reads as a terminal rather than a web page. Theme and font providers live in `main.tsx`,
 * which keeps this file the same shape as the Storybook decorator — both render `<PosApp />`
 * into the same context.
 *
 * The frame is a **device** (`src/pos/devices.ts`): the Clover Mini by default, or whatever the
 * presenter's device panel picked — kept in `?device=` and local storage. Picking a handheld
 * there opens the phone prototype instead. `?presenter=0` hides the panel for screenshots.
 *
 * Deep linking is on here and off in Storybook: the address bar tracks the current screen and
 * dialog, and any such link reopens exactly that. `readUrl()` runs once, before the provider
 * mounts, so the app starts on the linked screen rather than flashing the register first.
 */

/** Room left around a scaled-down device, per side. */
const MARGIN = 16;

/**
 * The terminal on the dark ground, at 1:1 or — with **Fit to window** on and a window smaller
 * than the device — scaled down whole. Never up.
 *
 * The tree is the same at every scale (only the transform changes), so resizing the window
 * past the device's size never remounts the app or loses the order on the rail.
 *
 * Dialogs portal into the device, not into `document.body`: a dialog on a Clover Mini is
 * measured against its 800px screen, not against whatever window the prototype is open in,
 * and its scrim dims the device rather than the presenter's desktop. While scaled they shrink
 * with the frame, as they do in Storybook's `Screen`.
 */
function TabletStage({ scale, children }: { scale: number; children: ReactNode }) {
  const frame = useTabletFrame();
  const [el, setEl] = useState<HTMLElement | null>(null);
  const scaled = scale < 1;
  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: md3.scrim, display: 'flex' }}>
      {/* `margin: auto` centres the device, and — unlike centring the flex row — lets one
          bigger than the window (Fit off) scroll from its top-left corner instead of being
          cut off on both sides. */}
      <Box sx={{ m: 'auto', width: frame.width * scale, height: frame.height * scale, flexShrink: 0 }}>
        <Box
          ref={setEl}
          data-device-stage
          sx={{
            width: frame.width,
            height: frame.height,
            // The box scoped dialogs fill (`inset: 0`) — positioned even when not transformed.
            position: 'relative',
            transform: scaled ? `scale(${scale})` : 'none',
            transformOrigin: 'top left',
          }}
        >
          <ModalContainerProvider container={el}>{el && children}</ModalContainerProvider>
        </Box>
      </Box>
    </Box>
  );
}

/** The scale the device is drawn at: 1, or less with Fit on and a window smaller than it. */
function useStageScale(fit: boolean): number {
  const frame = useTabletFrame();
  const win = useWindowSize();
  return fit ? fitScale(frame, win, MARGIN) : 1;
}

function App() {
  const d = usePrototypeDevice('tablet');
  return (
    <DeviceProvider device={d.deviceId}>
      <Prototype {...d} />
    </DeviceProvider>
  );
}

function Prototype({
  deviceId,
  setDevice,
  switchApp,
  fit,
  setFit,
  hidden,
}: ReturnType<typeof usePrototypeDevice>) {
  const scale = useStageScale(fit);
  const [initialState] = useState(readUrl);
  return (
    <>
      <TabletStage scale={scale}>
        <PosApp syncUrl initialState={initialState} />
      </TabletStage>
      {!hidden && (
        <DevicePresenter
          form="tablet"
          deviceId={deviceId}
          onChange={setDevice}
          onSwitchApp={switchApp}
          fit={fit}
          onFit={setFit}
          scale={scale}
        />
      )}
    </>
  );
}

export default App;
