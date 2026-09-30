import { useState } from 'react';
import { Box, ButtonBase, InputBase, Typography } from '@mui/material';
import { md3, radius } from '../../../theme/tokens';
import { staffById } from '../../data/staff';
import { LOW_STOCK, STOCKED_CATEGORIES, STOCK_ITEMS, type InventoryCount, type StockedCategory } from '../../data/stock';
import { money } from '../../logic/cart';
import { shortDate } from '../../logic/staff-hours';
import { countSummary, stockLevel, type StockLevel } from '../../logic/stock-levels';
import { usePos } from '../../state/PosProvider';
import { EmptyState, Icon } from '../primitives';
import { Stack } from '../Stack';
import { OpsScreen, OpsToolbar } from './OpsToolbar';
import { DataTable, FilterChip, PanelHeading, Stat, Td, ToolbarPrimary, ToolbarSecondary } from './OpsParts';

/**
 * Inventory (V1 → V2, Wave 3) — what is on the shelf, and counting it.
 *
 * ## What v1 did
 *
 * `tf-birdie-ds-v1/app/src/screens/inventory.tsx`, from `references/072926/16-inventory/`: a list of
 * saved counts (titles like "78987", "test", "yeetus", with a product count and a date), a category
 * button in the bottom bar opening a dark sheet upward over the list, a new-count form, and a count
 * sheet of expected against actual per SKU.
 *
 * ## What was wrong with it
 *
 * There was **no stock** — only counts. The "expected" on a count sheet came from nowhere a person
 * could see, nothing linked it to what had been sold, and the saved counts carried no category, so
 * the category picker filtered nothing (v1's own note flags it). You could not answer "how many
 * Pro V1 sleeves do we have" without starting a count.
 *
 * ## What this does
 *
 * - **Live stock**: every retail item's level, by category, which sales take down and refunds put
 *   back. **Low** (at or under three) and **Out** are badged here and on the register's tiles, with
 *   a filter for each, so reordering starts from a list rather than a walk round the shop.
 * - **Counts per category**: start one, and the sheet lists that category's items with what the
 *   shelf should hold — a snapshot taken at the start, so a sale mid-count is not a miscount. Key what
 *   is there (or tap ✓ for "matches"); the variance shows per line and in total, in units and dollars.
 * - **Saving sets stock** to what was counted — only the counted lines. A saved count is read-only;
 *   a draft can be discarded.
 */
export function InventoryView() {
  const { state, dispatch } = usePos();
  const [tab, setTab] = useState<'stock' | 'counts'>('stock');
  const active = state.inventoryCounts.find((c) => c.id === state.activeCountId);
  const newCount = () => dispatch({ type: 'openModal', modal: { kind: 'countForm' } });

  if (active) return <CountSheet count={active} />;

  const drafts = state.inventoryCounts.filter((c) => c.status === 'draft').length;
  return (
    <OpsScreen data-inventory>
      <OpsToolbar title="Inventory" actions={<ToolbarPrimary icon="fact_check" label="New count" onClick={newCount} />}>
        <FilterChip label="Stock" active={tab === 'stock'} onClick={() => setTab('stock')} />
        <FilterChip label="Counts" active={tab === 'counts'} onClick={() => setTab('counts')} count={state.inventoryCounts.length || undefined} />
        {drafts > 0 && (
          <Typography sx={{ fontSize: 12, color: '#92400e', fontWeight: 700, ml: 0.5 }}>
            {drafts} draft{drafts === 1 ? '' : 's'} in progress
          </Typography>
        )}
      </OpsToolbar>
      {tab === 'stock' ? <StockList /> : <CountList onNew={newCount} />}
    </OpsScreen>
  );
}

// ─── Stock ─────────────────────────────────────────────────────────────────

const title = (c: string) => c[0] + c.slice(1).toLowerCase();

