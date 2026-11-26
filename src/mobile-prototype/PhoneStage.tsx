import { Box } from '@mui/material';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { MobileStoryEmbed } from '../showcase/pos-mobile/mobile-embed';
import { useMobileFrame } from '../pos/device-context';
import { fitScale } from '../pos/devices';
import type { Size } from '../pos/devices';
import type { ScreenEntry } from './screen-index';

/**
 * Fit a W×H box into the element's content box. Scales down only — a phone blown up past
 * 1:1 stops reading as a phone, and its type sizes stop being the ones under review.
 */
function useFitScale(frame: Size, padding: number, fit: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!fit) {
      setScale(1);
      return;
    }
    const measure = () => {
      if (el.clientWidth <= 0 || el.clientHeight <= 0) return;
      setScale(fitScale(frame, { width: el.clientWidth, height: el.clientHeight }, padding));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [frame, padding, fit]);
  return { ref, scale };
}

/**
 * Runs the story's `play` once the phone has mounted, against the phone's own container —
 * the equivalent of Storybook's `canvasElement`. Guarded by a ref so StrictMode's
 * mount → unmount → mount in dev doesn't type into a search field twice. Failures are
 * logged, never thrown: a play function is a convenience that sets the scene, and a
 * screen that half-played is still worth showing.
 */
function usePlay(entry: ScreenEntry, canvas: RefObject<HTMLDivElement | null>) {
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current || !entry.play || !canvas.current) return;
    ran.current = true;
    const canvasElement = canvas.current;
    Promise.resolve()
      .then(() => entry.play?.({ canvasElement }))
      .catch((error: unknown) => {
        console.warn(`[mobile prototype] play() for ${entry.id} failed`, error);
      });
  }, [entry, canvas]);
}

function Phone({ entry, frame }: { entry: ScreenEntry; frame: Size }) {
  const canvas = useRef<HTMLDivElement>(null);
  usePlay(entry, canvas);
  return (
    <Box ref={canvas} sx={{ width: frame.width, height: frame.height }}>
      <MobileStoryEmbed.Provider value>{entry.render()}</MobileStoryEmbed.Provider>
    </Box>
  );
}

/**
 * The phone at its exact layout size — the chosen handheld's viewport (360×800 on the Quest),
 * or the 402×797 design canvas — scaled with a CSS transform to fit whatever space the stage
 * has. The outer box takes the *scaled* size so it centres and flows correctly; the inner box
 * keeps the real size, so nothing inside the app ever sees a different viewport.
 *
 * `fit` off shows the phone at 1:1 and lets the stage scroll instead — for checking type
 * sizes on a window that can't hold the whole device.
 *
 * `runKey` remounts the whole app — a new route, a new device, or Restart.
 */
export function PhoneStage({
  entry,
  runKey,
  padding = 24,
  fit = true,
  onScale,
}: {
  entry: ScreenEntry;
  runKey: string;
  padding?: number;
  fit?: boolean;
  /** Hears the scale the phone is drawn at, for the device panel's readout. */
  onScale?: (scale: number) => void;
}) {
  const frame = useMobileFrame();
  const { ref, scale } = useFitScale(frame, padding, fit);
  useEffect(() => {
    onScale?.(scale);
  }, [scale, onScale]);
  return (
    <Box
      ref={ref}
      data-phone-stage
      sx={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        display: 'flex',
        overflow: fit ? 'hidden' : 'auto',
      }}
    >
      <Box
        sx={{
          // `margin: auto` rather than centring the flex row: a phone bigger than the stage
          // (fit off) then scrolls from its top-left edge instead of being cut off on both sides.
          m: 'auto',
          width: frame.width * scale,
          height: frame.height * scale,
          flexShrink: 0,
          borderRadius: `${Math.round(24 * scale)}px`,
          overflow: 'hidden',
          boxShadow: 12,
        }}
      >
        <Box
          sx={{
            width: frame.width,
            height: frame.height,
            // Always a transform, even at 1:1: it makes this box the containing block for
            // anything fixed-position inside the app, which keeps it inside the phone.
            transform: `scale(${scale})`,
            transformOrigin: '0 0',
          }}
        >
          <Phone key={`${runKey}:${frame.width}x${frame.height}`} entry={entry} frame={frame} />
        </Box>
      </Box>
    </Box>
  );
}
