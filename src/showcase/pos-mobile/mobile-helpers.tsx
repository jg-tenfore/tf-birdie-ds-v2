import { Box } from '@mui/material';
import { useContext, useEffect, useState } from 'react';
import { md3, mobile } from '../../theme/tokens';
import { useDevice, useMobileFrame } from '../../pos/device-context';
import { fitScale } from '../../pos/devices';
import { MobileApp } from '../../pos/mobile/MobileApp';
import type { MobileAppProps } from '../../pos/mobile/MobileApp';
import { MobileStoryEmbed } from './mobile-embed';

/**
 * Helpers shared by the Mobile Screens stories.
 *
 * Same idea as `../pos/screen-helpers.tsx`: a story is a declaration — a POS state plus a
 * navigation stack — and gets that exact screen with no clicking. The POS scenario
 * builders (`withWalkInOrder`, `paidFoursome`, …) are re-exported so a mobile story and a
 * terminal story can show the same order side by side.
 */
export * from '../pos/screen-helpers';

/**
 * Render a mobile screen. The phone sits centred on the scrim; at the story's own
 * 402×797 viewport it fills the canvas exactly. Inside a `MobileStoryEmbed` host it is
 * just the phone. A handheld chosen on the **Device** toolbar sizes the phone to it.
 */
export function MobileStory(props: MobileAppProps) {
  const embedded = useContext(MobileStoryEmbed);
  const onDevice = Boolean(useDevice());
  if (embedded) return <MobileApp {...props} />;
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: md3.scrim,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {onDevice ? (
        <FittedPhone>
          <MobileApp {...props} />
        </FittedPhone>
      ) : (
        <MobileApp {...props} />
      )}
    </Box>
  );
}

/**
 * A handheld chosen on Storybook's **Device** toolbar, scaled down whole if the canvas is
 * smaller than it — the Quest is 3px taller than the 402×797 viewport the phone stories open
 * in. Bottom sheets portal into the frame itself, so they scale with it.
 */
function FittedPhone({ children }: { children: React.ReactNode }) {
  const frame = useMobileFrame();
  const measure = () =>
    typeof window === 'undefined' ? 1 : fitScale(frame, { width: window.innerWidth, height: window.innerHeight });
  const [scale, setScale] = useState(measure);
  useEffect(() => {
    const onResize = () => setScale(measure());
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame.width, frame.height]);
  return (
    <Box sx={{ width: frame.width * scale, height: frame.height * scale, flexShrink: 0 }}>
      <Box sx={{ width: frame.width, height: frame.height, transform: scale < 1 ? `scale(${scale})` : 'none', transformOrigin: '0 0' }}>
        {children}
      </Box>
    </Box>
  );
}

/**
 * Meta fields every Mobile Screens file spreads in. Pins the viewport to the 402×797
 * phone for this category only — everything else keeps the counter-terminal default.
 */
export const mobileMeta = {
  parameters: { layout: 'fullscreen' as const },
  globals: { viewport: { value: 'mobile402', isRotated: false } },
};

export const MOBILE_FRAME = mobile.frame;
