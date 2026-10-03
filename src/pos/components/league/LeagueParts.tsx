import type { ReactNode } from 'react';
import { Box, ButtonBase, InputBase, Typography } from '@mui/material';
import { md3, payBadges, radius } from '../../../theme/tokens';
import { Icon } from '../primitives';
import { Stack } from '../Stack';
import { TOUCH } from '../Touch';

/** The League view's small parts (V1 → V2, 100226), drawn as the approved 100226 mock drew them. */

/** Initials on a coloured disc. */
export function Avatar({ name, color, size = 34 }: { name: string; color: string; size?: number }) {
  const initials = name
    .replace(/[^A-Za-z ,]/g, '')
    .split(/[ ,]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (
    <Box sx={{ width: size, height: size, borderRadius: '50%', bgcolor: color, color: '#fff', display: 'grid', placeItems: 'center', fontSize: size * 0.36, fontWeight: 800, flexShrink: 0 }}>
      {initials || '?'}
    </Box>
  );
}

const CHIP_TONES = {
  ok: { bg: payBadges.paid.bg, text: payBadges.paid.text },
  muted: { bg: '#f3f4f6', text: '#4b5563' },
  warn: { bg: '#fef3c7', text: '#92400e' },
  new: { bg: '#fae8ff', text: '#86198f' },
} as const;

export function Chip({ label, tone = 'muted', icon }: { label: ReactNode; tone?: keyof typeof CHIP_TONES; icon?: string }) {
  const c = CHIP_TONES[tone];
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.375, px: 0.875, py: '2px', borderRadius: `${radius.xl}px`, bgcolor: c.bg, color: c.text, fontSize: 10.5, fontWeight: 800, whiteSpace: 'nowrap' }}>
      {icon && <Icon name={icon} size={12} />}
      {label}
    </Box>
  );
}

/** A line of guidance over the Assign screen. */
export function Hint({ children }: { children: ReactNode }) {
  return (
    <Stack direction="row" gap={1} alignItems="flex-start" sx={{ p: '8px 12px', borderRadius: `${radius.md}px`, bgcolor: '#f5f3ff', color: '#5b21b6', border: '1px solid #ddd6fe', fontSize: 12, fontWeight: 600, lineHeight: 1.45 }}>
      <Icon name="info" size={15} sx={{ mt: '2px' }} />
      <Box>{children}</Box>
    </Stack>
  );
}

export function SearchField({ value, onChange, placeholder, big }: { value: string; onChange: (v: string) => void; placeholder: string; big?: boolean }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={1}
      sx={{ height: big ? 56 : TOUCH + 4, px: 1.5, flex: big ? undefined : 1, minWidth: 0, borderRadius: `${radius.xl}px`, border: `1.5px solid ${value ? md3.primary : md3.outlineVariant}`, bgcolor: '#fff' }}
    >
      <Icon name="search" size={big ? 24 : 19} color={md3.onSurfaceVariant} />
      <InputBase
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputProps={{ 'aria-label': 'Search the league', 'data-league-search': true }}
        sx={{ flex: 1, fontSize: big ? 18 : 14, fontWeight: 600 }}
      />
      {value && (
        <ButtonBase aria-label="Clear search" onClick={() => onChange('')} sx={{ width: 32, height: 32, borderRadius: '50%' }}>
          <Icon name="close" size={18} />
        </ButtonBase>
      )}
    </Stack>
  );
}

/** A tee time, a team or a slice of the alphabet: a heading and its golfers. */
export function GroupCard({ title, badge, sub, children, id }: { title: string; badge?: ReactNode; sub: string; children: ReactNode; id: string }) {
  return (
    <Box data-league-group={id} sx={{ bgcolor: '#fff', border: `1px solid ${md3.outlineVariant}`, borderRadius: `${radius.md}px`, overflow: 'hidden', alignSelf: 'start' }}>
      <Stack direction="row" alignItems="center" gap={1} sx={{ px: 1.5, height: 44, bgcolor: md3.surfaceContainer }}>
        <Typography sx={{ fontSize: 15, fontWeight: 800 }}>{title}</Typography>
        {badge}
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant, fontWeight: 600 }}>{sub}</Typography>
      </Stack>
      {children}
    </Box>
  );
}
