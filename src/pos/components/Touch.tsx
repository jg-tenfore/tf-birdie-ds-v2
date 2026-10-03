import type { ReactNode } from 'react';
import { ButtonBase } from '@mui/material';
import { md3, radius } from '../../theme/tokens';
import { Icon } from './primitives';
import { Stack } from './Stack';

/**
 * Touch-sized parts (V1 → V2, 100226) — moved into the app from the 100226 mock kit
 * (`showcase/v1-v2/100226/mock-kit-2.tsx`) with the same API, now that the League view is built.
 *
 * - `TOUCH` — the smallest target, 40px.
 * - `Seg` — a segmented toggle, each segment a full touch target (`role="group"`, `aria-pressed`).
 * - `TouchButton` — a pill button at touch height, in four tones.
 */

/** 40px: the smallest target on these screens — it is a touchscreen. */
export const TOUCH = 40;

/** A segmented toggle, each segment a full touch target. */
export function Seg<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string; icon?: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <Stack direction="row" role="group" aria-label={label} sx={{ border: `1.5px solid ${md3.outlineVariant}`, borderRadius: `${radius.sm}px`, overflow: 'hidden', flexShrink: 0, bgcolor: '#fff' }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <ButtonBase
            key={String(o.value)}
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            sx={{ minWidth: 44, height: TOUCH - 3, px: 1.25, gap: 0.5, fontSize: 13, fontWeight: 800, bgcolor: on ? md3.onSurface : 'transparent', color: on ? '#fff' : md3.onSurface }}
          >
            {o.icon && <Icon name={o.icon} size={16} />}
            {o.label}
          </ButtonBase>
        );
      })}
    </Stack>
  );
}

/** A pill button at touch height. */
export function TouchButton({
  children,
  icon,
  tone = 'outline',
  onClick,
  label,
  disabled,
  sx,
}: {
  children?: ReactNode;
  icon?: string;
  tone?: 'outline' | 'filled' | 'done' | 'ghost';
  onClick?: () => void;
  label?: string;
  disabled?: boolean;
  sx?: object;
}) {
  const tones = {
    outline: { bg: '#fff', fg: md3.onSurface, bd: md3.outlineVariant },
    filled: { bg: md3.onSurface, fg: '#fff', bd: md3.onSurface },
    done: { bg: md3.primaryContainer, fg: md3.onPrimaryContainer, bd: md3.primary },
    ghost: { bg: 'transparent', fg: md3.onSurfaceVariant, bd: 'transparent' },
  }[tone];
  return (
    <ButtonBase
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      sx={{
        height: TOUCH,
        minWidth: children ? undefined : TOUCH,
        px: children ? 1.75 : 0,
        gap: 0.75,
        borderRadius: `${radius.xl}px`,
        border: `1.5px solid ${tones.bd}`,
        bgcolor: tones.bg,
        color: tones.fg,
        fontSize: 13.5,
        fontWeight: 800,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        '&.Mui-disabled': { opacity: 0.45 },
        ...sx,
      }}
    >
      {icon && <Icon name={icon} size={17} />}
      {children}
    </ButtonBase>
  );
}
