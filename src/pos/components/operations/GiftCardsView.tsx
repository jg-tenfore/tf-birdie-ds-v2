import { useMemo, useState } from 'react';
import { Box, ButtonBase, InputBase, Typography } from '@mui/material';
import { md3, radius } from '../../../theme/tokens';
import { money } from '../../logic/cart';
import { giftCardTotals, isSpent, searchGiftCards, withPlainHolders, type GiftCardListing } from '../../logic/customer-search';
import { allGiftCards } from '../../state/operations';
import { usePos } from '../../state/PosProvider';
import { ToolbarButton } from '../TeeSheetView';
import { Icon } from '../primitives';
import { Stack } from '../Stack';
import { GoodForChips, SpentBadge } from './CustomerChips';
import { OpsScreen, OpsToolbar } from './OpsToolbar';

type Filter = 'all' | 'balance' | 'spent';

/**
 * Gift Cards (V1 → V2, Wave 3) — every card the course has out, what is left on each, and what
 * each may pay for.
 *
 * ## What v1 did
 *
 * `tf-birdie-ds-v1/app/src/screens/gift-cards.tsx`, from `references/072926/14-giftcards/`: a search
 * field and a SEARCH button over eight equal columns — ID, customer, type, expiry, awarded, spent,
 * balance, UPC. The device opened on a bare canvas under the header band.
 *
 * ## What was wrong with it
 *
 * - **A spent card was a dimmer row**, nothing else — no badge, no column. At a glance it read as
 *   disabled or loading as easily as "nothing left".
 * - **It opened empty**, with no "no results" copy either, so an empty table and a missing one
 *   looked the same.
 * - **What a card could buy was nowhere on it.** The categories were chosen at sale and never shown
 *   again — and never enforced.
 *
 * ## What this does
 *
 * - **Opens on every card**, searched live by holder, card number or UPC — no SEARCH button.
 * - **A SPENT badge** on a card with nothing left, and a filter for them.
 * - **Good for**: each card's categories, alcohol marked when it is on. Checkout enforces them.
 * - **Totals** — cards out, what is outstanding, how many are spent.
 * - A card on the roster opens its holder's record; **Sell a gift card** goes to the register's
 *   gift-card dialog, which is where a card is sold — with the order it is paid on.
 */
