import { useMemo, useState } from 'react';
import { Box, ButtonBase, InputBase, Paper, Popper, Typography } from '@mui/material';
import { elevation, grid, md3, radius } from '../../theme/tokens';
import { ALL_ITEMS, CATALOG, CAT_ROWS, CHECK_IN_ITEMS, MEMBER_ITEM_TYPES } from '../data/catalog';
import * as cart from '../logic/cart';
import { usePos } from '../state/PosProvider';
import type { CatalogItem } from '../types';
import { EmptyState, Icon, SectionLabel } from './primitives';
import { Stack } from './Stack';

/**
 * The POS catalog: search, colored category buttons, and the item grid.
 *
 * Categories are the primary navigation and they're colour-coded rather than
 * labelled by icon, because staff learn the grid by position and hue. Each
 * category's items inherit a 13%-alpha wash of that colour, so the grid stays
 * visually tied to the button that opened it.
 */
export function PosView() {
  const { state, dispatch, toast } = usePos();
  const holesLock = cart.cartHolesLock(state.cart);
  const hasCheckIn = state.cart.some((i) => i.isCheckIn);

  /**
   * Route an item tap.
   *
   * Two kinds need interception before they can be priced: modifiers must target a
   * specific player, and member rates need a validated CRM lookup first.
   */
  const handleAdd = (item: CatalogItem) => {
    if (cart.isModifierItem(item.n)) {
      const itemIdx = state.cart.findIndex((i) => i.isCheckIn);
      if (itemIdx === -1) return toast('Add a round before applying a modifier');
      return dispatch({
        type: 'openModal',
        modal: { kind: 'playerModifier', itemIdx, playerIdx: 0 },
      });
    }
    if (MEMBER_ITEM_TYPES[item.n]) {
      return dispatch({
        type: 'openModal',
        modal: {
          kind: 'memberLookup',
          itemName: item.n,
          requiredType: MEMBER_ITEM_TYPES[item.n],
        },
      });
    }
    dispatch({ type: 'addItem', name: item.n, price: item.p });
    toast(`Added: ${item.n}`);
  };

  return (
    <Stack sx={{ flex: 1, minWidth: 0, height: '100%' }}>
      <PosTopBar />
      <SearchRow onPick={handleAdd} />

      {/* ── Category buttons ── */}
      <Box
        sx={{
          p: '10px 18px 8px',
          bgcolor: md3.surface,
          flexShrink: 0,
          borderBottom: `1px solid ${md3.outlineVariant}`,
        }}
      >
        {CAT_ROWS.map((row, ri) => (
          <Box
            key={ri}
            sx={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(row.length, 5)},1fr)`,
              gap: '7px',
              mb: ri === CAT_ROWS.length - 1 ? 0 : '5px',
            }}
          >
            {row.slice(0, 5).map((catName) => {
              const d = CATALOG[catName];
              const active = state.currentCategory === catName;
              return (
                <ButtonBase
                  key={catName}
                  onClick={() =>
                    dispatch({ type: 'setCategory', category: active ? null : catName })
                  }
                  sx={{
                    height: 66,
                    borderRadius: `${radius.md}px`,
                    bgcolor: d.color,
                    color: d.tc,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '.6px',
                    textTransform: 'uppercase',
                    alignItems: 'flex-end',
                    justifyContent: 'flex-start',
                    textAlign: 'left',
                    p: '9px 10px',
                    lineHeight: 1.2,
                    boxShadow: elevation.e1,
                    transition: 'all .13s',
                    ...(active
                      ? {
                          outline: '3px solid rgba(0,0,0,.5)',
                          outlineOffset: '-2px',
                          filter: 'brightness(.9)',
                        }
                      : {
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: elevation.e3,
                            filter: 'brightness(1.06)',
                          },
                        }),
                  }}
                >
                  {catName}
                </ButtonBase>
              );
            })}
            {/* Keep the 5-column rhythm when a row is short. */}
            {row.length < 5 &&
              ri === 0 &&
              Array.from({ length: 5 - row.length }, (_, i) => <Box key={`pad${i}`} />)}
          </Box>
        ))}
      </Box>

      {/* ── Item grid ── */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: '12px 18px 18px', minHeight: 0 }}>
        {!state.currentCategory ? (
          <EmptyState icon="sports_golf" label="Select a category" />
        ) : (
          <ItemGrid
            categoryName={state.currentCategory}
            holesLock={holesLock}
            hasCheckIn={hasCheckIn}
            onAdd={handleAdd}
          />
        )}
      </Box>
    </Stack>
  );
}

// ─── Top bar ────────────────────────────────────────────────────────────────

/** Registers label on the left, view switch and open-item on the right. */
function PosTopBar() {
  const { state, dispatch } = usePos();
  return (
    <Stack
      direction="row"
      alignItems="center"
      sx={{
        px: 1.75,
        height: grid.topbarH,
        borderBottom: `1px solid ${md3.outlineVariant}`,
        bgcolor: '#fff',
        flexShrink: 0,
      }}
    >
      <Typography sx={{ fontSize: 14, fontWeight: 700, flex: 1 }}>Pro Shop · Register 1</Typography>
      <Stack direction="row" alignItems="center" gap={0.75}>
        <SwitchButton
          icon="add_circle"
          onClick={() => dispatch({ type: 'openModal', modal: { kind: 'openItem' } })}
        >
          Open item
        </SwitchButton>
        <SwitchButton
          primary
          icon="golf_course"
          onClick={() => dispatch({ type: 'setView', view: 'tee' })}
        >
          Tee sheet
        </SwitchButton>
      </Stack>
      {/* `state` is read so the switch reflects the live view in Storybook stories. */}
      <Box sx={{ display: 'none' }}>{state.view}</Box>
    </Stack>
  );
}

/** The pill button used in both top bars. `primary` gives it the dark fill. */
export function SwitchButton({
  children,
  icon,
  primary,
  onClick,
}: {
  children: React.ReactNode;
  icon?: string;
  primary?: boolean;
  onClick?: () => void;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        gap: 0.75,
        px: 1.75,
        py: 0.875,
        borderRadius: `${radius.xl}px`,
        border: `1.5px solid ${primary ? md3.scrim : md3.outlineVariant}`,
        bgcolor: primary ? md3.scrim : 'transparent',
        color: primary ? '#fff' : md3.onSurfaceVariant,
        fontSize: 13,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        transition: 'all .13s',
        '&:hover': { bgcolor: primary ? '#2d302d' : md3.surfaceContainer },
      }}
    >
      {icon && <Icon name={icon} size={16} />}
      {children}
    </ButtonBase>
  );
}

// ─── Search ─────────────────────────────────────────────────────────────────

/** Type-ahead across the whole catalog; the top eight matches are offered. */
function SearchRow({ onPick }: { onPick: (item: CatalogItem) => void }) {
  const [query, setQuery] = useState('');
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return ALL_ITEMS.filter((i) => i.n.toLowerCase().includes(q)).slice(0, 8);
  }, [query]);

  return (
    <Stack direction="row" alignItems="center" gap={1.25} sx={{ p: '10px 18px', flexShrink: 0 }}>
      <Box ref={setAnchor} sx={{ flex: 1, position: 'relative' }}>
        <Icon
          name="search"
          size={20}
          color={md3.outline}
          sx={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }}
        />
        <InputBase
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search items…"
          sx={{
            width: '100%',
            pl: '42px',
            pr: 1.75,
            py: '11px',
            borderRadius: `${radius.xl}px`,
            border: `1.5px solid ${md3.outlineVariant}`,
            bgcolor: md3.surfaceContainer,
            fontSize: 14,
            transition: 'all .13s',
            '&.Mui-focused': {
              borderColor: md3.primary,
              bgcolor: '#fff',
              boxShadow: `0 0 0 3px rgba(23,163,74,.1)`,
            },
          }}
        />
        <Popper
          open={results.length > 0}
          anchorEl={anchor}
          placement="bottom-start"
          sx={{ zIndex: 100, width: anchor?.clientWidth }}
        >
          <Paper
            sx={{
              mt: '3px',
              border: `1.5px solid ${md3.outlineVariant}`,
              borderRadius: `${radius.md}px`,
              boxShadow: elevation.e3,
              overflow: 'hidden',
            }}
          >
            {results.map((item) => (
              <Stack
                key={`${item.cat}-${item.n}`}
                direction="row"
                alignItems="center"
                gap={1.25}
                onClick={() => {
                  onPick(item);
                  setQuery('');
                }}
                sx={{
                  p: '11px 14px',
                  cursor: 'pointer',
                  fontSize: 13,
                  borderBottom: `1px solid ${md3.surfaceContainer}`,
                  '&:last-of-type': { borderBottom: 'none' },
                  '&:hover': { bgcolor: md3.surfaceContainer },
                }}
              >
                <Box sx={{ flex: 1 }}>{item.n}</Box>
                <Typography sx={{ fontSize: 10, color: md3.outline }}>{item.cat}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: md3.primary }}>
                  {cart.money(item.p)}
                </Typography>
              </Stack>
            ))}
          </Paper>
        </Popper>
      </Box>
    </Stack>
  );
}

// ─── Item grid ──────────────────────────────────────────────────────────────

/** `#rrggbb` → `rgba(r,g,b,a)`, so a category colour can wash its item tiles. */
export function hexRgba(hex: string, a: number): string {
  let h = hex.replace('#', '');
  if (h.length === 3)
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function ItemGrid({
  categoryName,
  holesLock,
  hasCheckIn,
  onAdd,
}: {
  categoryName: string;
  holesLock: '9H' | '18H' | null;
  hasCheckIn: boolean;
  onAdd: (item: CatalogItem) => void;
}) {
  const d = CATALOG[categoryName];
  if (!d) return null;

  const bg = hexRgba(d.color, 0.13);
  const border = hexRgba(d.color, 0.3);
  // Near-black categories would render their label invisibly, so they keep the
  // literal colour rather than a derived tint.
  const labelColor = d.color === md3.scrim ? md3.scrim : d.color;

  return (
    <>
      <SectionLabel color={labelColor} rule sx={{ mb: 1 }}>
        {categoryName}
        <Box component="span" sx={{ fontWeight: 400, opacity: 0.6, fontSize: 9, textTransform: 'none', letterSpacing: 0 }}>
          {d.items.length} items
        </Box>
      </SectionLabel>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '7px' }}>
        {d.items.map((item) => {
          // A round already on the order locks the hole count, so mixed 9/18
          // rates on one tee time are impossible rather than merely discouraged.
          let locked = false;
          if (holesLock && CHECK_IN_ITEMS.has(item.n)) {
            const is18 = item.n.includes('18');
            const is9 = item.n.includes('9');
            if (holesLock === '9H' && is18) locked = true;
            if (holesLock === '18H' && is9) locked = true;
          }
          // Modifiers are meaningless without a round to attach them to.
          const dimmed = d.isModifier ? !hasCheckIn : locked;

          return (
            <ItemTile
              key={item.n}
              item={item}
              bg={dimmed && locked ? md3.surfaceContainer : bg}
              border={dimmed && locked ? md3.outlineVariant : border}
              isModifier={Boolean(d.isModifier)}
              disabled={dimmed}
              onClick={() => onAdd(item)}
            />
          );
        })}
      </Box>
    </>
  );
}

function ItemTile({
  item,
  bg,
  border,
  isModifier,
  disabled,
  onClick,
}: {
  item: CatalogItem;
  bg: string;
  border: string;
  isModifier: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const priceLabel = item.isDiscount
    ? `−$${Math.abs(item.p).toFixed(2)}`
    : item.isOverride || item.p === 0
      ? 'Free'
      : item.p < 0
        ? `-$${Math.abs(item.p).toFixed(2)}`
        : `$${item.p.toFixed(2)}`;
  const priceColor = item.p < 0 || item.isDiscount ? '#c0392b' : item.p === 0 ? md3.outline : 'inherit';

  return (
    <ButtonBase
      disabled={disabled}
      onClick={onClick}
      sx={{
        position: 'relative',
        minHeight: 64,
        pt: isModifier ? '28px' : '10px',
        pb: '10px',
        px: 1,
        borderRadius: `${radius.md}px`,
        border: `1.5px solid ${border}`,
        bgcolor: bg,
        boxShadow: elevation.e1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.5,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '.4px',
        textTransform: 'uppercase',
        color: md3.onSurface,
        textAlign: 'center',
        lineHeight: 1.3,
        transition: 'all .12s',
        '&:hover': { transform: 'translateY(-1px)', filter: 'brightness(.94)' },
        '&.Mui-disabled': { opacity: disabled ? 0.4 : 1, color: md3.outline },
      }}
    >
      {isModifier && item.tag && (
        <Box
          component="span"
          sx={{
            position: 'absolute',
            top: 7,
            left: '50%',
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
            px: 1,
            py: '2px',
            borderRadius: '3px',
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: '.5px',
            bgcolor: item.tagColor,
            color: '#fff',
          }}
        >
          {item.tag}
        </Box>
      )}
      <Box component="span" sx={{ fontSize: isModifier ? 11 : 10, fontWeight: isModifier ? 600 : 700 }}>
        {item.n}
      </Box>
      <Box component="span" sx={{ fontSize: 10, fontWeight: 500, opacity: 0.72, color: priceColor }}>
        {priceLabel}
      </Box>
    </ButtonBase>
  );
}
