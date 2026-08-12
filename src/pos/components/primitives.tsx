import { Box, Tooltip, Typography } from '@mui/material';
import type { BoxProps, SxProps, Theme } from '@mui/material';
import type { ReactNode } from 'react';
import { md3, memberTypes, payBadges, radius } from '../../theme/tokens';
import type { MemberTypeKey } from '../../theme/tokens';
import { findMemberByName, findMemberByPhone } from '../data/golfers';
import { iconFor } from '../icons';
import type { Booking, PayStatus } from '../types';
import { Stack } from './Stack';

/**
 * Small building blocks that recur across every POS screen.
 *
 * These exist because the prototype repeats the same handful of visual devices
 * dozens of times — a ligature-named icon, a tiny all-caps section label, a
 * membership dot, a payment badge, an icon-plus-value row. Extracting them keeps
 * the screen components readable and keeps the treatments consistent.
 */

// ─── Icon ───────────────────────────────────────────────────────────────────

export interface IconProps {
  /** Material Symbols ligature name, e.g. `'how_to_reg'`. */
  name: string;
  /** Pixel size. The prototype ranges from 9px (inline hints) to 38px (empty states). */
  size?: number;
  color?: string;
  sx?: SxProps<Theme>;
}

/**
 * Render an icon by its Material Symbols name.
 *
 * Sizing is explicit in pixels rather than by MUI's `fontSize` scale, because the
 * prototype sets icon sizes per-context and they need to match the adjacent text.
 */
export function Icon({ name, size = 16, color, sx }: IconProps) {
  const Cmp = iconFor(name);
  return <Cmp sx={{ fontSize: size, color, flexShrink: 0, ...sx }} aria-hidden />;
}

// ─── Section label ──────────────────────────────────────────────────────────

/**
 * The tiny bold all-caps label that heads nearly every group in this design.
 *
 * `rule` draws the hairline that trails the label in the item grid's category
 * headings — it fades to 18% of the current text color, so it inherits whatever
 * color the label was given.
 */
export function SectionLabel({
  children,
  color = md3.onSurfaceVariant,
  rule = false,
  sx,
}: {
  children: ReactNode;
  color?: string;
  rule?: boolean;
  sx?: SxProps<Theme>;
}) {
  return (
    <Typography
      variant="overline"
      sx={{
        color,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        ...(rule && {
          '&::after': {
            content: '""',
            flex: 1,
            height: '1px',
            backgroundColor: 'currentColor',
            opacity: 0.18,
          },
        }),
        ...sx,
      }}
    >
      {children}
    </Typography>
  );
}

// ─── Membership dot ─────────────────────────────────────────────────────────

/**
 * A colored dot marking a player's membership tier, or nothing if they aren't a
 * member. Lets staff spot a member on a tee-sheet chip without opening it.
 *
 * Pass `memberType` when it's known. Otherwise pass a `phone` or a `name` and the
 * tier is resolved from the CRM — phone is the reliable key, name is the fallback
 * for chips that only carry an abbreviated label.
 */
export function MemberDot({
  memberType,
  phone,
  name,
  size = 8,
}: {
  memberType?: MemberTypeKey | null;
  phone?: string;
  name?: string;
  size?: number;
}) {
  let tier = memberType ?? null;
  if (!tier && phone) tier = findMemberByPhone(phone)?.memberType ?? null;
  if (!tier && name) tier = findMemberByName(name)?.memberType ?? null;
  if (!tier) return null;

  const cfg = memberTypes[tier];
  return (
    <Tooltip title={cfg.label}>
      <Box
        component="span"
        sx={{
          width: size,
          height: size,
          borderRadius: '50%',
          bgcolor: cfg.color,
          flexShrink: 0,
          display: 'inline-block',
          verticalAlign: 'middle',
        }}
      />
    </Tooltip>
  );
}

/** The membership dot for a booking, keyed off its phone number. */
export function BookingMemberDot({ booking, size = 8 }: { booking?: Booking | null; size?: number }) {
  if (!booking?.phone) return null;
  return <MemberDot phone={booking.phone} size={size} />;
}

// ─── Payment badge ──────────────────────────────────────────────────────────

/**
 * The payment-state pill: PAID / OPEN / RAIN CHK / NO SHOW / REFUNDED.
 *
 * This is the highest-priority signal on the tee sheet and in list view, so it
 * gets a solid fill rather than an outline.
 */
export function PayBadge({
  pay,
  size = 'md',
  sx,
}: {
  pay: PayStatus | string;
  size?: 'sm' | 'md';
  sx?: SxProps<Theme>;
}) {
  const cfg = payBadges[pay as PayStatus] ?? {
    bg: md3.surfaceContainer,
    text: md3.outline,
    label: String(pay).toUpperCase(),
  };
  const sm = size === 'sm';
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        bgcolor: cfg.bg,
        color: cfg.text,
        fontSize: sm ? 9 : 10,
        fontWeight: 800,
        letterSpacing: '.4px',
        px: sm ? 0.625 : 0.875,
        py: sm ? 0.125 : 0.25,
        borderRadius: `${radius.sm / 2}px`,
        whiteSpace: 'nowrap',
        ...sx,
      }}
    >
      {cfg.label}
    </Box>
  );
}

// ─── Info row ───────────────────────────────────────────────────────────────

/**
 * `icon · value · trailing note` — the row shape used in the tee-time summary
 * card and throughout the booking detail panes.
 */
export function InfoRow({
  icon,
  children,
  note,
  color,
  sx,
}: {
  icon: string;
  children: ReactNode;
  note?: ReactNode;
  color?: string;
  sx?: SxProps<Theme>;
}) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={0.75}
      sx={{ fontSize: 12, color: md3.onSurfaceVariant, mb: '3px', ...sx }}
    >
      <Icon name={icon} size={14} />
      <Box component="span" sx={{ fontWeight: 600, color: color ?? md3.onSurface }}>
        {children}
      </Box>
      {note && (
        <Box component="span" sx={{ fontWeight: 400, ml: 0.5 }}>
          {note}
        </Box>
      )}
    </Stack>
  );
}

// ─── Empty state ────────────────────────────────────────────────────────────

/** Centred icon-over-label placeholder for empty carts, grids, and result lists. */
export function EmptyState({
  icon,
  label,
  sx,
}: {
  icon: string;
  label: string;
  sx?: SxProps<Theme>;
}) {
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      gap={1}
      sx={{ height: '100%', color: md3.outline, ...sx }}
    >
      <Icon name={icon} size={38} />
      <Typography sx={{ fontSize: 13 }}>{label}</Typography>
    </Stack>
  );
}

// ─── Well ───────────────────────────────────────────────────────────────────

/**
 * A recessed `surface-container` panel — the prototype's standard grouping device
 * for cart lines, result lists, and form sections.
 */
export function Well({ children, sx, ...rest }: BoxProps) {
  return (
    <Box
      sx={{ bgcolor: md3.surfaceContainer, borderRadius: `${radius.md}px`, ...sx }}
      {...rest}
    >
      {children}
    </Box>
  );
}

/** Signed currency, with a leading minus rather than parentheses: `-$12.50`. */
export function signedMoney(n: number): string {
  return n < 0 ? `-$${Math.abs(n).toFixed(2)}` : `$${n.toFixed(2)}`;
}

/** Delta currency, always signed: `+$20.00`, `-$3.00`, or `Free` at zero. */
export function deltaMoney(n: number): string {
  if (n === 0) return 'Free';
  return n < 0 ? `-$${Math.abs(n).toFixed(2)}` : `+$${n.toFixed(2)}`;
}
