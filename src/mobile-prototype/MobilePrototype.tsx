import {
  Box,
  Button,
  Chip,
  Drawer,
  IconButton,
  Link,
  List,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Tooltip,
  Typography,
  alpha,
  useMediaQuery,
} from '@mui/material';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import MenuIcon from '@mui/icons-material/Menu';
import OpenInNew from '@mui/icons-material/OpenInNew';
import Replay from '@mui/icons-material/Replay';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { Stack } from '../pos/components/Stack';
import { buildVenue } from '../pos/data/venues';
import type { VenueId } from '../pos/data/venues';
import { md3 } from '../theme/tokens';
import { PhoneStage } from './PhoneStage';
import { HOME, SCREENS, SECTIONS, WESTON, findScreen } from './screen-index';
import type { ScreenEntry } from './screen-index';

/**
 * The standalone mobile prototype — every Mobile Screens story as a live, linkable screen.
 *
 * Served at `/mobile/` (see `main.tsx` and `scripts/build-site.mjs`). Routing is hash-only
 * because GitHub Pages has no SPA fallback: `#/` is the app from the Tee Sheet root and
 * `#/<storybook story id>` starts from that story's state. Every screen stays fully
 * interactive; the route only picks where you start.
 */

const SIDEBAR_W = 320;
const WIDE = '(min-width:900px)';

const onScrim = md3.surface;
const onScrimMuted = alpha(md3.surface, 0.68);
const scrimDivider = alpha(md3.surface, 0.12);

// ── Routing ────────────────────────────────────────────────────────────────

