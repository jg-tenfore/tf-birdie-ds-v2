import type { ReactNode } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { md3, radius } from '../../../theme/tokens';
import { SERVERS } from '../../data/staff';
import { SelectField } from '../../modals/ModalFrame';
import { Icon } from '../primitives';
import { Stack } from '../Stack';

/**
 * The small controls the host's screens share (V1 → V2, Wave 2): a party-size stepper, the server
 * picker, and a 44px action button.
 *
 * The stepper is − / count / + at 44px, because a party size is changed by one far more often
 * than it is typed, and a number field on a tablet summons a keyboard over half the dialog.
 */

export function CountStepper({
  label,
  value,
  onChange,
  min = 1,
  max = 16,
  unit,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  /** "guests" — read after the number, and in the buttons' names. */
  unit: string;
}) {
  const btn = (delta: number, icon: string, name: string) => (
    <ButtonBase
      aria-label={name}
      disabled={value + delta < min || value + delta > max}
      onClick={() => onChange(Math.max(min, Math.min(max, value + delta)))}
      sx={{
        width: 44,
        height: 44,
        borderRadius: `${radius.md}px`,
        border: `1.5px solid ${md3.outlineVariant}`,
        '&.Mui-disabled': { opacity: 0.4 },
      }}
    >
      <Icon name={icon} size={18} />
    </ButtonBase>
  );
  return (
    <Stack sx={{ flex: 1 }}>
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: md3.onSurfaceVariant, mb: 0.5 }}>{label}</Typography>
      <Stack direction="row" alignItems="center" gap={1}>
        {btn(-1, 'remove', `Fewer ${unit}`)}
        <Typography sx={{ minWidth: 78, textAlign: 'center', fontSize: 15, fontWeight: 800 }} data-count={unit}>
          {value} {value === 1 ? unit.replace(/s$/, '') : unit}
        </Typography>
        {btn(1, 'add', `More ${unit}`)}
      </Stack>
    </Stack>
  );
}

export function ServerSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <SelectField
      label="Server"
      value={value}
      options={SERVERS.map((s) => ({ label: s.name, value: s.id }))}
      onChange={onChange}
    />
  );
}

/**
 * An action on the floor panel or a reservation row. `ModalFrame`'s buttons are sized for a
 * dialog footer, under 44px tall; these sit in the body of a screen worked with a thumb, so they
 * are the full 44.
 */
export function HostButton({
  children,
  onClick,
  disabled,
  tone = 'outline',
  icon,
  fullWidth,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: 'filled' | 'outline' | 'danger' | 'primary';
  icon?: string;
  fullWidth?: boolean;
}) {
  const look = {
    filled: { bg: md3.onSurface, fg: '#fff', border: md3.onSurface, hover: '#333' },
    primary: { bg: md3.primary, fg: '#fff', border: md3.primary, hover: '#128a3e' },
    outline: { bg: '#fff', fg: md3.onSurface, border: md3.outlineVariant, hover: md3.surfaceContainer },
    danger: { bg: '#fff', fg: md3.error, border: `${md3.error}66`, hover: '#fff0ee' },
  }[tone];
  return (
    <ButtonBase
      onClick={onClick}
      disabled={disabled}
      sx={{
        minHeight: 44,
        px: 1.75,
        gap: 0.75,
        width: fullWidth ? '100%' : undefined,
        borderRadius: `${radius.xl}px`,
        border: `1.5px solid ${look.border}`,
        bgcolor: look.bg,
        color: look.fg,
        fontSize: 13,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        '&:hover': { bgcolor: look.hover },
        '&.Mui-disabled': { opacity: 0.45 },
      }}
    >
      {icon && <Icon name={icon} size={17} />}
      {children}
    </ButtonBase>
  );
}

/** The flag a booked reservation with no table carries — the host's to-do list, visible from across the room. */
export function NoTableFlag() {
  return (
    <Box
      component="span"
      data-no-table
      sx={{ px: 1, py: '3px', borderRadius: `${radius.xl}px`, bgcolor: '#fef3c7', color: '#92400e', fontSize: 10.5, fontWeight: 800, whiteSpace: 'nowrap' }}
    >
      No table yet
    </Box>
  );
}
