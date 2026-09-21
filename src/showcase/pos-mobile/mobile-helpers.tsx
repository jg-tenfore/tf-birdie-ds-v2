import { Box } from '@mui/material';
import { useContext } from 'react';
import { md3, mobile } from '../../theme/tokens';
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
 * just the phone.
 */
export function MobileStory(props: MobileAppProps) {
  const embedded = useContext(MobileStoryEmbed);
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
      <MobileApp {...props} />
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
