import { useEffect } from 'react';
import { keyframes } from '@emotion/react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { md3, radius, reservationPanel } from '../../theme/tokens';
import { APP_IDENTITY, NAV_GROUPS, type NavItem, type NavKey } from '../data/nav';
import { usePos } from '../state/PosProvider';
import { Icon } from './primitives';
import { Stack } from './Stack';

/**
 * The main navigation, as a full-screen sheet.
 *
 * ## Why a sheet and not a drawer
 *
 * Weston, fifth call: *"we still need a main nav… I actually don't hate this to be the main
 * nav. But it can't expand the nav and do the cart. So I don't know how we do that."* The
 * order rail's hamburger expanded the rail, so making that same strip the nav gave one control
 * two different expansions. Splitting them is the whole fix: the hamburger now opens this, and
 * the rail is expanded by tapping the strip. Neither gesture can be mistaken for the other.
 *
 * The layout follows the reference Justin supplied — sectioned tiles on a light canvas,
 * facility top left, account actions top right — rather than v1's vertical list. Nineteen
 * destinations in a list is a scroll; in a four-column grid it is one screen, and a counter
 * hunting for "Table Chart" reads it at a glance.
 *
 * ## Why most of it is dimmed
 *
 * Four destinations exist in this prototype. The other fourteen are dimmed and unclickable,
 * which Weston chose over placeholder screens: a nav that opens fourteen "not built yet" pages
 * teaches people to distrust it. `live` in `data/nav.ts` is the only thing that decides this,
 * so a destination becomes real by being wired, not by being remembered.
 *
 * Built like `TeeSheetSidebar`: a sibling positioned against `PosShell`, not an MUI `Modal`.
 * A portal would escape the terminal frame and put the app inside an `aria-hidden` subtree.
 */
const fadeIn = keyframes`from { opacity: 0 } to { opacity: 1 }`;

export function NavOverlay() {
  const { state, dispatch, toast } = usePos();
  const close = () => dispatch({ type: 'setNavOpen', open: false });

  useEffect(() => {
    if (!state.navOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dispatch({ type: 'setNavOpen', open: false });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.navOpen, dispatch]);

  if (!state.navOpen) return null;

  const go = (key: NavKey) => {
    switch (key) {
      case 'teesheet':
        dispatch({ type: 'setView', view: 'tee' });
        return close();
      case 'proshop':
        dispatch({ type: 'setView', view: 'pos' });
        return close();
      case 'customersearch':
        dispatch({ type: 'openModal', modal: { kind: 'golferSearch', target: 'primary' } });
        return close();
      case 'settings':
        // The tee sheet owns the settings panel, so arrive there first.
        dispatch({ type: 'setView', view: 'tee' });
        return dispatch({ type: 'setTeeSheetSettings', open: true });
      default:
        return;
    }
  };

  return (
    <Box
      role="dialog"
      aria-modal="true"
      aria-label="Main navigation"
      data-nav-overlay
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 120,
        bgcolor: md3.surfaceContainer,
        display: 'flex',
        flexDirection: 'column',
        animation: `${fadeIn} ${reservationPanel.motion}`,
      }}
    >
      {/* Facility left, account actions right — the reference's header, and the two things
          a shared terminal needs on screen when someone is deciding where to go. */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 3, py: 2, flexShrink: 0 }}
      >
        <Box>
          <Typography sx={{ fontSize: 15, fontWeight: 700, color: md3.onSurface }}>
            {APP_IDENTITY.facility}
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant }}>
            {APP_IDENTITY.product} · {APP_IDENTITY.version} · {APP_IDENTITY.device}
          </Typography>
        </Box>
        <Stack direction="row" gap={1} alignItems="center">
          <HeaderAction icon="switch_account" label="Switch user" onClick={() => toast('Switch user')} />
          <HeaderAction icon="logout" label="Log Out" onClick={() => toast('Logged out')} />
          <ButtonBase
            aria-label="Close navigation"
            onClick={close}
            sx={{
              width: 40,
              height: 40,
              ml: 0.5,
              borderRadius: `${radius.sm}px`,
              color: md3.onSurfaceVariant,
            }}
          >
            <Icon name="close" size={22} />
          </ButtonBase>
        </Stack>
      </Stack>

      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, pb: 3 }}>
        {NAV_GROUPS.map((group, i) => (
          <Box key={group.heading ?? `group-${i}`} sx={{ mb: 3 }}>
            {/* The last block has no heading in the shipping app, so it has none here. */}
            <Typography
              sx={{
                fontSize: 19,
                fontWeight: 700,
                color: md3.onSurface,
                mb: 1,
                // Keeps the first tile row of an unheaded group level with a headed one.
                minHeight: group.heading ? 'auto' : 0,
              }}
            >
              {group.heading ?? ''}
            </Typography>
            <Box
              sx={{
                borderTop: `1px solid ${md3.outlineVariant}`,
                pt: 1.5,
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '12px',
              }}
            >
              {group.items.map((item) => (
                <NavTile key={item.key} item={item} onClick={() => go(item.key)} />
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function HeaderAction({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        gap: 0.75,
        px: 1.5,
        height: 40,
        borderRadius: `${radius.sm}px`,
        fontSize: 13.5,
        fontWeight: 600,
        color: md3.onSurfaceVariant,
      }}
    >
      <Icon name={icon} size={18} />
      {label}
    </ButtonBase>
  );
}

/**
 * One destination.
 *
 * A dimmed tile is `disabled` rather than merely faded, so it is skipped by the keyboard and
 * announced as unavailable instead of looking tappable to everyone except a mouse.
 */
function NavTile({ item, onClick }: { item: NavItem; onClick: () => void }) {
  const live = Boolean(item.live);
  return (
    <ButtonBase
      disabled={!live}
      onClick={onClick}
      data-nav-key={item.key}
      aria-label={live ? item.label : `${item.label} — not built yet`}
      sx={{
        flexDirection: 'column',
        gap: 0.75,
        height: 96,
        borderRadius: `${radius.md}px`,
        border: `1px solid ${md3.outlineVariant}`,
        bgcolor: live ? md3.onPrimary : 'transparent',
        color: live ? md3.onSurface : md3.outline,
        opacity: live ? 1 : 0.45,
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      <Icon name={item.icon} size={24} />
      {item.label}
    </ButtonBase>
  );
}
