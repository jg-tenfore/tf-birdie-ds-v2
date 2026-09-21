import { Badge, Box, Button, ButtonBase, IconButton, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { keyframes } from '@emotion/react';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Close from '@mui/icons-material/Close';
import GolfCourse from '@mui/icons-material/GolfCourse';
import GolfCourseOutlined from '@mui/icons-material/GolfCourseOutlined';
import Group from '@mui/icons-material/Group';
import GroupOutlined from '@mui/icons-material/GroupOutlined';
import Menu from '@mui/icons-material/Menu';
import MenuOutlined from '@mui/icons-material/MenuOutlined';
import PointOfSale from '@mui/icons-material/PointOfSale';
import PointOfSaleOutlined from '@mui/icons-material/PointOfSaleOutlined';
import SignalCellularAlt from '@mui/icons-material/SignalCellularAlt';
import Wifi from '@mui/icons-material/Wifi';
import BatteryFull from '@mui/icons-material/BatteryFull';
import { md3, mobile } from '../../theme/tokens';
import { Stack } from '../components/Stack';
import type { MobileTab } from './navigation';
import { TABS, useMobileNav } from './navigation';

/**
 * Mobile chrome — the MD3 scaffolding every mobile screen is built from.
 *
 * Screens compose `MobileScreen` with one of the top bars and, optionally, a bottom
 * action bar. They never draw their own status bar, navigation bar or back button:
 * those come from here so every screen enters and exits the same way.
 */

// ─── Device frame ───────────────────────────────────────────────────────────

/**
 * The frame-level layer bottom sheets portal into. A sheet opened from a root screen has
 * to dim the navigation bar too, and the navigation bar lives outside the screen — so the
 * sheet can't render where it's declared.
 */
const SheetHost = createContext<HTMLElement | null>(null);

/** Android status bar — drawn inside the frame because MD3 apps are edge-to-edge. */
function StatusBar({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const color = tone === 'dark' ? '#fff' : md3.onSurface;
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ height: mobile.statusBarH, px: 3, color, flexShrink: 0, fontSize: 14, fontWeight: 500 }}
    >
      <span>9:41</span>
      <Stack direction="row" alignItems="center" gap={0.5}>
        <Wifi sx={{ fontSize: 16 }} />
        <SignalCellularAlt sx={{ fontSize: 16 }} />
        <BatteryFull sx={{ fontSize: 16, transform: 'rotate(90deg)' }} />
      </Stack>
    </Stack>
  );
}

