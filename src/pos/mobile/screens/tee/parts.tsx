import type { ReactNode } from 'react';
import { Box, ButtonBase, Chip, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import Check from '@mui/icons-material/Check';
import VerifiedUser from '@mui/icons-material/VerifiedUser';
import { idMeGroups, md3, memberTypes, mobile, noteColors, payBadges, playerAccents, radius } from '../../../../theme/tokens';
import type { MemberTypeKey } from '../../../../theme/tokens';
import { TRANSPORT_META } from '../../../data/config';
import { findMemberByPhone } from '../../../data/golfers';
import { useGolferRoster } from '../../../state/PosProvider';
import { Icon } from '../../../components/primitives';
import { Stack } from '../../../components/Stack';
import type { Booking, Course, IdMeGroup, PayStatus } from '../../../types';
import { MobileScreen, TopAppBar } from '../../chrome';
import { checkedInCount, initials, isSlotHolder, shortCourse, useLongPress } from './tee-helpers';

/**
 * Shared pieces for the Tee Sheet destination.
 *
 * Everything here is phone-sized on purpose: 48dp targets, 14–16px text. The terminal's
 * `PayBadge` / `ListCard` are tuned for a mouse at 1366px and read as specks on a phone,
 * so these are re-drawn at MD3 touch density from the same tokens.
 */

// ─── Badges & avatars ───────────────────────────────────────────────────────

/** The payment-state badge at phone size. Same fills as the terminal's `PayBadge`. */
export function StatusBadge({ pay, sx }: { pay: PayStatus | string; sx?: SxProps<Theme> }) {
  const cfg = payBadges[pay as PayStatus] ?? { bg: md3.surfaceContainer, text: md3.outline, label: String(pay).toUpperCase() };
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 22,
        px: 1,
        borderRadius: `${radius.sm / 2}px`,
        bgcolor: cfg.bg,
        color: cfg.text,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.5,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        ...sx,
      }}
    >
      {cfg.label}
    </Box>
  );
}

/** Membership pill: the tier's colour and label. */
export function MemberBadge({ type }: { type: MemberTypeKey }) {
  const cfg = memberTypes[type];
  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={0.75}
      component="span"
      sx={{ height: 22, px: 1, borderRadius: `${radius.sm / 2}px`, bgcolor: cfg.bg, fontSize: 11, fontWeight: 700, flexShrink: 0 }}
    >
      <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: cfg.color }} />
      {cfg.label}
    </Stack>
  );
}

/**
 * ID.me verification badge (Weston Edits) at phone size: a shield and the group. Same 22dp
 * height as the pay and member badges so a player row's badges line up. `compact` drops the
 * "ID.me" prefix for tight rows — the shield carries it.
 */
export function IdMeBadge({ group, compact }: { group: IdMeGroup; compact?: boolean }) {
  const cfg = idMeGroups[group];
  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={0.5}
      component="span"
      aria-label={`ID.me verified · ${cfg.label}`}
      sx={{ height: 22, px: 0.75, borderRadius: `${radius.sm / 2}px`, bgcolor: cfg.bg, color: cfg.text, fontSize: 11, fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}
    >
      <VerifiedUser sx={{ fontSize: 14 }} />
      {compact ? cfg.label : `ID.me · ${cfg.label}`}
    </Stack>
  );
}

/** A seat's avatar: initials on the seat's accent colour — the same ramp the terminal uses. */
export function PlayerAvatar({ name, index, size = 40, dim }: { name: string; index: number; size?: number; dim?: boolean }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        bgcolor: playerAccents[index % playerAccents.length],
        color: md3.onPrimary,
        fontSize: size * 0.36,
        fontWeight: 700,
        opacity: dim ? 0.45 : 1,
      }}
    >
      {initials(name)}
    </Box>
  );
}

// ─── Layout bits ────────────────────────────────────────────────────────────

