import { useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { md3, radius } from '../../theme/tokens';
import { formatPhone, type Customer } from '../data/customers';
import { liveCustomer, liveRoster } from '../data/roster';
import { findCustomers, plainName } from '../logic/customer-search';
import { usePos } from '../state/PosProvider';
import { CustomerChipRow } from '../components/operations/CustomerChips';
import { Icon } from '../components/primitives';
import { Stack } from '../components/Stack';
import { Field, OutlineButton, ResultList, ResultRow } from './ModalFrame';

/**
 * Whose account — the first half of the house-account and card-on-file tenders (V1 → V2, Wave 3).
 *
 * Starts on whoever the order is for (`orderCustomerId`), so the usual case is already chosen and the
 * search is for the member signing for a guest. `note` is the tender's own line under each result —
 * the balance for a house account, the card for card on file — so the right person is picked on the
 * thing that matters to this tender, not just on a name.
 */
export function TenderCustomerPicker({
  customerId,
  onChange,
  note,
}: {
  customerId: string | null;
  onChange: (id: string | null) => void;
  note: (c: Customer) => string;
}) {
  const { state } = usePos();
  const [query, setQuery] = useState('');
  const roster = useMemo(() => liveRoster(state.customerEdits), [state.customerEdits]);
  const results = useMemo(() => findCustomers(query, roster, 6), [query, roster]);
  const chosen = liveCustomer(customerId ?? undefined, state.customerEdits);

  if (chosen) {
    return (
      <Stack
        data-tender-customer={chosen.id}
        direction="row"
        alignItems="center"
        gap={1.25}
        sx={{ p: '10px 10px 10px 14px', borderRadius: `${radius.md}px`, border: `1.5px solid ${md3.primary}`, bgcolor: md3.primaryContainer }}
      >
        <Icon name="person" size={18} color={md3.onPrimaryContainer} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" gap={0.75} sx={{ flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 14, fontWeight: 800, color: md3.onPrimaryContainer }}>{plainName(chosen)}</Typography>
            <CustomerChipRow customer={chosen} max={2} />
          </Stack>
          <Typography sx={{ fontSize: 11.5, color: md3.onPrimaryContainer }}>
            {[`ID ${chosen.id}`, formatPhone(chosen.phone)].filter(Boolean).join(' · ')}
          </Typography>
        </Box>
        <OutlineButton onClick={() => onChange(null)}>Change</OutlineButton>
      </Stack>
    );
  }

  return (
    <Box>
      <Field autoFocus value={query} onChange={setQuery} placeholder="Find the customer — name, email, phone" />
      {query.trim().length >= 2 && (
        <Box sx={{ mt: 1 }}>
          {results.length === 0 ? (
            <Typography sx={{ fontSize: 12.5, color: md3.onSurfaceVariant }}>Nobody matches “{query.trim()}”.</Typography>
          ) : (
            <ResultList maxHeight={240}>
              {results.map((c) => (
                <Box key={c.id} data-tender-result={c.id}>
                  <ResultRow primary={plainName(c)} secondary={note(c)} badge={c.memberships[0]?.name} badgeBg="#fef3c7" badgeColor="#92400e" onClick={() => {
                      // A fresh search next time Change is pressed, not the last one with more typed on the end.
                      setQuery('');
                      onChange(c.id);
                    }}
                  />
                </Box>
              ))}
            </ResultList>
          )}
        </Box>
      )}
    </Box>
  );
}
