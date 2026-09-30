import type { ReactNode } from 'react';
import { Box, ButtonBase } from '@mui/material';
import { md3, payBadges, radius } from '../../../theme/tokens';
import { Icon } from '../primitives';

/**
 * The small pieces Order Lookup and Events share (V1 → V2, Wave 3): a status badge in the tee
 * sheet's own pay colours, and the screen's action button.
 */

export function Badge({ tone, children }: { tone: keyof typeof payBadges; children: ReactNode }) {
  return (
    <Box
      component="span"
      sx={{
        px: 0.875,
        py: 0.25,
        borderRadius: `${radius.sm}px`,
        bgcolor: payBadges[tone].bg,
        color: payBadges[tone].text,
        fontSize: 10.5,
        fontWeight: 800,
        letterSpacing: '.04em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </Box>
  );
}

/** A screen's action button, 48px tall for a thumb. Filled is the one thing the screen is for. */
export function ActionButton({
  icon,
  children,
  filled,
  disabled,
  onClick,
  ...rest
}: { icon?: string; children: ReactNode; filled?: boolean; disabled?: boolean; onClick?: () => void } & Record<`data-${string}`, string | boolean>) {
  return (
    <ButtonBase
      onClick={onClick}
      disabled={disabled}
      {...rest}
      sx={{
        height: 48,
        px: 2.25,
        gap: 0.75,
        borderRadius: `${radius.xl}px`,
        fontSize: 14,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        border: filled ? 'none' : `1.5px solid ${md3.outlineVariant}`,
        bgcolor: filled ? md3.onSurface : '#fff',
        color: filled ? '#fff' : md3.onSurface,
        '&.Mui-disabled': { opacity: 0.45 },
      }}
    >
      {icon && <Icon name={icon} size={18} />}
      {children}
    </ButtonBase>
  );
}
