import { useState } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { md3, payBadges, radius } from '../../theme/tokens';
import { ROUND_STEPS, roundStepOf } from '../data/config';
import type { Customer } from '../data/customers';
import { Icon } from './primitives';
import { Stack } from './Stack';

/**
 * Two chips for a reservation's player row (V1 → V2, 100126 → 100226).
 */

// ─── Where they are in the round ────────────────────────────────────────────

/**
 * Where the player is in the round, as one chip that opens to change it.
 *
 * It replaces the five-stop rail at the foot of every row, the tallest thing on the card. Weston on
 * the rail: *"it does take up a lot of space… we could still show the status and maybe they could
 * click on it and change it"* — and, seeing the chip: *"I like… it's just showing the status chip."*
 */
export function RoundStatusChip({ step, onStep, label }: { step: number; onStep: (step: number) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const at = roundStepOf({ step });
  const started = at.step >= 0;
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
      <ButtonBase
        data-round-status={at.step}
        aria-label={`${label}: ${at.railLabel}. Change`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        sx={{
          height: 32,
          gap: 0.5,
          px: 1.125,
          borderRadius: `${radius.xl}px`,
          border: `1.5px solid ${started ? payBadges.paid.text : md3.outlineVariant}`,
          bgcolor: started ? payBadges.paid.bg : '#fff',
          color: started ? payBadges.paid.text : md3.onSurface,
          fontSize: 11.5,
          fontWeight: 800,
          whiteSpace: 'nowrap',
        }}
      >
        <Icon name={at.icon} size={14} />
        {at.railLabel}
        <Icon name="expand_more" size={15} />
      </ButtonBase>
      {open && (
        <>
          <Box onClick={() => setOpen(false)} sx={{ position: 'fixed', inset: 0, zIndex: 199 }} />
          <Box
            role="menu"
            sx={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              zIndex: 200,
              minWidth: 170,
              py: 0.5,
              bgcolor: '#fff',
              border: `1.5px solid ${md3.outlineVariant}`,
              borderRadius: `${radius.md}px`,
              boxShadow: '0 4px 12px rgba(0,0,0,.12)',
            }}
          >
            {ROUND_STEPS.map((r) => (
              <ButtonBase
                key={r.step}
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onStep(r.step);
                }}
                sx={{
                  width: '100%',
                  minHeight: 40,
                  justifyContent: 'flex-start',
                  gap: 1,
                  px: 1.5,
                  fontSize: 13,
                  fontWeight: r.step === at.step ? 800 : 500,
                  color: r.step === at.step ? md3.primary : md3.onSurface,
                  '&:hover': { bgcolor: md3.surfaceContainer },
                }}
              >
                <Icon name={r.icon} size={16} />
                {r.railLabel}
              </ButtonBase>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}

// ─── What they hold ─────────────────────────────────────────────────────────

/** Characters a membership chip shows before it is cut with "…". */
export const MEMBERSHIP_CHIP_CHARS = 24;
export const truncate = (s: string, n = MEMBERSHIP_CHIP_CHARS) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

const TONE = {
  member: { bg: '#ede9fe', text: '#6d28d9' },
  type: { bg: '#e0f2fe', text: '#0369a1' },
  more: { bg: '#f3f4f6', text: '#4b5563' },
} as const;

function Chip({ label, tone, title }: { label: string; tone: keyof typeof TONE; title?: string }) {
  return (
    <Box
      component="span"
      title={title}
      sx={{ display: 'inline-flex', alignItems: 'center', px: 0.875, py: '2px', borderRadius: `${radius.xl}px`, bgcolor: TONE[tone].bg, color: TONE[tone].text, fontSize: 10.5, fontWeight: 800, whiteSpace: 'nowrap', flexShrink: 0 }}
    >
      {label}
    </Box>
  );
}

/**
 * The player's membership and customer type, beside their name.
 *
 * They went missing in the migration — Weston, Sep 30: *"we want to have the customer type and the
 * membership."* On Oct 2 he added the catch: *"they can have kind of elaborate names… some of them
 * are like 30 characters long… do they have 5? Sometimes they do."* So: the **first membership**,
 * cut at {@link MEMBERSHIP_CHIP_CHARS} characters, the first customer type, and **+N** for the
 * rest — tap it for the full list. Most players hold one, so most rows look exactly as before.
 */
export function MembershipChips({ record }: { record: Pick<Customer, 'memberships' | 'customerTypes'> }) {
  const [open, setOpen] = useState(false);
  const memberships = record.memberships.map((m) => m.name);
  const types = record.customerTypes;
  const shown = [memberships[0], types[0]].filter(Boolean) as string[];
  const rest = memberships.length + types.length - shown.length;
  if (!shown.length) return null;
  return (
    <Stack direction="row" alignItems="center" gap={0.5} sx={{ minWidth: 0, position: 'relative' }} data-membership-chips>
      {memberships[0] && <Chip label={truncate(memberships[0])} tone="member" title={memberships[0]} />}
      {types[0] && <Chip label={truncate(types[0], 16)} tone="type" title={types[0]} />}
      {rest > 0 && (
        <ButtonBase
          data-membership-more={rest}
          aria-label={`${rest} more`}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(!open);
          }}
          sx={{ borderRadius: `${radius.xl}px` }}
        >
          <Chip label={`+${rest}`} tone="more" />
        </ButtonBase>
      )}
      {open && (
        <>
          <Box
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            sx={{ position: 'fixed', inset: 0, zIndex: 199 }}
          />
          <Box
            data-membership-list
            onClick={(e) => e.stopPropagation()}
            sx={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 200, width: 300, p: '10px 12px', bgcolor: '#fff', border: `1.5px solid ${md3.outlineVariant}`, borderRadius: `${radius.md}px`, boxShadow: '0 4px 12px rgba(0,0,0,.12)', textAlign: 'left' }}
          >
            {memberships.length > 0 && (
              <>
                <Typography sx={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.05em', color: md3.outline, mb: 0.5 }}>MEMBERSHIPS</Typography>
                {memberships.map((m) => (
                  <Typography key={m} sx={{ fontSize: 12.5, fontWeight: 600, py: 0.25 }}>
                    {m}
                  </Typography>
                ))}
              </>
            )}
            {types.length > 0 && (
              <>
                <Typography sx={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.05em', color: md3.outline, mt: memberships.length ? 1 : 0, mb: 0.5 }}>CUSTOMER TYPE</Typography>
                {types.map((t) => (
                  <Typography key={t} sx={{ fontSize: 12.5, fontWeight: 600, py: 0.25 }}>
                    {t}
                  </Typography>
                ))}
              </>
            )}
          </Box>
        </>
      )}
    </Stack>
  );
}