/** The gesture-navigation handle at the very bottom of the screen. */
function GestureBar({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  return (
    <Box sx={{ height: mobile.gestureBarH, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
      <Box
        sx={{
          width: 108,
          height: 4,
          borderRadius: 2,
          bgcolor: tone === 'dark' ? 'rgba(255,255,255,.8)' : md3.onSurface,
          opacity: tone === 'dark' ? 1 : 0.4,
        }}
      />
    </Box>
  );
}

/**
 * The 402×797 phone. Fixed-size for the same reason the terminal is: these are drafts of
 * specific screens at a specific size, not a responsive layout.
 */
export function MobileFrame({
  children,
  statusTone = 'light',
  statusBg = md3.surface,
}: {
  children: ReactNode;
  statusTone?: 'light' | 'dark';
  statusBg?: string;
}) {
  const [sheetHost, setSheetHost] = useState<HTMLElement | null>(null);
  return (
    <Box
      sx={{
        width: mobile.frame.width,
        height: mobile.frame.height,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: statusBg,
        color: md3.onSurface,
        overflow: 'hidden',
        position: 'relative',
        transition: `background-color ${mobile.motion.push}ms ${mobile.motion.easing}`,
      }}
    >
      <StatusBar tone={statusTone} />
      <SheetHost.Provider value={sheetHost}>
        <Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>{children}</Box>
      </SheetHost.Provider>
      <GestureBar tone={statusTone} />
      <Box ref={setSheetHost} sx={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none' }} />
    </Box>
  );
}

// ─── Screen layout ──────────────────────────────────────────────────────────

/**
 * One screen: a top bar, a scrolling body, and an optional pinned bottom region.
 *
 * `fab` floats above the bottom region, bottom-right, per MD3.
 */
export function MobileScreen({
  topBar,
  children,
  bottomBar,
  fab,
  bg = md3.surface,
  bodySx,
}: {
  topBar?: ReactNode;
  children: ReactNode;
  bottomBar?: ReactNode;
  fab?: ReactNode;
  bg?: string;
  bodySx?: SxProps<Theme>;
}) {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: bg, position: 'relative' }}>
      {topBar}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', ...bodySx }}>
        {children}
      </Box>
      {fab && (
        <Box sx={{ position: 'absolute', right: 16, bottom: 16 + (bottomBar ? 80 : 0), zIndex: 2 }}>
          {fab}
        </Box>
      )}
      {bottomBar}
    </Box>
  );
}

// ─── Top app bars ───────────────────────────────────────────────────────────

/**
 * MD3 small top app bar.
 *
 * `leading="back"` pops the stack — use on pushed pages. Roots pass nothing, or a custom
 * node (a date chip, a menu button). `large` switches to the medium/large variant with the
 * title on its own line, for roots and summary pages where the heading is the content.
 */
export function TopAppBar({
  title,
  subtitle,
  leading = 'back',
  onBack,
  actions,
  large = false,
  bg = md3.surface,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  leading?: 'back' | 'none' | ReactNode;
  onBack?: () => void;
  actions?: ReactNode;
  large?: boolean;
  bg?: string;
  /** Rendered under the bar and inside its surface — tabs, a search field, filter chips. */
  children?: ReactNode;
}) {
  const nav = useMobileNav();
  const lead =
    leading === 'back' ? (
      <IconButton aria-label="Back" onClick={onBack ?? (() => nav.pop())} sx={{ color: md3.onSurface }}>
        <ArrowBack />
      </IconButton>
    ) : leading === 'none' ? null : (
      leading
    );

  return (
    <Box sx={{ bgcolor: bg, flexShrink: 0, zIndex: 1 }}>
      <Stack
        direction="row"
        alignItems="center"
        gap={0.5}
        sx={{ height: mobile.topAppBarH, px: 0.5, pl: lead ? 0.5 : 2 }}
      >
        {lead}
        {!large && (
          <Box sx={{ flex: 1, minWidth: 0, pl: lead ? 0.5 : 0 }}>
            <Typography variant="h5" noWrap sx={{ lineHeight: 1.2 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" noWrap component="div">
                {subtitle}
              </Typography>
            )}
          </Box>
        )}
        {large && <Box sx={{ flex: 1 }} />}
        {actions && (
          <Stack direction="row" alignItems="center" sx={{ flexShrink: 0 }}>
            {actions}
          </Stack>
        )}
      </Stack>
      {large && (
        <Box sx={{ px: 2, pb: 2.5 }}>
          <Typography variant="h3">{title}</Typography>
          {subtitle && (
            <Typography variant="body2" sx={{ color: md3.onSurfaceVariant, mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      )}
      {children}
    </Box>
  );
}

/**
 * MD3 full-screen dialog header: ✕, title, and one confirming text button.
 *
 * Closing pops the dialog. `onConfirm` does the work — dispatch, then usually `nav.pop()`.
 */
export function DialogTopBar({
  title,
  confirmLabel = 'Save',
  onConfirm,
  confirmDisabled,
  onClose,
}: {
  title: ReactNode;
  confirmLabel?: string;
  onConfirm?: () => void;
  confirmDisabled?: boolean;
  onClose?: () => void;
}) {
  const nav = useMobileNav();
  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={0.5}
      sx={{ height: mobile.topAppBarH, px: 0.5, flexShrink: 0, bgcolor: md3.surface }}
    >
      <IconButton aria-label="Close" onClick={onClose ?? (() => nav.pop())} sx={{ color: md3.onSurface }}>
        <Close />
      </IconButton>
      <Typography variant="h5" noWrap sx={{ flex: 1, minWidth: 0, pl: 0.5 }}>
        {title}
      </Typography>
      {onConfirm && (
        <Button variant="text" onClick={onConfirm} disabled={confirmDisabled} sx={{ mr: 1 }}>
          {confirmLabel}
        </Button>
      )}
    </Stack>
  );
}

// ─── Bottom regions ─────────────────────────────────────────────────────────

/**
 * Pinned action area for a pushed page — the primary action a thumb should reach
 * ("Check in", "Charge $84.00"). Full-width filled button, optional summary line above.
 */
export function BottomActionBar({ children, summary }: { children: ReactNode; summary?: ReactNode }) {
  return (
    <Box
      sx={{
        flexShrink: 0,
        px: 2,
        pt: 1.5,
        pb: 1.5,
        bgcolor: md3.surfaceContainer,
        borderTop: `1px solid ${md3.outlineVariant}`,
      }}
    >
      {summary && <Box sx={{ mb: 1.5 }}>{summary}</Box>}
      <Stack direction="row" gap={1}>
        {children}
      </Stack>
    </Box>
  );
}

const TAB_ICONS: Record<MobileTab, { on: typeof GolfCourse; off: typeof GolfCourse }> = {
  tee: { on: GolfCourse, off: GolfCourseOutlined },
  register: { on: PointOfSale, off: PointOfSaleOutlined },
  people: { on: Group, off: GroupOutlined },
  more: { on: Menu, off: MenuOutlined },
};

/**
 * MD3 navigation bar: four destinations, filled icon + pill indicator on the active one.
 * `badges` puts a count on a destination — the Register shows how many lines are on the
 * open order, so an order in progress is visible from anywhere.
 */
export function NavigationBar({ badges = {} }: { badges?: Partial<Record<MobileTab, number>> }) {
  const nav = useMobileNav();
  return (
    <Stack
      direction="row"
      component="nav"
      aria-label="Main"
      sx={{ height: mobile.navBarH, bgcolor: md3.surfaceContainer, flexShrink: 0 }}
    >
      {TABS.map((t) => {
        const active = nav.tab === t.id;
        const Ico = active ? TAB_ICONS[t.id].on : TAB_ICONS[t.id].off;
        const count = badges[t.id] ?? 0;
        return (
          <ButtonBase
            key={t.id}
            onClick={() => nav.selectTab(t.id)}
            aria-current={active ? 'page' : undefined}
            sx={{ flex: 1, flexDirection: 'column', gap: 0.5, pt: 1.5, pb: 2 }}
          >
            <Box
              sx={{
                width: 64,
                height: 32,
                borderRadius: 16,
                display: 'grid',
                placeItems: 'center',
                bgcolor: active ? mobile.secondaryContainer : 'transparent',
                color: active ? mobile.onSecondaryContainer : md3.onSurfaceVariant,
                transition: `background-color 200ms ${mobile.motion.easing}`,
              }}
            >
              <Badge badgeContent={count} color="error" invisible={!count}>
                <Ico />
              </Badge>
            </Box>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: active ? 700 : 500,
                letterSpacing: 0.5,
                color: active ? md3.onSurface : md3.onSurfaceVariant,
              }}
            >
              {t.label}
            </Typography>
          </ButtonBase>
        );
      })}
    </Stack>
  );
}

// ─── Bottom sheet ───────────────────────────────────────────────────────────

/**
 * MD3 modal bottom sheet, confined to the phone frame.
 *
 * Use it for short, contextual choices that don't deserve a screen: the actions on a
 * tee time, a sort order, "pay now or later". Anything with a form goes to a full-screen
 * dialog route instead. Not MUI's `Drawer`, because that portals to `document.body` and
 * would render outside the 402×797 frame.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
}) {
  const host = useContext(SheetHost);
  if (!open || !host) return null;
  return createPortal(
    <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}>
      <Box
        onClick={onClose}
        sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,.32)', animation: `${sheetFade} 200ms linear` }}
      />
      <Box
        role="dialog"
        aria-modal
        sx={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: '85%',
          overflowY: 'auto',
          bgcolor: mobile.surfaceContainerLow,
          borderRadius: '28px 28px 0 0',
          // Clears the gesture handle, which the sheet now covers.
          pb: `${16 + mobile.gestureBarH}px`,
          animation: `${sheetRise} ${mobile.motion.sheet}ms ${mobile.motion.emphasized}`,
        }}
      >
        <Box sx={{ display: 'grid', placeItems: 'center', height: 36 }}>
          <Box sx={{ width: 32, height: 4, borderRadius: 2, bgcolor: md3.outline, opacity: 0.4 }} />
        </Box>
        {title && (
          <Typography variant="h6" sx={{ px: 3, pb: 1 }}>
            {title}
          </Typography>
        )}
        {children}
      </Box>
    </Box>,
    host,
  );
}

const sheetFade = keyframes`from { opacity: 0; } to { opacity: 1; }`;
const sheetRise = keyframes`from { transform: translateY(100%); } to { transform: none; }`;
