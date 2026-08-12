import { useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { md3, payBadges } from '../../theme/tokens';
import { formatTimeLabel } from '../data/courses';
import * as cart from '../logic/cart';
import { usePos } from '../state/PosProvider';
import { MemberDot } from '../components/primitives';
import {
  Callout,
  Field,
  FilledButton,
  ModalFrame,
  ModalSection,
  OutlineButton,
  ResultList,
  ResultRow,
  SelectField,
} from './ModalFrame';
import { Stack } from '../components/Stack';

/** Ad-hoc line item for anything not in the catalog. */
export function OpenItem() {
  const { dispatch, toast } = usePos();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState(1);

  const add = () => {
    if (!name.trim()) return toast('Name the item');
    const p = parseFloat(price);
    if (Number.isNaN(p)) return toast('Enter a price');
    dispatch({ type: 'addRawItem', item: { name: name.trim(), price: p, qty } });
    dispatch({ type: 'closeModal' });
    toast(`Added: ${name.trim()}`);
  };

  return (
    <ModalFrame
      width={440}
      title="Open item"
      subtitle="Ring something that isn't in the catalog"
      icon="add_circle"
      actions={
        <>
          <OutlineButton onClick={() => dispatch({ type: 'closeModal' })}>Cancel</OutlineButton>
          <FilledButton onClick={add}>Add to order</FilledButton>
        </>
      }
    >
      <ModalSection title="Item">
        <Field autoFocus value={name} onChange={setName} placeholder="Range balls — large" />
      </ModalSection>
      <Stack direction="row" gap={1.5}>
        <Field
          label="Price"
          prefix="$"
          value={price}
          onChange={setPrice}
          type="number"
          hint="Use a negative amount for a credit"
        />
        <SelectField
          label="Quantity"
          value={qty}
          options={Array.from({ length: 20 }, (_, i) => ({ label: String(i + 1), value: i + 1 }))}
          onChange={setQty}
        />
      </Stack>
      {price !== '' && !Number.isNaN(parseFloat(price)) && (
        <Box sx={{ mt: 2 }}>
          <Callout tone="info">
            Line total {cart.money(parseFloat(price) * qty)}
            {parseFloat(price) < 0 ? ' — recorded as a discount' : ''}
          </Callout>
        </Box>
      )}
    </ModalFrame>
  );
}

/**
 * Generic confirmation for destructive actions.
 *
 * The action is carried as a string key rather than a callback so the whole modal
 * state stays serializable — which is what lets a Storybook story open any
 * confirmation by describing it in plain data.
 */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: string;
}) {
  const { state, dispatch, toast } = usePos();

  const run = () => {
    const [kind, arg] = onConfirm.split(':');

    if (kind === 'voidTeeTime') {
      if (state.selectedBookingId)
        dispatch({ type: 'deleteBookings', bookingIds: [state.selectedBookingId] });
      dispatch({ type: 'clearOrder' });
      toast('Tee time voided');
    } else if (kind === 'clearSelected') {
      dispatch({ type: 'deleteBookings', bookingIds: state.multiSelectIds });
      dispatch({ type: 'exitMultiSelect' });
      toast(`${state.multiSelectIds.length} tee times cleared`);
    } else if (kind === 'deleteBooking' && arg) {
      dispatch({ type: 'deleteBookings', bookingIds: [arg] });
      toast('Booking deleted');
    } else if (kind === 'clearTime' && arg) {
      const timeMin = Number(arg);
      const ids = state.bookings
        .filter(
          (b) =>
            b.timeMin === timeMin &&
            b.date ===
              `${state.currentDate.getFullYear()}-${String(state.currentDate.getMonth() + 1).padStart(2, '0')}-${String(state.currentDate.getDate()).padStart(2, '0')}`,
        )
        .map((b) => b.id);
      dispatch({ type: 'deleteBookings', bookingIds: ids });
      toast(`${formatTimeLabel(timeMin)} cleared · ${ids.length} removed`);
    } else if (kind === 'clearOrder') {
      dispatch({ type: 'clearOrder' });
      toast('Order cleared');
    }

    dispatch({ type: 'closeModal' });
  };

  return (
    <ModalFrame
      width={440}
      title={title}
      icon="warning"
      iconColor={md3.error}
      actions={
        <>
          <OutlineButton onClick={() => dispatch({ type: 'closeModal' })}>Cancel</OutlineButton>
          <FilledButton destructive onClick={run}>
            {confirmLabel}
          </FilledButton>
        </>
      }
    >
      <Typography sx={{ fontSize: 13, lineHeight: 1.55, color: md3.onSurfaceVariant }}>{body}</Typography>
    </ModalFrame>
  );
}

/** Search every booking in the demo window, not just the current day. */
export function TeeSheetSearch() {
  const { state, dispatch } = usePos();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return state.bookings
      .filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.conf.toLowerCase().includes(q) ||
          b.phone.includes(q),
      )
      .sort((a, b) => a.date.localeCompare(b.date) || a.timeMin - b.timeMin)
      .slice(0, 40);
  }, [query, state.bookings]);

  return (
    <ModalFrame
      width={560}
      tall
      title="Find a tee time"
      subtitle="Searches every day in the schedule"
      icon="search"
      actions={<OutlineButton onClick={() => dispatch({ type: 'closeModal' })}>Close</OutlineButton>}
    >
      <Field autoFocus value={query} onChange={setQuery} placeholder="Name, confirmation, or phone…" />
      <Box sx={{ mt: 1.25 }}>
        {query.trim() === '' ? (
          <Callout tone="info">
            Type at least part of a name or a confirmation code. Results span the whole schedule, so
            selecting one jumps the tee sheet to that date.
          </Callout>
        ) : results.length === 0 ? (
          <Callout tone="warning">Nothing matches "{query.trim()}".</Callout>
        ) : (
          <ResultList maxHeight={420}>
            {results.map((b) => {
              const course = state.courses.find((c) => c.id === b.course);
              const [y, m, d] = b.date.split('-').map(Number);
              const dateLabel = new Date(y, m - 1, d).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });
              return (
                <ResultRow
                  key={b.id}
                  primary={
                    <Stack direction="row" alignItems="center" gap={0.5}>
                      <MemberDot phone={b.phone} size={7} />
                      {b.name}
                    </Stack>
                  }
                  secondary={`${dateLabel} · ${formatTimeLabel(b.timeMin)} · ${course?.name} · ${b.conf} · ${b.players}P`}
                  badge={payBadges[b.pay]?.label ?? b.pay.toUpperCase()}
                  badgeColor={payBadges[b.pay]?.text}
                  badgeBg={payBadges[b.pay]?.bg}
                  onClick={() => {
                    dispatch({ type: 'setDate', date: new Date(y, m - 1, d) });
                    dispatch({ type: 'closeModal' });
                    dispatch({ type: 'loadBooking', bookingId: b.id });
                  }}
                />
              );
            })}
          </ResultList>
        )}
      </Box>
    </ModalFrame>
  );
}