function StockList() {
  const { state } = usePos();
  const [category, setCategory] = useState<StockedCategory | null>(null);
  const [level, setLevel] = useState<'all' | 'low' | 'out'>('all');
  const [query, setQuery] = useState('');

  const qty = (name: string) => state.stock[name] ?? 0;
  const levels = STOCK_ITEMS.map((i) => stockLevel(qty(i.name)));
  const lowCount = levels.filter((l) => l === 'low').length;
  const outCount = levels.filter((l) => l === 'out').length;
  const units = STOCK_ITEMS.reduce((s, i) => s + qty(i.name), 0);
  const value = STOCK_ITEMS.reduce((s, i) => s + qty(i.name) * i.price, 0);

  const q = query.trim().toLowerCase();
  const shown = STOCK_ITEMS.filter((i) => !category || i.category === category)
    .filter((i) => level === 'all' || (level === 'low' ? stockLevel(qty(i.name)) !== 'ok' : stockLevel(qty(i.name)) === 'out'))
    .filter((i) => !q || i.name.toLowerCase().includes(q));

  return (
    <>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', p: '14px 18px', bgcolor: '#fff', borderBottom: `1px solid ${md3.outlineVariant}`, flexShrink: 0 }} data-stock-totals>
        <Stat label="Items stocked" value={String(STOCK_ITEMS.length)} sub={`${STOCKED_CATEGORIES.length} categories`} />
        <Stat label="On the shelf" value={`${units} units`} sub={`${money(value)} at retail`} />
        <Stat label="Low" value={String(lowCount)} sub={`${LOW_STOCK} or fewer left`} tone={lowCount ? 'warn' : undefined} />
        <Stat label="Out" value={String(outCount)} sub="Still sellable — the register flags them" tone={outCount ? 'bad' : undefined} />
      </Box>

      <Stack direction="row" gap={0.75} alignItems="center" sx={{ p: '10px 18px', flexShrink: 0, overflowX: 'auto' }}>
        <FilterChip label="All levels" active={level === 'all'} onClick={() => setLevel('all')} />
        <FilterChip label="Low & out" active={level === 'low'} onClick={() => setLevel('low')} count={lowCount + outCount} />
        <FilterChip label="Out" active={level === 'out'} onClick={() => setLevel('out')} count={outCount} />
        <Box sx={{ width: '1px', height: 28, bgcolor: md3.outlineVariant, mx: 0.5, flexShrink: 0 }} />
        <FilterChip label="All categories" active={!category} onClick={() => setCategory(null)} />
        {STOCKED_CATEGORIES.map((c) => (
          <FilterChip key={c} label={title(c)} active={category === c} onClick={() => setCategory(category === c ? null : c)} />
        ))}
        <Box sx={{ flex: 1 }} />
        <Stack direction="row" alignItems="center" sx={{ height: 40, px: 1.25, borderRadius: `${radius.xl}px`, border: `1.5px solid ${md3.outlineVariant}`, bgcolor: '#fff', width: 200, flexShrink: 0 }}>
          <Icon name="search" size={16} color={md3.outline} />
          <InputBase value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find an item" inputProps={{ 'aria-label': 'Find an item' }} sx={{ ml: 0.75, fontSize: 13, flex: 1 }} />
        </Stack>
      </Stack>

      <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pb: 2, minHeight: 0 }}>
        {shown.length === 0 ? (
          <EmptyState icon="inventory_2" label="Nothing matches — try another filter" sx={{ height: 'auto', py: 8 }} />
        ) : (
          <DataTable
            data-stock-table
            columns={[{ label: 'Item' }, { label: 'Category', width: 150 }, { label: 'Price', align: 'right', width: 100 }, { label: 'On the shelf', align: 'right', width: 130 }, { label: '', width: 90 }]}
          >
            {shown.map((i) => {
              const n = qty(i.name);
              return (
                <Box component="tr" key={i.name} data-stock-row={i.name} data-level={stockLevel(n)}>
                  <Td sx={{ fontWeight: 600 }}>{i.name}</Td>
                  <Td sx={{ color: md3.onSurfaceVariant }}>{title(i.category)}</Td>
                  <Td align="right">{money(i.price)}</Td>
                  <Td align="right" sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }} data-qty>
                    {n}
                  </Td>
                  <Td align="right">
                    <LevelBadge level={stockLevel(n)} />
                  </Td>
                </Box>
              );
            })}
          </DataTable>
        )}
      </Box>
    </>
  );
}

