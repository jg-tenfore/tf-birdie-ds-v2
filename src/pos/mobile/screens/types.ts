import type { ComponentType } from 'react';
import type { RouteName, RouteOf } from '../navigation';

/** A mobile screen receives its route (with params) and nothing else — state comes from `usePos`. */
export type ScreenProps<N extends RouteName> = { route: RouteOf<N> };

/** Every route name → the component that renders it. `registry.ts` checks this is total. */
export type ScreenMap = { [N in RouteName]: ComponentType<ScreenProps<N>> };