export function GiftCardsView() {
  const { state, dispatch } = usePos();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const { customerEdits, issuedGiftCards } = state;

  const all = useMemo(
    () => withPlainHolders(allGiftCards({ customerEdits, issuedGiftCards }), customerEdits).sort((a, b) => a.holder.localeCompare(b.holder) || a.card.id.localeCompare(b.card.id)),
    [customerEdits, issuedGiftCards],
  );
  const matched = useMemo(() => searchGiftCards(query, all), [query, all]);
  const shown = matched.filter((x) => (filter === 'all' ? true : filter === 'spent' ? isSpent(x.card) : !isSpent(x.card)));
  const totals = giftCardTotals(matched);

  return (
    <OpsScreen data-gift-cards>
      <OpsToolbar
        title="Gift Cards"
        actions={
          <ToolbarButton
            icon="redeem"
            label="Sell a gift card"
            onClick={() => {
              dispatch({ type: 'setView', view: 'pos' });
              dispatch({ type: 'openModal', modal: { kind: 'giftCard' } });
            }}
          />
        }
      >
        <Stack
          direction="row"
          alignItems="center"
          gap={0.75}
          sx={{ width: 340, height: 40, px: 1.25, borderRadius: `${radius.xl}px`, border: `1.5px solid ${md3.outlineVariant}`, '&:focus-within': { borderColor: md3.primary } }}
        >
          <Icon name="search" size={16} color={md3.outline} />
          <InputBase
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Holder, card number or UPC"
            inputProps={{ 'aria-label': 'Search gift cards', 'data-gift-card-search': true }}
            sx={{ flex: 1, fontSize: 13 }}
          />
          {query && (
            <ButtonBase aria-label="Clear search" onClick={() => setQuery('')} sx={{ p: 0.25, borderRadius: '50%' }}>
              <Icon name="close" size={15} color={md3.outline} />
            </ButtonBase>
          )}
        </Stack>
        {(
          [
            ['all', 'All'],
            ['balance', 'Has a balance'],
            ['spent', 'Spent'],
          ] as const
        ).map(([f, label]) => (
          <FilterChip key={f} active={filter === f} onClick={() => setFilter(f)} label={label} data-gift-filter={f} />
        ))}
      </OpsToolbar>

      <Box
        data-gift-totals
        sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', p: '14px 18px', borderBottom: `1px solid ${md3.outlineVariant}`, bgcolor: '#fff', flexShrink: 0 }}
      >
        <Stat label="Cards" value={String(totals.cards)} />
        <Stat label="Outstanding" value={money(totals.outstanding)} strong sub="what the course still owes on them" />
        <Stat label="Awarded" value={money(totals.awarded)} />
        <Stat label="Spent" value={String(totals.spent)} sub="nothing left on them" />
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pb: 2 }}>
        {shown.length === 0 ? (
          <Stack alignItems="center" gap={1} sx={{ py: 8, color: md3.onSurfaceVariant }} data-no-gift-cards>
            <Icon name="card_giftcard" size={36} />
            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{query.trim() ? `No card matches “${query.trim()}”` : 'No cards here'}</Typography>
            <Typography sx={{ fontSize: 12.5 }}>Try the holder’s last name, or the number on the back of the card.</Typography>
          </Stack>
        ) : (
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
            <Box component="thead">
              <Box component="tr">
                {['Card', 'Holder', 'Type', 'Good for', 'Expires', 'Awarded', 'Spent', 'Balance'].map((h, i) => (
                  <Box
                    component="th"
                    key={h}
                    sx={{
                      textAlign: i >= 5 ? 'right' : 'left',
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: '.04em',
                      color: md3.onSurfaceVariant,
                      textTransform: 'uppercase',
                      p: '10px 8px 8px',
                      borderBottom: `1px solid ${md3.outlineVariant}`,
                      position: 'sticky',
                      top: 0,
                      bgcolor: md3.surface,
                      zIndex: 1,
                    }}
                  >
                    {h}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {shown.map((x) => (
                <CardRow key={x.card.id} x={x} onOpen={x.customerId ? () => dispatch({ type: 'openCustomerModal', customerId: x.customerId! }) : undefined} />
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </OpsScreen>
  );
}

function CardRow({ x, onOpen }: { x: GiftCardListing; onOpen?: () => void }) {
  const spent = isSpent(x.card);
  const td = { p: '10px 8px', fontSize: 13, borderBottom: `1px solid ${md3.outlineVariant}`, color: spent ? md3.onSurfaceVariant : md3.onSurface } as const;
  return (
    <Box
      component="tr"
      data-gift-card-row={x.card.id}
      onClick={onOpen}
      sx={{ cursor: onOpen ? 'pointer' : 'default', bgcolor: '#fff', '&:hover': { bgcolor: onOpen ? md3.surface : '#fff' } }}
    >
      <Box component="td" sx={{ ...td, whiteSpace: 'nowrap' }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>#{x.card.id}</Typography>
        {x.card.upc && <Typography sx={{ fontSize: 10.5, color: md3.onSurfaceVariant }}>UPC {x.card.upc}</Typography>}
      </Box>
      <Box component="td" sx={td}>
        {x.holder}
        {!x.customerId && <Typography sx={{ fontSize: 10.5, color: md3.onSurfaceVariant }}>Not on the roster</Typography>}
      </Box>
      <Box component="td" sx={td}>
        {x.card.type}
      </Box>
      <Box component="td" sx={td}>
        <GoodForChips card={x.card} />
      </Box>
      <Box component="td" sx={{ ...td, whiteSpace: 'nowrap' }}>
        {x.card.expires}
      </Box>
      <Box component="td" sx={{ ...td, textAlign: 'right' }}>
        {money(x.card.awarded)}
      </Box>
      <Box component="td" sx={{ ...td, textAlign: 'right' }}>
        {money(x.card.spent)}
      </Box>
      <Box component="td" sx={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
        <Stack direction="row" alignItems="center" justifyContent="flex-end" gap={0.75}>
          {spent && <SpentBadge />}
          <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: spent ? md3.outline : md3.onSurface }}>{money(x.card.balance)}</Typography>
        </Stack>
      </Box>
    </Box>
  );
}

function Stat({ label, value, sub, strong }: { label: string; value: string; sub?: string; strong?: boolean }) {
  return (
    <Box data-stat={label} sx={{ p: '10px 12px', borderRadius: `${radius.md}px`, bgcolor: strong ? md3.primaryContainer : md3.surfaceContainer }}>
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: md3.onSurfaceVariant }}>{label}</Typography>
      <Typography sx={{ fontSize: 18, fontWeight: 800, color: strong ? md3.onPrimaryContainer : md3.onSurface }}>{value}</Typography>
      {sub && <Typography sx={{ fontSize: 10.5, color: md3.onSurfaceVariant }}>{sub}</Typography>}
    </Box>
  );
}

function FilterChip({ label, active, onClick, ...rest }: { label: string; active: boolean; onClick: () => void } & Record<`data-${string}`, string>) {
  return (
    <ButtonBase
      {...rest}
      onClick={onClick}
      aria-pressed={active}
      sx={{
        height: 40,
        px: 1.75,
        borderRadius: `${radius.xl}px`,
        border: `1.5px solid ${active ? md3.primary : md3.outlineVariant}`,
        bgcolor: active ? md3.primaryContainer : '#fff',
        color: active ? md3.onPrimaryContainer : md3.onSurface,
        fontSize: 12.5,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </ButtonBase>
  );
}
