import type { ScreenMap } from './types';
import { peopleScreens } from './people';
import { registerScreens } from './register';
import { teeScreens } from './tee';

/**
 * Route → screen. `satisfies ScreenMap` makes a route with no screen a type error, so the
 * navigation table in `navigation.tsx` and what actually renders can't disagree.
 */
export const SCREENS = { ...teeScreens, ...registerScreens, ...peopleScreens } satisfies ScreenMap;
