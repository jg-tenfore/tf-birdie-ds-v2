import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import '@fontsource-variable/roboto';
import { theme } from './theme';
import { isVenueId, setVenueOverride } from './pos/data/venues';
import { ARCHIVED_EDITION, CURRENT_EDITION, CURRENT_VENUE, buildEdition, isEdition, setEditionOverride } from './pos/edition';

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

const params = new URLSearchParams(window.location.search);

// Which edition. `?edition=` wins (one dev server shows them all); then the build's
// `VITE_EDITION` (the archive builds pin `base`); and with neither, the **current** Birdie for
// this app — V1 → V2 on the tablet, Weston Edits on the phone (`CURRENT_EDITION`). Storybook
// never runs this file, so its default stays `base` and every story names its own edition.
// Set before the apps load, like the venue.
{
  const e = params.get('edition');
  if (e && isEdition(e)) setEditionOverride(e);
  else if (!import.meta.env.VITE_EDITION) setEditionOverride(CURRENT_EDITION[isMobile ? 'mobile' : 'tablet']);
}

// Which club. `?venue=` wins over the build's own — on the phone it has to be set before the
// story modules load (see `setVenueOverride`), and on the tablet it is how the redirects from
// the old per-club paths (`/prototype-18/` → `/prototype/?venue=eighteen`) land on a club. With
// neither, the current Birdie opens at the club it was designed on (18 holes) and the archive
// at the original three nines, as their published builds do.
{
  const v = params.get('venue');
  if (v && isVenueId(v)) setVenueOverride(v);
  else if (!import.meta.env.VITE_VENUE && buildEdition() !== ARCHIVED_EDITION) setVenueOverride(CURRENT_VENUE);
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