/** MD3 list subheader: title-small in primary, optional trailing action. */
export function SectionHeader({ children, action, sx }: { children: ReactNode; action?: ReactNode; sx?: SxProps<Theme> }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ minHeight: 48, px: 2, ...sx }}>
      <Typography variant="subtitle2" sx={{ color: md3.primary }}>
        {children}
      </Typography>
      {action}
    </Stack>
  );
}

const CALLOUT_TONES = {
  info: noteColors.blue,
  warning: noteColors.yellow,
  danger: noteColors.red,
  success: noteColors.green,
} as const;

/** A tinted inline message — the phone version of the terminal's `Callout`. */
export function Callout({
  tone = 'info',
  icon,
  children,
  sx,
}: {
  tone?: keyof typeof CALLOUT_TONES;
  icon?: string;
  children: ReactNode;
  sx?: SxProps<Theme>;
}) {
  const c = CALLOUT_TONES[tone];
  return (
    <Stack
      direction="row"
      gap={1.5}
      alignItems="flex-start"
      sx={{ p: 1.5, borderRadius: `${radius.md}px`, bgcolor: c.bg, border: `1px solid ${c.border}`, color: c.text, ...sx }}
    >
      {icon && <Icon name={icon} size={20} color={c.dot} />}
      <Typography variant="body2" sx={{ color: 'inherit', flex: 1 }}>
        {children}
      </Typography>
    </Stack>
  );
}

/** MD3 filter chip: outlined when off, secondary-container with a check when on. */
export function FilterChip({
  label,
  selected,
  onClick,
  count,
  disabled,
}: {
  label: ReactNode;
  selected: boolean;
  onClick: () => void;
  count?: number;
  disabled?: boolean;
}) {
  return (
    <Chip
      clickable
      disabled={disabled}
      onClick={onClick}
      icon={selected ? <Check sx={{ fontSize: 18 }} /> : undefined}
      label={
        count == null ? (
          label
        ) : (
          <>
            {label}
            <Box component="span" sx={{ ml: 0.75, opacity: 0.7 }}>
              {count}
            </Box>
          </>
        )
      }
      variant={selected ? 'filled' : 'outlined'}
      sx={{
        flexShrink: 0,
        borderColor: md3.outlineVariant,
        bgcolor: selected ? mobile.secondaryContainer : 'transparent',
        color: selected ? mobile.onSecondaryContainer : md3.onSurfaceVariant,
        '& .MuiChip-icon': { color: mobile.onSecondaryContainer, ml: 1 },
        '&&:hover': { bgcolor: selected ? mobile.secondaryContainer : md3.surfaceContainer },
      }}
    />
  );
}

