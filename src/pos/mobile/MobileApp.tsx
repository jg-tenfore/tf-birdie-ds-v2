import { Box, Snackbar, ThemeProvider } from '@mui/material';
import { keyframes } from '@emotion/react';
import { Component, useEffect, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { mobileTheme } from '../../theme/mobile-theme';
import { md3, mobile } from '../../theme/tokens';
import type { PosState } from '../state/pos-store';
import { PosProvider, usePos } from '../state/PosProvider';
import { MobileFrame, NavigationBar } from './chrome';
import type { MobileRoute, MobileTab, NavState } from './navigation';
import { MobileNavProvider, PRESENTATION, createNavState, useMobileNav } from './navigation';
import { SCREENS } from './screens/registry';
import type { ScreenProps } from './screens/types';

/**
 * The Birdie POS phone app.
 *
 * Same reducer and data as the counter terminal (`PosProvider`), so an order built here
 * prices exactly as it would at the desk — only the presentation differs. Where the
 * terminal opens a dialog over a persistent left panel, the phone pushes a screen: see
 * `navigation.tsx` for the full map.
 */

// MD3 shared-axis X for drill-down, and a rise for full-screen dialogs.
const slideIn = keyframes`
  from { transform: translateX(30%); opacity: 0; }
  to   { transform: none; opacity: 1; }
`;
const riseIn = keyframes`
  from { transform: translateY(12%); opacity: 0; }
  to   { transform: none; opacity: 1; }
`;
const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const ENTER = {
  root: 'none',
  push: `${slideIn} ${mobile.motion.push}ms ${mobile.motion.emphasized}`,
  dialog: `${riseIn} ${mobile.motion.sheet}ms ${mobile.motion.emphasized}`,
  takeover: `${fadeIn} ${mobile.motion.push}ms ${mobile.motion.easing}`,
} as const;

// Going back mirrors the way in, shorter and accelerating — MD3 exits are quicker than
// entrances, so the screen underneath is usable almost immediately.
const slideOut = keyframes`
  from { transform: none; opacity: 1; }
  to   { transform: translateX(30%); opacity: 0; }
`;
const dropOut = keyframes`
  from { transform: none; opacity: 1; }
  to   { transform: translateY(12%); opacity: 0; }
`;
const fadeOut = keyframes`
  from { opacity: 1; }
  to   { opacity: 0; }
`;

const EXIT = {
  root: 'none',
  push: `${slideOut} ${mobile.motion.exit}ms ${mobile.motion.exitEasing} forwards`,
  dialog: `${dropOut} ${mobile.motion.exit}ms ${mobile.motion.exitEasing} forwards`,
  takeover: `${fadeOut} ${mobile.motion.exit}ms ${mobile.motion.exitEasing} forwards`,
} as const;

/**
 * A screen on its way out keeps rendering for the length of its exit animation, and the
 * state it shows may already be gone (a booking deleted, then popped). If it throws while
 * leaving, it simply vanishes instead of taking the app down. Every screen is wrapped —
 * adding the boundary only on exit would change the tree and remount the screen — but
 * one that isn't leaving rethrows, so real errors still surface.
 */
class ExitBoundary extends Component<
  { leaving: boolean; children: ReactNode },
  { error: unknown }
> {
  state = { error: null as unknown };
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  render() {
    if (this.state.error) {
      if (!this.props.leaving) throw this.state.error;
      return null;
    }
    return this.props.children;
  }
}

interface Exiting {
  tab: MobileTab;
  index: number;
  route: MobileRoute;
}

/**
 * The screen being popped, kept mounted just long enough to animate out.
 *
 * Only the top screen animates: popping several at once (a receipt returning to the
 * register root) slides the top one away and drops the rest, as Android does. A tab switch
 * or a replace isn't a "back", so neither animates.
 */
function useExiting(tab: MobileTab, stack: MobileRoute[]): Exiting | null {
  const [prev, setPrev] = useState({ tab, stack });
  const [exiting, setExiting] = useState<Exiting | null>(null);

  // Derived during render, not in an effect: an effect runs after React has already
  // committed the stack without the popped screen, so it would unmount and then remount
  // it to animate — losing its state and paying for a full re-render mid-transition.
  if (prev.tab !== tab || prev.stack !== stack) {
    setPrev({ tab, stack });
    if (prev.tab === tab && stack.length < prev.stack.length) {
      const index = prev.stack.length - 1;
      setExiting({ tab, index, route: prev.stack[index] });
    }
  }

  useEffect(() => {
    if (!exiting) return;
    const t = window.setTimeout(() => setExiting(null), mobile.motion.exit);
    return () => window.clearTimeout(t);
  }, [exiting]);

  // A push landing on the same depth before the exit finished takes the slot back.
  return exiting && exiting.tab === tab && exiting.index >= stack.length ? exiting : null;
}

function RouteView({ route }: { route: MobileRoute }) {
  const Screen = SCREENS[route.name] as ComponentType<ScreenProps<typeof route.name>>;
  return <Screen route={route} />;
}

/**
 * Renders the current destination's whole stack, top screen last. Screens underneath
 * stay mounted so their scroll position and local state survive a round trip to a
 * detail page and back — the same reason Android keeps the back-stack alive.
 */
function Router() {
  const nav = useMobileNav();
  const { state, dispatch } = usePos();
  const orderLines = state.cart.filter((i) => !i.isSubItem).length;

  const exiting = useExiting(nav.tab, nav.stack);
  const layers = nav.stack.map((route, i) => ({ route, index: i, leaving: false }));
  if (exiting) layers.push({ route: exiting.route, index: exiting.index, leaving: true });

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {layers.map(({ route, index, leaving }) => {
          const top = index === nav.stack.length - 1;
          const presentation = PRESENTATION[route.name];
          return (
            <Box
              // Same key while leaving as while in the stack, so the popped screen keeps its
              // DOM and state through the exit rather than remounting to animate.
              key={`${nav.tab}-${index}-${route.name}`}
              aria-hidden={!top || undefined}
              inert={!top || undefined}
              sx={{
                position: 'absolute',
                inset: 0,
                // Each screen is its own stacking context, so a lower screen's z-indexed
                // parts (top app bar, sticky subheaders, FAB) can't paint over the one above.
                zIndex: index,
                isolation: 'isolate',
                bgcolor: md3.surface,
                pointerEvents: leaving ? 'none' : undefined,
                animation: leaving ? EXIT[presentation] : index === 0 ? 'none' : ENTER[presentation],
              }}
            >
              <ExitBoundary leaving={leaving}>
                <RouteView route={route} />
              </ExitBoundary>
            </Box>
          );
        })}
      </Box>
      {/* Held back while a screen leaves: showing it at once would shrink the content area
          and jolt the leaving screen's bottom bar up by the bar's height. */}
      {nav.atRoot && !exiting && <NavigationBar badges={{ register: orderLines }} />}
      <Snackbar
        open={Boolean(state.toast)}
        message={state.toast ?? ''}
        onClose={() => dispatch({ type: 'toast', message: null })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ position: 'absolute', bottom: nav.atRoot && !exiting ? mobile.navBarH + 12 : 12 }}
      />
    </Box>
  );
}

export interface MobileAppProps {
  /** POS state to start from — the same scenario builders the terminal stories use. */
  initialState?: Partial<PosState>;
  /** Which destination is selected. */
  tab?: MobileTab;
  /** Screens above that destination's root, bottom first. The root is implied. */
  stack?: MobileRoute[];
  /** Full navigation state, when a story needs several destinations' stacks. */
  nav?: NavState;
}

export function MobileApp({ initialState, tab = 'tee', stack, nav }: MobileAppProps) {
  return (
    <ThemeProvider theme={mobileTheme}>
      <PosProvider initialState={initialState}>
        <MobileNavProvider initial={nav ?? createNavState(tab, stack)}>
          <MobileFrame>
            <Router />
          </MobileFrame>
        </MobileNavProvider>
      </PosProvider>
    </ThemeProvider>
  );
}
