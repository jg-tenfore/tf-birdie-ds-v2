import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Box, ButtonBase, IconButton, InputBase, Typography } from '@mui/material';
import Close from '@mui/icons-material/Close';
import DirectionsWalk from '@mui/icons-material/DirectionsWalk';
import EventAvailable from '@mui/icons-material/EventAvailable';
import Search from '@mui/icons-material/Search';
import SearchOff from '@mui/icons-material/SearchOff';
import { md3, mobile, radius } from '../../../../theme/tokens';
import { ALL_ITEMS, CATALOG, CATEGORY_ICONS, CAT_ROWS } from '../../../data/catalog';
import { venue } from '../../../data/venues';
import { usePos } from '../../../state/PosProvider';
import { Icon } from '../../../components/primitives';
import { Stack } from '../../../components/Stack';
import { MobileScreen, TopAppBar } from '../../chrome';
import { useMobileNav } from '../../navigation';
import { Subheader, ViewOrderBar, categoryColors, isHoleLocked, priceLabel, titleCase, useAddItem } from './parts';

/**
 * Register — the destination root.
 *
 * The terminal's catalog without its left panel: a search bar, then every category as a
 * colour-coded card. Categories are *pushed*, not expanded inline, because on a phone the
 * item grid needs the whole screen and the back arrow is the cheapest way home.
 *
 * Before anything is on the order, the two ways an order starts on the terminal (walk-in,
 * reserve a tee time) sit above the grid as a pair of cards. Once the order has a line,
 * the "View order" bar takes over the bottom of the screen.
 */

// MODIFIERS isn't in the terminal's category rows (modifiers are reached from a player),
// but a phone has room to list it, so it follows CHECK IN where it belongs.
const CATEGORIES = [CAT_ROWS[0][0], 'MODIFIERS', ...CAT_ROWS[0].slice(1), ...CAT_ROWS[1]];

export function RegisterScreen() {
  const { state, dispatch } = usePos();
  const nav = useMobileNav();
  const { add, sheets, lock } = useAddItem();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return ALL_ITEMS.filter((i) => i.n.toLowerCase().includes(q)).slice(0, 20);
  }, [query]);

  const hasCheckIn = state.cart.some((i) => i.isCheckIn);
  const fresh = state.cart.length === 0 && !state.selectedBookingId;

  const start = (mode: 'walkin' | 'reserve') => {
    dispatch({ type: 'setFlowMode', mode });
    nav.push({ name: 'category', category: 'CHECK IN' });
  };

  return (
    <MobileScreen
      topBar={
        <TopAppBar title="Register" subtitle={venue(state.venueId).name} leading="none">
          <Box sx={{ px: 2, pb: 1.5 }}>
            <Stack
              direction="row"
              alignItems="center"
              gap={1}
              sx={{ height: 56, px: 2, borderRadius: `${radius.xl}px`, bgcolor: md3.surfaceHigh }}
            >
              <Search sx={{ color: md3.onSurfaceVariant }} />
              <InputBase
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search items"
                inputProps={{ 'aria-label': 'Search items' }}
                sx={{ flex: 1, fontSize: 16 }}
              />
              {query && (
                <IconButton aria-label="Clear search" onClick={() => setQuery('')} sx={{ mr: -1.5 }}>
                  <Close />
                </IconButton>
              )}
            </Stack>
          </Box>
        </TopAppBar>
      }
      bottomBar={<ViewOrderBar />}
    >
      {query.trim() ? (
        <SearchResults results={results} onPick={add} lock={lock} />
      ) : (
        <>
          {fresh && (
            <>
              <Subheader>Start an order</Subheader>
              <Stack direction="row" gap={1.5} sx={{ px: 2 }}>
                <StartCard
                  icon={<DirectionsWalk />}
                  label="Walk-in"
                  hint="Play now"
                  active={state.flowMode === 'walkin'}
                  onClick={() => start('walkin')}
                />
                <StartCard
                  icon={<EventAvailable />}
                  label="Reserve"
                  hint="Book a tee time"
                  active={state.flowMode === 'reserve'}
                  onClick={() => start('reserve')}
                />
              </Stack>
            </>
          )}
          <Subheader>Categories</Subheader>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, px: 2, pb: 2 }}>
            {CATEGORIES.map((cat) => {
              const c = categoryColors(cat);
              const dim = CATALOG[cat]?.isModifier && !hasCheckIn;
              return (
                <ButtonBase
                  key={cat}
                  onClick={() => nav.push({ name: 'category', category: cat })}
                  sx={{
                    height: 88,
                    p: 1.5,
                    borderRadius: `${radius.md}px`,
                    bgcolor: c.color,
                    color: c.tc,
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    textAlign: 'left',
                    opacity: dim ? 0.45 : 1,
                  }}
                >
                  <Icon name={CATEGORY_ICONS[cat] ?? 'sell'} size={24} />
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2, color: 'inherit' }}>
                      {titleCase(cat)}
                    </Typography>
                    <Typography sx={{ fontSize: 12, opacity: 0.8, color: 'inherit' }}>
                      {dim ? 'Needs a round' : `${CATALOG[cat]?.items.length ?? 0} items`}
                    </Typography>
                  </Box>
                </ButtonBase>
              );
            })}
          </Box>
        </>
      )}
      {sheets}
    </MobileScreen>
  );
}