function LevelBadge({ level }: { level: StockLevel }) {
  if (level === 'ok') return null;
  const out = level === 'out';
  return (
    <Box
      component="span"
      data-level-badge={level}
      sx={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.04em', px: 1, py: '3px', borderRadius: `${radius.xl}px`, bgcolor: out ? '#ffdad6' : '#fef3c7', color: out ? md3.error : '#92400e' }}
    >
      {out ? 'OUT' : 'LOW'}
    </Box>
  );
}

// ─── Counts ────────────────────────────────────────────────────────────────

function CountList({ onNew }: { onNew: () => void }) {
  const { state, dispatch } = usePos();
  // Drafts first — they are the unfinished work — then newest.
  const counts = state.inventoryCounts.slice().reverse().sort((a, b) => (a.status === b.status ? 0 : a.status === 'draft' ? -1 : 1));
  if (counts.length === 0) {
    return (
      <Stack alignItems="center" justifyContent="center" gap={1.5} sx={{ flex: 1, color: md3.onSurfaceVariant }} data-no-counts>
        <Icon name="fact_check" size={38} color={md3.outline} />
        <Typography sx={{ fontSize: 14, fontWeight: 600 }}>No stock counts yet</Typography>
        <Typography sx={{ fontSize: 12.5, maxWidth: 420, textAlign: 'center', lineHeight: 1.5 }}>
          A count checks one category's shelf against what it should hold, and saving it corrects the stock.
        </Typography>
        <ToolbarPrimary icon="fact_check" label="Start a count" onClick={onNew} />
      </Stack>
    );
  }
  return (
    <Box sx={{ flex: 1, overflowY: 'auto', p: '14px 18px', minHeight: 0 }}>
      <DataTable
        data-count-list
        columns={[{ label: 'Count' }, { label: 'Category' }, { label: 'Started' }, { label: 'Counted', align: 'right' }, { label: 'Variance', align: 'right' }, { label: 'Status', align: 'right' }]}
      >
        {counts.map((c) => {
          const s = countSummary(c);
          return (
            <Box
              component="tr"
              key={c.id}
              data-count={c.id}
              data-count-status={c.status}
              onClick={() => dispatch({ type: 'setActiveCount', countId: c.id })}
              sx={{ cursor: 'pointer', '&:hover': { bgcolor: md3.surfaceContainer } }}
            >
              <Td sx={{ fontWeight: 700 }}>
                <ButtonBase onClick={() => dispatch({ type: 'setActiveCount', countId: c.id })} sx={{ fontSize: 13, fontWeight: 700, minHeight: 40, justifyContent: 'flex-start' }}>
                  {c.title}
                </ButtonBase>
              </Td>
              <Td>{title(c.category)}</Td>
              <Td sx={{ color: md3.onSurfaceVariant, whiteSpace: 'nowrap' }}>
                {shortDate(c.date)} · {staffById(c.staffId)?.short}
              </Td>
              <Td align="right">
                {s.counted} of {s.lines}
              </Td>
              <Td align="right" sx={{ fontWeight: 700, color: s.units < 0 ? md3.error : s.units > 0 ? '#92400e' : md3.onSurface }}>
                {signed(s.units)} · {money(s.value)}
              </Td>
              <Td align="right">
                <StatusBadge c={c} />
              </Td>
            </Box>
          );
        })}
      </DataTable>
    </Box>
  );
}

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

function StatusBadge({ c }: { c: InventoryCount }) {
  const draft = c.status === 'draft';
  return (
    <Box
      component="span"
      sx={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.04em', px: 1, py: '3px', borderRadius: `${radius.xl}px`, whiteSpace: 'nowrap', bgcolor: draft ? '#fef3c7' : '#dcfce7', color: draft ? '#92400e' : '#166534' }}
    >
      {draft ? 'DRAFT' : `SAVED ${c.savedAt ?? ''}`.trim()}
    </Box>
  );
}

function CountSheet({ count }: { count: InventoryCount }) {
  const { state, dispatch, toast } = usePos();
  const s = countSummary(count);
  const draft = count.status === 'draft';
  const back = () => dispatch({ type: 'setActiveCount', countId: null });
  const set = (name: string, counted: number | null) => dispatch({ type: 'setCounted', countId: count.id, name, counted });

  const save = () => {
    dispatch({ type: 'saveCount', countId: count.id });
    toast(`${count.title} saved · stock set for ${s.counted} item${s.counted === 1 ? '' : 's'}`);
  };
  const discard = () => {
    dispatch({ type: 'discardCount', countId: count.id });
    toast(`${count.title} discarded`);
  };

  return (
    <OpsScreen data-inventory data-count-sheet={count.id}>
      <OpsToolbar
        title="Inventory"
        actions={
          draft ? (
            <>
              <ToolbarSecondary icon="delete" label="Discard" onClick={discard} />
              <ToolbarPrimary icon="save" label={s.counted ? `Save ${s.counted} counted` : 'Save count'} onClick={save} disabled={s.counted === 0} />
            </>
          ) : undefined
        }
      >
        <ToolbarSecondary icon="arrow_back" label="All counts" onClick={back} />
        <Box sx={{ minWidth: 0, ml: 0.5 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{count.title}</Typography>
          <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant, whiteSpace: 'nowrap' }}>
            {title(count.category)} · started {shortDate(count.date)} by {staffById(count.staffId)?.short}
            {count.savedAt ? ` · saved ${count.savedAt}` : ''}
          </Typography>
        </Box>
        <StatusBadge c={count} />
      </OpsToolbar>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', p: '14px 18px', bgcolor: '#fff', borderBottom: `1px solid ${md3.outlineVariant}`, flexShrink: 0 }} data-count-summary>
        <Stat label="Counted" value={`${s.counted} of ${s.lines}`} sub={draft ? 'Uncounted items are left as they are' : 'Only these were set'} />
        <Stat label="Differ" value={String(s.differing)} sub="Lines not matching the shelf" tone={s.differing ? 'warn' : undefined} />
        <Stat label="Variance" value={`${signed(s.units)} unit${Math.abs(s.units) === 1 ? '' : 's'}`} sub="Counted minus expected" tone={s.units < 0 ? 'bad' : s.units > 0 ? 'warn' : undefined} />
        <Stat label="At retail" value={money(s.value)} sub={s.value < 0 ? 'Shrinkage' : s.value > 0 ? 'More than expected' : 'No difference'} tone={s.value < 0 ? 'bad' : undefined} />
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pb: 2, minHeight: 0 }}>
        <PanelHeading sx={{ mt: 1.5 }} aside={draft ? 'Expected is the shelf when the count began' : undefined}>
          {title(count.category)}
        </PanelHeading>
        <DataTable
          data-count-lines
          columns={[{ label: 'Item' }, { label: 'Expected', align: 'right', width: 100 }, { label: 'Counted', align: 'center', width: 220 }, { label: 'Variance', align: 'right', width: 100 }]}
        >
          {count.lines.map((l) => {
            const d = l.counted == null ? null : l.counted - l.expected;
            const now = state.stock[l.name] ?? 0;
            return (
              <Box component="tr" key={l.name} data-count-line={l.name}>
                <Td sx={{ fontWeight: 600 }}>
                  {l.name}
                  {draft && now !== l.expected && (
                    <Typography sx={{ fontSize: 11, color: md3.onSurfaceVariant }}>
                      {now < l.expected ? `${l.expected - now} sold since the count began` : `${now - l.expected} returned since the count began`}
                    </Typography>
                  )}
                </Td>
                <Td align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {l.expected}
                </Td>
                <Td align="center">
                  {draft ? <Counter name={l.name} value={l.counted} expected={l.expected} onChange={(v) => set(l.name, v)} /> : <b>{l.counted ?? '—'}</b>}
                </Td>
                <Td align="right" sx={{ fontWeight: 800, color: d == null ? md3.outline : d < 0 ? md3.error : d > 0 ? '#92400e' : '#166534' }} data-line-variance>
                  {d == null ? 'Not counted' : d === 0 ? 'Matches' : signed(d)}
                </Td>
              </Box>
            );
          })}
        </DataTable>
      </Box>
    </OpsScreen>
  );
}

