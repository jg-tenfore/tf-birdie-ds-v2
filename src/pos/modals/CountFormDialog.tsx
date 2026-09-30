import { useState } from 'react';
import { Typography } from '@mui/material';
import { md3 } from '../../theme/tokens';
import { STOCKED_CATEGORIES, STOCK_ITEMS, type StockedCategory } from '../data/stock';
import type { OperationsModal } from '../state/operations';
import { usePos } from '../state/PosProvider';
import { Field, FilledButton, ModalFrame, ModalSection, OutlineButton, PillGroup } from './ModalFrame';

const title = (c: string) => c[0] + c.slice(1).toLowerCase();

/**
 * Start a stock count (V1 → V2, Wave 3).
 *
 * v1's "Inventory Count" form asked for a Product Category from a picker whose value was centred
 * across the screen while its label sat left, and a title — and then its saved counts carried no
 * category at all, so filtering the list by one did nothing. Here the category is the count: it
 * decides which lines the sheet has, and the title is optional (it defaults to the category and
 * the date). Starting takes a snapshot of what the shelf should hold, so a sale made mid-count shows
 * for what it is.
 */
export function CountFormDialog({ m }: { m: Extract<OperationsModal, { kind: 'countForm' }> }) {
  void m;
  const { dispatch, toast } = usePos();
  const [category, setCategory] = useState<StockedCategory>(STOCKED_CATEGORIES[0]);
  const [name, setName] = useState('');
  const lines = STOCK_ITEMS.filter((i) => i.category === category).length;

  const start = () => {
    dispatch({ type: 'startCount', category, title: name.trim() || undefined });
    dispatch({ type: 'closeModal' });
    toast(`Counting ${title(category)} · ${lines} items`);
  };

  return (
    <ModalFrame
      width={560}
      title="New stock count"
      subtitle="Count one category's shelf against what it should hold"
      icon="fact_check"
      actions={
        <>
          <OutlineButton onClick={() => dispatch({ type: 'closeModal' })}>Cancel</OutlineButton>
          <FilledButton onClick={start}>Start counting {lines} items</FilledButton>
        </>
      }
    >
      <ModalSection title="Category">
        <PillGroup value={category} options={STOCKED_CATEGORIES.map((c) => ({ label: title(c), value: c }))} onChange={setCategory} />
      </ModalSection>
      <ModalSection title="Title" hint="Optional">
        <Field value={name} onChange={setName} placeholder={`${title(category)} · today`} />
      </ModalSection>
      <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant, lineHeight: 1.5 }}>
        Saving the count sets each counted item's stock to what you found. Items you don't reach are left as they are.
      </Typography>
    </ModalFrame>
  );
}
