import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { grid, mobile, shell } from '../theme/tokens';
import { device as deviceById, frameClass, isDeviceId } from './devices';
import type { DeviceForm, DeviceId, DeviceProfile, Size } from './devices';

/**
 * Which device the POS is rendering on — a context, like the edition.
 *
 * The frames used to be constants: `shell` (1366×840) for the tablet and `mobile.frame`
 * (402×797) for the phone. They are now read through here, so the same screen can be shown at
 * a Clover Mini's 1280×800, the large display's 1920×1080 or a handheld's 360×800, from the
 * prototype's device picker or Storybook's **Device** toolbar.
 *
 * **No provider means the design canvas.** Every existing story and test renders without one,
 * so they keep rendering at exactly the size they did before devices existed.
 *
 * A device only resizes the app of its own form. A handheld chosen over a tablet story leaves
 * the tablet on its canvas (and the other way round): a counter-terminal layout squeezed onto
 * a 360px phone is not a design anybody is reviewing. The prototype's picker goes one step
 * further and switches apps instead.
 */

const DeviceContext = createContext<DeviceProfile | null>(null);

export function DeviceProvider({
  device,
  children,
}: {
  /** A device id or profile. `undefined` (or an unknown id) renders the design canvas. */
  device?: DeviceId | DeviceProfile | string | null;
  children: ReactNode;
}) {
  const profile =
    device == null ? null : typeof device === 'string' ? (isDeviceId(device) ? deviceById(device) : null) : device;
  return <DeviceContext.Provider value={profile}>{children}</DeviceContext.Provider>;
}

/** The chosen device, or `null` when nothing chose one (the design canvas). */
export function useDevice(): DeviceProfile | null {
  return useContext(DeviceContext);
}

const CANVAS: Record<DeviceForm, Size> = {
  tablet: { width: shell.width, height: shell.height },
  handheld: { width: mobile.frame.width, height: mobile.frame.height },
};

/** The frame an app of this form renders in: the device's viewport, or the design canvas. */
export function frameFor(profile: DeviceProfile | null, form: DeviceForm): Size {
  return profile && profile.form === form ? profile.viewport : CANVAS[form];
}

/** The counter terminal's frame. 1366×840 unless a tablet device is chosen. */
export function useTabletFrame(): Size {
  return frameFor(useDevice(), 'tablet');
}

/** The phone's frame. 402×797 unless a handheld device is chosen. */
export function useMobileFrame(): Size {
  return frameFor(useDevice(), 'handheld');
}

/**
 * How much room the terminal has, for the components that lay out by it: `wide` on the large
 * display, `compact` on anything smaller than the design canvas (the Clover Mini).
 */
export function useTabletFrameClass(): { wide: boolean; compact: boolean } {
  return frameClass(useTabletFrame());
}

/**
 * The order rail's width: 320, or 380 on the large display. The extra 60px go to the lines'
 * names and modifiers — the rail is where a long order gets read back to a golfer.
 */
export function useLeftPanelWidth(): number {
  return useTabletFrameClass().wide ? 380 : grid.leftPanelW;
}

/**
 * Columns for the terminal's tile grids, by frame: `base` on the design canvas and the Clover
 * Mini, `wide` on the large display — more tiles in a row rather than the same tiles stretched.
 */
export function useTileColumns(base: number, wide: number): number {
  return useTabletFrameClass().wide ? wide : base;
}

/**
 * How much room the phone has: `narrow` on the 360px handhelds (the design canvas is 402),
 * `short` on the Clover Flex's 720px (the canvas is 797). Rows of controls tighten their
 * spacing when narrow — never their 36–48px tap heights.
 */
export function useMobileFrameClass(): { narrow: boolean; short: boolean } {
  const { width, height } = useMobileFrame();
  return { narrow: width < 380, short: height < 760 };
}