function StartCard({
  icon,
  label,
  hint,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  hint: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        flex: 1,
        gap: 1.5,
        p: 1.5,
        minHeight: 64,
        justifyContent: 'flex-start',
        borderRadius: `${radius.md}px`,
        border: `1px solid ${active ? md3.primary : md3.outlineVariant}`,
        bgcolor: active ? md3.primaryContainer : md3.surface,
        color: active ? md3.onPrimaryContainer : md3.onSurface,
        textAlign: 'left',
      }}
    >
      <Box sx={{ color: active ? md3.primary : md3.onSurfaceVariant, display: 'flex' }}>{icon}</Box>
      <Box>
        <Typography variant="subtitle2">{label}</Typography>
        <Typography variant="caption">{hint}</Typography>
      </Box>
    </ButtonBase>
  );
}

/** MD3 search results: one-line list items with the category as a coloured leading dot. */
function SearchResults({
  results,
  onPick,
  lock,
}: {
  results: typeof ALL_ITEMS;
  onPick: (item: (typeof ALL_ITEMS)[number]) => void;
  lock: '9H' | '18H' | null;
}) {
  if (results.length === 0) {
    return (
      <Stack alignItems="center" gap={1} sx={{ pt: 8, color: md3.onSurfaceVariant }}>
        <SearchOff sx={{ fontSize: 40 }} />
        <Typography variant="body2">No items match</Typography>
      </Stack>
    );
  }
  return (
    <Box sx={{ py: 1 }}>
      {results.map((item) => {
        const c = categoryColors(item.cat);
        const locked = isHoleLocked(item, lock);
        return (
          <ButtonBase
            key={`${item.cat}-${item.n}`}
            onClick={() => onPick(item)}
            disabled={locked}
            sx={{
              width: '100%',
              justifyContent: 'flex-start',
              gap: 2,
              px: 2,
              minHeight: mobile.listItem.two,
              opacity: locked ? 0.4 : 1,
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: `${radius.sm}px`,
                bgcolor: c.color,
                color: c.tc,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <Icon name={CATEGORY_ICONS[item.cat] ?? 'sell'} size={20} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <Typography variant="body1" noWrap>
                {item.n}
              </Typography>
              <Typography variant="body2" sx={{ color: md3.onSurfaceVariant }}>
                {titleCase(item.cat)}
              </Typography>
            </Box>
            <Typography variant="subtitle2">{priceLabel(item)}</Typography>
          </ButtonBase>
        );
      })}
    </Box>
  );
}
