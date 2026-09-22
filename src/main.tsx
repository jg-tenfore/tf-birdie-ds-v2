import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import '@fontsource-variable/roboto';
import { theme } from './theme';
import { isVenueId, setVenueOverride } from './pos/data/venues';
import { isEdition, setEditionOverride } from './pos/edition';

/**
 * One entry, two apps. The mobile prototype is built with `VITE_APP=mobile` (Pages serves
 * it at `/mobile/`); in dev, where one server hosts both, the path decides — Vite's SPA
 * fallback serves this same `index.html` at `/mobile/`.
 *
 * The path test is dev-only, so in a production build `isMobile` is a constant and the
 * unused app's chunk is dropped rather than emitted and never fetched.
 */
const isMobile =
  import.meta.env.VITE_APP === 'mobile' ||
  (import.meta.env.DEV && /\/mobile\/?$/.test(window.location.pathname));

// The mobile prototype's club: `?venue=` wins over the build's own, and has to be set
// before the prototype's story modules load (see `setVenueOverride`).
if (isMobile) {
  const v = new URLSearchParams(window.location.search).get('venue');
  if (v && isVenueId(v)) setVenueOverride(v);
}

// `?edition=weston` shows Weston's edits from the one dev server; built prototypes carry
// `VITE_EDITION` instead. Set before the apps load, like the venue.
{
  const e = new URLSearchParams(window.location.search).get('edition');
  if (e && isEdition(e)) setEditionOverride(e);
}

const App = isMobile
  ? lazy(() => import('./mobile-prototype/MobilePrototype.tsx'))
  : lazy(() => import('./App.tsx'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </LocalizationProvider>
    </ThemeProvider>
  </StrictMode>,
);
