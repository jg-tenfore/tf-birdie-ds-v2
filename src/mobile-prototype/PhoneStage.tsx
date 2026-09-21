import { Box } from '@mui/material';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { mobile } from '../theme/tokens';
import { MobileStoryEmbed } from '../showcase/pos-mobile/mobile-embed';
import type { ScreenEntry } from './screen-index';

const { width: W, height: H } = mobile.frame;

/**
 * Fit a W×H box into the element's content box. Scales down only — a phone blown up past
 * 1:1 stops reading as a phone, and its type sizes stop being the ones under review.
 */
function useFitScale(padding: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth - padding * 2;
      const h = el.clientHeight - padding * 2;
      if (w <= 0 || h <= 0) return;
      setScale(Math.min(1, w / W, h / H));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [padding]);
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

function Phone({ entry }: { entry: ScreenEntry }) {
  const canvas = useRef<HTMLDivElement>(null);
  usePlay(entry, canvas);
  return (
    <Box ref={canvas} sx={{ width: W, height: H }}>
      <MobileStoryEmbed.Provider value>{entry.render()}</MobileStoryEmbed.Provider>
    </Box>
  );
}

/**
 * The phone at exact 402×797 layout, scaled with a CSS transform to fit whatever space the
 * stage has. The outer box takes the *scaled* size so it centres and flows correctly; the
 * inner box keeps the real size, so nothing inside the app ever sees a different viewport.
 *
 * `runKey` remounts the whole app — a new route, or Restart.
 */
export function PhoneStage({ entry, runKey, padding = 24 }: { entry: ScreenEntry; runKey: string; padding?: number }) {
  const { ref, scale } = useFitScale(padding);
  return (
    <Box
      ref={ref}
      sx={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          width: W * scale,
          height: H * scale,
          flexShrink: 0,
          borderRadius: `${Math.round(24 * scale)}px`,
          overflow: 'hidden',
          boxShadow: 12,
        }}
      >
        <Box sx={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: '0 0' }}>
          <Phone key={runKey} entry={entry} />
        </Box>
      </Box>
    </Box>
  );
}
