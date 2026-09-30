import { Box } from '@mui/material';
import type { Customer, CustomerGiftCard } from '../../data/customers';
import { categoryLabels, customerChips } from '../../logic/customer-search';
import { md3, radius } from '../../../theme/tokens';
import { Stack } from '../Stack';

/**
 * The small marks Customer Search, Gift Cards and the account tenders share (V1 → V2, Wave 3).
 * One definition each, so a membership or a spent card looks the same on every screen that shows it.
 */

/** Amber, as the customer record's membership chips are — the rate-deciding thing. */
const MEMBER = { bg: '#fef3c7', fg: '#92400e' };

function Pill({ label, bg, fg, ...rest }: { label: string; bg: string; fg: string } & Record<`data-${string}`, string | undefined>) {
  return (
    <Box
      component="span"
      {...rest}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: '8px',
        py: '2px',
        borderRadius: 999,
        bgcolor: bg,
        color: fg,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        lineHeight: 1.5,
      }}
    >
      {label}
    </Box>
  );
}

/**
 * Memberships and customer types as chips, beside the name rather than inside it — v1 printed
 * "Weston Farnsworth - 30 Day booking window". `max` keeps a result row to one line; the rest
 * collapse into "+n".
 */
export function CustomerChipRow({ customer, max = 3 }: { customer: Pick<Customer, 'memberships' | 'customerTypes'>; max?: number }) {
  const chips = customerChips(customer);
  if (chips.length === 0) return null;
  const shown = chips.slice(0, max);
  const more = chips.length - shown.length;
  return (
    <Stack direction="row" gap={0.5} alignItems="center" sx={{ flexWrap: 'wrap' }} data-customer-chips>
      {shown.map((c) =>
        c.tone === 'member' ? (
          <Pill key={`m-${c.label}`} label={c.label} bg={MEMBER.bg} fg={MEMBER.fg} data-membership-chip={c.label} />
        ) : (
          <Pill key={`t-${c.label}`} label={c.label} bg={md3.surfaceContainer} fg={md3.onSurfaceVariant} />
        ),
      )}
      {more > 0 && <Pill label={`+${more}`} bg={md3.surfaceContainer} fg={md3.onSurfaceVariant} />}
    </Stack>
  );
}

/** A gift card with nothing left on it. v1 only dimmed the row, which reads as "disabled" as easily as "spent". */
export function SpentBadge() {
  return (
    <Box
      component="span"
      data-spent
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: '7px',
        py: '2px',
        borderRadius: `${radius.sm / 2}px`,
        bgcolor: md3.surfaceHighest,
        color: md3.onSurfaceVariant,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: '.4px',
        whiteSpace: 'nowrap',
      }}
    >
      SPENT
    </Box>
  );
}

/** What a card may pay for. Alcohol is the one people ask about, so it is marked when it is on. */
export function GoodForChips({ card }: { card: Pick<CustomerGiftCard, 'categories'> }) {
  return (
    <Stack direction="row" gap={0.5} sx={{ flexWrap: 'wrap' }} data-good-for>
      {categoryLabels(card).map((l) =>
        l === 'Alcohol' ? (
          <Pill key={l} label={l} bg="#ede9fe" fg="#6d28d9" />
        ) : (
          <Pill key={l} label={l} bg={md3.surfaceContainer} fg={md3.onSurfaceVariant} />
        ),
      )}
    </Stack>
  );
}
