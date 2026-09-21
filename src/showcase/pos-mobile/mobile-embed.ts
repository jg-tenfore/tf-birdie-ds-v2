import { createContext } from 'react';

/**
 * Set by a host that embeds the Mobile Screens stories outside Storybook (the standalone
 * mobile prototype, `src/mobile-prototype/`). When true, `MobileStory` renders the bare
 * phone and leaves the ground, centring and scaling to the host. Storybook never sets it.
 *
 * Its own module rather than in `mobile-helpers.tsx` so that file keeps fast refresh.
 */
export const MobileStoryEmbed = createContext(false);