/** MD3 segmented button: a full-width single-select row with a check on the selection. */
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: Array<{ value: T; label: ReactNode; disabled?: boolean }>;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <ToggleButtonGroup
      exclusive
      fullWidth
      aria-label={ariaLabel}
      value={value}
      onChange={(_, v) => v != null && onChange(v as T)}
      sx={{
        '& .MuiToggleButton-root': {
          borderColor: md3.outline,
          color: md3.onSurface,
          px: 1,
          gap: 0.5,
          '&.Mui-selected': { bgcolor: mobile.secondaryContainer, color: mobile.onSecondaryContainer },
          '&.Mui-selected:hover': { bgcolor: mobile.secondaryContainer },
        },
        '& .MuiToggleButton-root:first-of-type': { borderRadius: '20px 0 0 20px' },
        '& .MuiToggleButton-root:last-of-type': { borderRadius: '0 20px 20px 0' },
      }}
    >
      {options.map((o) => (
        <ToggleButton key={String(o.value)} value={o.value} disabled={o.disabled}>
          {o.value === value && <Check sx={{ fontSize: 18 }} />}
          {o.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

// ─── Booking card ───────────────────────────────────────────────────────────

/**
 * One booking as an outlined card. The left stripe is the payment colour — the same
 * signal the terminal's chip fill carries, because "who still owes" is the first question.
 * Blocks and league events get a flat tinted card instead: they hold a slot, they aren't
 * a party.
 */
export function BookingCard({
  booking: b,
  course,
  showTime,
  onClick,
  onLongPress,
}: {
  booking: Booking;
  /** Shown in the meta line when the list spans several courses. */
  course?: Course;
  /** Shown in the meta line when the card is outside its time row (search, summary). */
  showTime?: string;
  onClick: () => void;
  onLongPress?: () => void;
}) {
  const press = useLongPress(onLongPress ?? (() => {}));
  const roster = useGolferRoster();
  const holder = isSlotHolder(b);
  const cfg = payBadges[b.pay] ?? payBadges.open;
  const member = findMemberByPhone(b.phone, roster);
  const inCount = checkedInCount(b);
  const dim = b.pay === 'no_show' || b.pay === 'refund';

  const meta: ReactNode[] = [];
  if (showTime) meta.push(<b key="t">{showTime}</b>);
  if (course) meta.push(shortCourse(course));
  if (!holder) {
    meta.push(
      <Stack key="p" component="span" direction="row" alignItems="center" gap={0.25}>
        <Icon name="person" size={14} />
        {b.players}
      </Stack>,
    );
    meta.push(<Icon key="c" name={TRANSPORT_META[b.cart]?.icon ?? 'directions_walk'} size={14} />);
    if (b.holes) meta.push(b.holes);
    if (inCount > 0)
      meta.push(
        <Box key="i" component="span" sx={{ color: md3.primary, fontWeight: 600 }}>
          {inCount}/{b.players} in
        </Box>,
      );
  } else if (b.note) {
    meta.push(b.note);
  }

  return (
    <ButtonBase
      onClick={onLongPress ? press.tap(onClick) : onClick}
      {...(onLongPress ? press.handlers : {})}
      aria-label={`${b.name}, ${cfg.label}`}
      sx={{
        width: '100%',
        display: 'flex',
        alignItems: 'stretch',
        textAlign: 'left',
        borderRadius: `${radius.md}px`,
        overflow: 'hidden',
        border: holder ? 'none' : `1px solid ${md3.outlineVariant}`,
        bgcolor: holder ? cfg.bg : md3.surface,
        opacity: dim ? 0.7 : 1,
        userSelect: 'none',
      }}
    >
      {!holder && <Box sx={{ width: 4, flexShrink: 0, bgcolor: cfg.text }} />}
      <Box sx={{ flex: 1, minWidth: 0, px: 1.5, py: 1 }}>
        <Stack direction="row" alignItems="center" gap={0.75}>
          {holder && <Icon name={b.pay === 'event' ? 'groups' : 'block'} size={18} color={cfg.text} />}
          {member && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: memberTypes[member.memberType ?? 'annual'].color, flexShrink: 0 }} />}
          <Typography
            variant="subtitle2"
            noWrap
            sx={{ flex: 1, minWidth: 0, color: holder ? cfg.text : md3.onSurface, textDecoration: b.pay === 'no_show' ? 'line-through' : 'none' }}
          >
            {b.name}
          </Typography>
          {b.note && !holder && <Icon name="sticky_note_2" size={16} color={noteColors.yellow.dot} />}
          {!holder && <StatusBadge pay={b.pay} />}
        </Stack>
        {meta.length > 0 && (
          <Stack
            direction="row"
            alignItems="center"
            gap={1}
            sx={{ mt: 0.25, color: holder ? cfg.text : md3.onSurfaceVariant, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden' }}
          >
            {meta.map((m, i) => (
              <Box key={i} component="span" sx={{ display: 'inline-flex', alignItems: 'center', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {m}
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </ButtonBase>
  );
}

// ─── Data access ────────────────────────────────────────────────────────────

/** What a pushed screen shows when its booking was deleted underneath it. */
export function BookingGone() {
  return (
    <MobileScreen topBar={<TopAppBar title="Booking" />}>
      <Stack alignItems="center" gap={1.5} sx={{ p: 4, color: md3.onSurfaceVariant, textAlign: 'center' }}>
        <Icon name="search_off" size={40} />
        <Typography variant="body1">This booking no longer exists.</Typography>
      </Stack>
    </MobileScreen>
  );
}