function readHash(): ScreenEntry {
  const raw = window.location.hash.replace(/^#\/?/, '');
  if (!raw) return HOME;
  let id = raw;
  try {
    id = decodeURIComponent(raw);
  } catch {
    // A malformed escape is just an unknown route.
  }
  return findScreen(id) ?? HOME;
}

const hrefFor = (entry: ScreenEntry) => (entry.id === HOME.id ? '#/' : `#/${entry.id}`);

function useRoute() {
  const [entry, setEntry] = useState(readHash);
  useEffect(() => {
    const sync = () => {
      const next = readHash();
      // Unknown routes settle on `#/` so the address bar never names a screen that isn't shown.
      const wanted = hrefFor(next);
      if (next === HOME && window.location.hash !== wanted && window.location.hash !== '') {
        history.replaceState(null, '', wanted);
      }
      setEntry(next);
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  const go = useCallback((next: ScreenEntry) => {
    window.location.hash = hrefFor(next);
  }, []);
  return { entry, go };
}

// ── Links out ──────────────────────────────────────────────────────────────

const DEV = import.meta.env.DEV;
const STORYBOOK_ORIGIN = (import.meta.env.VITE_STORYBOOK_ORIGIN as string | undefined) ?? 'http://localhost:6006';

const storybookHref = (id?: string) =>
  DEV ? `${STORYBOOK_ORIGIN}/${id ? `?path=/story/${id}` : ''}` : `../${id ? `?path=/story/${id}` : ''}`;
// ── Clubs ──────────────────────────────────────────────────────────────────

/**
 * The three clubs, each its own mobile build (`/mobile/`, `/mobile-18/`, `/mobile-9/`)
 * beside the matching tablet one — the same split the terminal prototypes use. In dev one
 * server serves all three, so the club rides along as `?venue=` instead.
 */
const CLUBS: Array<{ id: VenueId; label: string; mobileDir: string; tabletDir: string }> = [
  { id: 'three-nines', label: 'Three nines', mobileDir: 'mobile', tabletDir: 'prototype' },
  { id: 'eighteen', label: '18 holes', mobileDir: 'mobile-18', tabletDir: 'prototype-18' },
  { id: 'nine', label: 'Single nine', mobileDir: 'mobile-9', tabletDir: 'prototype-9' },
];
const CLUB = CLUBS.find((c) => c.id === buildVenue()) ?? CLUBS[0];

/** The same screen at another club — the hash (which story) carries over. */
const clubHref = (id: VenueId) => {
  const club = CLUBS.find((c) => c.id === id)!;
  const hash = typeof window === 'undefined' ? '' : window.location.hash;
  return DEV ? `/mobile/?venue=${id}${hash}` : `../${club.mobileDir}/${hash}`;
};

// Weston Edits pairs with its own tablet prototype, at the 18-hole club.
const TABLET_HREF = WESTON
  ? DEV
    ? 'http://localhost:5173/?edition=weston#/tee-sheet?venue=eighteen'
    : '../weston-edits/'
  : DEV
    ? `http://localhost:5173/#/register?venue=${CLUB.id}`
    : `../${CLUB.tabletDir}/`;

/**
 * Weston Edits is one club (18 holes), so its prototype names the edition instead of
 * offering a club switch — switching would leave the edition.
 */
function EditionLabel() {
  return (
    <Stack direction="row" gap={0.75} sx={{ mt: 1.25 }}>
      <Chip label="Weston Edits · 18 holes" size="small" color="primary" variant="filled" />
    </Stack>
  );
}

function ClubSwitcher() {
  return (
    <Stack direction="row" gap={0.75} flexWrap="wrap" sx={{ mt: 1.25 }} role="group" aria-label="Club">
      {CLUBS.map((c) => (
        <Chip
          key={c.id}
          label={c.label}
          size="small"
          clickable
          color={c.id === CLUB.id ? 'primary' : 'default'}
          variant={c.id === CLUB.id ? 'filled' : 'outlined'}
          aria-current={c.id === CLUB.id ? 'true' : undefined}
          // Read the hash at click time, so the link keeps whichever screen is open now.
          onClick={() => {
            if (c.id !== CLUB.id) window.location.href = clubHref(c.id);
          }}
        />
      ))}
    </Stack>
  );
}

// ── Screen index ───────────────────────────────────────────────────────────

function ScreenList({ current, onPick }: { current: ScreenEntry; onPick: (e: ScreenEntry) => void }) {
  const selectedRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' });
  }, [current]);
  return (
    <List dense disablePadding sx={{ pb: 2 }}>
      {SECTIONS.map(({ section, entries }) => (
        <li key={section}>
          <ul style={{ padding: 0 }}>
            <ListSubheader
              sx={{ bgcolor: md3.surface, color: md3.onSurfaceVariant, fontWeight: 600, lineHeight: '36px' }}
            >
              {section}
            </ListSubheader>
            {entries.map((entry) => {
              const selected = entry.id === current.id;
              return (
                <ListItemButton
                  key={entry.id}
                  ref={selected ? selectedRef : undefined}
                  component="a"
                  href={hrefFor(entry)}
                  selected={selected}
                  onClick={(ev: MouseEvent) => {
                    ev.preventDefault();
                    onPick(entry);
                  }}
                  sx={{
                    mx: 1,
                    borderRadius: 1,
                    '&.Mui-selected': { bgcolor: md3.primaryContainer, color: md3.onPrimaryContainer },
                    '&.Mui-selected:hover': { bgcolor: md3.primaryContainer },
                  }}
                >
                  <ListItemText primary={entry.name} slotProps={{ primary: { noWrap: true } }} />
                  {entry.play && (
                    <Tooltip title="Plays an interaction after loading">
                      <Typography component="span" variant="caption" sx={{ color: md3.outline, ml: 1 }}>
                        ▶
                      </Typography>
                    </Tooltip>
                  )}
                </ListItemButton>
              );
            })}
          </ul>
        </li>
      ))}
    </List>
  );
}

function SidebarHeader() {
  return (
    <Box sx={{ px: 2, pt: 2, pb: 1.5, borderBottom: `1px solid ${md3.outlineVariant}` }}>
      <Typography variant="h6" sx={{ fontWeight: 600, color: md3.onSurface }}>
        ⛳ Birdie POS · {WESTON ? 'Weston Edits · Mobile' : 'Mobile'}
      </Typography>
      <Typography variant="body2" sx={{ color: md3.onSurfaceVariant, mb: 1 }}>
        {WESTON
          ? `${SCREENS.length} screens — Weston Edits first, then Mobile Screens`
          : `${SCREENS.length} screens from Storybook's Mobile Screens`}
      </Typography>
      <Stack direction="row" gap={2} flexWrap="wrap">
        <Link href={storybookHref()} target="_blank" rel="noopener" variant="body2" underline="hover">
          Design system (Storybook)
        </Link>
        <Link href={TABLET_HREF} variant="body2" underline="hover">
          Tablet prototype
        </Link>
      </Stack>
      {WESTON ? <EditionLabel /> : <ClubSwitcher />}
    </Box>
  );
}

function Sidebar({ current, onPick }: { current: ScreenEntry; onPick: (e: ScreenEntry) => void }) {
  return (
    <Box
      component="nav"
      aria-label="Screens"
      sx={{
        width: SIDEBAR_W,
        flexShrink: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: md3.surface,
        color: md3.onSurface,
        borderRight: `1px solid ${md3.outlineVariant}`,
      }}
    >
      <SidebarHeader />
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        <ScreenList current={current} onPick={onPick} />
      </Box>
    </Box>
  );
}

// ── Main area ──────────────────────────────────────────────────────────────

function Description({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);
  const [clamped, setClamped] = useState(false);
  useEffect(() => {
    setOpen(false);
  }, [text]);
  useEffect(() => {
    const el = ref.current;
    if (el) setClamped(el.scrollHeight > el.clientHeight + 1);
  }, [text, open]);
  if (!text) return null;
  return (
    <Box sx={{ maxWidth: 760, mx: 'auto', px: 3, pb: 1 }}>
      <Typography
        ref={ref}
        variant="body2"
        title={open ? undefined : text}
        sx={{
          color: onScrimMuted,
          whiteSpace: 'pre-line',
          textAlign: 'center',
          ...(open
            ? {}
            : { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }),
        }}
      >
        {text}
      </Typography>
      {(clamped || open) && (
        <Box sx={{ textAlign: 'center' }}>
          <Button size="small" onClick={() => setOpen((v) => !v)} sx={{ color: onScrim, minWidth: 0 }}>
            {open ? 'Less' : 'More'}
          </Button>
        </Box>
      )}
    </Box>
  );
}

interface NavProps {
  entry: ScreenEntry;
  onPrev: () => void;
  onNext: () => void;
  onRestart: () => void;
}

const ghost = { color: onScrim, '&:hover': { bgcolor: alpha(md3.surface, 0.08) } } as const;

function Toolbar({ entry, onPrev, onNext, onRestart }: NavProps) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={1}
      sx={{ px: 2, py: 1.25, borderBottom: `1px solid ${scrimDivider}`, color: onScrim }}
    >
      <IconButton aria-label="Previous screen (←)" onClick={onPrev} sx={ghost}>
        <ChevronLeft />
      </IconButton>
      <IconButton aria-label="Next screen (→)" onClick={onNext} sx={ghost}>
        <ChevronRight />
      </IconButton>
      <Typography variant="subtitle1" noWrap sx={{ flex: 1, minWidth: 0, fontWeight: 500 }}>
        <Box component="span" sx={{ color: onScrimMuted }}>
          {entry.section} ·{' '}
        </Box>
        {entry.name}
      </Typography>
      <Button startIcon={<Replay />} onClick={onRestart} sx={ghost}>
        Restart
      </Button>
      <Button
        startIcon={<OpenInNew />}
        href={storybookHref(entry.id)}
        target="_blank"
        rel="noopener"
        variant="outlined"
        sx={{ ...ghost, borderColor: alpha(md3.surface, 0.3) }}
      >
        Open in Storybook
      </Button>
    </Stack>
  );
}