/**
 * One line's count: − / field / + and a ✓ for "matches". Keyed or stepped — a shelf of twelve is
 * typed, a shelf of two is tapped — and empty means "not counted", never zero.
 */
function Counter({ name, value, expected, onChange }: { name: string; value: number | null; expected: number; onChange: (v: number | null) => void }) {
  const step = (d: number) => onChange(Math.max(0, (value ?? expected) + d));
  const btn = { width: 40, height: 40, borderRadius: `${radius.md}px`, border: `1.5px solid ${md3.outlineVariant}`, bgcolor: '#fff', flexShrink: 0 } as const;
  return (
    <Stack direction="row" gap={0.5} alignItems="center" justifyContent="center">
      <ButtonBase aria-label={`One fewer ${name}`} onClick={() => step(-1)} sx={btn}>
        <Icon name="remove" size={18} />
      </ButtonBase>
      <InputBase
        value={value == null ? '' : String(value)}
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, '');
          onChange(raw === '' ? null : Number(raw));
        }}
        placeholder="—"
        inputProps={{ inputMode: 'numeric', 'aria-label': `Counted ${name}`, style: { textAlign: 'center' } }}
        sx={{ width: 56, height: 40, border: `1.5px solid ${value == null ? md3.outlineVariant : md3.primary}`, borderRadius: `${radius.md}px`, fontSize: 15, fontWeight: 700, bgcolor: '#fff' }}
      />
      <ButtonBase aria-label={`One more ${name}`} onClick={() => step(1)} sx={btn}>
        <Icon name="add" size={18} />
      </ButtonBase>
      <ButtonBase
        aria-label={`${name} matches`}
        onClick={() => onChange(expected)}
        sx={{ ...btn, ...(value === expected && { bgcolor: md3.primaryContainer, borderColor: md3.primary }) }}
      >
        <Icon name="check" size={18} color={md3.primary} />
      </ButtonBase>
    </Stack>
  );
}
