import type { ReactNode } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { md3, radius } from '../../../theme/tokens';
import { varianceLabel, varianceTone } from '../../logic/drawer';
import { Icon } from '../primitives';

/**
 * The pieces Time Clock, Shift and Inventory share (V1 → V2, Wave 3): a stat tile, a filter chip, a
 * plain data table and a coloured variance. The same treatments Orders & Tips drew locally, lifted
 * here so three screens built together read as one back office.
 */

/** A figure with its label — Orders & Tips' totals band, as a component. */
export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'strong' | 'warn' | 'bad' }) {
  const bg = tone === 'strong' ? md3.primaryContainer : tone === 'warn' ? '#fef3c7' : tone === 'bad' ? '#ffdad6' : md3.surfaceContainer;
  const fg = tone === 'strong' ? md3.onPrimaryContainer : tone === 'warn' ? '#92400e' : tone === 'bad' ? md3.error : md3.onSurface;
  return (
    <Box data-stat={label} sx={{ p: '10px 12px', borderRadius: `${radius.md}px`, bgcolor: bg, minWidth: 0 }}>
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: md3.onSurfaceVariant }}>{label}</Typography>
      <Typography component="div" sx={{ fontSize: 18, fontWeight: 800, color: fg, whiteSpace: 'nowrap' }}>
        {value}
      </Typography>
      {sub && (
        <Typography component="div" sx={{ fontSize: 10.5, color: md3.onSurfaceVariant }}>
          {sub}
        </Typography>
      )}
    </Box>
  );
}

/** A 40px pill toggle — big enough for a thumb, as Orders & Tips' filters are. */
export function FilterChip({ label, active, onClick, count }: { label: string; active: boolean; onClick: () => void; count?: number }) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-pressed={active}
      sx={{
        height: 40,
        px: 1.75,
        gap: 0.75,
        borderRadius: `${radius.xl}px`,
        border: `1.5px solid ${active ? md3.primary : md3.outlineVariant}`,
        bgcolor: active ? md3.primaryContainer : '#fff',
        color: active ? md3.onPrimaryContainer : md3.onSurface,
        fontSize: 12.5,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {label}
      {count != null && (
        <Box component="span" sx={{ fontSize: 11, fontWeight: 800, color: active ? md3.onPrimaryContainer : md3.onSurfaceVariant }}>
          {count}
        </Box>
      )}
    </ButtonBase>
  );
}

/** The all-caps heading over a panel's section. */
export function PanelHeading({ children, aside, sx }: { children: ReactNode; aside?: ReactNode; sx?: SxProps<Theme> }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1, ...sx }}>
      <Typography component="h2" sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '.05em', color: md3.onSurfaceVariant, textTransform: 'uppercase' }}>
        {children}
      </Typography>
      {aside && <Typography sx={{ fontSize: 11.5, color: md3.outline, ml: 'auto' }}>{aside}</Typography>}
    </Box>
  );
}

export interface Column {
  label: string;
  align?: 'left' | 'right' | 'center';
  width?: number | string;
}

/**
 * A plain table. Headers stick while the body scrolls; cells never clip — a column that does not
 * fit wraps rather than running off the pane, which is what v1's Shift history did ("End Checl").
 */
export function DataTable({ columns, children, ...rest }: { columns: Column[]; children: ReactNode } & Record<`data-${string}`, string | boolean>) {
  return (
    <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }} {...rest}>
      <Box component="thead">
        <Box component="tr">
          {columns.map((c, i) => (
            <Box
              component="th"
              key={c.label || i}
              sx={{
                textAlign: c.align ?? 'left',
                width: c.width,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '.04em',
                color: md3.onSurfaceVariant,
                textTransform: 'uppercase',
                p: '8px 8px',
                borderBottom: `1px solid ${md3.outlineVariant}`,
                position: 'sticky',
                top: 0,
                bgcolor: md3.surface,
                zIndex: 1,
                whiteSpace: 'nowrap',
              }}
            >
              {c.label}
            </Box>
          ))}
        </Box>
      </Box>
      <Box component="tbody">{children}</Box>
    </Box>
  );
}

/** A body cell with the table's rhythm. */
export function Td({
  children,
  align,
  sx,
  colSpan,
  ...rest
}: { children?: ReactNode; align?: 'left' | 'right' | 'center'; sx?: SxProps<Theme>; colSpan?: number } & Record<`data-${string}`, string | boolean>) {
  return (
    <Box
      component="td"
      colSpan={colSpan}
      {...rest}
      sx={{ p: '10px 8px', fontSize: 13, borderBottom: `1px solid ${md3.outlineVariant}`, textAlign: align ?? 'left', verticalAlign: 'middle', ...sx }}
    >
      {children}
    </Box>
  );
}

const TONE = {
  exact: { fg: '#166534', bg: '#dcfce7' },
  over: { fg: '#92400e', bg: '#fef3c7' },
  short: { fg: md3.error, bg: '#ffdad6' },
} as const;

/**
 * Over or short, coloured. Short is red — money is missing. Over is amber rather than green: a
 * drawer that is over has usually been short-changed a customer, which is still a mistake.
 */
export function VarianceText({ value, pill }: { value: number; pill?: boolean }) {
  const tone = varianceTone(value);
  const c = TONE[tone];
  return (
    <Box
      component="span"
      data-variance={tone}
      sx={{
        color: c.fg,
        fontWeight: 800,
        whiteSpace: 'nowrap',
        ...(pill && { bgcolor: c.bg, px: 1, py: '3px', borderRadius: `${radius.xl}px`, fontSize: 12 }),
      }}
    >
      {varianceLabel(value)}
    </Box>
  );
}

/**
 * The toolbar's one primary action — filled, beside `ToolbarButton`'s outlined secondaries, at the
 * same 40px height. What v1 put in a full-width bar at the bottom of the screen (END SHIFT, SAVE).
 */
export function ToolbarPrimary({
  icon,
  label,
  onClick,
  destructive,
  disabled,
}: {
  icon?: string;
  label: string;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      disabled={disabled}
      sx={{
        height: 40,
        gap: 0.75,
        px: 2,
        borderRadius: `${radius.xl}px`,
        bgcolor: destructive ? md3.error : md3.onSurface,
        color: '#fff',
        fontSize: 13,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        '&:hover': { bgcolor: destructive ? '#8f1414' : '#333' },
        '&.Mui-disabled': { bgcolor: md3.surfaceHighest, color: md3.onSurfaceVariant, opacity: 0.6 },
      }}
    >
      {icon && <Icon name={icon} size={17} />}
      {label}
    </ButtonBase>
  );
}

/** The toolbar's outlined secondary — `ToolbarButton`'s look at the primary's 40px height. */
export function ToolbarSecondary({ icon, label, onClick, disabled }: { icon?: string; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <ButtonBase
      onClick={onClick}
      disabled={disabled}
      sx={{
        height: 40,
        gap: 0.75,
        px: 1.75,
        borderRadius: `${radius.xl}px`,
        border: `1.5px solid ${md3.outlineVariant}`,
        color: md3.onSurface,
        fontSize: 13,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        '&:hover': { bgcolor: md3.surfaceContainer },
        '&.Mui-disabled': { opacity: 0.5 },
      }}
    >
      {icon && <Icon name={icon} size={17} />}
      {label}
    </ButtonBase>
  );
}