function NarrowToolbar({ entry, onPrev, onNext, onMenu }: NavProps & { onMenu: () => void }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={0.5}
      sx={{ px: 0.5, height: 48, flexShrink: 0, color: onScrim, borderBottom: `1px solid ${scrimDivider}` }}
    >
      <IconButton aria-label="Screen index" onClick={onMenu} sx={ghost}>
        <MenuIcon />
      </IconButton>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" noWrap component="div" sx={{ color: onScrimMuted, lineHeight: 1.2 }}>
          {entry.section}
        </Typography>
        <Typography variant="body2" noWrap component="div" sx={{ fontWeight: 500, lineHeight: 1.3 }}>
          {entry.name}
        </Typography>
      </Box>
      <IconButton aria-label="Previous screen" onClick={onPrev} sx={ghost}>
        <ChevronLeft />
      </IconButton>
      <IconButton aria-label="Next screen" onClick={onNext} sx={ghost}>
        <ChevronRight />
      </IconButton>
    </Stack>
  );
}

// ── Keyboard ───────────────────────────────────────────────────────────────

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}

// ── The page ───────────────────────────────────────────────────────────────

export default function MobilePrototype() {
  const { entry, go } = useRoute();
  const wide = useMediaQuery(WIDE, { noSsr: true });
  const [runs, setRuns] = useState(0);
  const [drawer, setDrawer] = useState(false);

  const index = SCREENS.indexOf(entry);
  const step = useCallback(
    (delta: number) => go(SCREENS[(index + delta + SCREENS.length) % SCREENS.length]),
    [go, index],
  );
  const onPrev = useCallback(() => step(-1), [step]);
  const onNext = useCallback(() => step(1), [step]);
  const onRestart = useCallback(() => setRuns((n) => n + 1), []);

  useEffect(() => {
    document.title = WESTON ? 'Birdie POS — Weston Edits · Mobile' : `Birdie POS — Mobile prototype · ${CLUB.label}`;
  }, []);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.defaultPrevented || ev.altKey || ev.ctrlKey || ev.metaKey || isTyping(ev.target)) return;
      if (ev.key === 'ArrowLeft') onPrev();
      else if (ev.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onPrev, onNext]);

  const pick = (next: ScreenEntry) => {
    setDrawer(false);
    if (next === entry) onRestart();
    else go(next);
  };

  const runKey = `${entry.id}:${runs}`;
  const nav = { entry, onPrev, onNext, onRestart };

  if (wide) {
    return (
      <Box sx={{ height: '100dvh', display: 'flex', bgcolor: md3.scrim, overflow: 'hidden' }}>
        <Sidebar current={entry} onPick={pick} />
        <Box component="main" sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Toolbar {...nav} />
          <Box sx={{ pt: 1.5 }}>
            <Description text={entry.description} />
          </Box>
          <PhoneStage entry={entry} runKey={runKey} padding={24} />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column', bgcolor: md3.scrim, overflow: 'hidden' }}>
      <NarrowToolbar {...nav} onMenu={() => setDrawer(true)} />
      <PhoneStage entry={entry} runKey={runKey} padding={8} />
      <Drawer
        open={drawer}
        onClose={() => setDrawer(false)}
        slotProps={{ paper: { sx: { width: `min(${SIDEBAR_W}px, 86vw)`, bgcolor: md3.surface } } }}
      >
        <SidebarHeader />
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          <ScreenList current={entry} onPick={pick} />
        </Box>
        <Box sx={{ p: 2, borderTop: `1px solid ${md3.outlineVariant}` }}>
          <Button fullWidth startIcon={<OpenInNew />} href={storybookHref(entry.id)} target="_blank" rel="noopener">
            Open this screen in Storybook
          </Button>
          <Button fullWidth startIcon={<Replay />} onClick={() => pick(entry)} sx={{ mt: 0.5 }}>
            Restart this screen
          </Button>
        </Box>
      </Drawer>
    </Box>
  );
}
